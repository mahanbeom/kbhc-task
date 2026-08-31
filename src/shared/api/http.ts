/* API 기본 계층.
 * 도메인 코드는 fetch를 직접 쓰지 않고 이 모듈을 통해 호출한다 —
 * mock(MSW)과 실백엔드 전환은 VITE_API_BASE_URL 하나로 결정되며(SPEC 참고),
 * 인증(Bearer/refresh)은 이 위에 얹는 별도 계층이 담당한다. */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* base가 미설정이면 현재 origin 기준 — 브라우저는 실행 포트에 상관없이 동작하고,
 * 테스트(jsdom)에서는 jsdom origin으로 절대 URL이 만들어져 Node fetch의
 * 상대 URL 미지원 문제를 피한다. */
export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return new URL(path, base).toString();
}

/* 비-2xx 응답을 ApiError(status, errorMessage)로 정규화한다 */
export async function parseJson<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;

  let message = '요청에 실패했습니다.';
  try {
    message = ((await response.json()) as { errorMessage: string }).errorMessage;
  } catch {
    /* body가 JSON이 아니면 기본 메시지 유지 */
  }
  throw new ApiError(response.status, message);
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    /* refresh 토큰 쿠키 전송용. 실백엔드가 다른 origin이면 서버측 CORS
     * credentials 허용이 필요하다(README 결정 사항 참고). */
    credentials: 'include',
    headers: {
      ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });
  return parseJson(response);
}
