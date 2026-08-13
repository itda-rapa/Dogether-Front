import { apiRequest, NetworkError } from '@/lib/api'
import type {
  Greeting,
  ReactionType,
  Setlog,
  SetlogListResult,
  SetlogReaction,
  SetlogUploadProgress,
  SetlogUploadSession,
} from './types'

const MAX_SETLOG_UPLOAD_BYTES = 200 * 1024 * 1024
const SETLOG_CONTENT_TYPES = ['video/mp4', 'video/webm']
export const MAX_SETLOG_CAPTION_LENGTH = 500

export class SetlogUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SetlogUploadError'
  }
}

/** M1 은 모든 사용자에게 동일한 시드 영상 3개를 준다. 커서 페이지네이션 응답이다. */
export function listSetlogs() {
  return apiRequest<SetlogListResult>('/setlogs')
}

/** 동일 반응을 다시 추가해도 서버가 멱등 처리한다. */
export function addReaction(setlogId: number, type: ReactionType) {
  return apiRequest<SetlogReaction>(`/setlogs/${setlogId}/reactions/${type}`, {
    method: 'PUT',
  })
}

/** 반응이 이미 없어도 200 과 reacted=false 를 돌려주는 멱등 API 다. */
export function removeReaction(setlogId: number, type: ReactionType) {
  return apiRequest<SetlogReaction>(`/setlogs/${setlogId}/reactions/${type}`, {
    method: 'DELETE',
  })
}

/**
 * 고정 인사 전송 → DIRECT 채팅방 생성.
 *
 * 요청 본문이 없다. 서버가 "안녕하세요! 같이 놀아요." 를 대신 저장한다.
 * 상대가 답하기 전까지 추가 메시지를 보낼 수 없고, 하루 10명 제한이 있다(429).
 */
export function sendGreeting(setlogId: number) {
  return apiRequest<Greeting>(`/setlogs/${setlogId}/greetings`, {
    method: 'POST',
  })
}

export function createSetlogUploadSession(body: {
  petId: number
  fileName: string
  contentType: string
  size: number
}) {
  return apiRequest<SetlogUploadSession>('/setlogs/uploads', {
    method: 'POST',
    body,
  })
}

export function completeSetlogUpload(
  uploadId: string,
  clientRequestId: string,
  caption: string | null,
) {
  return apiRequest<Setlog>(`/setlogs/uploads/${uploadId}/complete`, {
    method: 'POST',
    body: { clientRequestId, caption },
  })
}

/** 선택 시점에 미리 검사할 때도, 업로드 시작 시 다시 검사할 때도 이 함수 하나로 맞춘다. */
export function getSetlogVideoError(file: File): string | null {
  if (!SETLOG_CONTENT_TYPES.includes(file.type)) {
    return 'MP4 또는 WebM 영상만 올릴 수 있습니다.'
  }
  if (file.size > MAX_SETLOG_UPLOAD_BYTES) {
    return '영상은 200MB 이하만 올릴 수 있습니다.'
  }
  return null
}

/** 서버와 동일하게 trim 기준으로 길이를 검사한다. */
export function getSetlogCaptionError(caption: string): string | null {
  if (caption.trim().length > MAX_SETLOG_CAPTION_LENGTH) {
    return `캡션은 ${MAX_SETLOG_CAPTION_LENGTH}자 이하로 입력해 주세요.`
  }
  return null
}

/** trim 후 빈 문자열이면 null 로 보낸다. 서버의 정규화 규칙과 맞춘다. */
function normalizeCaption(caption: string): string | null {
  const trimmed = caption.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * 셋로그 영상 업로드: 세션 생성 → presigned PUT → 완료 신고.
 *
 * features/media/api.ts 의 uploadMedia 와 같은 모양이지만, 그건 범용 미디어
 * API(/api/v1/media/*)이고 이건 Setlog 전용 엔드포인트(/setlogs/uploads)라
 * 계약이 달라 재사용할 수 없다 — 패턴만 그대로 따른다.
 */
export async function uploadSetlogVideo(
  petId: number,
  file: File,
  caption: string,
  onProgress?: (progress: SetlogUploadProgress) => void,
): Promise<Setlog> {
  const validationError = getSetlogVideoError(file)
  if (validationError) throw new SetlogUploadError(validationError)

  const captionError = getSetlogCaptionError(caption)
  if (captionError) throw new SetlogUploadError(captionError)

  onProgress?.({ stage: 'initializing', uploadedBytes: 0, totalBytes: file.size })

  const session = await createSetlogUploadSession({
    petId,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  })

  await putToStorage(session.uploadUrl, file, session.headers)
  onProgress?.({ stage: 'uploading', uploadedBytes: file.size, totalBytes: file.size })

  onProgress?.({ stage: 'completing', uploadedBytes: file.size, totalBytes: file.size })
  return completeSetlogUpload(session.uploadId, crypto.randomUUID(), normalizeCaption(caption))
}

async function putToStorage(url: string, file: File, headers: Record<string, string>) {
  let response: Response
  try {
    response = await fetch(url, { method: 'PUT', headers, body: file })
  } catch {
    throw new NetworkError('스토리지에 연결할 수 없습니다.')
  }
  if (!response.ok) {
    throw new SetlogUploadError(`영상 업로드에 실패했습니다. (HTTP ${response.status})`)
  }
}
