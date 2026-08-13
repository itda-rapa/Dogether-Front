import { ApiError } from '@/lib/api'

/** 펫 인증(조회·적용·등록) 오류 코드 → 한국어 문구. 세 화면(펫 상세 인증,
 *  강아지 등록 시 인증)이 같은 오류 집합을 공유해서 여기 하나로 모았다. */
export function toVerificationError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '요청을 처리하지 못했습니다. 네트워크 연결을 확인해 주세요.'
  }
  switch (error.code) {
    case 'VALIDATION_FAILED':
      return '입력한 정보를 다시 확인해 주세요.'
    case 'PET_VERIFICATION_NOT_MATCHED':
      return '등록정보를 확인할 수 없습니다. 입력정보를 확인한 후 다시 시도해 주세요.'
    case 'PET_VERIFICATION_CONFLICT':
      return '이미 사용되었거나 인증된 등록정보입니다.'
    case 'PET_VERIFICATION_TOKEN_INVALID':
      return '인증 유효시간이 지났습니다. 처음부터 다시 조회해 주세요.'
    case 'PET_NOT_OWNED':
      return '본인 소유의 펫만 인증할 수 있습니다.'
    case 'PET_NOT_FOUND':
      return '존재하지 않거나 삭제된 펫입니다.'
    case 'PET_LIMIT_EXCEEDED':
      return '반려견은 최대 5마리까지 등록할 수 있습니다.'
    case 'PET_VERIFICATION_UNAVAILABLE':
      return '인증 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'
    default:
      return error.message || '요청을 처리하지 못했습니다.'
  }
}
