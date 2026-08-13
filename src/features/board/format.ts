export function formatBoardPostTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1_000))
  if (seconds < 60) return '방금 전'
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}분 전`
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}시간 전`
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}
