/** 참가자 이름을 "초코, 몽이" 또는 "초코 외 2마리"로 축약한다. */
export function formatParticipants(pets: ReadonlyArray<{ nickname: string }>) {
  if (pets.length === 0) return '알 수 없음'
  if (pets.length <= 2) return pets.map((p) => p.nickname).join(', ')
  return `${pets[0].nickname} 외 ${pets.length - 1}마리`
}

export function formatMeetAt(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
