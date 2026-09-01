import { HttpResponse, http as mswHttp } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { createToken } from '@/mocks/jwt';
import { seedUser } from '@/mocks/seed';
import { useAuthStore } from '@/shared/auth/auth-store';
import { server } from '@/test/server';

import type { UserResponse } from '@/entities/user';

import { api } from './client';
import { http } from './http';

/* 실제 sign-in 핸들러를 거쳐 refresh 쿠키를 심는다 — 핸들러의 쿠키 검증까지
 * 함께 통합 검증하기 위해 쿠키를 직접 조작하지 않는다 */
async function signInForCookie() {
  await http('/api/sign-in', {
    method: 'POST',
    body: JSON.stringify({ email: seedUser.email, password: seedUser.password }),
  });
}

/* 특정 경로로 나간 요청 횟수를 센다 (refresh 1회 보장·재시도 없음 검증용) */
function countRequests(pathname: string): () => number {
  let count = 0;
  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname === pathname) count += 1;
  });
  return () => count;
}

const expiredToken = () => createToken(seedUser.id, -60);

/* MSW의 가상 쿠키 저장소는 테스트 사이에 비울 공개 API가 없어 파일 내에서
 * 쿠키가 유지된다. 쿠키 부재가 전제인 테스트는 핸들러 override로 격리한다. */
afterEach(() => {
  server.events.removeAllListeners();
});

describe('api 인터셉터', () => {
  it('유효한 토큰이면 Bearer만 부착하고 refresh 없이 성공한다', async () => {
    useAuthStore.getState().setAccessToken(createToken(seedUser.id, 60));
    const refreshCount = countRequests('/api/refresh');

    await expect(api<UserResponse>('/api/user')).resolves.toEqual({
      name: seedUser.name,
      memo: seedUser.memo,
    });
    expect(refreshCount()).toBe(0);
  });

  it('만료 토큰이면 refresh 후 원 요청을 재시도해 성공한다', async () => {
    await signInForCookie();
    const expired = expiredToken();
    useAuthStore.getState().setAccessToken(expired);
    const refreshCount = countRequests('/api/refresh');

    await expect(api<UserResponse>('/api/user')).resolves.toEqual({
      name: seedUser.name,
      memo: seedUser.memo,
    });
    expect(refreshCount()).toBe(1);
    /* 갱신된 accessToken이 스토어에 반영된다 */
    const token = useAuthStore.getState().accessToken;
    expect(token).not.toBeNull();
    expect(token).not.toBe(expired);
  });

  it('refresh 실패(401) 시 스토어를 초기화하고 원 요청을 재시도하지 않는다', async () => {
    useAuthStore.getState().setAccessToken(expiredToken());
    server.use(
      mswHttp.post('/api/refresh', () =>
        HttpResponse.json({ errorMessage: '세션이 만료되었습니다.' }, { status: 401 }),
      ),
    );
    const userCount = countRequests('/api/user');

    await expect(api('/api/user')).rejects.toMatchObject({ status: 401 });
    expect(useAuthStore.getState().accessToken).toBeNull();
    /* 무한 루프 방지: 원 요청은 최초 1회만 */
    expect(userCount()).toBe(1);
  });

  it('동시에 401이 여러 건 발생해도 refresh는 1회만 수행한다(single-flight)', async () => {
    await signInForCookie();
    useAuthStore.getState().setAccessToken(expiredToken());
    const refreshCount = countRequests('/api/refresh');

    const results = await Promise.all([
      api<UserResponse>('/api/user'),
      api<UserResponse>('/api/user'),
      api<UserResponse>('/api/user'),
    ]);

    for (const result of results) {
      expect(result).toEqual({ name: seedUser.name, memo: seedUser.memo });
    }
    expect(refreshCount()).toBe(1);
  });

  it('동시 401에서 refresh가 실패해도 refresh는 1회, 스토어는 초기화된다', async () => {
    useAuthStore.getState().setAccessToken(expiredToken());
    server.use(
      mswHttp.post('/api/refresh', () =>
        HttpResponse.json({ errorMessage: '세션이 만료되었습니다.' }, { status: 401 }),
      ),
    );
    const refreshCount = countRequests('/api/refresh');

    const results = await Promise.allSettled([api('/api/user'), api('/api/user')]);

    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    expect(refreshCount()).toBe(1);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('401이 아닌 에러는 refresh 없이 그대로 전파한다', async () => {
    useAuthStore.getState().setAccessToken(createToken(seedUser.id, 60));
    server.use(
      mswHttp.get('/api/user', () =>
        HttpResponse.json({ errorMessage: '서버 오류' }, { status: 500 }),
      ),
    );
    const refreshCount = countRequests('/api/refresh');

    await expect(api('/api/user')).rejects.toMatchObject({ status: 500 });
    expect(refreshCount()).toBe(0);
  });
});
