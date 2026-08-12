import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DotsThree, Prohibit, Flag, EyeSlash, X } from '@phosphor-icons/react'
import { createBlock, createReport, createSetlogReport } from '@/features/moderation/api'
import { REPORT_REASONS, type ReportReason } from '@/features/moderation/types'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * 셋로그 신고는 백엔드 협의가 끝날 때까지 숨겨둔다.
 * 협의되면 여기만 true 로 바꾸면 된다 — 메뉴·시트 배선은 이미 돼 있다.
 */
const SETLOG_REPORT_ENABLED = false

type Props = {
  /**
   * 신고 대상 방. M1 의 신고는 **DIRECT 방 단위로만** 접수되므로
   * 채팅방 화면에서만 넘긴다. 없으면 신고 항목이 뜨지 않는다.
   */
  roomId?: number
  /**
   * 신고 대상 셋로그. 계약이 아직 없어 `SETLOG_REPORT_ENABLED` 가 꺼져
   * 있는 동안은 넘겨도 메뉴에 나타나지 않는다.
   */
  setlogId?: number
  /** 차단 대상 펫. 없으면 차단 항목을 숨긴다. */
  targetPetId?: number
  /**
   * "이 영상만 내 피드에서 숨기기". 차단/신고와 달리 작성자·서버에 영향이
   * 없는 로컬 전용 동작이라, 실제 처리는 호출부가 한다. 없으면 항목을 숨긴다.
   */
  onHide?: () => void
  targetName: string
  /**
   * 드롭다운이 버튼 아래로 열리면 카드처럼 overflow-hidden 인 조상 안에서
   * 잘려 보일 수 있는 위치(카드 맨 아래줄 등)에서 'up' 을 준다.
   */
  dropdownDirection?: 'down' | 'up'
}

/**
 * 차단·신고 메뉴.
 *
 * 차단은 되돌릴 수 없고(M1 에 해제 API 가 없다) 신고는 방 단위라 대상이 서로
 * 다르다. 그래서 둘을 각각 독립적으로 노출한다.
 */
