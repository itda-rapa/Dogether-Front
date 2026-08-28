/**
 * 브라우저 Geolocation 을 Promise 로 감싼다. 백엔드 오류코드와 구분해야 하는
 * "위치를 아예 못 얻은" 경우(권한 거부·미지원·실패)만 다룬다 — 얻은 좌표가
 * 서버 기준으로 유효한지(LOCATION_INVALID 등)는 서버가 정본이다.
 */

export type GeolocationFailureReason =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'

export type CapturedLocation = {
  latitude: number
  longitude: number
  accuracyMeters: number
  /** ISO date-time. 위치를 실제로 획득한 시각. */
  capturedAt: string
}

export type GeolocationResult =
  | { ok: true; location: CapturedLocation }
  | { ok: false; reason: GeolocationFailureReason }

export function getCurrentLocation(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ ok: false, reason: 'UNSUPPORTED' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            capturedAt: new Date(position.timestamp).toISOString(),
          },
        })
      },
      (error) => {
        const reason: GeolocationFailureReason =
          error.code === error.PERMISSION_DENIED
            ? 'PERMISSION_DENIED'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'POSITION_UNAVAILABLE'
              : 'TIMEOUT'
        resolve({ ok: false, reason })
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  })
}

export const GEOLOCATION_FAILURE_MESSAGE: Record<GeolocationFailureReason, string> = {
  UNSUPPORTED: '이 브라우저는 위치 확인을 지원하지 않습니다.',
  PERMISSION_DENIED: '위치 권한이 꺼져 있습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.',
  POSITION_UNAVAILABLE: '현재 위치를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  TIMEOUT: '위치를 확인하는 데 시간이 너무 오래 걸렸습니다. 다시 시도해 주세요.',
}
