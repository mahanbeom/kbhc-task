import {
  ArrowRightEndOnRectangleIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { Link, Outlet } from '@tanstack/react-router';

import { selectIsAuthenticated, useAuthStore } from '@/shared/auth/auth-store';

/* GNB(상단): 로고 + 로그인/회원정보, LNB(좌측): 라우트 맵 — SPEC 결정 8 */
export function AppLayout() {
  /* h-screen 고정 + main 내부 스크롤: 목록의 가상 스크롤 컨테이너(h-full 기반)가
   * 뷰포트에 묶인 확정 높이를 갖게 한다. min-h-screen이면 내용만큼 늘어나
   * 가상화가 무력화된다(TASK_4 이슈 A). */
  return (
    <div className="flex h-screen flex-col">
      <Gnb />
      <div className="flex min-h-0 flex-1">
        <Lnb />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Gnb() {
  /* 토큰 원문이 아닌 파생 boolean만 구독한다 — refresh로 토큰이 갱신될 때
   * GNB가 리렌더되지 않게 하기 위함(SPEC 결정 2) */
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <Link to="/" className="text-lg font-bold">
        할 일 관리
      </Link>
      {isAuthenticated ? (
        <Link to="/user" aria-label="회원정보" className="rounded p-2 hover:bg-surface">
          <UserCircleIcon className="size-6" aria-hidden />
        </Link>
      ) : (
        <Link to="/sign-in" aria-label="로그인" className="rounded p-2 hover:bg-surface">
          <ArrowRightEndOnRectangleIcon className="size-6" aria-hidden />
        </Link>
      )}
    </header>
  );
}

const lnbItems = [
  { to: '/', label: '대시보드', Icon: Squares2X2Icon },
  { to: '/task', label: '할 일', Icon: ClipboardDocumentListIcon },
] as const;

function Lnb() {
  return (
    <nav aria-label="주 메뉴" className="w-14 border-r border-border bg-background sm:w-48">
      <ul>
        {lnbItems.map(({ to, label, Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface"
              activeProps={{ className: 'bg-primary/15 font-semibold' }}
              activeOptions={{ exact: to === '/' }}
            >
              <Icon className="size-6 shrink-0" aria-hidden />
              {/* 좁은 화면에서는 시각적으로만 숨긴다 — display:none(hidden)은
               * 접근성 트리에서도 빠져 링크가 이름을 잃는다(WCAG 4.1.2) */}
              <span className="sr-only sm:not-sr-only">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
