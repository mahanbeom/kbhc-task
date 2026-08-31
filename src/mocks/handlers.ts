import { HttpResponse, http } from 'msw';

import { createToken, isTokenValid } from './jwt';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, seedTasks, seedUser } from './seed';

interface SignInBody {
  email: string;
  password: string;
}

/* Bearer accessToken 검증 — 인증 필수 API 핸들러 공용. 실패 시 401 응답을 반환 */
function verifyBearer(request: Request): Response | null {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (isTokenValid(token ?? undefined)) return null;
  return HttpResponse.json({ errorMessage: '인증이 만료되었습니다.' }, { status: 401 });
}

/* AuthTokenResponse + refresh 쿠키 재발급 (sign-in/refresh 공용, SPEC 결정 1) */
function issueTokens() {
  const refreshToken = createToken(seedUser.id, REFRESH_TOKEN_TTL_SECONDS);
  return HttpResponse.json(
    {
      accessToken: createToken(seedUser.id, ACCESS_TOKEN_TTL_SECONDS),
      refreshToken,
    },
    {
      headers: {
        /* HttpOnly: 클라이언트가 스크립트로 refresh 토큰을 읽을 수 없다는
         * 전제(SPEC 결정 1·2)를 mock에서도 강제한다 — MSW는 HttpOnly 쿠키를
         * document.cookie에 노출하지 않고 자체 저장소로만 주입한다 */
        'Set-Cookie': `token=${refreshToken}; Path=/; Max-Age=${REFRESH_TOKEN_TTL_SECONDS}; SameSite=Strict; HttpOnly`,
      },
    },
  );
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

    /* SPEC 결정 1: refreshToken은 스펙(AuthTokenResponse 필수 필드) 준수를 위해
     * body로도 내려주지만, 클라이언트는 body 값을 사용하지 않고 Set-Cookie로 심긴
     * `token` 쿠키로만 /api/refresh를 호출한다. 실서버라면 HttpOnly 쿠키만
     * 내려주는 것이 표준. */
    return issueTokens();
  }),

  /* refresh 쿠키(`token`)가 유효하면 토큰 일체를 재발급한다 */
  http.post('/api/refresh', ({ cookies }) => {
    if (!isTokenValid(cookies.token)) {
      return HttpResponse.json({ errorMessage: '세션이 만료되었습니다.' }, { status: 401 });
    }
    return issueTokens();
  }),

  /* openapi에는 없는 엔드포인트. 로그아웃(SPEC 결정 6)이 세션을 실제로 종료하려면
   * refresh 쿠키를 지워야 하는데, HttpOnly 쿠키는 서버만 만료시킬 수 있다는
   * 전제(결정 1·2)에 따라 mock 서버가 Set-Cookie로 처리한다 — 클라이언트가
   * MSW 내부 쿠키 저장소에 직접 접근하지 않기 위한 최소 추가. */
  http.post('/api/sign-out', () =>
    HttpResponse.json(
      { success: true },
      { headers: { 'Set-Cookie': 'token=; Path=/; Max-Age=0; HttpOnly' } },
    ),
  ),

  http.get('/api/user', ({ request }) => {
    const unauthorized = verifyBearer(request);
    if (unauthorized) return unauthorized;
    return HttpResponse.json({ name: seedUser.name, memo: seedUser.memo });
  }),

  /* 저장해둔 숫자가 아니라 매 요청 시드 배열에서 집계 — 삭제(슬라이스 5) 후
   * 대시보드 쿼리 invalidate 시 줄어든 값이 그대로 반영되게 한다 */
  http.get('/api/dashboard', ({ request }) => {
    const unauthorized = verifyBearer(request);
    if (unauthorized) return unauthorized;
    const numOfDoneTask = seedTasks.filter((task) => task.status === 'DONE').length;
    return HttpResponse.json({
      numOfTask: seedTasks.length,
      numOfRestTask: seedTasks.length - numOfDoneTask,
      numOfDoneTask,
    });
  }),
];
