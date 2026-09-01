import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { describe, expect, it } from 'vitest';

import { createToken } from '@/mocks/jwt';
import { seedUser } from '@/mocks/seed';
import { refreshAccessToken } from '@/shared/api/client';
import { http } from '@/shared/api/http';
import { useAuthStore } from '@/shared/auth/auth-store';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

describe('인증 가드와 회원정보', () => {
  it('미인증 상태로 보호 라우트 접근 시 /sign-in으로 redirect된다', async () => {
    const { router } = renderApp('/user');

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');
    /* 복귀 목적지가 search에 보존된다 (SPEC 결정 3) */
    expect(router.state.location.search).toEqual({ redirect: '/user' });
  });

  it('외부 URL redirect 파라미터는 버린다(내부 경로만 허용)', async () => {
    const { router } = renderApp('/sign-in?redirect=https://evil.example');

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    /* location.search는 raw 값이고, validateSearch 결과는 라우트 match에 반영된다 */
    const match = router.state.matches.find((m) => m.routeId === '/sign-in');
    expect(match?.search).toEqual({});
  });

  it('화면을 띄운 채 세션이 소실되면(refresh 실패) 즉시 로그인으로 보낸다', async () => {
    /* 만료 accessToken + 죽은 refresh 세션: 가드(토큰 존재)는 통과하지만
     * user 쿼리가 401 → refresh 401 → 스토어 초기화로 이어지는 상황 */
    useAuthStore.getState().setAccessToken(createToken(seedUser.id, -60));
    server.use(
      mswHttp.post('/api/refresh', () =>
        HttpResponse.json({ errorMessage: '세션이 만료되었습니다.' }, { status: 401 }),
      ),
    );
    const { router } = renderApp('/user');

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(router.state.location.search).toEqual({ redirect: '/user' });
  });

  it('로그인 성공 시 원래 가려던 페이지로 복귀하고 회원정보를 표시한다', async () => {
    const user = userEvent.setup();
    renderApp('/user');

    await user.type(await screen.findByLabelText('이메일'), seedUser.email);
    await user.type(screen.getByLabelText('비밀번호'), seedUser.password);
    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByRole('heading', { name: '회원정보' })).toBeInTheDocument();
    expect(await screen.findByText(seedUser.name)).toBeInTheDocument();
    expect(screen.getByText(seedUser.memo)).toBeInTheDocument();
    /* GNB 아이콘이 로그인 → 회원정보로 분기된다 */
    expect(screen.getByRole('link', { name: '회원정보' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
  });

  it('로그아웃하면 상태가 초기화되고 세션(refresh 쿠키)도 종료된다', async () => {
    const user = userEvent.setup();
    /* 실제 sign-in 핸들러로 refresh 쿠키를 심어 로그인 상태를 만든다 */
    await http('/api/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email: seedUser.email, password: seedUser.password }),
    });
    useAuthStore.getState().setAccessToken(createToken(seedUser.id, 60));
    renderApp('/user');

    expect(await screen.findByText(seedUser.name)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
    /* mock sign-out이 쿠키를 만료시켰으므로 세션 복원(refresh)이 더는 안 된다 */
    await expect(refreshAccessToken()).rejects.toMatchObject({ status: 401 });
  });
});
