import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Dog, SealCheck, UserPlus } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { sendFriendRequest } from '@/features/friend/api'
import { listSetlogs } from '@/features/setlog/api'
import type { PetSearchItem } from '@/features/chat/types'
import { ApiError } from '@/lib/api'

/**
 * 남의 펫 프로필. 홈 피드에서 작성자를 눌러 들어온다.
 *
 * 백엔드 `GET /pets/{petId}` 는 `myPetQueryService.getMyPet` 이라 내 펫만 준다.
 * 공개 펫 조회 API 가 없으므로 두 경로로 펫을 얻는다.
 *   1) 홈에서 들어온 경우 — router state 로 받은 authorPet (요청 0건)
 *   2) 새로고침·URL 직접 입력 — 셋로그 목록에서 petId 로 찾는다.
 *      GET /setlogs 응답의 authorPet 이 프로필과 같은 모양이라 그대로 쓸 수 있다.
 */
export function PetProfilePage() {
  const { petId = '' } = useParams()
  const location = useLocation()
  const fromState = (location.state as { pet?: PetSearchItem } | null)?.pet ?? null

  const id = Number(petId)
  const setlogs = useQuery({
    queryKey: ['setlogs'],
    queryFn: listSetlogs,
    // state 로 받았으면 굳이 부르지 않는다.
    enabled: fromState === null && Number.isFinite(id),
    retry: false,
    staleTime: 60_000,
  })

  const found =
    setlogs.data?.find((s) => s.authorPet.petId === id)?.authorPet ?? null
  const pet = fromState ?? found

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/" label="홈" />

      {pet === null && setlogs.isPending && (
        <p className="mt-6 text-muted-foreground">불러오는 중…</p>
      )}

      {pet === null && !setlogs.isPending && (
        <div className="mt-6">
          <EmptyState
            title="프로필을 불러올 수 없습니다"
            description="이 강아지의 셋로그가 피드에 없습니다. 공개 펫 조회 API 가 열리면 바로 조회됩니다."
          />
        </div>
      )}

      {pet !== null && <Profile pet={pet} key={petId} />}
    </div>
  )
}

function Profile({ pet }: { pet: PetSearchItem }) {
  // 서버가 준 relationship 이 시작값이고, 요청을 보내면 낙관적으로 올린다.
  const [relationship, setRelationship] = useState(pet.relationship)
  const [error, setError] = useState<string | null>(null)

  const request = useMutation({
    mutationFn: () => sendFriendRequest(pet.petId),
    onSuccess: () => {
      setRelationship('REQUEST_SENT')
      setError(null)
    },
    onError: (e) => setError(toRequestMessage(e)),
  })

  return (
    <>
      <div className="mt-4 flex items-center gap-4">
        <div
          aria-hidden
          className="grid size-20 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <Dog size={40} />
        </div>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <span className="truncate">{pet.nickname}</span>
            {pet.verified && (
              <SealCheck
                size={22}
                weight="fill"
                className="shrink-0 text-primary-strong"
                aria-label="인증된 펫"
              />
            )}
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {pet.publicTag}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {relationship === 'FRIEND' ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-center font-medium text-muted-foreground">
            이미 친구입니다
          </p>
        ) : relationship === 'REQUEST_SENT' ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-center font-medium text-muted-foreground">
            친구 요청을 보냈습니다. 상대가 수락하면 연결됩니다.
          </p>
        ) : relationship === 'REQUEST_RECEIVED' ? (
          <Link
            to="/me/friends"
            className="flex min-h-12 w-full items-center justify-center rounded-lg bg-primary font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            받은 요청에서 수락하기
          </Link>
        ) : (
          <button
            type="button"
            disabled={request.isPending}
            onClick={() => request.mutate()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <UserPlus size={20} weight="bold" />
            {request.isPending ? '보내는 중…' : '친구 요청'}
          </button>
        )}

        {error && (
          <p role="alert" className="mt-3 text-[14px] text-destructive">
            {error}
          </p>
        )}
      </div>

      <p className="mt-4 text-[13px] text-muted-foreground">
        친구는 양방향 동의입니다. 요청을 보낸 뒤 상대가 수락해야 연결됩니다.
      </p>
    </>
  )
}

function toRequestMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return '친구 요청을 보내지 못했습니다.'
  if (e.status === 409) return '이미 친구이거나 대기 중인 요청이 있습니다.'
  if (e.status === 404) return '존재하지 않거나 삭제된 펫입니다.'
  if (e.status === 403) return '대표 강아지를 지정해야 친구 요청을 보낼 수 있습니다.'
  return '친구 요청을 보내지 못했습니다.'
}
