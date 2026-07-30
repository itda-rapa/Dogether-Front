import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, SealCheck, Dog } from '@phosphor-icons/react'
import { getPet } from '@/features/pet/api'
import {
  SEX_LABEL,
  SIZE_LABEL,
  ageFrom,
  type Pet,
} from '@/features/pet/types'
import { ApiError } from '@/lib/api'

export function PetDetailPage() {
  const { petId = '' } = useParams()

  const pet = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPet(Number(petId)),
    enabled: Number.isFinite(Number(petId)),
    retry: false,
  })

  const notFound = pet.error instanceof ApiError && pet.error.status === 404

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link
        to="/me"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-muted-foreground"
      >
        <ArrowLeft size={20} />
        마이 페이지
      </Link>

      {pet.isPending && <p className="text-muted-foreground">불러오는 중…</p>}

      {pet.isError && (
        <p role="alert" className="text-destructive">
          {notFound
            ? '존재하지 않거나 삭제된 펫입니다.'
            : '펫 정보를 불러오지 못했습니다.'}
        </p>
      )}

      {pet.data && <PetDetail pet={pet.data} />}
    </div>
  )
}

/*
  펫 수정·삭제 화면은 두지 않는다.
  PATCH /pets/{petId} 와 DELETE /pets/{petId} 가 M1 계약에 없다.
*/

function PetDetail({ pet }: { pet: Pet }) {
  const age = ageFrom(pet.birthDate)

  // M1 사용자 등록 Pet 은 profileUrl 이 항상 null 이라 기본 이미지를 쓴다.
  return (
    <>
      <div className="flex items-center gap-4">
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

      {pet.bio && <p className="mt-4">{pet.bio}</p>}

      {pet.personalityTags && pet.personalityTags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {pet.personalityTags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-primary-subtle px-3 py-1 text-[14px] font-medium text-primary-strong"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold">기본 정보</h2>
      <dl className="overflow-hidden rounded-xl border border-border bg-surface">
        <Row term="품종" value={pet.breedName} />
        <Row term="생일" value={pet.birthDate} />
        <Row term="나이" value={age !== null ? `${age}살` : null} />
        <Row term="성별" value={pet.sex ? SEX_LABEL[pet.sex] : null} />
        <Row
          term="중성화"
          value={pet.neutered === null ? null : pet.neutered ? '완료' : '안 함'}
        />
        <Row term="몸무게" value={pet.weightKg ? `${pet.weightKg}kg` : null} />
        <Row term="크기" value={pet.sizeCode ? SIZE_LABEL[pet.sizeCode] : null} />
      </dl>

      {pet.careNote && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-bold">특별 관리 사항</h2>
          <p className="rounded-xl border border-border bg-surface p-4">
            {pet.careNote}
          </p>
        </>
      )}
    </>
  )
}

/** 값이 없는 항목도 숨기지 않고 "미입력"으로 보여준다 — 뭘 채워야 하는지 알 수 있게. */
function Row({ term, value }: { term: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{term}</dt>
      <dd className={value ? 'min-w-0 truncate' : 'text-muted-foreground'}>
        {value ?? '미입력'}
      </dd>
    </div>
  )
}
