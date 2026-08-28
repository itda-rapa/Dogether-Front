import { useQuery } from '@tanstack/react-query'
import { X } from '@phosphor-icons/react'
import { listSetlogs } from '@/features/setlog/api'
import { useAuth } from '@/features/auth/auth-context'

/**
 * 채팅에 공유할 셋로그를 고르는 바텀시트. 백엔드가 "발신자 소유 Setlog만
 * 공유"를 강제하므로(M3 API 계약 §4), 내 Active Pet 이 올린 것만 보여준다.
 */
export function ShareSetlogPicker({
  onPick,
  onClose,
  pending,
}: {
  onPick: (setlogId: number) => void
  onClose: () => void
  pending: boolean
}) {
  const { me } = useAuth()
  const setlogs = useQuery({
    queryKey: ['setlogs'],
    queryFn: listSetlogs,
    staleTime: 60_000,
  })

  const mine = setlogs.data?.items.filter((s) => s.authorPet.petId === me?.activePetId) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" role="dialog" aria-modal="true" aria-label="셋로그 공유">
      <div className="max-h-[70vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">공유할 셋로그 선택</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-primary-subtle">
            <X size={20} />
          </button>
        </div>

        {setlogs.isPending && <p className="mt-6 text-center text-[14px] text-muted-foreground">불러오는 중…</p>}
        {setlogs.isError && <p className="mt-6 text-center text-[14px] text-destructive">셋로그를 불러오지 못했습니다.</p>}
        {setlogs.data && mine.length === 0 && (
          <p className="mt-6 text-center text-[14px] text-muted-foreground">내가 올린 셋로그가 없습니다.</p>
        )}

        {mine.length > 0 && (
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {mine.map((setlog) => (
              <li key={setlog.setlogId}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onPick(setlog.setlogId)}
                  className="aspect-square w-full overflow-hidden rounded-lg bg-black disabled:opacity-50"
                >
                  <video src={setlog.mediaUrl} muted playsInline className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
