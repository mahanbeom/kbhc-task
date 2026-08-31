# TASK_2 — 인증 인프라

> 목표: 인증의 수직 슬라이스 — 401 자동 refresh 인터셉터, 보호 라우트 가드,
> 새로고침 세션 복원, GNB 로그인 분기, 회원정보(/user)와 로그아웃까지.
> SPEC 결정 2(메모리 보관)·3(가드 redirect)·6(로그아웃 최소)·7(exp 60초) 이행.

## 상세 작업 내용

- [x] 1. (TDD) 인터셉터 테스트 선행 작성 (`src/shared/api/client.test.ts`, 5건) —
      ① 유효 토큰은 Bearer만 부착(refresh 0회) ② 만료 토큰 → refresh → 원 요청
      재시도 성공 ③ refresh 401 → 스토어 초기화 + 원 요청 1회만(무한 루프 방지)
      ④ 동시 401 3건 → refresh 1회만(single-flight) ⑤ 401 아닌 에러는 그대로 전파 - 실제 sign-in 핸들러로 쿠키를 심는 통합 방식 — MSW의 가상 쿠키 저장소가
      node(vitest)에서도 Set-Cookie를 보관·주입함을 확인 - refresh 횟수는 `server.events`(request:start)로 계수
- [x] 2. MSW 핸들러 — `POST /api/refresh`(cookie `token` 검증, 실패 시 401),
      `GET /api/user`(Bearer 검증). 공용 `verifyBearer`/`issueTokens` 헬퍼로
      이후 슬라이스의 인증 필수 API가 재사용
- [x] 3. `shared/api/client.ts` — `api()`: Bearer 부착 + 401 시
      refresh 후 1회 재시도. 재시도는 `http()` 직접 호출이라 401을 다시 잡지
      않음(무한 루프 원천 차단). `refreshAccessToken()`: 진행 중 Promise를
      공유하는 single-flight, 실패 시 스토어 초기화
- [x] 4. `_auth` pathless 라우트 가드 — 보호 라우트 4개(`/`, `/task`,
      `/task/$id`, `/user`)를 `src/routes/_auth/` 아래로 이동, `beforeLoad`에서
      미인증 시 `/sign-in?redirect=<href>` throw. sign-in 라우트
      `validateSearch`로 복귀 목적지 수신, 로그인 성공 시 복귀(SPEC 결정 3)
- [x] 5. 부트스트랩 세션 복원 — `main.tsx`에서 렌더 전에
      `refreshAccessToken()` 시도(실패는 미로그인의 정상 흐름)
- [x] 6. GNB 로그인/회원정보 아이콘 분기(`selectIsAuthenticated`만 구독),
      `/user` 페이지(name/memo, 페이지 소유 쿼리), 로그아웃(sign-out 호출 +
      스토어·쿼리 캐시 초기화)
- [x] 7. 통합 테스트 3건 (`src/test/auth.test.tsx`) — 가드 redirect(+search 보존),
      로그인 후 원래 목적지 복귀·회원정보 표시·GNB 분기, 로그아웃 시 상태
      초기화·세션 실종료(이후 refresh 401)
- [x] 8. 검증 — 테스트 16건·typecheck·lint·build 통과. 브라우저 실구동:
      세션 복원(새 로드 시 refresh 200) → 로그아웃 → 비로그인 `/` 접근 시
      `/sign-in?redirect=%2F` → 로그인 후 `/` 복귀 → **60초 대기 후 이동 시
      네트워크에서 `GET /api/user 401 → POST /api/refresh 200 → GET /api/user
200` 확인**(SPEC 결정 7의 시연 목적 달성)
- [x] 9. code-reviewer 1차 리뷰 → Critical/Major 해소 (아래 리뷰 결과 참고)

## 이슈 및 해결

### 이슈 A (작업 6) — 로그아웃해도 새로고침하면 세션이 복원됨

- **증상**: 로그아웃 후 페이지를 새로 열면 `/api/refresh`가 200으로 성공해
  다시 로그인 상태가 됨.
- **원인**: MSW는 mock 응답의 Set-Cookie를 `document.cookie`와 **자체 가상
  쿠키 저장소(`localStorage['__msw-cookie-store__']`)** 두 곳에 보관한다.
  클라이언트에서 `document.cookie`만 지우면 MSW 저장소가 남아 이후 요청에
  쿠키가 계속 주입된다.
- **1차 접근(폐기)**: 클라이언트가 `document.cookie` 직접 삭제 — 위 이유로
  동작하지 않고, 동작하더라도 "쿠키는 HttpOnly라 클라이언트가 못 지운다"는
  결정 1·2의 전제와 모순.
- **최종 해결**: mock에 `POST /api/sign-out` 핸들러 추가 — `Set-Cookie:
token=; Max-Age=0`으로 서버가 쿠키를 만료시키는 실서버 표준 패턴. MSW의
  가상 저장소도 Max-Age=0을 인식해 쿠키를 제거함을 테스트·브라우저 양쪽에서
  확인. ※ openapi.yaml에 없는 엔드포인트를 mock에만 추가한 것이므로 SPEC
  결정 6 보강 사항으로 확인 필요(핸들러 주석·README 결정 사항에 기재 예정).

### 이슈 B (작업 4) — validateSearch 반환 타입이 redirect를 필수 search로 만듦

- **증상**: `tsc -b`에서 `/sign-in`으로 가는 모든 `Link`/`navigate`가
  "Property 'search' is missing" 에러.
