import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle,
  Clock,
  MapPin,
  Spinner,
  WarningCircle,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import {
  confirmConfirmationCode,
  getMeetingVerification,
  issueConfirmationCode,
  submitMeetingReview,
  submitMeetingVerification,
  verifyConfirmationCode,
} from './api'
import { getCurrentLocation, GEOLOCATION_FAILURE_MESSAGE } from './geolocation'
import type { GeolocationFailureReason } from './geolocation'
import type {
  ConfirmationCodeResult,
  IssueConfirmationCodeResult,
  MeetingReviewSubmitResult,
  MeetingVerificationStatusResult,
  SubmitMeetingVerificationBody,
} from './types'
import { ApiError, NetworkError } from '@/lib/api'

/**
 * 만남 GPS 확인(#148) + 확인 코드 fallback(#164) — 위치 권한·제출·상태 폴링,
 * CODE_REQUIRED 이후의 코드 발급·검증·최종 확인까지 다룬다.
 *
 * 시간창(`meetAt ± 1h`)을 프론트가 먼저 막지 않는다. 서버가 정본이라 너무
 * 이르거나 늦으면 `MEETING_TIME_WINDOW_EXCEEDED` 로 알려준다.
 */
export function MeetingVerificationPanel({ cardId }: { cardId: number }) {
  const queryClient = useQueryClient()
  const queryKey = ['meeting-verification', cardId] as const

  const verification = useQuery({
    queryKey,
    queryFn: () => getMeetingVerification(cardId),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status === 'WAITING_COUNTERPART' ||
      query.state.data?.status === 'CODE_REQUIRED'
        ? 4000
        : false,
  })

  /*
    네트워크 재시도는 이 값을 그대로 다시 보낸다 — 같은 clientRequestId 에 다른
    좌표를 실으면 서버가 409 로 거절한다. 위치를 새로 잡는 "다른 시도"에서만
    비운다(요청 참고: 렌더링·위치 watch 마다 새 POST 를 보내면 안 된다).
  */
  const [pendingRequest, setPendingRequest] = useState<SubmitMeetingVerificationBody | null>(
    null,
  )
  const [locationBusy, setLocationBusy] = useState(false)
  const [locationError, setLocationError] = useState<GeolocationFailureReason | null>(null)

  const submit = useMutation({
    mutationFn: (body: SubmitMeetingVerificationBody) =>
      submitMeetingVerification(cardId, body),
    onSuccess: (result) => {
      const status: MeetingVerificationStatusResult = {
        cardId: result.cardId,
        status: result.status,
        mySubmitted: true,
        counterpartSubmitted: result.counterpartSubmitted,
        meetingId: result.meetingId,
        confirmed: result.confirmed,
        verificationMethod: result.verificationMethod,
        confirmedAt: result.confirmedAt,
        codeRequired: result.codeRequired,
        distanceMeters: result.distanceMeters,
      }
      queryClient.setQueryData(queryKey, status)
    },
  })

  async function attemptSubmit(reuseLastRequest: boolean) {
    setLocationError(null)

    let body = reuseLastRequest ? pendingRequest : null
    if (!body) {
      setLocationBusy(true)
      const result = await getCurrentLocation()
      setLocationBusy(false)
      if (!result.ok) {
        setLocationError(result.reason)
        return
      }
      body = { clientRequestId: crypto.randomUUID(), ...result.location }
      setPendingRequest(body)
    }

    submit.mutate(body)
  }

  if (verification.isPending) {
    return <PanelShell>확인 상태를 불러오는 중…</PanelShell>
  }

  if (verification.isError) {
    return (
      <PanelShell tone="error">
        <p>만남 확인 상태를 불러오지 못했습니다.</p>
        <RetryLink onClick={() => void verification.refetch()} label="다시 시도" />
      </PanelShell>
    )
  }

  const v = verification.data

  if (v.confirmed) {
    return (
      <PanelShell tone="success">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle size={20} weight="fill" />
          만남이 확인됐습니다
        </div>
        {v.distanceMeters != null && (
          <p className="mt-1 text-[14px] text-muted-foreground">
            두 위치 거리 약 {Math.round(v.distanceMeters)}m
          </p>
        )}
        {v.meetingId != null && <MeetingReviewForm meetingId={v.meetingId} />}
      </PanelShell>
    )
  }

  if (v.status === 'CODE_REQUIRED') {
    return (
      <CodeFallbackPanel
        cardId={cardId}
        onConfirmed={(result) =>
          queryClient.setQueryData(queryKey, {
            ...v,
            status: 'CODE_CONFIRMED',
            confirmed: true,
            meetingId: result.meetingId,
            verificationMethod: result.verificationMethod,
            confirmedAt: result.confirmedAt,
            codeRequired: false,
          } satisfies MeetingVerificationStatusResult)
        }
      />
    )
  }

  if (v.status === 'EXPIRED') {
    return <PanelShell tone="error">만남 확인 시간이 지났습니다.</PanelShell>
  }

  if (v.status === 'REJECTED') {
    return <PanelShell tone="error">만남 확인이 거절됐습니다.</PanelShell>
  }

  if (v.mySubmitted) {
    return (
      <PanelShell tone="waiting">
        <div className="flex items-center gap-2 font-semibold">
          <Spinner size={18} className="animate-spin" />
          상대방의 확인을 기다리고 있습니다
        </div>
        <p className="mt-1 text-[14px] text-muted-foreground">
          자동으로 확인되면 화면이 바뀝니다. 잠시 기다려 주세요.
        </p>
      </PanelShell>
    )
  }

  const busy = locationBusy || submit.isPending

  return (
    <PanelShell>
      <div className="flex items-center gap-2 font-semibold">
        <MapPin size={20} />
        만남 장소에 도착했나요?
      </div>
      <p className="mt-1 text-[14px] text-muted-foreground">
        {v.counterpartSubmitted
          ? '상대방은 이미 위치를 확인했어요. 내 위치도 확인해 주세요.'
          : '위치를 확인하면 상대방에게도 알려줘요.'}
      </p>

      <Button
        className="mt-3"
        onClick={() => void attemptSubmit(false)}
        disabled={busy}
      >
        {busy ? (
          <>
            <Spinner size={18} className="animate-spin" />
            {locationBusy ? '위치 확인 중…' : '제출 중…'}
          </>
        ) : (
          '위치 확인하기'
        )}
      </Button>

      {locationError && (
        <div className="mt-3 flex items-start gap-2 text-[14px] text-destructive">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div>
            <p>{GEOLOCATION_FAILURE_MESSAGE[locationError]}</p>
            <RetryLink onClick={() => void attemptSubmit(false)} label="다시 시도" />
          </div>
        </div>
      )}

      {submit.isError && (
        <div className="mt-3 flex items-start gap-2 text-[14px] text-destructive">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div>
            <p>{describeSubmitError(submit.error)}</p>
            <RetryLink
              onClick={() => void attemptSubmit(isNetworkRetryable(submit.error))}
              label={isNetworkRetryable(submit.error) ? '다시 시도' : '새로 제출'}
            />
          </div>
        </div>
      )}
    </PanelShell>
  )
}

