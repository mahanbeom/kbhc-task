import {
  ArrowRightEndOnRectangleIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Link, Outlet } from '@tanstack/react-router';

/* GNB(상단): 로고 + 로그인/회원정보, LNB(좌측): 라우트 맵 — SPEC 결정 8 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Gnb />
      <div className="flex flex-1">
        <Lnb />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Gnb() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <Link to="/" className="text-lg font-bold">
        할 일 관리
      </Link>
      {/* 로그인 상태 분기는 인증 슬라이스에서 추가한다 */}
      <Link to="/sign-in" aria-label="로그인" className="rounded p-2 hover:bg-surface">
        <ArrowRightEndOnRectangleIcon className="size-6" aria-hidden />
      </Link>
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
              <span className="hidden sm:inline">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
