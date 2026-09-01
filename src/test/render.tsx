import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { afterEach } from 'vitest';

import { createAppRouter } from '@/app/router';

/* 테스트가 만든 라우터들의 스토어 구독을 매 테스트 후 해제한다 — 해제하지
 * 않으면 언마운트된 라우터들이 스토어 전이마다 navigate를 수행한다 */
const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers) dispose();
  disposers.length = 0;
});

/* 앱과 동일한 구성(라우터 팩토리 + QueryClientProvider)으로 렌더한다.
 * 테스트마다 Provider 조립을 복제하면 앱 구성이 진화할 때 테스트가
 * 뒤처진다(TASK_3 이슈 A) — 조립은 이 헬퍼 한 곳에서만 한다. */
export function renderApp(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { router, dispose } = createAppRouter(
    queryClient,
    createMemoryHistory({ initialEntries: [initialPath] }),
  );
  disposers.push(dispose);
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, queryClient };
}
