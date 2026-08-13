import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/app/theme'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { RequireAuth } from '@/components/RequireAuth'
import { AppShell } from '@/components/AppShell'
import { HomePage } from '@/routes/HomePage'
import { BoardPage } from '@/routes/BoardPage'
import { ChatPage } from '@/routes/ChatPage'
import { ChatRoomPage } from '@/routes/ChatRoomPage'
import { MeetingDraftPage } from '@/routes/MeetingDraftPage'
import { ChatNewPage } from '@/routes/ChatNewPage'
import { OpenChatPage } from '@/routes/OpenChatPage'
import { OpenChatCreatePage } from '@/routes/OpenChatCreatePage'
import { OpenChatDetailPage } from '@/routes/OpenChatDetailPage'
import { OpenChatRoomPage } from '@/routes/OpenChatRoomPage'
import { MapPage } from '@/routes/MapPage'
import { PlaceDetailPage } from '@/routes/PlaceDetailPage'
import { PostDetailPage } from '@/routes/PostDetailPage'
import { PostNewPage } from '@/routes/PostNewPage'
import { UploadPage } from '@/routes/UploadPage'
import { SetlogUploadPage } from '@/routes/SetlogUploadPage'
import { MePage } from '@/routes/MePage'
import { PetDetailPage } from '@/routes/PetDetailPage'
import { PetEditPage } from '@/routes/PetEditPage'
import { PetProfilePage } from '@/routes/PetProfilePage'
import { PetNewPage } from '@/routes/PetNewPage'
import { PetVerifyPage } from '@/routes/PetVerifyPage'
import { MeetingCardPage } from '@/routes/MeetingCardPage'
import { MeetingsPage } from '@/routes/MeetingsPage'
import { BlocksPage } from '@/routes/BlocksPage'
import { HiddenSetlogsPage } from '@/routes/HiddenSetlogsPage'
import {
  RequireAdmin,
  AdminReportsPage,
  AdminReportDetailPage,
} from '@/routes/admin/AdminReportsPage'
import { AdminHomePage } from '@/routes/admin/AdminHomePage'
import { AdminBoardsPage } from '@/routes/admin/AdminBoardsPage'
import { FriendsPage } from '@/routes/FriendsPage'
import { FriendSearchPage } from '@/routes/FriendSearchPage'
import { PlacesPage } from '@/routes/PlacesPage'
import { NotificationsPage } from '@/routes/NotificationsPage'
import { SearchPage } from '@/routes/SearchPage'
import {
  NoticesPage,
  NoticeDetailPage,
  QnaPage,
  FaqPage,
} from '@/routes/SupportPages'
import { LoginPage } from '@/routes/LoginPage'
import { SignupPage } from '@/routes/SignupPage'
import { ResetPasswordPage } from '@/routes/ResetPasswordPage'
import { NotFoundPage } from '@/routes/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      /*
        기본값 'online' 은 브라우저가 오프라인이라고 판단하면 요청을 보내지 않고
        fetchStatus='paused', status='pending' 으로 묶어둔다. 복귀 이벤트를 놓치면
        화면은 로딩 스피너에서 영원히 벗어나지 못한다. 실제로 이 상태를 재현했다.
        'always' 로 두면 항상 시도하고, 실패는 NetworkError 로 화면에 드러난다.
      */
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
})

// 개발 중 쿼리 상태를 콘솔에서 들여다보기 위한 핸들. 프로덕션 번들에는 없다.
if (import.meta.env.DEV) {
  ;(window as unknown as { __queryClient: QueryClient }).__queryClient =
    queryClient
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* 인증 화면은 앱 셸(탭바/사이드바) 밖에서 렌더된다. */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />

                  {/* 게시판 */}
                  <Route path="board" element={<BoardPage />} />
                  <Route path="board/new" element={<PostNewPage />} />
                  <Route path="board/:postId" element={<PostDetailPage />} />

                  {/* 채팅 — /chat/new 는 :roomId 보다 먼저 와야 한다 */}
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="chat/new" element={<ChatNewPage />} />
                  <Route path="chat/open" element={<OpenChatPage />} />
                  <Route path="chat/open/new" element={<OpenChatCreatePage />} />
                  <Route path="chat/open/:roomId" element={<OpenChatDetailPage />} />
                  <Route path="chat/open/:roomId/room" element={<OpenChatRoomPage />} />
                  <Route path="chat/:roomId" element={<ChatRoomPage />} />
                  <Route
                    path="chat/:roomId/meeting/new"
                    element={<MeetingDraftPage />}
                  />

                  {/* 약속 목록 — 채팅과 지도 사이. 카드 단건은 meeting-cards/:cardId */}
                  <Route path="meetings" element={<MeetingsPage />} />

                  {/* 지도 */}
                  <Route path="map" element={<MapPage />} />
                  <Route path="map/:placeId" element={<PlaceDetailPage />} />

                  <Route path="upload" element={<UploadPage />} />
                  <Route path="setlogs/new" element={<SetlogUploadPage />} />

                  {/* 마이 페이지 — /me/pets/new 는 :petId 보다 먼저 */}
                  <Route path="me" element={<MePage />} />
                  <Route path="me/pets/new" element={<PetNewPage />} />
                  <Route path="me/pets/:petId" element={<PetDetailPage />} />
                  <Route path="me/pets/:petId/edit" element={<PetEditPage />} />
                  <Route path="me/pets/:petId/verify" element={<PetVerifyPage />} />

                  {/* 남의 펫 프로필. 홈 피드 작성자 → 친구 요청 진입점 */}
                  <Route path="pets/:petId" element={<PetProfilePage />} />
                  <Route path="me/friends" element={<FriendsPage />} />
                  <Route path="me/friends/search" element={<FriendSearchPage />} />
                  <Route path="me/places" element={<PlacesPage />} />
                  <Route path="me/blocks" element={<BlocksPage />} />
                  <Route path="me/hidden-setlogs" element={<HiddenSetlogsPage />} />

                  {/* 약속 카드 — 채팅의 CARD 말풍선에서 진입한다 */}
                  <Route path="meeting-cards/:cardId" element={<MeetingCardPage />} />

                  {/* 관리자 전용 */}
                  <Route element={<RequireAdmin />}>
                    <Route path="admin" element={<AdminHomePage />} />
                    <Route path="admin/boards" element={<AdminBoardsPage />} />
                    <Route path="admin/reports" element={<AdminReportsPage />} />
                    <Route
                      path="admin/reports/:reportId"
                      element={<AdminReportDetailPage />}
                    />
                  </Route>

                  {/* 고객 지원 */}
                  <Route path="notices" element={<NoticesPage />} />
                  <Route path="notices/:noticeId" element={<NoticeDetailPage />} />
                  <Route path="qna" element={<QnaPage />} />
                  <Route path="faq" element={<FaqPage />} />

                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="search" element={<SearchPage />} />

                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
