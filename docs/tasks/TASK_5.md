# TASK_5 — 할 일 상세 + 삭제

> 목표: `/task/:id` 상세의 수직 슬라이스 — 상세 조회(title/memo/
> registerDatetime), 404 대체 화면(목록 복귀 버튼), 삭제(id 재입력 확인
> 모달 → string 비교 일치 시에만 활성화 → 목록 redirect + 캐시 무효화).
> requirement.md "할 일 상세" 절 충족.

## 상세 작업 내용

- [x] 1. (TDD) `GET/DELETE /api/task/:id` 핸들러 테스트 선행(4건) — 상세
      형상(registerDatetime 포함), 미존재 404(GET/DELETE), DELETE 성공 시
      시드 제거·재조회 404·대시보드 집계 감소, 미인증 401
- [x] 2. MSW 핸들러 — GET/DELETE `/api/task/:id`, 공용 `verifyBearer`
- [x] 3. `entities/task` 확장 — TaskDetailResponse, `taskDetailQuery(id)`
      (queryOptions), `deleteTask(id)`
- [x] 4. 라우터 컨텍스트에 queryClient 연결 — `createRootRouteWithContext`,
      `createAppRouter(queryClient, history)`. 상세 라우트 loader가
      `ensureQueryData`로 선조회하고 404(ApiError)를 `notFound()`로 변환 →
      `notFoundComponent`가 대체 화면 렌더
- [x] 5. `/task/$id` 페이지 — `useSuspenseQuery`(loader가 데이터 보장 →
      pending/error 분기 없음), 등록 일시는 `Intl.DateTimeFormat('ko-KR')`
      (추가 의존성 없음, 계획 문서 결정)
- [x] 6. `features/task-delete/TaskDeleteButton` — 확인 모달(id 입력
      useState, `confirmInput !== taskId`면 비활성 — string 비교), 성공 시
      `/task` 이동 후 상세 캐시 remove + 목록·대시보드 invalidate,
      실패 시 모달 내 role="alert" 에러
- [x] 7. (TDD) 통합 테스트 4건 (`src/test/task-detail.test.tsx`) — 상세
      표시(포맷 포함), 404 화면+복귀 버튼, 활성화 조건(불일치·부분일치·
      초과입력 비활성), 삭제 성공 흐름(이동·캐시 제거·시드 반영)
- [x] 8. 검증 — 테스트 36건·typecheck·build 통과(lint 경고는 TASK_4 참고
      결정의 1건 유지). 브라우저: 로그인 redirect 복귀 → 상세 렌더 →
      모달(백드롭·포커스 트랩·비활성) → 불일치 비활성 유지 → 일치 활성 →
      삭제 → 목록 복귀(항목 소멸) → 대시보드 499/302/197 감소 반영 →
      미존재 id 404 대체 화면

## 이슈 및 해결

이번 슬라이스는 신규 이슈 없음. 참고 사항 하나:

- **full reload 후 삭제 항목 부활**: 새로고침하면 MSW 모듈이 재로드되며
  시드가 재생성되어 삭제가 초기화된다 — mock 서버 재시작 시 시드 리셋과
  동일한 본질적 특성(버그 아님). SPA 세션 내 일관성(삭제 후 404·목록/
  대시보드 반영)은 테스트와 브라우저에서 검증됨.

## 참고 결정

- **queryClient를 라우터 컨텍스트로**: 404를 컴포넌트 분기가 아닌 라우터
  `notFound()`로 처리하기 위해 loader에서 선조회가 필요했고, loader가
  queryClient에 접근하는 표준 방법이 컨텍스트다(TanStack Router+Query 공식
  통합 패턴). 부수 효과로 상세 페이지는 `useSuspenseQuery`로 pending/error
  분기가 사라짐.
- **삭제 후 캐시 전략**: 이동 먼저 → 상세 캐시는 invalidate가 아닌
  **remove** — invalidate는 refetch를 유발해 삭제된 리소스에 404를 내므로.
  목록·대시보드는 invalidate로 감소분 재조회(SPEC 완료 기준의 "목록 캐시
  무효화" 이행).
- **공용 테스트 렌더 헬퍼** (`src/test/render.tsx`): 라우터 컨텍스트 도입으로
  모든 테스트의 라우터 생성부가 바뀌어야 했음 — TASK_3 이슈 A에서 예고한
  Provider 조립 중복을 이번에 헬퍼 한 곳으로 통합(슬라이스 6 예정분 선반영).
- **확인 모달 상태는 useState**: RHF 미사용(SPEC 규칙 — 지역적 단일 입력),
  닫을 때 입력 초기화. 포커스 트랩·ESC는 네이티브 dialog가 보장.
- **시드 원복**: 삭제 테스트는 모듈 상태(seedTasks)를 바꾸므로 테스트 말미에
  같은 index로 재삽입해 파일 내 다른 테스트와 격리.
- **데이터 요청 시점 기준(리뷰 문답에서 확정)**: "응답이 라우팅 결정을
  바꾸는 곳만 loader" — 상세는 404 판정이 라우팅 관심사라
  loader(선조회)+`useSuspenseQuery`, 대시보드·회원정보는 라우팅 판정이
  없어 컴포넌트 `useQuery`(즉시 전환 + 페이지 내 로딩 표시).
  README 결정 사항에 기재 예정.

## 슬라이스 6 반영 예정 (리뷰 문답에서 합의)

1. **`ensureQueryData` → `queryClient.query()` 교체**: 설치된
   @tanstack/query-core 5.102에서 `ensureQueryData`가 deprecated
   (`queryClient.query({ ...options, staleTime: 'static' })`가 대체 API,
   다음 메이저에서 제거 예고). 동작 동일 — 상세 라우트 loader만 수정.
2. **mock 핸들러 응답 타입화**: 현재 성공·에러 응답 모두 타입 미지정
   리터럴(계약 준수는 런타임 테스트만 검증). MSW 제네릭
   (`http.get<Params, ReqBody, ResBody>`)으로 openapi 계약을 컴파일 타임에
   강제 — `ErrorResponse`는 `shared/api`(ApiError가 소비하는 형상),
   성공 응답은 entities 타입 재사용.
