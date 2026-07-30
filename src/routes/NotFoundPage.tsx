import { Link } from 'react-router'
import { Page } from '@/components/ui/Page'

export function NotFoundPage() {
  return (
    <Page title="페이지를 찾을 수 없습니다">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 font-semibold text-on-primary transition-colors duration-200 hover:bg-primary-hover"
      >
        홈으로
      </Link>
    </Page>
  )
}
