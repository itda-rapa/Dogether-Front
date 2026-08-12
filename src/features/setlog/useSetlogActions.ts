import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addReaction, removeReaction, sendGreeting } from './api'
import { applyReaction, type ReactionType, type Setlog } from './types'
import { ApiError } from '@/lib/api'

/**
 * 셋로그 하나에 대한 반응·인사 동작.
 *
 * 피드 카드와 전체화면 뷰어가 같은 셋로그를 각각 그리므로, 상태를 여기서
 * 한 번만 만들고 양쪽이 같은 객체를 쓰게 한다. 카드에서 하트를 누르고
 * 전체화면으로 들어가면 이미 눌린 상태로 보여야 한다.
 */
export function useSetlogActions(
  setlog: Setlog,
  onChange: (next: Setlog) => void,
) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [greetError, setGreetError] = useState<string | null>(null)
  // 서버가 "이미 인사함" 여부를 목록에 안 내려주므로, 409 를 받으면 그때부터
  // 이 화면 안에서만 기억해 둔다(새로고침하면 다시 모른다).
  const [alreadyGreeted, setAlreadyGreeted] = useState(false)

  // 자기 영상이거나 L1 이면 상호작용 자체가 막힌다.
  const interactive = setlog.canInteract !== false

  const react = useMutation({
    mutationFn: ({ type, next }: { type: ReactionType; next: boolean }) =>
      next ? addReaction(setlog.setlogId, type) : removeReaction(setlog.setlogId, type),
    onSuccess: (res) => {
      // 서버가 준 카운트를 정본으로 삼는다.
      onChange({
        ...setlog,
        cuteCount: res.cuteCount,
        likeCount: res.likeCount,
        myReactions: res.reacted
          ? Array.from(new Set([...setlog.myReactions, res.type]))
          : setlog.myReactions.filter((r) => r !== res.type),
      })
    },
    onError: (_e, vars) => {
      // 낙관적 갱신을 되돌린다.
      onChange(applyReaction(setlog, vars.type, !vars.next))
    },
  })

  const toggle = (type: ReactionType) => {
    if (!interactive) return
    const next = !setlog.myReactions.includes(type)
    onChange(applyReaction(setlog, type, next)) // 낙관적 갱신
    react.mutate({ type, next })
  }

  const greet = useMutation({
    mutationFn: () => sendGreeting(setlog.setlogId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] })
      navigate(`/chat/${res.roomId}`)
    },
    onError: (e) => {
      setGreetError(toGreetMessage(e))
      if (e instanceof ApiError && e.status === 409) setAlreadyGreeted(true)
    },
  })

  return { interactive, toggle, greet, greetError, alreadyGreeted }
}

function toGreetMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return '인사를 보내지 못했습니다.'
  if (e.status === 404) return '셋로그를 찾을 수 없거나 인사할 수 없는 상대입니다.'
  if (e.status === 429) return '오늘 인사할 수 있는 인원을 모두 사용했습니다. (하루 10명)'
  if (e.status === 409) return '이미 대화 중인 상대입니다.'
  if (e.status === 403) return '대표 강아지를 지정해야 인사할 수 있습니다.'
  return '인사를 보내지 못했습니다.'
}