export function ModerationMenu({
  roomId,
  setlogId,
  targetPetId,
  onHide,
  targetName,
  dropdownDirection = 'down',
}: Props) {
  const canReport = roomId != null || (SETLOG_REPORT_ENABLED && setlogId != null)
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState<'report' | 'block' | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`${targetName} 메뉴`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-primary-subtle"
      >
        <DotsThree size={22} weight="bold" />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-30 w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-md',
            dropdownDirection === 'up' ? 'bottom-12' : 'top-12',
          )}
        >
          {/* 신고는 방 단위(+ 숨김 처리된 셋로그 단위)만 지원한다. */}
          {canReport && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setSheet('report')
              }}
              className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-primary-subtle"
            >
              <Flag size={18} />
              신고하기
            </button>
          )}

          {targetPetId != null && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setSheet('block')
              }}
              className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left text-destructive transition-colors first:border-t-0 hover:bg-primary-subtle [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border"
            >
              <Prohibit size={18} />
              차단하기
            </button>
          )}

          {/* 작성자·서버에 영향 없는 로컬 전용 동작. 확인 시트 없이 바로 처리한다. */}
          {onHide && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onHide()
              }}
              className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-primary-subtle [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border"
            >
              <EyeSlash size={18} />
              숨기기
            </button>
          )}
        </div>
      )}

      {sheet === 'report' && canReport && (
        <ReportSheet
          roomId={roomId}
          setlogId={SETLOG_REPORT_ENABLED ? setlogId : undefined}
          targetName={targetName}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'block' && targetPetId != null && (
        <BlockSheet
          targetPetId={targetPetId}
          targetName={targetName}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  // 뒤로가기·ESC 로 닫히게 한다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      {/* 배경 흐림은 "눌러서 닫힘"을 알리는 용도다. 장식이 아니다. */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <h2 className="flex-1 text-lg font-bold">{title}</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-lg transition-colors hover:bg-primary-subtle"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ReportSheet({
  roomId,
  setlogId,
  targetName,
  onClose,
}: {
  roomId?: number
  setlogId?: number
  targetName: string
  onClose: () => void
}) {
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [detail, setDetail] = useState('')

  const submit = useMutation({
    mutationFn: () => {
      const reasonCode = reason as ReportReason
      const trimmedDetail = detail.trim() || undefined
      // roomId 가 있으면 방 신고, 없으면(숨김 기능) 셋로그 신고.
      return roomId != null
        ? createReport({ roomId, reasonCode, detail: trimmedDetail })
        : createSetlogReport({ setlogId: setlogId!, reasonCode, detail: trimmedDetail })
    },
    onSuccess: onClose,
  })

  return (
    <Sheet title={`${targetName} 신고`} onClose={onClose}>
      {/* 신고 단위가 대화방/영상 전체라는 걸 분명히 알린다. */}
      <p className="mb-3 text-[14px] text-muted-foreground">
        {roomId != null
          ? '이 대화방 전체가 관리자에게 전달됩니다.'
          : '이 영상이 관리자에게 전달됩니다.'}
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">신고 사유</legend>
        {REPORT_REASONS.map((r) => (
          <label
            key={r.value}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
              reason === r.value
                ? 'border-primary bg-primary-subtle'
                : 'border-border hover:bg-primary-subtle',
            )}
          >
            <input
              type="radio"
              name="reason"
              value={r.value}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="size-4 accent-[var(--dg-primary)]"
            />
            {r.label}
          </label>
        ))}
      </fieldset>

      <label htmlFor="report-detail" className="mt-4 block font-medium">
        상세 내용 (선택)
      </label>
      <textarea
        id="report-detail"
        rows={3}
        maxLength={500}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        className={cn(inputClass(false), 'mt-1.5 resize-y py-3')}
      />

      {submit.isError && (
        <p role="alert" className="mt-3 text-[14px] text-destructive">
          {submit.error instanceof ApiError
            ? submit.error.message
            : '신고를 접수하지 못했습니다. 네트워크 연결을 확인해 주세요.'}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <Button
          onClick={() => submit.mutate()}
          disabled={reason === '' || submit.isPending}
        >
          {submit.isPending ? '접수 중…' : '신고'}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          취소
        </Button>
      </div>
    </Sheet>
  )
}

function BlockSheet({
  targetPetId,
  targetName,
  onClose,
}: {
  targetPetId: number
  targetName: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const submit = useMutation({
    mutationFn: () => createBlock(targetPetId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me', 'blocks'] }),
        queryClient.invalidateQueries({ queryKey: ['setlogs'] }),
        queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] }),
        queryClient.invalidateQueries({ queryKey: ['chat', 'room'] }),
      ])
      onClose()
    },
  })

  return (
    <Sheet title={`${targetName} 차단`} onClose={onClose}>
      <p className="leading-relaxed">
        차단하면 서로의 게시물과 프로필이 보이지 않고, 대화도 할 수 없습니다.
      </p>
      <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-[14px] text-muted-foreground">
        <li>이미 맺은 친구 관계가 삭제됩니다</li>
        <li>주고받은 친구 요청이 모두 취소됩니다</li>
        <li>차단은 상대 계정 전체에 적용됩니다</li>
      </ul>

      {/* 계약에 해제 API 가 없다. 사용자에게 미리 알려야 한다. */}
      <p className="mt-3 text-[14px] font-medium text-destructive">
        현재 차단은 앱에서 해제할 수 없습니다.
      </p>

      {submit.isError && (
        <p role="alert" className="mt-3 text-[14px] text-destructive">
          {submit.error instanceof ApiError
            ? submit.error.message
            : '차단하지 못했습니다. 네트워크 연결을 확인해 주세요.'}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <Button
          onClick={() => submit.mutate()}
          disabled={submit.isPending}
          className="bg-destructive hover:bg-destructive"
        >
          {submit.isPending ? '차단 중…' : '차단하기'}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          취소
        </Button>
      </div>
    </Sheet>
  )
}
