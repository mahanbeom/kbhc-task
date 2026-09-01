# kbhc-task

KB헬스케어 프론트엔드 과제 — 인증이 필요한 할 일 관리 SPA.

## 실행 방법

요구 환경: Node.js 22+, pnpm 10+

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

로그인 계정(mock 시드): `user@kbhc.co.kr` / `password1234`

별도 백엔드 없이 MSW가 API를 모킹합니다(모킹 코드도 제출물 —
`src/mocks/`). accessToken 만료가 60초로 짧게 설정되어 있어, 로그인 후
60초 뒤 아무 페이지나 이동하면 네트워크 탭에서 `401 → POST /api/refresh →
원 요청 재시도` 흐름을 직접 볼 수 있습니다.

```bash
pnpm test        # vitest (36건)
pnpm typecheck   # tsc -b
pnpm lint        # eslint
pnpm build       # tsc -b && vite build
```

`VITE_API_BASE_URL`을 설정하면 MSW를 켜지 않고 해당 주소의 실백엔드로
요청합니다 — mock↔실서버 전환 스위치가 환경변수 하나입니다.

## 기술 스택

| 선택                                 | 근거 요약                                                       |
| ------------------------------------ | --------------------------------------------------------------- |
| Vite + React 19 + TypeScript | CSR SPA — 전 화면이 인증 뒤라 SEO·서버 렌더 이점이 없음         |
| TanStack Router                      | 타입 안전 라우팅, `beforeLoad` 인증 가드, `notFound()` 404 처리 |
| TanStack Query                       | 서버 상태 전담, `useInfiniteQuery` 무한 스크롤                  |
| @tanstack/react-virtual              | 가상 스크롤. Router/Query와 동일 생태계                         |
| react-hook-form + zod                | 로그인 폼 유효성, openapi 규칙을 zod 스키마로 이관              |
| zustand                              | 인증 상태 하나만 전역 관리(그 외 전역 스토어 없음)              |
| MSW                                  | Authorization/쿠키 검증·만료 토큰 발급까지 재현하는 모킹        |
| Tailwind CSS v4                      | `@theme` CSS 변수로 색상 토큰 관리                              |

## 디렉터리 구조 (경량 FSD)

```
src/
  app/        엔트리 구성 — 라우터 팩토리(세션 소실 구독), 레이아웃(GNB/LNB), 전역 스타일·토큰
  routes/     TanStack Router 파일 기반 라우트 (_auth = 보호 라우트 가드)
  pages/      라우트가 렌더링하는 페이지 컴포넌트 (플랫 슬라이스)
  features/   sign-in(로그인 폼), task-delete(삭제 확인 모달)
  entities/   task / user / dashboard — openapi 대응 타입과 쿼리
  shared/
    api/      http(기본 계층: base URL·에러 정규화) + client(Bearer/refresh 인터셉터)
    auth/     zustand authStore (shared에 두는 이유: shared/api가 참조 — 역참조 방지)
    ui/       Button, Input, Modal
  mocks/      MSW 핸들러·시드·mock JWT (브라우저 worker와 테스트 node server 공용)
```

보일러플레이트 방지 규칙: 세그먼트(ui/model/api) 분리와 index.ts(public
API)는 필요해진 시점에만 도입, 재사용 없는 쿼리는 페이지가 소유.

## 문서

| 문서                                       | 내용                                                  |
| ------------------------------------------ | ----------------------------------------------------- |
| [docs/requirement.md](docs/requirement.md) | 원본 과제 요구사항                                    |
| [docs/openapi.yaml](docs/openapi.yaml)     | API 계약 (형상 충돌 시 우선 기준)                     |
| [docs/SPEC.md](docs/SPEC.md)               | 요구사항 분석 · 기술 결정 · 자의적 결정 사항 코멘트   |
| [docs/PLAN.md](docs/PLAN.md)               | 구현 계획 (수직 슬라이스 7개)                         |
| [docs/tasks/](docs/tasks/)                 | 슬라이스별 작업 기록 (체크리스트 + 이슈/해결)         |
| [docs/AI_USAGE.md](docs/AI_USAGE.md)       | AI 활용 내역 (도구·작업 범위·프롬프트·사람 검증 내용) |
