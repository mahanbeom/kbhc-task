# TASK_0 — 프로젝트 스캐폴딩

> 커밋: `chore: scaffold project` (206fb32)
> 목표: 이후 모든 기능 슬라이스가 올라탈 기반 구성 — 빌드 도구, 라우팅, 스타일
> 토큰, 모킹, 테스트 환경을 만들고 실행 가능한 상태로 검증한다.

## 상세 작업 내용

- [x] 1. Vite `react-ts` 템플릿 생성 후 저장소 루트로 이동 (React 19, TypeScript ~6.0)
- [x] 2. 코드 품질 도구 구성 — ESLint flat config(`@eslint/js` +
      `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-config-prettier`),
      Prettier(`.prettierrc.json`), `lint`/`format`/`typecheck` 스크립트 등록.
      템플릿 기본 린터(oxlint)는 제거 (생성 파일 `routeTree.gen.ts`,
      `mockServiceWorker.js`는 lint/format 제외)
- [x] 3. tsconfig 보강 — 템플릿에 빠져 있던 `strict`,
      `noUncheckedIndexedAccess`, `noImplicitOverride` 추가
- [x] 4. 의존성 설치 - 런타임: `@tanstack/react-router` `@tanstack/react-query`
      `@tanstack/react-virtual` `react-hook-form` `zod` `@hookform/resolvers`
      `zustand` `@heroicons/react` `pretendard` - 개발: `@tanstack/router-plugin` `tailwindcss` `@tailwindcss/vite` `msw`
      `vitest` `@testing-library/*` `jsdom`
- [x] 5. TailwindCSS v4 구성 — `@theme`에 kbhc.co.kr 브랜드 기반 색상 토큰 정의
      (`primary #ffd300`, `danger #f8670d` 등, SPEC 참고), Pretendard 적용
- [x] 6. TanStack Router 파일 기반 라우팅 구성 (`@tanstack/router-plugin` +
      `src/routes/`), 5개 라우트 뼈대 생성 (`/`, `/sign-in`, `/task`,
      `/task/$id`, `/user`)
- [x] 7. GNB/LNB 레이아웃 셸 (`src/app/layout/AppLayout.tsx`) — GNB(로고+계정
      아이콘), LNB(대시보드/할일, `activeProps`로 활성 표시), SPEC 결정 8
- [x] 8. MSW 초기화 — `public/mockServiceWorker.js` 생성, 빈 핸들러 배열 +
      browser worker, `main.tsx`에서 worker 기동 후 렌더
- [x] 9. Vitest + Testing Library 셋업 (jsdom 환경) + 라우터 smoke 테스트 1건
- [x] 10. `.claude/launch.json`에 dev 서버 등록 (브라우저 패널 구동 확인용)
- [x] 11. 검증 — `typecheck`/`lint`/`test`/`build` 통과, dev 서버 구동 후
      브라우저에서 레이아웃·라우팅·토큰·폰트 적용 확인 (콘솔 에러 없음)

## 이슈 및 해결

### 이슈 A (작업 2, 4, 8 관련) — pnpm 11의 빌드 스크립트 차단으로 설치·실행 실패

- **증상**: msw의 postinstall 스크립트가 차단되며
  `ERR_PNPM_IGNORED_BUILDS` 발생. 이후 `pnpm exec`/`pnpm install`이 실행 전
  의존성 검증 단계에서 같은 이유로 exit 1.
- **원인**: pnpm 11은 의존성의 빌드 스크립트를 기본 차단하고, 허용/불허를
  명시하기 전까지 오류로 취급한다.
- **해결**: `pnpm-workspace.yaml`에 `allowBuilds: { msw: false }`로 "의도적으로
  실행하지 않음"을 명시해 오류 해제. (worker 파일이 저장소에 커밋되어 있어
  postinstall의 자동 동기화 없이도 동작에 문제 없음 — 이슈 B 참고)
