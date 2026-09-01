import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '@/shared/api/client';

import type { DeleteTaskResponse, TaskDetailResponse, TaskListResponse } from './model';

/* 서버가 주는 hasNext로만 다음 페이지 유무를 판단한다 — hasNext=false면
 * getNextPageParam이 undefined를 반환해 이후 fetchNextPage가 no-op이 된다 */
export const taskListQuery = infiniteQueryOptions({
  queryKey: ['task', 'list'],
  queryFn: ({ pageParam }) => api<TaskListResponse>(`/api/task?page=${pageParam}`),
  initialPageParam: 1,
  getNextPageParam: (lastPage, _allPages, lastPageParam) =>
    lastPage.hasNext ? lastPageParam + 1 : undefined,
});

export const taskDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ['task', 'detail', id],
    queryFn: () => api<TaskDetailResponse>(`/api/task/${id}`),
  });

export function deleteTask(id: string): Promise<DeleteTaskResponse> {
  return api(`/api/task/${id}`, { method: 'DELETE' });
}
