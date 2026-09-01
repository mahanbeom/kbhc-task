# 구현 계획 — KB헬스케어 프론트엔드 과제

## Context

채용 과제 구현. 요구사항 분석과 기술 결정은 [SPEC.md](SPEC.md)에서 확정됨
(스택: Vite + React 19 + TS 6 + TanStack Router/Query/Virtual + RHF/zod + zustand + MSW + Tailwind v4 + heroicons,
경량 FSD, 자의적 결정 8건 포함). 저장소는 빈 상태(README, docs/, SPEC.md, .claude/agents/code-reviewer.md).

진행 방식은 사용자 표준 프로세스대로 **수직 슬라이스 7개**, 슬라이스마다
`구현 → 검증(typecheck·lint·test·실제 구동) → 커밋`. 로직성 코드(zod 스키마, 인터셉터,
삭제 활성화 조건)는 테스트 선행(TDD). code-reviewer subagent는 슬라이스 2(인증 코어)와
슬라이스 6(최종)에서 실행. AI_USAGE.md 기록은 슬라이스 0부터 누적.

## 디렉터리 구조 (경량 FSD)

```
src/
  app/            # 엔트리, Provider(QueryClient), 라우터, 레이아웃(GNB/LNB), 전역 스타일·토큰
  routes/         # TanStack Router 파일 기반 라우트 (__root, index, sign-in, task/, user)
  pages/          # 라우트가 렌더링하는 페이지 컴포넌트
  features/       # sign-in(RHF 폼), task-delete(확인 모달)
  entities/       # task(타입·쿼리·무한스크롤), user, dashboard는 page 소유(재사용 없음)
  shared/
    api/          # fetch 클라이언트 + Bearer/refresh 인터셉터
    auth/         # zustand authStore (shared에 두는 이유: shared/api가 참조해야 하므로 FSD 역참조 방지)
    ui/           # Button, Input, Modal 등
  mocks/          # MSW 핸들러, 시드 데이터, JWT 유틸(browser worker + 테스트용 node server 공용)
```

## 슬라이스

### 0. 스캐폴딩 (커밋: chore: scaffold project)
- `pnpm create vite` react-ts 템플릿 → TypeScript **^6 고정** 후 `~/.claude/templates/js-ts/setup.sh` 적용.
  Vite가 만든 eslint.config.js는 kit 기반으로 교체, tsconfig은 Vite 구조 유지(스크립트가 skip함).
- 의존성 설치: TanStack Router(+file-based 라우팅 Vite 플러그인)/Query/Virtual, RHF+zod+resolvers,
  zustand, msw, tailwindcss@4(+@tailwindcss/vite), @heroicons/react, pretendard(npm),
  vitest+@testing-library/react+jsdom.
- Tailwind `@theme`에 SPEC 색상 토큰 정의, Pretendard 적용.
- 라우트 뼈대(`__root` = GNB/LNB 셸 + Outlet, 각 라우트 placeholder), QueryClient Provider,
  MSW browser worker 초기화(핸들러는 슬라이스별 추가; 배포 없는 과제이므로 항상 모킹).
- `.claude/launch.json`에 dev 서버 등록(브라우저 패널 확인용).
- 검증: dev 구동 화면 확인, typecheck/lint/build/vitest smoke 통과.

### 1. 로그인 (feat: sign-in)
- TDD: `features/sign-in/model/schema.test.ts` 먼저 — email 형식, password `^[A-Za-z0-9]{8,24}$`.
- MSW: `POST /api/sign-in` — 시드 계정 일치 시 JWT 2개(body) + refreshToken `Set-Cookie`(**결정 1**:
  body 값은 클라이언트 미사용, 주석 명기), 불일치 시 400 `{errorMessage}`.
- `/sign-in` 페이지: RHF+zodResolver(`mode: 'onChange'`), label 연결, 인라인 에러(aria-describedby/aria-invalid),
  `formState.isValid`로 제출 활성화, 실패 시 errorMessage 모달(shared/ui/Modal 신규), 성공 시
  authStore에 accessToken 저장 후 `/` 이동.
- authStore 최소 구현(**결정 2**: 메모리만, persist 없음, refreshToken 미보관).
- 검증: 스키마·폼 테스트, 브라우저에서 실패/성공 시나리오.

