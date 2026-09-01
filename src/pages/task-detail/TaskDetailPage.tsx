import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';

import { taskDetailQuery } from '@/entities/task';
import { TaskDeleteButton } from '@/features/task-delete';

const route = getRouteApi('/_auth/task/$id');

/* 추가 의존성 없이 표준 API로 날짜를 표기한다(계획 문서 결정) */
const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

export function TaskDetailPage() {
  const { id } = route.useParams();
  /* loader의 ensureQueryData가 선조회를 보장하므로 pending/error 분기가 없다 */
  const { data } = useSuspenseQuery(taskDetailQuery(id));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-bold">{data.title}</h1>
        <TaskDeleteButton taskId={id} />
      </div>

      <dl className="flex flex-col gap-4 rounded border border-border bg-background p-6">
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-semibold text-text-muted">메모</dt>
          <dd>{data.memo || '메모 없음'}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-semibold text-text-muted">등록 일시</dt>
          <dd>{dateFormat.format(new Date(data.registerDatetime))}</dd>
        </div>
      </dl>
    </div>
  );
}
