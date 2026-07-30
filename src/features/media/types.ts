export type MediaType = 'IMAGE' | 'VIDEO'
export type MediaStatus = 'INIT' | 'UPLOADED' | 'COMPLETED' | 'FAILED'

export type PresignedUrlPart = {
  partNumber: number
  presignedUrl: string
}

export type MultipartUploaded = {
  partNumber: number
  eTag: string
}

export type MediaInitResponse = {
  id: number
  mediaType: MediaType
  path: string
  status: MediaStatus
  userId: number
  presignedUrl: string | null
  uploadId: string | null
  presignedUrlParts: PresignedUrlPart[] | null
  createdAt: string
  updatedAt: string
}

export type MediaResponse = {
  id: number
  mediaType: MediaType
  path: string
  status: MediaStatus
  userId: number
  fileSize: number | null
  attributes: Record<string, unknown> | null
  createdAt: string
  modifiedAt: string
}

export type MediaPresignedUrlResponse = {
  presignedUrl: string
  media: MediaResponse
}

export type MediaUploadStage = 'initializing' | 'uploading' | 'completing'

export type MediaUploadProgress = {
  stage: MediaUploadStage
  uploadedBytes: number
  totalBytes: number
}

export type MediaUploadResult = {
  media: MediaResponse
  downloadUrl: string
}
