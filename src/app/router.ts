import { createRouter, type RouterHistory } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';
import { useAuthStore } from '@/shared/auth/auth-store';

/* 라우터 생성과 세션 소실 대응을 한 곳에 묶는다(main과 테스트가 공유).
 * 가드(beforeLoad)는 다음 내비게이션에서만 실행되므로, 화면을 띄워둔 채
 * refresh가 실패해 스토어가 비워지는 경우는 여기서 스토어 전이를 구독해
 * 즉시 로그인으로 보낸다(SPEC 완료 기준: refresh 실패 시 로그인 이동). */
export function createAppRouter(history?: RouterHistory) {
  const router = createRouter({
    routeTree,
    /* 기본(non-strict)은 validateSearch가 거른 값도 URL에 보존한다 — sign-in의
     * redirect 위생 검증이 실효를 가지려면 스키마 밖 파라미터를 제거해야 한다 */
    search: { strict: true },
    ...(history !== undefined && { history }),
  });

  useAuthStore.subscribe((state, prev) => {
    if (prev.accessToken === null || state.accessToken !== null) return;
    const { href, pathname } = router.state.location;
    if (pathname === '/sign-in') return;
    /* 로그아웃의 명시적 navigate와 겹칠 수 있지만 목적지가 같아 무해하다 */
    void router.navigate({ to: '/sign-in', search: { redirect: href } });
  });

  return router;
}
