import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext } from '@tanstack/react-router';

import { AppLayout } from '@/app/layout/AppLayout';

/* 라우터 컨텍스트로 queryClient를 전달한다 — 상세 라우트 loader가
 * ensureQueryData로 선조회하고 404를 notFound()로 변환하기 위함 */
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({ component: AppLayout });
