import { http } from '@/shared/api/http';

import type { SignInInput } from '../model/schema';

interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export async function signIn(input: SignInInput): Promise<string> {
  const data = await http<AuthTokenResponse>('/api/sign-in', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  /* SPEC 결정 1: body의 refreshToken은 사용하지 않는다. refresh는 sign-in 응답의
   * Set-Cookie로 심긴 `token` 쿠키로만 수행한다(실서버 기준 HttpOnly 쿠키 가정). */
  return data.accessToken;
}
