import { createFileRoute } from '@tanstack/react-router';

import { SignInPage } from '@/pages/sign-in/SignInPage';

export const Route = createFileRoute('/sign-in')({
  /* _auth 가드가 넘겨준 복귀 목적지. URL로 주입되는 외부 값이므로 내부 경로만
   * 허용한다(외부 URL·`//` protocol-relative는 open redirect 위생상 버림).
   * 반환 타입에서 optional로 선언해야 /sign-in 링크가 search 없이도 성립한다 */
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const value = search.redirect;
    return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
      ? { redirect: value }
      : {};
  },
  component: SignInPage,
});
