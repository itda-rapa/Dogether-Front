import { useEffect, useState } from 'react'

/** target(ISO date-time) 까지 남은 초. target 이 없으면 0. 1초마다 갱신된다. */
export function useCountdown(target: string | null): number {
  const [remaining, setRemaining] = useState(() => secondsUntil(target))

  useEffect(() => {
    setRemaining(secondsUntil(target))
    if (!target) return

    const id = window.setInterval(() => {
      setRemaining(secondsUntil(target))
    }, 1000)
    return () => window.clearInterval(id)
  }, [target])

  return remaining
}

function secondsUntil(target: string | null): number {
  if (!target) return 0
  return Math.max(0, Math.round((new Date(target).getTime() - Date.now()) / 1000))
}
