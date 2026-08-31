import { CheckCircleIcon, ClockIcon, RectangleStackIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api/client';

/* 대시보드에서만 쓰는 쿼리라 entity로 승격하지 않고 페이지가 소유한다(SPEC 규칙) */
interface DashboardResponse {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
}

/* requirement "대시보드 (/)" 표의 세 지표. 항목별 아이콘 구분 요구 충족 */
const metrics = [
  { key: 'numOfTask', label: '일', Icon: RectangleStackIcon },
  { key: 'numOfRestTask', label: '해야할 일', Icon: ClockIcon },
  { key: 'numOfDoneTask', label: '한 일', Icon: CheckCircleIcon },
] as const;

export function DashboardPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardResponse>('/api/dashboard'),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">대시보드</h1>

      {isPending && <p className="text-text-muted">불러오는 중…</p>}
      {isError && (
        <p role="alert" className="text-danger">
          대시보드를 불러오지 못했습니다.
        </p>
      )}
      {data && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {metrics.map(({ key, label, Icon }) => (
            <li
              key={key}
              className="flex items-center gap-4 rounded border border-border bg-background p-6"
            >
              <Icon className="size-8 shrink-0 text-primary-strong" aria-hidden />
              <div>
                <p className="text-sm text-text-muted">{label}</p>
                <p className="text-2xl font-bold">{data[key]}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
