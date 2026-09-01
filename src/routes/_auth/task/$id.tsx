import { Link, createFileRoute, notFound } from '@tanstack/react-router';

import { taskDetailQuery } from '@/entities/task';
import { ApiError } from '@/shared/api/http';

import { TaskDetailPage } from '@/pages/task-detail/TaskDetailPage';

export const Route = createFileRoute('/_auth/task/$id')({
  /* loader에서 선조회해 404를 라우터 notFound로 변환한다 — 컴포넌트는
   * 데이터가 보장된 상태(useSuspenseQuery)로 단순해진다.
   * staleTime: 'static' = 캐시에 있으면 fetch 없이 반환(구 ensureQueryData —
   * v5.102에서 deprecated되어 통합 API인 query()로 대체) */
  loader: ({ context: { queryClient }, params }) =>
    queryClient
      .query({ ...taskDetailQuery(params.id), staleTime: 'static' })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) throw notFound();
        throw error;
      }),
  component: TaskDetailPage,
  notFoundComponent: TaskNotFound,
});

function TaskNotFound() {
  return (
    <div className="mx-auto mt-16 flex w-full max-w-md flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-bold">할 일을 찾을 수 없습니다</h1>
      <p className="text-text-muted">삭제되었거나 존재하지 않는 할 일입니다.</p>
      <Link
        to="/task"
        className="rounded bg-primary px-4 py-2 font-semibold hover:bg-primary-strong"
      >
        목록으로 돌아가기
      </Link>
    </div>
  );
}