/** 5xx·네트워크 자체 실패만 "같은 요청 재시도"로 취급한다. 그 외 4xx 는 판정이
 * 끝난 답이라 새 위치·새 clientRequestId 로 다시 시작해야 한다. */
function isNetworkRetryable(e: unknown): boolean {
  return e instanceof NetworkError || (e instanceof ApiError && e.status >= 500)
}

function describeSubmitError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof NetworkError) return e.message
  return '위치를 제출하지 못했습니다.'
}

function RetryLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 font-semibold text-primary-strong underline underline-offset-2"
    >
      {label}
    </button>
  )
}

function PanelShell({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'success' | 'waiting' | 'error'
}) {
  const toneClass = {
    default: 'border-border bg-surface',
    success: 'border-primary bg-primary-subtle',
    waiting: 'border-border bg-surface',
    error: 'border-destructive/40 bg-surface',
  }[tone]

  return (
    <div className={`mt-6 rounded-xl border p-4 ${toneClass}`}>{children}</div>
  )
}

/**
 * 확인 코드 fallback(#164). 발급자/검증자 역할은 서버가 아니라 사용자가 화면에서
 * 직접 고른다 — 발급자가 자기 코드를 검증하면 403 MEETING_CODE_ISSUER_FORBIDDEN.
 */
