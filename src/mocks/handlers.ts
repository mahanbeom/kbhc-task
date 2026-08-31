import { HttpResponse, http } from 'msw';

import { createToken } from './jwt';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, seedUser } from './seed';

interface SignInBody {
  email: string;
  password: string;
}

export const handlers = [
  http.post('/api/sign-in', async ({ request }) => {
    const body = (await request.json()) as SignInBody;
    if (body.email !== seedUser.email || body.password !== seedUser.password) {
      return HttpResponse.json(
        { errorMessage: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 400 },
      );
    }

    const refreshToken = createToken(seedUser.id, REFRESH_TOKEN_TTL_SECONDS);
    /* SPEC 결정 1: refreshToken은 스펙(AuthTokenResponse 필수 필드) 준수를 위해
     * body로도 내려주지만, 클라이언트는 body 값을 사용하지 않고 이 쿠키로만
     * /api/refresh를 호출한다. 실서버라면 HttpOnly 쿠키만 내려주는 것이 표준. */
    return HttpResponse.json(
      {
        accessToken: createToken(seedUser.id, ACCESS_TOKEN_TTL_SECONDS),
        refreshToken,
      },
      {
        headers: {
          'Set-Cookie': `token=${refreshToken}; Path=/; Max-Age=${REFRESH_TOKEN_TTL_SECONDS}; SameSite=Strict`,
        },
      },
    );
  }),
];
