import { Link } from 'react-router'
import { FirstAidKit, X } from '@phosphor-icons/react'
import type { PlaceKeyword } from './placeSuggestion'
import { placeTypeFromKeyword } from './placeSuggestion'

/**
 * 방금 내가 보낸 메시지에서 병원/약국 키워드가 잡혔을 때만 뜬다.
 * 키워드를 말한 사람에게만 보여야 하므로, 부르는 쪽(ChatRoomPage)에서
 * "내가 보낸 최신 메시지"인지 이미 확인한 뒤 렌더한다.
 */
export function PlaceSuggestionPopup({
  keyword,
  onDismiss,
}: {
  keyword: PlaceKeyword
  onDismiss: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-t border-border bg-primary-subtle px-3 py-2">
      <FirstAidKit
        size={18}
        weight="fill"
        className="shrink-0 text-primary-strong"
        aria-hidden
      />
      <p className="min-w-0 flex-1 truncate text-[14px] font-medium">
        {keyword}을(를) 찾으시나요?
      </p>
      <Link
        to={`/map?type=${placeTypeFromKeyword(keyword)}&intent=locate`}
        onClick={onDismiss}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-primary px-4 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-hover"
      >
        지도에서 보기
      </Link>
      <button
        type="button"
        aria-label="닫기"
        onClick={onDismiss}
        className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-subtle"
      >
        <X size={16} />
      </button>
    </div>
  )
}
