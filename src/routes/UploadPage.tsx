import { useState } from 'react'
import { FilmSlate, UploadSimple } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import { NotConnected } from '@/components/ui/NotConnected'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { cn } from '@/lib/cn'

/** 기획: 30초 영상을 불러와 3~5초 구간만 잘라 올린다. */
const MIN_SEC = 3
const MAX_SEC = 5

export function UploadPage() {
  const [start, setStart] = useState(0)
  const [caption, setCaption] = useState('')
  const duration = 30

  const end = Math.min(start + MAX_SEC, duration)

  return (
    <Page
      title="셋로그 추가"
      description={`영상을 불러와 ${MIN_SEC}~${MAX_SEC}초 구간으로 잘라 올립니다`}
    >
      {/*
        M1 범위 주의: 셋로그 업로드는 시드 콘텐츠를 넣는 관리자만 가능하다.
        일반 사용자 업로드는 M2 다. 이 화면은 M2 대비 껍데기다.
      */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <p className="font-semibold">M2 기능입니다</p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          M1 에서는 관리자만 셋로그를 업로드합니다. 일반 사용자 업로드는 M2
          범위입니다.
        </p>
      </div>

      <div
        role="img"
        aria-label="영상 미리보기 영역"
        className="mb-4 grid aspect-[4/5] w-full place-items-center rounded-xl border border-border bg-muted text-muted-foreground"
      >
        <FilmSlate size={36} />
      </div>

      <Button variant="secondary" className="mb-6 w-full">
        <UploadSimple size={20} />
        영상 불러오기
      </Button>

      <section className="mb-6">
        <h2 className="mb-1 font-medium">구간 선택</h2>
        <p className="mb-3 text-[13px] text-muted-foreground">
          시작 지점을 옮기면 {MAX_SEC}초 구간이 잡힙니다.
        </p>

        <label htmlFor="trim-start" className="sr-only">
          시작 지점
        </label>
        <input
          id="trim-start"
          type="range"
          min={0}
          max={Math.max(duration - MIN_SEC, 0)}
          step={0.5}
          value={start}
          onChange={(e) => setStart(Number(e.target.value))}
          className="w-full accent-[var(--dg-primary)]"
        />

        <div className="mt-2 flex justify-between text-[13px] tabular-nums text-muted-foreground">
          <span>{start.toFixed(1)}초</span>
          <span className="font-medium text-primary">
            {(end - start).toFixed(1)}초 선택됨
          </span>
          <span>{duration}초</span>
        </div>
      </section>

      <div className="mb-6">
        <Field label="설명" hint="셋로그처럼 짧은 텍스트를 넣을 수 있습니다">
          {({ id, describedBy }) => (
            <textarea
              id={id}
              rows={3}
              maxLength={200}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              aria-describedby={describedBy}
              className={cn(inputClass(false), 'resize-y py-3')}
            />
          )}
        </Field>
      </div>

      <NotConnected
        endpoint="POST /media/uploads · POST /media/{id}/complete · POST /setlogs"
        note="브라우저에서 구간을 자르려면 WebCodecs 또는 ffmpeg.wasm 이 필요합니다. 클라이언트 편집 가능 여부가 아직 확인되지 않았습니다 — 서버에서 자르는 방식도 검토 대상입니다."
      />

      <div className="mt-6 flex gap-3">
        <Button disabled>업로드</Button>
        <Button variant="secondary" disabled>
          취소
        </Button>
      </div>
    </Page>
  )
}
