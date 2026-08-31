# TASK_1 — 로그인

> 목표: `/sign-in` 화면과 로그인 기능의 수직 슬라이스 — 폼 유효성, 실패 모달,
> 성공 시 토큰 저장·이동까지. requirement.md "로그인 (/sign-in)" 절 전체 충족.

## 상세 작업 내용

- [x] 1. (TDD) `signInSchema` 테스트 선행 작성 → red 확인 후 구현 - openapi.yaml `SignInRequest` 규칙 이관: email 형식,
      password `^[A-Za-z0-9]+$` 8~24자 - 케이스: 정상 / 잘못된 email 5종 / 길이 경계(7·8·24·25자) / 허용 외 문자 4종
- [x] 2. mock 기반 유틸 — `src/mocks/jwt.ts`(payload에 id·exp를 담는 mock JWT
      생성/해독/만료 판정), `src/mocks/seed.ts`(시드 계정
      `user@kbhc.co.kr` / `password1234`, accessToken TTL 60초 — SPEC 결정 7)
- [x] 3. MSW `POST /api/sign-in` 핸들러 — 자격 증명 불일치 시 400 + `errorMessage`,
      성공 시 `accessToken`/`refreshToken`(body) + refreshToken `Set-Cookie`
      (SPEC 결정 1: body 값은 클라이언트가 사용하지 않음, 코드 주석 명기)
- [x] 3-1. API 기본 계층 `src/shared/api/http.ts` — 도메인 코드는 fetch를 직접
      쓰지 않고 이 모듈을 통해 호출한다(리뷰 반영, 이슈 A 참고) - base URL 해석: `VITE_API_BASE_URL` 미설정이면 현재 origin →
      **mock(MSW)↔실백엔드 전환이 환경변수 하나로 결정**되는 구조 - 비-2xx 응답을 `ApiError(status, errorMessage)`로 정규화, refresh 쿠키용
      `credentials: 'include'` 기본 포함 - `main.tsx`: `VITE_API_BASE_URL` 설정 시 MSW worker를 켜지 않음 - MSW 핸들러 경로는 상대경로 유지 — 상대경로 매칭은 현재 origin 기준이라
      실행 포트와 무관하며, 와일드카드(`*/api/…`)는 타 호스트 요청까지
      가로채는 과잉 매칭이라 기각
- [x] 4. `authStore`(zustand) — accessToken 메모리 보관(SPEC 결정 2: persist 없음,
      refreshToken 미보관), UI용 `selectIsAuthenticated` 파생 셀렉터
- [x] 5. 공용 UI 3종 (`src/shared/ui/`) - `Input`: label-htmlFor 연결, 에러 시 `aria-invalid`/`aria-describedby` + `role="alert"` 메시지 - `Button`: primary/danger variant, disabled 토큰 색상 - `Modal`: 네이티브 `<dialog>` — showModal()이 포커스 트랩·ESC를 브라우저
      수준에서 보장
- [x] 6. `SignInForm` — RHF + zodResolver(`mode: 'onChange'`),
      `formState.isValid`로 제출 버튼 활성/비활성, 실패 시 errorMessage 모달,
      성공 시 `setAccessToken` 후 `/` 이동. 브라우저 기본 검증과 겹치지 않게
      form `noValidate`
- [x] 7. 페이지·라우트 연결 — `pages/sign-in/SignInPage` + `/sign-in` 라우트
- [x] 8. 테스트 인프라 — MSW node 서버(`src/test/server.ts`, 브라우저와 동일
      핸들러 재사용), setup에 RTL cleanup·핸들러 리셋·스토어 초기화
- [x] 9. 통합 테스트 3건 — 초기/유효성 미충족 시 비활성, 실패 모달 표시,
      성공 시 대시보드 이동 + 토큰 저장
- [x] 10. 검증 — 테스트 8건·typecheck·lint·build 통과, 브라우저 실구동으로
      실패 모달(백드롭·포커스 포함)과 성공 이동·refresh 쿠키 심김 확인

## 이슈 및 해결

### 이슈 A (작업 9 → 3-1로 해소) — 테스트에서 API 호출이 전부 실패

- **증상**: 실패 모달 테스트에서 기대한 errorMessage 대신 라우터 에러 바운더리/
  엉뚱한 메시지. 원 요청이 서버까지 가지 못함.
- **원인**: 코드가 `fetch('/api/sign-in')`처럼 상대 URL을 쓰는데, 브라우저와 달리
  **Node(vitest)의 fetch는 상대 URL을 지원하지 않아** URL 파싱 단계에서 throw.
- **1차 해결(폐기)**: 테스트 setup에서 `/`로 시작하는 입력만 jsdom origin 기준
  절대 URL로 보정하는 fetch 래퍼 적용. 동작은 했지만 테스트 인프라가 프로덕션
  코드의 결함을 덮는 구조라 리뷰에서 재설계.
- **최종 해결**: URL 해석을 API 기본 계층(작업 3-1)의 정식 책임으로 이동 —
  `new URL(path, VITE_API_BASE_URL || window.location.origin)`. 브라우저는 실행
  포트와 무관하게 자기 origin으로, 테스트(jsdom)는 jsdom origin으로 절대 URL이
  자동 구성되어 **테스트 전용 패치 코드를 삭제**함. mock↔실백엔드 전환
  스위치(base URL)와 같은 메커니즘을 공유하므로 별도 장치가 늘지 않음.

### 이슈 B (작업 5, 9) — jsdom이 `<dialog>` showModal 미구현

- **증상**: 모달 열릴 때 `TypeError: dialog.showModal is not a function` →
  라우터 에러 바운더리("Something went wrong!")로 렌더가 대체됨.
- **원인**: jsdom(v30 기준)은 `HTMLDialogElement`의 `showModal`/`close`를
  구현하지 않음.
- **해결**: 테스트 setup에 최소 polyfill(open 토글 + close 이벤트 발행) 추가.
  포커스 트랩 등 실제 동작은 브라우저 구동 검증으로 확인(검증 완료).

## 참고 결정

- 로그인 API 호출은 TanStack Query mutation 대신 RHF `isSubmitting` + async
  함수로 처리 — 캐시·무효화가 필요 없는 1회성 호출이라 도구를 늘리지 않음.
- 에러 모달 상태는 `useState` 지역 상태 — 전역 스토어 금지 원칙(SPEC) 준수.
- feature 전용이던 `SignInError`는 기본 계층의 `ApiError`로 통합 — 에러 규약을
  한 곳(shared/api)에서 관리.
