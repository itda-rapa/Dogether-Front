import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Dog, HandHeart, SealCheck, UserPlus } from '@phosphor-icons/react'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { BackLink } from '@/components/ui/BackLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { sendFriendRequest } from '@/features/friend/api'
import { getPetPublicProfile } from '@/features/pet/api'
import { SEX_LABEL, SIZE_LABEL, ageFrom, type PetPublicProfile } from '@/features/pet/types'
import { ApiError } from '@/lib/api'

/** 남의 펫 프로필. 홈 피드·게시판·채팅에서 작성자를 눌러 들어온다. */
export function PetProfilePage() {
  const { petId = '' } = useParams()
  const id = Number(petId)
  const valid = Number.isSafeInteger(id) && id > 0

  const profile = useQuery({
    queryKey: ['pet-public-profile', id],
    queryFn: () => getPetPublicProfile(id),
    enabled: valid,
    retry: false,
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/" label="홈" />

      {!valid && (
        <div className="mt-6">
          <EmptyState title="존재하지 않는 펫입니다" />
        </div>
      )}

      {valid && profile.isPending && (
        <p className="mt-6 text-muted-foreground">불러오는 중…</p>
      )}

      {valid && profile.isError && (
        <div className="mt-6">
          <ApiErrorNotice
            error={profile.error}
            title="프로필을 불러오지 못했습니다"
            onRetry={() => void profile.refetch()}
          />
        </div>
      )}

      {profile.data && <Profile pet={profile.data} key={petId} />}
    </div>
  )
}

function Profile({ pet }: { pet: PetPublicProfile }) {
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

  const age = ageFrom(pet.birthDate)

  return (
    <>
      <div className="mt-4 flex items-center gap-4">
        {pet.profileUrl ? (
          <img
            src={pet.profileUrl}
            alt=""
            className="size-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="grid size-20 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
          >
            <Dog size={40} />
          </div>
        )}
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
          <p className="mt-1 text-[14px] text-muted-foreground">{pet.publicTag}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-[14px] sm:grid-cols-3">
        {pet.breedName && <Field label="품종" value={pet.breedName} />}
        {pet.sizeCode && <Field label="크기" value={SIZE_LABEL[pet.sizeCode]} />}
        {pet.sex && <Field label="성별" value={SEX_LABEL[pet.sex]} />}
        {age !== null && <Field label="나이" value={`${age}살`} />}
      </dl>

      {pet.personalityTags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {pet.personalityTags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-primary-subtle px-3 py-1 text-[13px] font-medium text-primary-strong"
            >
              #{tag}
            </li>
          ))}
        </ul>
      )}

      {pet.bio && <p className="mt-4 whitespace-pre-wrap text-[14px]">{pet.bio}</p>}

      <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <HandHeart size={16} />
        도움이 됐어요 {pet.helpfulReceivedCount}회
      </p>

      {relationship !== null && (
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

          <p className="mt-4 text-[13px] text-muted-foreground">
            친구는 양방향 동의입니다. 요청을 보낸 뒤 상대가 수락해야 연결됩니다.
          </p>
        </div>
      )}
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function toRequestMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return '친구 요청을 보내지 못했습니다.'
  if (e.status === 409) return '이미 친구이거나 대기 중인 요청이 있습니다.'
  if (e.status === 404) return '존재하지 않거나 삭제된 펫입니다.'
  if (e.status === 403) return '대표 강아지를 지정해야 친구 요청을 보낼 수 있습니다.'
  return '친구 요청을 보내지 못했습니다.'
}
