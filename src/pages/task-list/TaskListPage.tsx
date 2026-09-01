import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';

import { taskListQuery } from '@/entities/task';

const ROW_HEIGHT = 88;

export function TaskListPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending, isError } =
    useInfiniteQuery(taskListQuery);
  const tasks = data?.pages.flatMap((page) => page.data) ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    /* 다음 페이지가 있으면 마지막에 로더 row 1개를 더 그린다 */
    count: hasNextPage ? tasks.length + 1 : tasks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });
  const virtualItems = virtualizer.getVirtualItems();

  /* 공식 무한 스크롤 패턴: 마지막 가상 row(로더)가 화면에 들어오면 다음 페이지.
   * hasNext=false면 로더 row 자체가 없고 getNextPageParam도 undefined라
   * 추가 호출이 발생하지 않는다.
   * cancelRefetch: false — 기본값(true)은 재호출 시 진행 중 요청을 취소·재시작해
   * 백그라운드 탭(rAF 스로틀)에서 연속 스크롤 이벤트가 들어오면 취소→재요청이
   * 반복돼 응답이 계속 폐기된다. false면 진행 중 fetch가 있을 때 no-op. */
  const lastVirtualIndex = virtualItems.at(-1)?.index;
  useEffect(() => {
    if (lastVirtualIndex === undefined) return;
    /* isError 게이트: 다음 페이지 fetch가 최종 실패한 뒤에도 로더 row가 보이는
     * 동안 재발화하면 실패→재요청 무한 루프가 된다(5xx·네트워크 오류) */
    if (lastVirtualIndex >= tasks.length - 1 && hasNextPage && !isFetchingNextPage && !isError) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [lastVirtualIndex, tasks.length, hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-xl font-bold">할 일</h1>

      {isPending && <p className="text-text-muted">불러오는 중…</p>}
      {isError && (
        <p role="alert" className="text-danger">
          할 일 목록을 불러오지 못했습니다.
        </p>
      )}
      {data && tasks.length === 0 && <p className="text-text-muted">등록된 할 일이 없습니다.</p>}

      {tasks.length > 0 && (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <ul className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualItems.map((row) => {
              const task = tasks[row.index];
              return (
                <li
                  key={row.key}
                  data-index={row.index}
                  className="absolute inset-x-0 top-0 pb-3"
                  style={{ height: row.size, transform: `translateY(${row.start}px)` }}
                >
                  {task ? (
                    <Link
                      to="/task/$id"
                      params={{ id: task.id }}
                      className="flex h-full flex-col justify-center gap-1 rounded border border-border bg-background px-5 hover:border-primary-strong"
                    >
                      <span className="truncate font-semibold">{task.title}</span>
                      <span className="truncate text-sm text-text-muted">
                        {task.memo || '메모 없음'}
                      </span>
                    </Link>
                  ) : (
                    <p className="flex h-full items-center justify-center text-text-muted">
                      다음 페이지 불러오는 중…
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
