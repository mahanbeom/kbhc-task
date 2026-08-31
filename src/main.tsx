import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createAppRouter } from '@/app/router';
import { refreshAccessToken } from '@/shared/api/client';
import { ApiError } from '@/shared/api/http';

import '@/app/styles/index.css';

const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /* 4xx는 재시도해도 결과가 같다 — 401은 인터셉터가 refresh까지 마친 뒤의
       * 확정 실패고(재시도하면 죽은 세션에서 401이 증폭된다), 404는 즉시
       * 대체 화면을 보여야 한다. 그 외(네트워크·5xx)만 기본 횟수만큼 재시도. */
      retry: (failureCount, error) =>
        failureCount < 3 &&
        !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

/* 별도 서버가 없는 과제이므로 기본은 MSW mock 모드.
 * VITE_API_BASE_URL이 설정되면 실백엔드 모드로 간주해 MSW를 켜지 않는다. */
async function enableMocking() {
  if (import.meta.env.VITE_API_BASE_URL) return;
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

async function bootstrap() {
  await enableMocking();
  /* 새로고침 세션 복원(SPEC 결정 2): accessToken은 메모리에만 있으므로 렌더 전에
   * refresh 쿠키로 재획득한다. 실패(쿠키 없음·만료)는 미로그인 상태의 정상 흐름. */
  await refreshAccessToken().catch(() => undefined);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