### 2. 인증 인프라 (feat: auth infrastructure) — 최고 난이도
- TDD: 인터셉터 테스트 먼저(MSW node server 사용) — ① 만료 토큰 → refresh → 원 요청 재시도 성공
  ② refresh 401 → 스토어 초기화, 재시도 없음(무한 루프 방지) ③ 동시 401 N건 → refresh **1회만**(single-flight 공유 Promise).
- `shared/api/client.ts`: fetch 래퍼 — Bearer 부착(`useAuthStore.getState()`), 401 시 위 로직.
- MSW: `POST /api/refresh`(cookie 검증, exp 60초 accessToken 발급 — **결정 7**), `GET /api/user`.
- 라우트 가드: 보호 라우트 `beforeLoad`에서 미인증 시 `/sign-in?redirect=` → 로그인 성공 시 복귀(**결정 3**).
- 앱 부트스트랩 시 refresh로 세션 복원(**결정 2**), GNB 아이콘 분기(`isAuthenticated` 셀렉터),
  `/user` 페이지(name/memo) + 로그아웃 버튼(**결정 6**).
- 검증 후 **code-reviewer 1차 리뷰** → Critical/Major 해소 → 커밋.

### 3. 대시보드 (feat: dashboard)
- `mocks/`에 task 시드 500건 생성(제목/메모/status 무작위, **결정 5**), `GET /api/dashboard`는 시드에서 집계.
- `/` 페이지: 지표 카드 3개(일/해야할 일/한 일) + 항목별 아이콘.
- 검증: 브라우저 확인, 집계 정확성 테스트 1건.

### 4. 할 일 목록 (feat: task list)
- MSW: `GET /api/task?page=` — 20건/페이지, `{data, hasNext}`.
- `entities/task`: 타입(openapi 스키마 대응) + `useInfiniteQuery`(`getNextPageParam: hasNext ? page+1 : undefined`).
- `/task` 페이지: `useVirtualizer` + 마지막 가상 row 노출 시 `fetchNextPage`(공식 패턴), 카드에 title/memo,
  클릭 시 상세 이동, 로딩/빈/에러 상태.
- 검증: DOM 노드 수가 화면 표시분 수준인지 브라우저에서 확인, `hasNext=false` 이후·스크롤 반복 시
  중복 호출 없음(네트워크 로그), 테스트(페이지 파라미터 로직).

### 5. 상세 + 삭제 (feat: task detail & delete)
- MSW: `GET/DELETE /api/task/:id`(미존재 시 404).
- `/task/$id` 페이지: title/memo/registerDatetime(`Intl.DateTimeFormat`, 추가 의존성 없음) 표시,
  404는 라우터 `notFound()` → 목록 복귀 버튼 화면.
- `features/task-delete`: 삭제 버튼 → 확인 모달(id 입력 `useState`, string 비교 일치 시에만 제출 활성화,
  포커스 트랩) → 성공 시 목록·대시보드 쿼리 invalidate + `/task` redirect.
- TDD: 활성화 조건 및 삭제 흐름 테스트.

### 6. 마감 (chore: polish & docs)
- 접근성 점검(label/aria/포커스 순회), `grep`으로 토큰 외 hex 하드코딩 검사, 아이콘 중복 확인.
- **code-reviewer 최종 리뷰** → Critical/Major 0건까지 수정.
- README(실행 방법, 구조, SPEC 자의적 결정 8건 코멘트), AI_USAGE.md(필수 4항목 + 선택: SPEC.md,
  본 계획 문서, .claude/agents/code-reviewer.md).
- SPEC 완료 기준 체크리스트 전체 대조.

## 검증 방법 (매 슬라이스 공통 + 최종)

- 명령: `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build`
- 실제 구동: launch.json으로 dev 서버 → 브라우저 패널에서 해당 슬라이스 시나리오 확인
- 최종 워크스루: 비로그인 `/` 접근 → `/sign-in` redirect → 유효성 에러/실패 모달 → 로그인 →
  대시보드 → 목록 스크롤(가상화+무한) → 상세 → 삭제(불일치 비활성 → 일치 삭제) → 목록 복귀 →
  회원정보 → 60초 대기 후 API 호출로 자동 refresh 확인 → 새로고침 세션 복원 확인
- 유의: 60초 exp 대기가 번거로우면 mock에 exp 짧은 토큰 강제 발급 헬퍼를 두어 시연 시간 단축

## 커밋 단위

슬라이스당 1커밋(위 명명), 슬라이스 0 이전에 현재 준비물(SPEC.md, docs/, agent 설정)을
`docs: add spec and assignment docs`로 먼저 커밋.
