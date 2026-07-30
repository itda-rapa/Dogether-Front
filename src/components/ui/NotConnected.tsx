import { PlugsConnected } from '@phosphor-icons/react'

/**
 * 아직 백엔드에 연결되지 않은 영역 표시.
 *
 * "만들다 만 화면"과 "백엔드가 없는 화면"을 구분하기 위해 엔드포인트를 그대로
 * 적는다. 연동할 때 이 컴포넌트를 지우는 것이 곧 작업 완료 표시가 된다.
 */
export function NotConnected({
  endpoint,
  note,
}: {
  endpoint: string
  note?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-5">
      <PlugsConnected
        size={22}
        className="mt-0.5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-medium">API 연동 대기</p>
        <p className="mt-1 break-all font-mono text-[13px] text-muted-foreground">
          {endpoint}
        </p>
        {note && (
          <p className="mt-2 text-[14px] text-muted-foreground">{note}</p>
        )}
      </div>
    </div>
  )
}
