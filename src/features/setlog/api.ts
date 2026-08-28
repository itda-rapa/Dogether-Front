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
const MIN_SETLOG_DURATION_SECONDS = 3
const MAX_SETLOG_DURATION_SECONDS = 5
const DURATION_PROBE_TIMEOUT_MS = 8000
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

/**
 * 단건 상세 조회. 채팅에 공유된 SETLOG_SHARE 카드의 `detailPath`가 여기로 연결된다.
 * 카드 표시 뒤 삭제·비공개·차단이 발생해도 조회 시점 권한을 다시 검증하며,
 * 과거 Media URL 을 재사용하지 않고 매번 새로 서명한다. 접근 불가는 404 로 숨긴다.
 */
export function getSetlog(setlogId: number) {
  return apiRequest<Setlog>(`/setlogs/${setlogId}`)
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
  if (file.size <= 0 || file.size > MAX_SETLOG_UPLOAD_BYTES) {
    return '영상은 200MB 이하만 올릴 수 있습니다.'
  }
  return null
}

/**
 * 손상되거나 메타데이터를 끝내 못 읽는 파일은 `onloadedmetadata`/`onerror`가
 * 둘 다 안 불릴 수 있다. 타임아웃 없이는 "확인하는 중" 상태가 무한정 멈춘다.
 */
function readVideoDuration(file: File): Promise<number> {
  const objectUrl = URL.createObjectURL(file)

  const probe = new Promise<number>((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => resolve(video.duration)
    video.onerror = () => reject(new SetlogUploadError('영상 정보를 읽을 수 없습니다.'))
    video.src = objectUrl
  })

  let timeoutId: ReturnType<typeof setTimeout>
  const timeout = new Promise<number>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new SetlogUploadError('영상 정보를 읽을 수 없습니다.')),
      DURATION_PROBE_TIMEOUT_MS,
    )
  })

  return Promise.race([probe, timeout]).finally(() => {
    clearTimeout(timeoutId)
    URL.revokeObjectURL(objectUrl)
    probe.catch(() => {})
  })
}

/**
 * 형식·크기 검사를 통과한 뒤에만 호출한다. `video.duration`은 부동소수점이므로
 * 반올림하지 않고 원본 값으로 3~5초 경계를 판정한다(5.01초는 초과로 처리).
 *
 * 이 검사는 사용자 안내용 선검사일 뿐이다. 백엔드가 S3의 실제 파일을 최종
 * 검증하므로, 이걸 통과해도 완료 API가 거절할 수 있다.
 */
export async function getSetlogVideoDurationError(file: File): Promise<string | null> {
  let duration: number
  try {
    duration = await readVideoDuration(file)
  } catch {
    return '영상 정보를 읽을 수 없습니다.'
  }
  if (
    !Number.isFinite(duration) ||
    duration < MIN_SETLOG_DURATION_SECONDS ||
    duration > MAX_SETLOG_DURATION_SECONDS
  ) {
    return '셋로그 영상은 3초 이상 5초 이하만 올릴 수 있어요.'
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

  const durationError = await getSetlogVideoDurationError(file)
  if (durationError) throw new SetlogUploadError(durationError)

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
