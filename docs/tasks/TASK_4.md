# TASK_4 — 할 일 목록

> 목표: `/task` 목록의 수직 슬라이스 — 페이지네이션 API(20건/페이지),
> useInfiniteQuery + useVirtualizer 결합(가상 스크롤 + 무한 스크롤),
> 카드(title/memo)·상세 이동·로딩/빈/에러 상태.
> requirement.md "할 일 (/task)" 절 충족, SPEC 결정 5(page size 20).

## 상세 작업 내용

- [x] 1. (TDD) `GET /api/task?page=` 핸들러 테스트 선행(5건) — 20건/hasNext,
      페이지 연속성(겹침 없음), 마지막 페이지 hasNext=false·범위 밖 빈 배열,
      page 누락/0 → 400, 미인증 401, TaskItem 형상(registerDatetime 미포함)
- [x] 2. MSW `GET /api/task` — 시드 slice, openapi대로 page required·min 1
      검증, `TASK_PAGE_SIZE = 20`은 seed.ts에서 단일 관리
- [x] 3. `entities/task` — model.ts(TaskItem/TaskListResponse), api.ts
      (`infiniteQueryOptions`, getNextPageParam: hasNext ? page+1 :
      undefined — 로직 단위 테스트 2건), index.ts(public API)
- [x] 4. `/task` 페이지 (`src/pages/task-list/TaskListPage.tsx`) —
      useVirtualizer(고정 88px, overscan 5) + 마지막 가상 row(로더) 노출 시
      `fetchNextPage({ cancelRefetch: false })` (공식 패턴 + 이슈 B),
      카드 Link → `/task/$id`, 로딩/빈/에러 상태
- [x] 5. 검증 — 테스트 28건·typecheck·build 통과, lint 경고 1건(참고 결정).
      브라우저: DOM row 15개(뷰포트 991px 기준, 화면 표시분+overscan 수준)
      유지하며 page 1→25 **순차·각 1회** 호출, 25페이지(hasNext=false) 도달
      후 로더 row 소멸·추가 스크롤에도 요청 0건. 도중 60초 토큰 만료로 발생한
      401 2건은 인터셉터가 refresh 후 재시도해 자동 복구(슬라이스 2 실전 검증).
      상세 라우트 이동 확인

## 이슈 및 해결

### 이슈 A (작업 4) — 가상화 무력화: 로드된 row 전부가 DOM에 렌더됨

- **증상**: DOM row 수가 로드된 항목 수(61)와 같고, 로더 row가 항상 화면에
  있어 다음 페이지가 연쇄 로드됨.
- **원인**: 레이아웃 루트가 `min-h-screen`이라 내용만큼 늘어남 → 스크롤
  컨테이너의 `h-full`이 상한 없이 커져 "보이는 영역"이 전체가 됨. 가상
  스크롤은 **확정된(bounded) 높이의 스크롤 컨테이너**가 전제다.
- **해결**: AppLayout을 `h-screen` 고정 + 중간 행 `min-h-0` + `main`
  `overflow-y-auto`로 변경 — 목록 페이지는 내부 스크롤 컨테이너가 뷰포트에
  묶이고, 다른 페이지는 main이 자연 스크롤.

### 이슈 B (작업 4) — 백그라운드 탭에서 fetchNextPage 요청 폭주·응답 폐기

- **증상**: 탭이 숨겨진(rAF 스로틀) 상태에서 연속 스크롤 이벤트 발생 시
  같은 page=2 요청이 수십 회 반복되고 응답이 전부 폐기되어 데이터가 쌓이지
  않음(네트워크 로그로 확인).
- **원인**: `fetchNextPage()`의 기본 `cancelRefetch: true`는 재호출 시
  **진행 중 요청을 취소하고 재시작**한다. isFetchingNextPage 가드가 있어도
  취소가 fetch 상태를 되돌리는 순간과 이벤트가 겹치면 취소→재요청이
  자기지속적으로 반복될 수 있다.
- **해결**: `fetchNextPage({ cancelRefetch: false })` — 진행 중 fetch가
  있으면 추가 호출이 no-op이 되어 중복 요청·응답 폐기가 구조적으로 불가능.
  수정 후 같은 조건에서 중복 0건 확인.

## 참고 결정

- **lint 경고 1건 유지**: React Compiler가 useVirtualizer(불안정 참조
  라이브러리) 사용 컴포넌트의 자동 메모화를 건너뛴다는 안내
  (`react-hooks/incompatible-library`). react-virtual 사용 시 예상되는
  동작이고 기능 영향이 없어 억제하지 않고 남긴다.
- **무한 스크롤 트리거는 로더 row 가시성**: IntersectionObserver 별도 도입
  대신 가상화가 이미 계산하는 "마지막 가상 아이템 index"를 재사용(TanStack
  공식 infinite-scroll 예제 패턴). 도구가 늘지 않는다.
- **끝 감지의 이중 안전장치**: hasNext=false면 ① 로더 row가 count에서
  빠져 트리거 자체가 없고 ② getNextPageParam이 undefined라 fetchNextPage가
  no-op — 어느 한쪽이 무너져도 초과 호출이 없다.
- **estimateSize 고정(88px)**: 카드가 2줄 고정 레이아웃(제목+메모 truncate)
  이라 동적 측정(measureElement)이 불필요. jsdom의 높이 측정 불가 문제도
  회피(핸드오프에서 예고된 제약 — UI 검증은 브라우저 실구동으로 대체).
