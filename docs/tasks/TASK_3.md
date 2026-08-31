# TASK_3 — 대시보드

> 목표: `/` 대시보드의 수직 슬라이스 — task 시드 500건 생성,
> `GET /api/dashboard` 집계 핸들러, 지표 카드 3개(일/해야할 일/한 일) +
> 항목별 아이콘. requirement.md "대시보드 (/)" 절 충족, SPEC 결정 5(시드
> 500건 이상) 이행.

## 상세 작업 내용

- [x] 1. task 시드 500건 (`src/mocks/seed.ts`) — 제목/메모/status 무작위,
      고정 시드 PRNG(mulberry32)로 매 실행 동일 데이터(테스트·디버깅 재현성).
      슬라이스 5(상세) 대비 registerDatetime 포함, 삭제가 조작할 수 있게
      mutable 배열
- [x] 2. (TDD) 집계 정확성 테스트 선행 (`src/mocks/handlers.test.ts`) —
      red 확인 후 구현. 응답 3개 지표가 시드 배열 직접 집계와 일치 +
      rest+done=total 불변식 + 시드 500건 이상, 미인증 401
- [x] 3. MSW `GET /api/dashboard` — 저장된 숫자가 아니라 매 요청 시드
      배열에서 집계(슬라이스 5 삭제 후 invalidate 시 감소 반영 대비),
      공용 `verifyBearer`로 Bearer 검증
- [x] 4. `/` 페이지 (`src/pages/dashboard/DashboardPage.tsx`) — 지표 카드
      3개, 항목별 아이콘(일 RectangleStack / 해야할 일 Clock / 한 일
      CheckCircle), 로딩/에러(role="alert") 상태. 쿼리는 페이지 소유
      (SPEC 보일러플레이트 방지 규칙)
- [x] 5. 검증 — 테스트 21건·typecheck·lint·build 통과. 브라우저 실구동:
      로그인 → 대시보드 카드 3개 렌더(일 500 / 해야할 일 302 / 한 일 198,
      합계 일치), 콘솔 에러는 미로그인 상태의 의도된 refresh 401 1건뿐

## 이슈 및 해결

### 이슈 A (작업 4) — 대시보드가 useQuery를 쓰면서 기존 로그인 테스트 실패

- **증상**: SignInForm 테스트 3번(로그인 성공 시 대시보드 이동)이
  "No QueryClient set" 에러로 실패.
- **원인**: 이 테스트는 QueryClientProvider 없이 라우터만 렌더했는데,
  로그인 성공 후 이동하는 `/`가 이번 슬라이스부터 useQuery를 사용.
- **해결**: 테스트 헬퍼에 retry: false QueryClient Provider 추가
  (auth.test.tsx의 renderApp과 동일 구성).
- **범위**: 테스트 헬퍼 한정 문제 — 실제 앱은 main.tsx에서 항상
  QueryClientProvider가 라우터를 감싸므로 개발/운영 환경에서는 발생하지
  않는다. 테스트 헬퍼들이 Provider 구성을 각자 복제하는 구조는 슬라이스
  6에서 공용 렌더 헬퍼로 정리 검토.

## 참고 결정

- **시드 무작위를 고정 시드 PRNG로**: `Math.random()`이면 실행마다 집계가
  달라져 "브라우저에서 본 숫자"와 "테스트가 본 숫자"를 대조할 수 없다.
  mulberry32(6줄)로 무작위스러운 분포와 재현성을 동시에 확보.
- **집계 캐싱 안 함**: 500건 filter는 요청당 비용이 무시 가능한 수준이고,
  시드가 mutable(삭제 반영)이라 미리 계산해두면 오히려 무효화 문제가 생긴다.
- **날짜 기준 고정**: registerDatetime은 고정 기준일(2026-08-01)에서 과거
  1년 분포 — `Date.now()` 기반이면 실행 시점마다 달라져 재현성이 깨진다.
