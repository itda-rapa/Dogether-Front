import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dog, MagnifyingGlass, SealCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { inputClass } from '@/components/ui/input-class'
import { cn } from '@/lib/cn'
import { useAuth } from '@/features/auth/auth-context'
import { searchPetByPublicTag } from '@/features/pet/api'
import { sendFriendRequest } from '@/features/friend/api'
import type { PetSearchItem } from '@/features/chat/types'

/**
 * 친구 추가.
 *
 * 계약상 진입점은 공개 태그(`몽이#A7K2`) 검색이다.
 * 차단 관계와 자기 소유 펫은 서버가 결과에서 제외한다.
 */
export function FriendSearchPage() {
  const { me } = useAuth()
  const petId = me?.activePetId ?? null

  const [query, setQuery] = useState('')
  const [relationship, setRelationship] = useState<
    PetSearchItem['relationship'] | null
  >(null)
  const queryClient = useQueryClient()

  const search = useMutation({
    mutationFn: (tag: string) => searchPetByPublicTag(tag),
    onSuccess: () => setRelationship(null),
  })

  const request = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: (res) => {
      setRelationship(res.status === 'ACCEPTED' ? 'FRIEND' : 'REQUEST_SENT')
      void queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })

  const pet = search.data ?? null
  const currentRelationship = relationship ?? pet?.relationship ?? null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me/friends" label="친구" />
      <h1 className="mt-4 text-2xl font-bold">친구 추가</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        상대의 공개 태그를 정확히 입력해 주세요. 예: 봉이#B3X9
      </p>

      {petId === null ? (
        <div className="mt-6">
          <EmptyState
            title="대표 강아지를 먼저 지정해 주세요"
            description="친구는 강아지 단위로 맺어집니다."
          />
        </div>
      ) : (
        <>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const tag = query.trim()
              if (tag === '') return
              search.mutate(tag)
            }}
          >
            <div className="relative flex-1">
              <MagnifyingGlass
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <label htmlFor="tag-search" className="sr-only">
                공개 태그
              </label>
              <input
                id="tag-search"
                type="search"
                placeholder="봉이#B3X9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={30}
                className={cn(inputClass(false), 'pl-11')}
              />
            </div>
            <button
              type="submit"
              disabled={query.trim() === '' || search.isPending}
              className="min-h-11 shrink-0 rounded-lg bg-primary px-5 font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {search.isPending ? '검색 중…' : '검색'}
            </button>
          </form>

          {search.isError && (
            <div className="mt-6">
              <ApiErrorNotice
                error={search.error}
                title="검색하지 못했습니다"
                onRetry={() => search.mutate(query.trim())}
              />
            </div>
          )}

          {search.isSuccess && (
            <div className="mt-6">
              {pet ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                  <div
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
                  >
                    <Dog size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{pet.nickname}</span>
                      {pet.verified && (
                        <SealCheck
                          size={15}
                          weight="fill"
                          className="shrink-0 text-primary-strong"
                          aria-label="인증된 펫"
                        />
                      )}
                    </p>
                    <p className="truncate text-[14px] text-muted-foreground">
                      {pet.publicTag}
                    </p>
                  </div>
                  <RequestAction
                    relationship={currentRelationship}
                    pending={request.isPending}
                    onRequest={() => request.mutate(pet.petId)}
                  />
                </div>
              ) : (
                <EmptyState
                  title="검색 결과가 없습니다"
                  description="공개 태그는 닉네임과 #뒤 4자리로 이루어집니다."
                />
              )}
              {request.isError && (
                <p role="alert" className="mt-3 text-[14px] text-destructive">
                  친구 요청을 보내지 못했습니다.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RequestAction({
  relationship,
  pending,
  onRequest,
}: {
  relationship: PetSearchItem['relationship']
  pending: boolean
  onRequest: () => void
}) {
  if (relationship === 'FRIEND') {
    return (
      <span className="shrink-0 rounded-full bg-muted px-4 py-2 text-[13px] font-medium text-muted-foreground">
        이미 친구
      </span>
    )
  }
  if (relationship === 'REQUEST_SENT') {
    return (
      <span className="shrink-0 rounded-full bg-muted px-4 py-2 text-[13px] font-medium text-muted-foreground">
        요청 보냄
      </span>
    )
  }
  if (relationship === 'REQUEST_RECEIVED') {
    return (
      <Link
        to="/me/friends"
        className="shrink-0 rounded-lg border border-border px-4 py-2 text-[13px] font-semibold text-primary-strong transition-colors hover:bg-primary-subtle"
      >
        받은 요청 확인
      </Link>
    )
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onRequest}
      className="min-h-11 shrink-0 rounded-lg bg-primary px-4 font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
    >
      {pending ? '요청 중…' : '친구 요청'}
    </button>
  )
}
