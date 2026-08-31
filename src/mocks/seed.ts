/* mock 데이터 시드. 로그인 계정은 README에도 안내한다. */

export const seedUser = {
  id: 'user-1',
  email: 'user@kbhc.co.kr',
  password: 'password1234',
  name: '김국민',
  memo: 'KB헬스케어 프론트엔드 과제 계정입니다.',
};

/* accessToken을 짧게 잡아 refresh 플로우가 실제로 동작함을 시연한다 (SPEC 결정 7) */
export const ACCESS_TOKEN_TTL_SECONDS = 60;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24;
