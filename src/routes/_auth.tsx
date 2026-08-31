import { createFileRoute, redirect } from '@tanstack/react-router';

import { selectIsAuthenticated, useAuthStore } from '@/shared/auth/auth-store';

/* 보호 라우트 공통 가드(SPEC 결정 3): 미인증이면 /sign-in으로 보내고,
 * 로그인 성공 시 원래 목적지로 복귀할 수 있게 redirect search에 담는다.
 * 세션 복원(main.tsx 부트스트랩)이 렌더 전에 끝나므로 여기서는 스토어만 본다. */
export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    if (!selectIsAuthenticated(useAuthStore.getState())) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
  },
});
