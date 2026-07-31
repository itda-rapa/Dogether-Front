import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * 사용자가 모션 축소를 켜 뒀는지.
 *
 * 셋로그 뷰어에서 자동재생과 스크롤 스냅을 끄는 데 쓴다. 전정기관 문제가 있는
 * 사용자에게 전체화면 영상이 자동으로 넘어가는 건 실제로 어지럼증을 유발한다.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
