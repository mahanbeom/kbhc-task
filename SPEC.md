# SPEC — KB헬스케어 프론트엔드 과제

원본 요구사항: [docs/requirement.md](docs/requirement.md) · API 계약: [docs/openapi.yaml](docs/openapi.yaml)
요구사항과 이 문서가 충돌하면 원본 요구사항이 우선하고, API 형상은 openapi.yaml이 우선한다.

## 무엇을

인증이 필요한 할 일 관리 SPA. 화면 5개 + 공통 내비게이션(GNB/LNB).

| 라우트 | 화면 | 핵심 요구 |
| --- | --- | --- |
| `/` | 대시보드 | 일(numOfTask) / 해야할 일(numOfRestTask) / 한 일(numOfDoneTask) 표기 |
| `/sign-in` | 로그인 | RHF 폼, label 표기, 유효성 표시, 조건 충족 시에만 제출 활성화, 실패 시 errorMessage 모달 |
| `/task` | 할 일 목록 | 카드 목록(title, memo), **가상 스크롤 + 무한 스크롤**(`page` param, `hasNext`) |
| `/task/:id` | 할 일 상세 | title/memo/registerDatetime 표시, 404 대체 화면(목록 복귀 버튼), 삭제(id 재입력 확인 모달 → 목록 redirect) |
| `/user` | 회원정보 | name, memo 표시 |

- GNB: 대시보드/할일 아이콘 + 로그인 상태에 따라 회원정보/로그인 아이콘 분기.
- 인증: JWT Bearer. 모든 조회 API가 인증 필수 → 비로그인 접근은 `/sign-in`으로 redirect.
- 토큰 갱신: accessToken 만료(exp) 시 `/api/refresh`(cookie 기반) → 원 요청 재시도.
- API는 MSW로 모킹하며 모킹 코드도 제출물이다.

## 왜

채용 과제. 기능 완성만이 아니라 다음이 평가된다고 판단한다:

- 스펙(특히 openapi.yaml에만 있는 refresh 플로우)을 읽어내는 능력
- 라이브러리 선택의 판단력 — 과한 도구 사용도 감점 요인
- 인증/에러/경계 상황(401, 404, 만료, 중복 호출) 처리의 견고함
- 접근성, 색상 토큰, 코드 일관성 같은 기본기
- AI 활용의 투명성 (AI_USAGE.md 가산점)

## 기술 스택과 근거

| 선택 | 근거 |
| --- | --- |
| Vite + React 19 + TypeScript | SSR 불필요(전 화면 인증 뒤). 요구사항의 React 18/19 + TS 충족 |
| TanStack Router | 타입 안전 라우팅, `beforeLoad` 인증 가드, `notFound()` 404 처리 |
| TanStack Query | 서버 상태 전담. `useInfiniteQuery`로 무한 스크롤 |
| @tanstack/react-virtual | 가상 스크롤 요구 충족. Router/Query와 동일 생태계 |
| react-hook-form + zod | 로그인 폼 유효성 + `isValid` 기반 제출 활성화. zod 스키마로 openapi 규칙 이관 |
| zustand | **인증 상태 하나만** 전역 관리(authStore). 그 외 전역 스토어 금지 |
| MSW | API 모킹. Authorization/cookie 검증, 만료 토큰 발급까지 재현 |
| TailwindCSS v4 | `@theme` CSS 변수로 색상 토큰 관리 요구를 함께 충족 |
| @heroicons/react | 아이콘. Tailwind Labs 제작으로 Tailwind와 자연스럽게 결합, 항목별 아이콘 구분 요구 충족 |
| Vitest + Testing Library | MSW 핸들러를 재사용한 통합 테스트 |

아키텍처는 FSD를 가볍게 적용한다: `app / pages / features / entities / shared`
(widgets/processes 레이어는 사용하지 않음). 보일러플레이트 방지 규칙:

- 세그먼트(ui/model/api) 분리는 슬라이스에 파일이 여러 개일 때만. 빈 폴더 금지.
- index.ts(public API)는 레이어 경계를 넘는 슬라이스에만 둔다.
- 재사용되지 않는 쿼리/컴포넌트는 해당 page가 직접 소유한다(억지로 entity로 승격하지 않음).

삭제 확인 모달의 input 등 지역적 상태는 `useState`로 처리한다(RHF 사용 안 함).

### 색상 토큰

kbhc.co.kr 실서비스 CSS에서 추출한 브랜드 컬러를 시맨틱 토큰으로 정의한다
(Tailwind `@theme` CSS 변수, 컴포넌트에서 hex 직접 사용 금지):

| 토큰 | 값 | 출처/용도 |
| --- | --- | --- |
| primary | `#ffd300` | KB Yellow(사이트 주 액센트). 버튼, 활성 상태 |
| primary-strong | `#ffbc00` | KB 브랜드 옐로우(진한 톤). hover/강조 |
| danger | `#f8670d` | 사이트 dialog-alert 색. 에러 모달, 삭제 버튼 |
| text | `#111` | 본문 텍스트 |
| text-muted | `#666` | 보조 텍스트(memo 등) |
| disabled | `#ccc` | 비활성 버튼/텍스트 |
| border | `#e5e5e5` | 카드/입력 테두리 |
| surface | `#f7f7f7` | 페이지 배경 |
| background | `#fff` | 카드/입력 배경 |

