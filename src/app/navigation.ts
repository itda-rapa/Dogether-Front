import {
  House,
  Article,
  Plus,
  ChatCircle,
  MapTrifold,
  type Icon,
} from '@phosphor-icons/react'

export type NavItem = {
  /** 라우트 경로. NavLink 의 to 로 그대로 쓴다. */
  to: string
  label: string
  icon: Icon
  /** 가운데 액션 버튼(셋로그 추가)만 시각적으로 강조한다. */
  emphasized?: boolean
}

/**
 * 앱 전역 내비게이션 정본.
 *
 * Figma 는 화면마다 탭 구성이 달랐다(지도 화면은 "리스트 확인", 채팅 상세는
 * "검색/방/마이"). 예측 가능한 내비게이션을 위해 아래 5개로 통일하고,
 * 지도의 "리스트 확인"은 탭이 아니라 지도 화면 내부의 시트 토글로 처리한다.
 *
 * 항목이 5개를 넘으면 안 된다 (bottom-nav-limit).
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '홈', icon: House },
  { to: '/board', label: '게시판', icon: Article },
  { to: '/upload', label: '셋로그 추가', icon: Plus, emphasized: true },
  { to: '/chat', label: '채팅', icon: ChatCircle },
  { to: '/map', label: '지도', icon: MapTrifold },
]
