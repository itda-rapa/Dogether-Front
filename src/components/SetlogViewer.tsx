import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Heart, Smiley, HandWaving, X, SealCheck } from '@phosphor-icons/react'
import { ModerationMenu } from '@/components/ModerationMenu'
import { useSetlogActions } from '@/features/setlog/useSetlogActions'
import { REACTION_LABEL, type ReactionType, type Setlog } from '@/features/setlog/types'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

/**
 * 전체화면 세로 뷰어 (쇼츠·릴스 방식).
 *
 * 함정이 많아 정리해 둔다.
 * - 스냅: `scroll-snap-type: y mandatory` 로 한 영상씩 멈춘다.
 * - 재생: IntersectionObserver 로 보이는 것만 재생하고 나머지는 정지시킨다.
 *   10개가 넘어가면 전부 디코딩하다 메모리로 버벅인다.
 * - preload: 화면 밖은 `none`. 보이는 것만 `auto` 로 올린다.
 * - 자동재생은 `muted` 없으면 브라우저가 막는다.
 * - 뒤로가기로 닫는다. history 를 push 해 두지 않으면 앱이 통째로 닫힌다.
 * - 우측 레일이 영상 위에 겹치므로 흰 아이콘 + drop-shadow 가 필수다.
 * - 하단은 safe-area 를 띄운다. 홈 인디케이터에 버튼이 가린다.
 */
export function SetlogViewer({
  items,
  startIndex,
  onChangeItem,
  onHideItem,
  onClose,
}: {
  items: Setlog[]
  startIndex: number
  onChangeItem: (next: Setlog) => void
  onHideItem: (setlogId: number) => void
  onClose: () => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  /*
    뒤로가기로 닫기. push 해 둔 항목이 pop 될 때가 닫는 시점이다.
    StrictMode 는 effect 를 두 번 실행하므로 그냥 push 하면 항목이 두 개 쌓이고,
    뒤로가기를 두 번 눌러야 닫히게 된다. 이미 우리 항목이면 push 하지 않는다.
  */
  useEffect(() => {
    if (!window.history.state?.setlogViewer) {
      window.history.pushState({ setlogViewer: true }, '')
    }
    const onPop = () => onClose()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [onClose])

  // 열려 있는 동안 뒤 배경이 스크롤되지 않게 한다.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // 시작 위치로 즉시 이동. smooth 를 쓰면 열자마자 스크롤이 보인다.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.clientHeight * startIndex
  }, [startIndex])

  const close = () => {
    // 우리가 push 한 항목을 되돌린다. popstate 핸들러가 onClose 를 부른다.
    if (window.history.state?.setlogViewer) window.history.back()
    else onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="셋로그 전체화면"
    >
      <button
        type="button"
        onClick={close}
        aria-label="닫기"
        className="absolute left-3 top-3 z-10 grid size-11 place-items-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition-colors hover:bg-white/15"
        style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <X size={26} weight="bold" />
      </button>

      <div
        ref={scrollerRef}
        className={cn(
          'h-full w-full overflow-y-auto overscroll-contain',
          // reduced-motion 에서는 스냅을 끈다. 강제 스크롤이 불편할 수 있다.
          reduced ? '' : 'snap-y snap-mandatory',
        )}
      >
        {items.map((s) => (
          <ViewerItem
            key={s.setlogId}
            setlog={s}
            onChange={onChangeItem}
            onHide={() => onHideItem(s.setlogId)}
            reduced={reduced}
          />
        ))}
      </div>
    </div>
  )
}