## 자의적 결정 사항 (제출 시 코멘트 대상)

1. **refresh 토큰 전달**: sign-in 핸들러는 스펙(AuthTokenResponse 필수 필드) 준수를
   위해 body로 refreshToken을 내려주고, 동시에 `Set-Cookie`(`token`)로도 심는다.
   **클라이언트는 body의 refreshToken을 사용하지 않는다** — 실서버라면 HttpOnly
   cookie만 내려주는 것이 표준이며, 과제 환경 재현을 위한 이중 전달임을
   해당 코드 주석과 README 결정 사항에 기재한다.
2. **accessToken 저장**: localStorage가 아닌 메모리(zustand authStore). 새로고침 시
   `/api/refresh`로 세션 복원. XSS 노출면 최소화 근거를 코멘트. 구현 제약:
   - refreshToken은 store에 저장하지 않는다(HttpOnly cookie만이 유일한 보관처).
   - persist 미들웨어를 사용하지 않는다(메모리 저장 결정과 모순).
   - API 인터셉터에서는 훅이 아닌 `useAuthStore.getState()`로 읽는다.
   - GNB 등 UI는 토큰 원문이 아닌 파생 boolean(`isAuthenticated`) 셀렉터만
     구독한다(토큰 갱신 시 불필요한 리렌더 방지).
3. **비로그인 접근**: 보호 라우트(`/`, `/task`, `/task/:id`, `/user`) 진입 시
   `/sign-in`으로 redirect. 로그인 성공 시 원래 가려던 곳으로 복귀(redirect search param).
4. **회원정보 라우트**: 문서에 미지정 → `/user`로 결정.
5. **목록 page size**: 20개로 시작하고, UI 확인 후 필요 시 조정한다.
   가상 스크롤 검증을 위해 mock 데이터는 500건 이상 시드.
6. **로그아웃**: 요구사항에 없음 → 회원정보 페이지에 로그아웃 버튼만 추가(상태 초기화
   확인용). 과잉 구현 방지를 위해 그 외 기능 추가 금지.
7. **토큰 만료 재현**: mock accessToken exp를 짧게(예: 60초) 설정해 refresh 플로우가
   실제로 동작함을 시연 가능하게 한다.
8. **GNB/LNB 배치**: 문서의 두 그룹을 각각 매핑 — GNB(상단): 로고 + 우측
   로그인/회원정보 아이콘 분기, LNB(좌측): 라우트 맵(대시보드/할일, 활성 메뉴 강조).
   루트 레이아웃 라우트 하나로 렌더링하며 `/sign-in`에서도 표시(비로그인 시 로그인
   아이콘을 보여준다는 요구의 전제). 활성 상태는 라우터 `Link`의
   `activeProps`/`aria-current`로 처리, 별도 상태 없음. 좁은 화면에서는 LNB 텍스트
   레이블만 숨겨 아이콘 레일로 축소(그 이상의 반응형은 범위 외).

## 완료 기준

기능:
- [ ] 로그인: 유효성 미충족 시 제출 비활성 + 인라인 에러, 200 아닌 응답 시 errorMessage 모달, 성공 시 이동
- [ ] GNB 아이콘이 로그인 상태에 따라 분기하고 각 라우트로 이동
- [ ] 대시보드에 3개 지표 표시
- [ ] 목록: 카드에 title/memo, 가상 스크롤(DOM 노드 수가 화면 표시분 수준), 끝 도달 시 다음 페이지 호출, `hasNext=false` 이후 미호출
- [ ] 상세: 데이터 표시, 404 대체 화면 + 목록 복귀 버튼
- [ ] 삭제: id 일치 시에만 제출 활성화, 성공 시 목록 redirect(목록 캐시 무효화 포함)
- [ ] 회원정보 표시
- [ ] 만료 토큰으로 요청 → 자동 refresh → 원 요청 성공 (새로고침 세션 복원 포함)
- [ ] refresh 실패(401) 시 로그인으로 이동, 무한 재시도 없음

품질:
- [ ] `tsc --noEmit`, lint, 테스트, 빌드 모두 통과
- [ ] 색상은 토큰으로만 사용(하드코딩 hex 금지), Pretendard 적용, 항목별 아이콘 지정
- [ ] 모든 input에 label 연결, 에러 메시지 aria 연결, 모달 포커스 관리
- [ ] 핵심 플로우 테스트 존재: 로그인 유효성/실패 모달, refresh 재시도, 삭제 확인
- [ ] code-reviewer subagent 리뷰에서 Critical/Major 0건

제출물:
- [ ] README(실행 방법, 구조, 결정 사항 코멘트), AI_USAGE.md(필수 4항목 + 선택: 계획 문서, subagent 설정)
- [ ] 슬라이스 단위 커밋 히스토리