function CodeFallbackPanel({
  cardId,
  onConfirmed,
}: {
  cardId: number
  onConfirmed: (result: ConfirmationCodeResult) => void
}) {
  const [mode, setMode] = useState<'choose' | 'issue' | 'verify'>('choose')

  if (mode === 'issue') {
    return (
      <IssueCodePanel cardId={cardId} onBack={() => setMode('choose')} onConfirmed={onConfirmed} />
    )
  }
  if (mode === 'verify') {
    return <VerifyCodePanel cardId={cardId} onBack={() => setMode('choose')} />
  }

  return (
    <PanelShell tone="waiting">
      <div className="flex items-center gap-2 font-semibold">
        <Clock size={20} />
        위치 정확도가 낮아 확인 코드가 필요합니다
      </div>
      <p className="mt-1 text-[14px] text-muted-foreground">
        직접 만난 상태에서 한쪽이 코드를 발급하고, 다른 한쪽이 그 코드를 입력해 주세요.
      </p>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => setMode('issue')}>코드 발급하기</Button>
        <Button variant="secondary" onClick={() => setMode('verify')}>
          코드 입력하기
        </Button>
      </div>
    </PanelShell>
  )
}

/**
 * 코드를 발급하고, 상대가 검증할 때까지 `confirm` 을 폴링한다. 전용 상태 조회
 * 엔드포인트가 없어 `confirmConfirmationCode` 자체를 폴링에 쓴다 — 상대가 아직
 * 검증하지 않았을 때는 409 `MEETING_CODE_VERIFIER_REQUIRED` 만 돌려주는 부작용 없는 호출이다.
 */
function IssueCodePanel({
  cardId,
  onBack,
  onConfirmed,
}: {
  cardId: number
  onBack: () => void
  onConfirmed: (result: ConfirmationCodeResult) => void
}) {
  const [issued, setIssued] = useState<IssueConfirmationCodeResult | null>(null)

  const issue = useMutation({
    mutationFn: () => issueConfirmationCode(cardId),
    onSuccess: setIssued,
  })

  const expired = issued != null && Date.now() >= new Date(issued.expiresAt).getTime()

  const confirmPoll = useQuery({
    queryKey: ['meeting-confirmation-code-confirm', cardId, issued?.expiresAt],
    queryFn: () => confirmConfirmationCode(cardId),
    enabled: issued != null && !expired,
    retry: false,
    refetchInterval: (query) => (isConfirmPollWaiting(query.state.error) ? 4000 : false),
  })

  /*
    onConfirmed 는 부모(MeetingVerificationPanel)가 렌더마다 새로 만드는
    인라인 함수라 useCallback 없이 effect 의존성에 넣으면, 상위 4초 폴링마다
    이 effect 가 다시 돌아 confirmPoll.data 가 그대로여도 onConfirmed 를 매번
    재호출한다. ref 에 최신 값만 담아 effect 는 confirmPoll.data 변화에만 반응하게 한다.
  */
  const onConfirmedRef = useRef(onConfirmed)
  onConfirmedRef.current = onConfirmed

  useEffect(() => {
    if (confirmPoll.data) onConfirmedRef.current(confirmPoll.data)
  }, [confirmPoll.data])

  function reissue() {
    setIssued(null)
    issue.reset()
  }

  if (!issued) {
    return (
      <PanelShell tone="waiting">
        <div className="flex items-center gap-2 font-semibold">
          <MapPin size={20} />
          코드 발급하기
        </div>
        <p className="mt-1 text-[14px] text-muted-foreground">
          발급한 코드를 상대방에게 직접 알려주세요. 코드는 이 화면에만 한 번 표시됩니다.
        </p>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => issue.mutate()} disabled={issue.isPending}>
            {issue.isPending ? (
              <>
                <Spinner size={18} className="animate-spin" />
                발급 중…
              </>
            ) : (
              '코드 발급'
            )}
          </Button>
          <Button variant="secondary" onClick={onBack} disabled={issue.isPending}>
            뒤로
          </Button>
        </div>
        {issue.isError && (
          <p className="mt-3 text-[14px] text-destructive">{describeCodeError(issue.error)}</p>
        )}
      </PanelShell>
    )
  }

  const waitingError =
    confirmPoll.error != null && !expired && !isConfirmPollWaiting(confirmPoll.error)
      ? confirmPoll.error
      : null

  return (
    <PanelShell tone={expired || waitingError ? 'error' : 'waiting'}>
      <div className="flex items-center gap-2 font-semibold">
        <Clock size={20} />
        상대방에게 코드를 알려주세요
      </div>
      <p className="mt-4 text-center text-[40px] font-bold tracking-[0.3em] text-primary-strong">
        {issued.code}
      </p>
      {!expired && !waitingError && (
        <p className="text-center text-[14px] text-muted-foreground">
          상대방이 입력하면 자동으로 확인됩니다.
        </p>
      )}
      {expired && (
        <div className="mt-3 text-[14px] text-destructive">
          <p>코드가 만료됐습니다.</p>
          <RetryLink onClick={reissue} label="다시 발급" />
        </div>
      )}
      {waitingError && (
        <div className="mt-3 text-[14px] text-destructive">
          <p>{describeCodeError(waitingError)}</p>
          {/*
            GPS 쪽에서 먼저 확정된 경우 MEETING_ALREADY_CONFIRMED 가 오는데,
            이미 끝난 만남을 "다시 발급"해봐야 같은 오류만 반복된다. 곧 상위
            폴링이 confirmed=true 를 받아 이 화면 자체가 성공 화면으로 바뀐다.
          */}
          {!isAlreadyConfirmedCode(waitingError) && (
            <RetryLink onClick={reissue} label="다시 발급" />
          )}
        </div>
      )}
    </PanelShell>
  )
}