function ViewerItem({
  setlog,
  onChange,
  onHide,
  reduced,
}: {
  setlog: Setlog
  onChange: (next: Setlog) => void
  onHide: () => void
  reduced: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { interactive, toggle, greet, greetError } = useSetlogActions(
    setlog,
    onChange,
  )

  // 보이는 것만 재생하고 나머지는 정지 + preload 해제.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          v.preload = 'auto'
          if (!reduced) void v.play().catch(() => {})
        } else {
          v.pause()
          v.preload = 'none'
        }
      },
      { threshold: 0.6 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [reduced])

  return (
    <section className="relative h-full w-full snap-start snap-always">
      <video
        ref={videoRef}
        src={setlog.mediaUrl}
        // muted 가 없으면 자동재생이 차단된다.
        muted
        loop
        playsInline
        preload="none"
        onClick={(e) => {
          const v = e.currentTarget
          if (v.paused) void v.play().catch(() => {})
          else v.pause()
        }}
        className="size-full object-contain"
      />

      {/*
        우측 세로 액션 레일. 세로로 쌓으므로 CUTE·LIKE 를 둘 다 둘 수 있다.
        z-10 이 없으면 아래 캡션 박스(뒤에 나오는 형제 요소라 기본 스택 순서가 더
        위)가 레일 하단(...메뉴 버튼)과 겹쳐 클릭을 가로챈다. 캡션이 길어질수록
        더 위쪽 버튼까지 먹힐 수 있으니 반드시 레일을 위에 둔다.
      */}
      <div
        className="absolute bottom-0 right-2 z-10 flex flex-col items-center gap-5 pb-6"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <RailReaction
          type="CUTE"
          active={setlog.myReactions.includes('CUTE')}
          count={setlog.cuteCount}
          disabled={!interactive}
          onClick={() => toggle('CUTE')}
        />
        <RailReaction
          type="LIKE"
          active={setlog.myReactions.includes('LIKE')}
          count={setlog.likeCount}
          disabled={!interactive}
          onClick={() => toggle('LIKE')}
        />

        <button
          type="button"
          onClick={() => greet.mutate()}
          disabled={!interactive || greet.isPending}
          className="flex flex-col items-center gap-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] disabled:opacity-40"
        >
          <HandWaving size={30} weight="fill" />
          <span className="text-[12px] font-medium">
            {greet.isPending ? '보내는 중' : '인사'}
          </span>
        </button>

        <div className="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          <ModerationMenu
            setlogId={setlog.setlogId}
            targetPetId={setlog.authorPet.petId}
            onHide={onHide}
            targetName={setlog.authorPet.nickname}
            dropdownDirection="up"
          />
        </div>
      </div>

      {/* 캡션·작성자는 좌하단. 레일과 겹치지 않게 우측을 비워 둔다. */}
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pr-20"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <Link
          to={`/pets/${setlog.authorPet.petId}`}
          state={{ pet: setlog.authorPet }}
          className="inline-flex items-center gap-1.5 font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
        >
          {setlog.authorPet.nickname}
          {setlog.authorPet.verified && (
            <SealCheck size={15} weight="fill" aria-label="인증된 펫" />
          )}
          <span className="text-[13px] font-normal text-white/70">
            {setlog.authorPet.publicTag}
          </span>
        </Link>
        {setlog.caption && (
          <p className="mt-1.5 text-[15px] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {setlog.caption}
          </p>
        )}
        {greetError && (
          <p role="alert" className="mt-2 text-[14px] text-white">
            {greetError}
          </p>
        )}
      </div>
    </section>
  )
}

function RailReaction({
  type,
  active,
  count,
  disabled,
  onClick,
}: {
  type: ReactionType
  active: boolean
  count: number
  disabled: boolean
  onClick: () => void
}) {
  const Icon = type === 'CUTE' ? Smiley : Heart
  const label = REACTION_LABEL[type]

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `${label} 취소` : label}
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center gap-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] disabled:opacity-40"
    >
      {/* 색만으로 상태를 알리지 않는다. 외곽선↔채움 형태도 함께 바뀐다. */}
      <Icon
        size={30}
        weight={active ? 'fill' : 'regular'}
        className={cn('transition-colors', active ? 'text-like' : 'text-white')}
      />
      <span className="text-[12px] font-medium tabular-nums text-white">
        {count}
      </span>
    </button>
  )
}