- **추가 조사** (버전 정책 관련):
  - 버그가 아니라 공급망 공격 대응으로 **pnpm 10부터 도입된 의도적 기본값**
    (의존성 빌드 스크립트 기본 차단). 11은 미결정 패키지를 경고가 아닌 오류로
    격상했고, `allowBuilds` 명시가 공식 해법.
  - pnpm에는 LTS 채널이 없음 — 레지스트리 dist-tags 기준 `latest = 11.x`이며
    `lts` 태그 부재. 11 사용이 표준.
  - 9로 다운그레이드하면 오류는 사라지지만 보안 기본값을 포기하는 교환이라
    채택하지 않음.
  - msw postinstall의 실제 역할(정정): 후원 안내가 아니라 **`msw.workerDirectory`에
    worker 파일을 자동 동기화**하는 스크립트. 차단해도 최초 생성된 worker가
    커밋되어 있으면 무해하며, 대신 msw **업그레이드 시 자동 동기화가 없으므로**
    `pnpm exec msw init`을 수동 재실행해야 한다(아래 이슈 B).
  - 의존성 트리 전수 스캔 결과 install 계열 스크립트 보유 패키지는 **msw
    하나뿐** — 다른 라이브러리 영향 없음. 향후 네이티브 빌드 패키지(sharp 등)
    추가 시에만 `allowBuilds: true` 등록 필요.

### 이슈 B (작업 8) — `msw init public --save` 실패

- **증상**: `--save`가 내부적으로 `pnpm install`을 재실행하다 이슈 A와 동일하게
  실패, worker 파일이 생성되지 않음.
- **원인(정확화)**: allowBuilds가 **아직 설정되기 전** 시점이라 모든
  `pnpm install`이 미결정-빌드 오류로 실패하던 상황. `--save`의 내부 install도
  같은 이유로 실패한 것 — allowBuilds 적용이 안 되는 것이 아니라 적용 전이었다.
  설정 후 재확인 결과 `pnpm exec msw init`은 정상 동작한다.
- **해결**: worker 파일을 `node_modules/msw/lib/mockServiceWorker.js`에서
  `public/`으로 복사하고(복사 방향: 패키지 → 저장소), `package.json`의
  `msw.workerDirectory`를 수동 기록.
- **다른 사용자 clone 시 영향 검증**: `public/mockServiceWorker.js`가 저장소에
  커밋되어 있으므로 원격에서 내려받은 사용자도 추가 절차 없이 동작한다.
  clean clone → `pnpm install` → `test`/`build` 전 과정 통과를 실제로 재현해
  확인함. 유일한 유의점: postinstall 자동 동기화를 꺼둔 상태이므로 **msw
  버전 업그레이드 시 `pnpm exec msw init`으로 worker 파일을 갱신 후 커밋**해야
  한다(버전 불일치 시 msw가 런타임 경고를 출력).

### 이슈 C (작업 2) — `typecheck` 스크립트가 아무것도 검사하지 않음

- **증상**: 처음 등록한 `typecheck: tsc --noEmit`이 항상 즉시 성공.
- **원인**: Vite 템플릿의 루트 `tsconfig.json`은 `files: []` + project
  references 구조라 루트에서 `tsc --noEmit`을 돌리면 검사 대상이 0개다.
- **해결**: `typecheck: tsc -b`로 변경해 references(app/node) 전체를 검사.

### 이슈 D (작업 11) — 첫 실행 시 `pnpm build` 실패 (`routeTree.gen.ts` 없음)

- **증상**: `build`는 `tsc -b && vite build` 순서인데, 라우트 트리 생성 파일이
  vite 플러그인 실행 시점에 만들어지므로 최초 1회는 tsc가 먼저 실패.
- **해결**: `pnpm exec vite build`를 먼저 1회 실행해 `routeTree.gen.ts` 생성.
  이후 재발 방지를 위해 생성 파일을 커밋에 포함(리뷰어가 clone 직후
  `typecheck`부터 실행해도 통과하도록). lint/format에서는 제외.

## 참고 결정

- TypeScript는 템플릿 기본인 6.0.x 사용 (typescript-eslint 8.x가 TS 7을 아직
  지원하지 않음).
- 설정은 외부 공유 설정 패키지 없이 저장소 안에 자체 완결로 둔다 — 리뷰어가
  clone만으로 동일 환경을 재현할 수 있어야 하므로.
- MSW는 dev/빌드 구분 없이 항상 활성화 — 별도 서버가 없는 과제 특성상 preview
  빌드에서도 동일하게 동작해야 하므로.