function isAlreadyConfirmedCode(e: unknown): boolean {
  return e instanceof ApiError && e.code === 'MEETING_ALREADY_CONFIRMED'
}

/**
 * 만남 후기(#166). `meetingId`는 카드 id가 아니라 이 카드가 확정되며 생긴
 * `Meeting.id`(위 v.meetingId) 다. 별점은 없다 — placeTag(필수)·content(선택)만.
 *
 * "이미 후기를 남겼는지"를 알려주는 조회 엔드포인트가 없어 새로고침하면 폼이
 * 다시 뜬다. 다시 제출하면 서버가 409 REVIEW_ALREADY_EXISTS로 막아준다 —
 * 프론트가 먼저 숨기지 못하는 건 계약 간극이라 여기 남겨둔다.
 */
function MeetingReviewForm({ meetingId }: { meetingId: number }) {
  const [placeTag, setPlaceTag] = useState('')
  const [content, setContent] = useState('')
  const [submitted, setSubmitted] = useState<MeetingReviewSubmitResult | null>(null)

  /*
    매 제출마다 새 clientRequestId 를 쓴다 — GPS 제출과 달리 여기선 재사용할
    "비싼 자원"(위치 측정)이 없다. 이전 버전에서 ref 로 한 번 고정해 재사용했더니,
    거절된 뒤 내용을 고쳐 다시 누르면 같은 id 에 다른 payload 가 실려
    409 REVIEW_REQUEST_CONFLICT 로 영원히 막히는 버그가 있었다. 응답을 못 받고
    재클릭해 서버엔 이미 저장된 경우엔 REVIEW_ALREADY_EXISTS 로 안내되니 괜찮다.
  */
  const review = useMutation({
    mutationFn: () =>
      submitMeetingReview(meetingId, {
        clientRequestId: crypto.randomUUID(),
        placeTag: placeTag.trim(),
        content: content.trim() || undefined,
      }),
    onSuccess: setSubmitted,
  })

  if (submitted) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-background p-3">
        <p className="text-[14px] font-medium">
          "{submitted.placeTag}"에 후기를 남겼습니다.
        </p>
        {submitted.footprint.granted && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            오늘의 발자국이 하나 늘었어요.
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      className="mt-3 flex flex-col gap-2 border-t border-border pt-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (placeTag.trim() === '' || review.isPending) return
        review.mutate()
      }}
    >
      <Field label="후기 남기기">
        {({ id, describedBy }) => (
          <input
            id={id}
            aria-describedby={describedBy}
            value={placeTag}
            onChange={(e) => setPlaceTag(e.target.value)}
            maxLength={30}
            placeholder="장소 태그 (예: 한강공원)"
            className={inputClass(false)}
          />
        )}
      </Field>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="한 줄 후기 (선택)"
        aria-label="한 줄 후기"
        className={`${inputClass(false)} min-h-0 py-2`}
      />
      {review.isError && (
        <p role="alert" className="text-[13px] text-destructive">
          {describeReviewError(review.error)}
        </p>
      )}
      <Button type="submit" disabled={placeTag.trim() === '' || review.isPending}>
        {review.isPending ? '등록 중…' : '후기 등록'}
      </Button>
    </form>
  )
}

