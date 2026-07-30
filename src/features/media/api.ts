import { apiRequest, NetworkError } from '@/lib/api'
import type {
  MediaInitResponse,
  MediaPresignedUrlResponse,
  MediaResponse,
  MediaType,
  MediaUploadProgress,
  MediaUploadResult,
  MultipartUploaded,
} from './types'

const MULTIPART_PART_SIZE = 8 * 1024 * 1024

const CONTENT_TYPES: Record<MediaType, string> = {
  IMAGE: 'image/jpeg',
  VIDEO: 'video/mp4',
}

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaUploadError'
  }
}

export function initMedia(mediaType: MediaType, fileSize: number) {
  return apiRequest<MediaInitResponse>('/api/v1/media/init', {
    method: 'POST',
    body: { mediaType, fileSize },
  })
}

export function markMediaUploaded(
  mediaId: number,
  parts: MultipartUploaded[],
) {
  return apiRequest<MediaResponse>('/api/v1/media/uploaded', {
    method: 'POST',
    body: { mediaId, parts },
  })
}

export function getMediaPresignedUrl(mediaId: number) {
  return apiRequest<MediaPresignedUrlResponse>(
    `/api/v1/media/${mediaId}/presigned-url`,
  )
}

export function getMediaType(file: File): MediaType {
  if (file.type === CONTENT_TYPES.IMAGE) return 'IMAGE'
  if (file.type === CONTENT_TYPES.VIDEO) return 'VIDEO'
  throw new MediaUploadError('Only JPEG images and MP4 videos are supported.')
}

export async function uploadMedia(
  file: File,
  onProgress?: (progress: MediaUploadProgress) => void,
): Promise<MediaUploadResult> {
  const mediaType = getMediaType(file)
  onProgress?.({
    stage: 'initializing',
    uploadedBytes: 0,
    totalBytes: file.size,
  })

  const initialized = await initMedia(mediaType, file.size)
  let uploadedBytes = 0
  let completedParts: MultipartUploaded[] = []

  if (initialized.presignedUrl) {
    await putToStorage(
      initialized.presignedUrl,
      file,
      CONTENT_TYPES[mediaType],
    )
    uploadedBytes = file.size
    onProgress?.({
      stage: 'uploading',
      uploadedBytes,
      totalBytes: file.size,
    })
  } else {
    const uploadParts = [...(initialized.presignedUrlParts ?? [])].sort(
      (a, b) => a.partNumber - b.partNumber,
    )
    if (!initialized.uploadId || uploadParts.length === 0) {
      throw new MediaUploadError(
        'The server did not provide multipart upload URLs.',
      )
    }

    completedParts = []
    for (const part of uploadParts) {
      const start = (part.partNumber - 1) * MULTIPART_PART_SIZE
      const chunk = file.slice(
        start,
        Math.min(start + MULTIPART_PART_SIZE, file.size),
      )
      const response = await putToStorage(part.presignedUrl, chunk)
      const eTag = response.headers.get('ETag')
      if (!eTag) {
        throw new MediaUploadError(
          'Could not read ETag. Add ETag to S3 CORS ExposeHeaders.',
        )
      }
      completedParts.push({ partNumber: part.partNumber, eTag })
      uploadedBytes += chunk.size
      onProgress?.({
        stage: 'uploading',
        uploadedBytes,
        totalBytes: file.size,
      })
    }
  }

  onProgress?.({
    stage: 'completing',
    uploadedBytes,
    totalBytes: file.size,
  })
  await markMediaUploaded(initialized.id, completedParts)
  const downloadable = await getMediaPresignedUrl(initialized.id)

  return {
    media: downloadable.media,
    downloadUrl: downloadable.presignedUrl,
  }
}

async function putToStorage(
  url: string,
  body: Blob,
  contentType?: string,
): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'PUT',
      headers: contentType ? { 'Content-Type': contentType } : undefined,
      body,
    })
  } catch {
    throw new NetworkError('Could not connect to media storage.')
  }

  if (!response.ok) {
    throw new MediaUploadError(
      `Media storage upload failed. (HTTP ${response.status})`,
    )
  }
  return response
}
