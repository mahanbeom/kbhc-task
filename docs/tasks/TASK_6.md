# TASK_6 — 마감 (polish & docs)

> 목표: 슬라이스 5까지 쌓인 후속 반영 + 품질 점검 + code-reviewer 최종
> 리뷰 + 제출 문서(README, AI_USAGE.md) + SPEC 완료 기준 전체 대조.

## 상세 작업 내용

- [x] 1. TASK_5 예정 반영 ① — 상세 라우트 loader의 `ensureQueryData`
      (deprecated) → `queryClient.query({ ...options, staleTime: 'static' })`
      (query-core 5.102의 deprecation 지침 그대로, 동작 등가)
- [x] 2. TASK_5 예정 반영 ② — mock 핸들러 응답 타입화: 전 핸들러에 MSW
      제네릭(`http.method<Params, ReqBody, ResBody>`) 지정, `verifyBearer`/
      `issueTokens`는 `StrictResponse<T>`. 계약 타입 단일 출처화 —
      `ErrorResponse`(shared/api), `AuthTokenResponse`(shared/api/client
      export), `UserResponse`/`DashboardResponse`(entities 승격 — 쿼리는
      여전히 페이지 소유, 계약 타입만 공유), `DeleteTaskResponse`
      (entities/task). 테스트의 중복 로컬 타입 4곳 제거
- [x] 3. 품질 점검 — hex 하드코딩 0건(토큰만 사용), heroicons 6종 전부
      고유(항목별 아이콘 구분 충족), raw input 없음(전부 label 연결 Input),
      아이콘 전부 aria-hidden
- [x] 4. code-reviewer 최종 리뷰 — Critical 0 / Major 2 / Minor 7 →
      전건 해소(아래 리뷰 결과 참고)
- [x] 5. README.md — 실행 방법(시드 계정·refresh 시연법·API_BASE 스위치),
      스택 근거, 구조, SPEC 결정 8건 + 구현 중 확정 결정 7건 코멘트
- [x] 6. AI_USAGE.md — 필수 4항목 + 선택(계획 문서 사본 docs/PLAN.md,
      subagent 설정, TASK_n 기록)
- [x] 7. SPEC 완료 기준 16항목 전수 대조·체크 + 브라우저 최종 워크스루
      (로그인 → 상세 → 삭제 모달 문구·백드롭·ESC, 모바일 뷰포트에서
      LNB 접근성 이름 유지 확인)
- [x] 8. 검증 — 테스트 36건·typecheck·lint·build 통과

## code-reviewer 최종 리뷰 결과 (작업 4)

Critical 0 / Major 2 / Minor 7 — 전건 반영:

- **M1 (반영)** README 스텁·AI_USAGE.md 부재 → 작업 5·6으로 작성.
- **M2 (반영)** 좁은 화면에서 LNB 레이블이 `hidden`(display:none)으로
  숨겨져 링크가 접근 가능한 이름을 잃음(WCAG 4.1.2) →
  `sr-only sm:not-sr-only`로 시각적 숨김만 적용. 모바일 뷰포트(375px)에서
  이름 유지 브라우저 확인.
- **m1 (반영)** 다음 페이지 fetch가 최종 실패(5xx·네트워크)한 뒤 로더
  row가 보이는 동안 effect가 재발화해 실패→재요청 무한 루프 가능 →
  트리거 조건에 `!isError` 게이트 추가.
- **m2 (반영)** 삭제 확인 모달 제출 버튼 문구 — requirement.md가 백틱으로
  `제출`을 명시("원본 요구 우선" 규칙) → "삭제"에서 "제출"로 변경.
- **m3 (반영)** Modal backdrop이 토큰 밖 색(`bg-black/50`) 사용 →
  `--color-overlay` 토큰 추가 후 `backdrop:bg-overlay`.
- **m4 (반영)** `createAppRouter`의 스토어 구독 미해제 — 테스트에서
  renderApp마다 구독 누적 → 팩토리가 `{ router, dispose }`를 반환하고
  test/render.tsx가 afterEach에서 일괄 해제.
