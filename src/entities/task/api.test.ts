import { describe, expect, it } from 'vitest';

import { taskListQuery } from './api';

const page = (hasNext: boolean) => ({ data: [], hasNext });

describe('taskListQuery.getNextPageParam', () => {
  it('hasNext면 다음 페이지 번호를 반환한다', () => {
    expect(taskListQuery.getNextPageParam(page(true), [page(true)], 1, [1])).toBe(2);
    expect(taskListQuery.getNextPageParam(page(true), [], 7, [])).toBe(8);
  });

  it('hasNext=false면 undefined — 이후 fetchNextPage는 no-op', () => {
    expect(taskListQuery.getNextPageParam(page(false), [page(false)], 25, [25])).toBeUndefined();
  });
});