- **원인**: `validateSearch`가 `{ redirect: string | undefined }`를 반환하면
  TanStack Router는 키가 존재하므로 **필수 search param**으로 취급한다.
- **해결**: 반환 타입을 `{ redirect?: string }`(optional)로 선언하고 값이
  없으면 키 자체를 생략 — search 없는 `/sign-in` 링크가 성립.

### 이슈 C (리뷰 반영 중) — validateSearch가 값을 걸러도 URL·match에 그대로 남음

- **증상**: `redirect=https://evil.example`을 validateSearch에서 버렸는데
  `match.search`에 raw 값이 그대로 들어 있음(외부 URL 필터가 실효 없음).
- **원인**: TanStack Router 기본은 **non-strict** — 스키마 밖 search param을
  하위 호환을 위해 보존한다.
- **해결**: 라우터 옵션 `search: { strict: true }`로 스키마 밖 파라미터를
  전역 제거. 통합 테스트로 외부 URL redirect가 버려짐을 검증.

## code-reviewer 1차 리뷰 결과 (작업 9)

Critical 0 / Major 2 / Minor 7. Major 전건과 Minor 5건 반영:

- **M1 (반영)** 화면을 띄운 채 refresh가 실패하면 가드(beforeLoad)는 다음
  내비게이션까지 실행되지 않아 "로그인 이동"(SPEC 완료 기준)이 지연됨 →
  라우터 생성을 `app/router.ts`의 `createAppRouter()` 팩토리로 추출하고,
  authStore 전이(non-null→null) 구독으로 즉시 `/sign-in?redirect=` 이동.
  main과 테스트가 같은 팩토리를 쓰므로 통합 테스트로 검증(세션 소실 테스트).
- **M2 (반영)** `new QueryClient()` 기본 retry(3회)가 죽은 세션에서 401을
  증폭(원 요청·refresh 각 4회) → 4xx는 재시도하지 않는 전역 retry 정책
  (401은 인터셉터가 확정한 실패, 404는 즉시 대체 화면 필요. 슬라이스 5 대비).
- **m1 (반영)** refresh 완료 직후 도착한 401이 두 번째 refresh를 유발하는
  경계 → 401 처리 시 스토어 토큰이 요청 당시와 달라져 있으면 refresh 없이
  새 토큰으로 재시도.
- **m2 (반영)** redirect 파라미터 open-redirect 위생 → 내부 경로만 허용
  (`/` 시작 + `//` 제외) + 이슈 C의 strict 옵션으로 실효화.
- **m3 (반영)** mock refresh 쿠키에 `HttpOnly` 추가 — "클라이언트는 refresh
  토큰을 읽을 수 없다"는 결정 1·2의 전제를 mock이 스스로 강제. MSW는
  HttpOnly 쿠키를 document.cookie에 노출하지 않고 자체 저장소로만 주입함을
  브라우저에서 확인.
- **m4 (반영)** client.test의 무효한 document.cookie 정리 코드 제거(MSW 가상
  저장소는 공개 초기화 API가 없어 쿠키 부재 전제 테스트는 핸들러 override로
  격리한다고 주석 명기). 스토어 초기화는 전역 setup의 afterEach가 이미 수행.
- **m5 (반영)** 커버리지 공백 보강 — 동시 401에서 refresh 실패 시 1회만 수행·
  스토어 초기화(테스트 추가), 외부 URL redirect 폐기(추가), 세션 소실 시 즉시
  이동(M1 테스트로 추가). 총 19건.
- **m6 (반영)** /user 에러 문구에 `role="alert"`.
- **m7 (반영)** sign-out 호출을 `http()`→`api()`로 — 인증된 사용자의 행위라는
  의미와 실서버 전환 시 Bearer 검증 대비.
- **미반영(사유)**: sign-out 응답을 204로 — 기본 계층 `parseJson`이 JSON body를
  전제하므로 `{ success: true }` 유지(204 처리를 넣는 것이 더 큰 변경).
  README 결정 사항 반영(sign-out 추가, 결정 1·2)은 슬라이스 6(README 작성)에서.

## 참고 결정

- **복귀 내비게이션**: 가드가 넘긴 `redirect`는 라우트 테이블 밖의 런타임
  href라 타입 안전한 `to`로 표현할 수 없어 `router.history.push()`로 이동
  (TanStack 인증 가이드의 복귀 패턴). 값이 없으면 `navigate({ to: '/' })`.
- **가드는 스토어만 확인**: 세션 복원이 렌더 전에 끝나므로(`main.tsx`
  부트스트랩) `beforeLoad`에서는 refresh를 시도하지 않는다 — 시점 경합 제거.
- **user 쿼리는 페이지 소유**: `/user`에서만 쓰므로 entity로 승격하지 않음
  (SPEC 보일러플레이트 방지 규칙).
- **jsdom scrollTo 경고**: 라우터 내비게이션마다 "Not implemented" 경고가
  찍혀 setup.ts에 no-op 스텁 추가(소음 제거).
- **부트스트랩 refresh 유지(사용자 검토 후 확정)**: 첫 접속 시 `/api/refresh`
  1회 호출(미로그인이면 401)은 의도된 동작 — accessToken이 메모리에만 있고
  refresh 쿠키는 HttpOnly라, 새로고침 후 로그인 상태를 알 유일한 방법이
  refresh 시도이기 때문(silent refresh 패턴). 대안(가드 lazy refresh,
  localStorage 힌트 플래그) 검토 후 단순성을 이유로 현행 유지 결정.
  README 결정 사항에 기재할 것.