- **m5 (반영)** features 슬라이스 public API 부재(자체 규칙과 비대칭) →
  `features/sign-in`, `features/task-delete`에 index.ts 추가.
- **m6 (반영)** 미참조 자산 `public/icons.svg` 제거.
- **m7 (반영)** 본 문서 갱신.

## 이슈 및 해결

이번 슬라이스는 신규 이슈 없음(리뷰 지적 반영은 위 절 참고).

## 최종 요구사항 대조 (사용자 검수 라운드)

리뷰 반영 이후 사용자가 requirement.md·openapi.yaml을 항목별로 재대조하며
지시한 최종 수정들:

- **refresh 실패 코드 구분(400/401)** — openapi에 400·401이 모두 정의되어
  있는데 401만 구현돼 있던 것을 지적받아 구분 구현: 쿠키 부재 → 400,
  쿠키 무효·만료 → 401. 핸들러 테스트 추가. 클라이언트 인터셉터는 코드
  무관 세션 종료 처리라 변경 없음. 로그아웃 직후 refresh는 쿠키가 삭제된
  상태라 400이 정답이 되어 기존 테스트 기대값 정정.
- **deprecated API 전수 재점검** — 직접 의존성 전체의 타입 정의에서
  `@deprecated`를 스캔해 사용 코드와 대조. msw `StrictResponse`(→
  `HttpResponse<T>`) 2곳 교체로 **src 내 deprecated 사용 0건**. 나머지
  스캔 결과(fetchQuery/prefetchQuery, useBlocker, ScrollRestoration,
  waitUntilReady, RHF 별칭, zod `.email()`)는 전부 미사용 확인.
- **로그인 폼 에러 문구 동작** — 입력을 전부 지우면 에러 문구를 숨기고
  다시 틀리면 재표시(표시 조건만 추가, 검증·제출 비활성 로직 불변).
  동작 테스트 1건 추가. 로그인 버튼명도 requirement 표기대로 "제출"로
  변경(사용자 직접 수정)에 맞춰 테스트 갱신. 구독은 `watch()`가 아닌
  `useWatch` 훅 사용 — watch는 React Compiler가 메모이즈할 수 없어
  컴포넌트 컴파일이 스킵된다는 lint 경고를 사용자가 clean clone 검증에서
  발견해 교체(잔여 경고는 문서화된 useVirtualizer 1건뿐).
- **버튼 커서** — Tailwind v4 preflight가 버튼 기본 커서를 pointer→default로
  바꿔 클릭 가능성이 안 보이던 것을 공용 Button에 `cursor-pointer` 추가로
  일괄 해결(비활성 not-allowed 유지).
- **상세 404 요구사항 확인 셋팅** — 미존재 id 직접 접근·삭제 후 재접근
  두 경로로 404 대체 화면(목록 복귀 버튼) 확인 환경 제공, 사용자 검수.
- **문서 정리(사용자 지시)** — SPEC·AI_USAGE를 docs/로 이동, README를
  실행/스택/구조 + 문서 표 구성으로 재편(결정 사항은 SPEC으로 이관),
  AI_USAGE 도구 표기 정정(CLI → 데스크톱 앱)과 말투 통일, `tsc --noEmit`
  오기를 `tsc -b`로 정정(SPEC·code-reviewer 설정), 프롬프트 원문은 검토 후
  미제출 결정.

## 참고 결정

- **sign-out 응답 타입은 mock 로컬 정의**: openapi에 없는 엔드포인트라
  계약 타입이 없다 — task의 `DeleteTaskResponse`를 재사용하면 의미가
  어긋나므로 handlers 내부에 `SignOutResponse`로 별도 선언.
- **SPEC 완료 기준 대조 결과**: 기능 9항목·품질 5항목·제출물 2항목 전부
  충족 확인(SPEC.md 체크박스 갱신). 리뷰가 지적한 "부분 충족" 항목들
  (M2 접근성, m1 재시도 루프)은 반영 후 충족으로 전환.
