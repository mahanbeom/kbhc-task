/* 인증 API 계층 — 기본 계층(http) 위에 Bearer 부착과 401 인터셉터를 얹는다.
 * 인증 필수 API는 이 모듈의 api()를 쓰고, 인증 무관 호출(sign-in 등)은 http()를 쓴다. */

import { useAuthStore } from '@/shared/auth/auth-store';

import { ApiError, http } from './http';

interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/* single-flight: 동시 401 N건이 refresh를 각자 부르지 않도록 진행 중인
 * refresh Promise를 공유한다. React 밖이므로 스토어는 getState()로 접근(SPEC 결정 2). */
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshPromise ??= http<AuthTokenResponse>('/api/refresh', { method: 'POST' })
    .then((data) => {
      /* body의 refreshToken은 사용하지 않는다 — 쿠키가 유일한 보관처(SPEC 결정 1) */
      useAuthStore.getState().setAccessToken(data.accessToken);
      return data.accessToken;
    })
    .catch((error: unknown) => {
      /* refresh 실패 = 세션 종료. 스토어를 비우면 가드가 이후 내비게이션을 막고,
       * 라우터의 스토어 구독(app/router.ts)이 현재 화면도 로그인으로 보낸다 */
      useAuthStore.getState().setAccessToken(null);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function withBearer(init: RequestInit, token: string | null): RequestInit {
  if (token === null) return init;
  return { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } };
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  try {
    return await http<T>(path, withBearer(init, token));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    /* 401 → refresh 후 딱 1회 재시도. 재시도의 401은 다시 잡지 않으므로(http 직접 호출)
     * 무한 루프가 없고, refresh 실패 시에는 위에서 스토어 초기화 후 그대로 전파된다.
     * 이 401을 처리하는 사이 다른 요청이 refresh를 이미 끝냈다면(토큰이 바뀜)
     * refresh 없이 새 토큰으로 바로 재시도한다 — 완료 직후 도착한 401이
     * 불필요한 refresh를 중복 유발하는 것을 막는다. */
    const current = useAuthStore.getState().accessToken;
    const refreshed = current !== null && current !== token ? current : await refreshAccessToken();
    return http<T>(path, withBearer(init, refreshed));
  }
}