function describeReviewError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'REVIEW_ALREADY_EXISTS') return '이미 이 만남에 후기를 남겼습니다.'
    return e.message
  }
  if (e instanceof NetworkError) return e.message
  return '후기를 등록하지 못했습니다.'
}

/** 상대가 알려준 코드를 검증한다. 검증까지만 하고 확정은 발급자의 confirm 이 한다 —
 * 성공 뒤에는 상위 폴링(WAITING_COUNTERPART/CODE_REQUIRED)이 확정을 잡아낸다. */
function VerifyCodePanel({ cardId, onBack }: { cardId: number; onBack: () => void }) {
  const [code, setCode] = useState('')

  const verify = useMutation({
    mutationFn: () => verifyConfirmationCode(cardId, code),
  })

  if (verify.isSuccess) {
    return (
      <PanelShell tone="waiting">
        <div className="flex items-center gap-2 font-semibold">
          <Spinner size={18} className="animate-spin" />
          상대방의 최종 확인을 기다리고 있습니다
        </div>
        <p className="mt-1 text-[14px] text-muted-foreground">
          자동으로 확인되면 화면이 바뀝니다. 잠시 기다려 주세요.
        </p>
      </PanelShell>
    )
  }

  return (
    <PanelShell tone="waiting">
      <div className="flex items-center gap-2 font-semibold">
        <MapPin size={20} />
        상대방이 알려준 코드를 입력하세요
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          verify.mutate()
        }}
      >
        <input
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="0000"
          className={`${inputClass(verify.isError)} text-center text-[20px] tracking-[0.3em]`}
        />
        <Button type="submit" disabled={code.length !== 4 || verify.isPending}>
          {verify.isPending ? <Spinner size={18} className="animate-spin" /> : '확인'}
        </Button>
      </form>
      <Button variant="secondary" className="mt-2" onClick={onBack} disabled={verify.isPending}>
        뒤로
      </Button>
      {verify.isError && (
        <p className="mt-3 text-[14px] text-destructive">{describeCodeError(verify.error)}</p>
      )}
    </PanelShell>
  )
}

/**
 * 네트워크 오류·5xx·"상대 검증 대기"는 계속 폴링한다. 그 외 4xx(만료·초과확정
 * 등)만 폴링을 멈추고 에러로 보여준다.
 *
 * "상대 검증 대기"의 실제 코드는 `MEETING_CODE_VERIFIER_REQUIRED` 다
 * (`MeetingConfirmationCode.confirmByIssuer()`가 `verifierConfirmedAt == null`
 * 일 때 던진다). `MEETING_CODE_REQUIRED`는 이름이 비슷하지만 GPS 제출
 * 쪽(#148, LOW_ACCURACY → 코드 방식 전환) 코드라 여기서 오지 않는다 — 코드를
 * 혼동하면 상대가 검증하기 전에 폴링이 멈추고 "다시 발급"으로 잘못 안내한다.
 */
function isConfirmPollWaiting(e: unknown): boolean {
  if (e instanceof NetworkError) return true
  if (e instanceof ApiError) return e.status >= 500 || e.code === 'MEETING_CODE_VERIFIER_REQUIRED'
  return false
}

function describeCodeError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'MEETING_CODE_MISMATCH':
        return '코드가 일치하지 않습니다. 다시 확인해 주세요.'
      case 'MEETING_CODE_EXPIRED':
        return '코드가 만료됐습니다. 상대방에게 새로 발급해달라고 요청하세요.'
      case 'MEETING_CODE_ATTEMPTS_EXCEEDED':
        return '입력 가능 횟수를 초과했습니다.'
      case 'MEETING_CODE_ISSUER_FORBIDDEN':
        return '내가 발급한 코드는 직접 입력할 수 없습니다.'
      case 'MEETING_CODE_REISSUE_FORBIDDEN':
        return '상대방이 이미 확인한 코드는 다시 발급할 수 없습니다.'
      case 'MEETING_CODE_REISSUE_ISSUER_FORBIDDEN':
        return '이 약속의 코드는 처음 발급한 사람만 다시 발급할 수 있습니다.'
      case 'MEETING_CODE_NOT_AVAILABLE':
        return '발급 가능한 코드가 없습니다.'
      case 'MEETING_ALREADY_CONFIRMED':
        return '이미 만남이 확인됐습니다.'
      default:
        return e.message
    }
  }
  if (e instanceof NetworkError) return e.message
  return '처리하지 못했습니다. 다시 시도해 주세요.'
}
