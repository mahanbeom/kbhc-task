import { describe, expect, it } from 'vitest';

import { api } from '@/shared/api/client';
import { http } from '@/shared/api/http';
import { useAuthStore } from '@/shared/auth/auth-store';

import { createToken } from './jwt';
import { TASK_PAGE_SIZE, seedTasks, seedUser } from './seed';

interface DashboardResponse {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
}

interface TaskListResponse {
  data: { id: string; title: string; memo: string; status: 'TODO' | 'DONE' }[];
  hasNext: boolean;
}

function signInToStore() {
  useAuthStore.getState().setAccessToken(createToken(seedUser.id, 60));
}

describe('GET /api/dashboard', () => {
  it('시드 500건 이상을 기준으로 집계가 정확하다', async () => {
    signInToStore();

    const data = await api<DashboardResponse>('/api/dashboard');

    /* SPEC 결정 5: 가상 스크롤 검증을 위해 시드는 500건 이상 */
    expect(seedTasks.length).toBeGreaterThanOrEqual(500);
    const numOfDoneTask = seedTasks.filter((task) => task.status === 'DONE').length;
    expect(data).toEqual({
      numOfTask: seedTasks.length,
      numOfRestTask: seedTasks.length - numOfDoneTask,
      numOfDoneTask,
    });
    expect(data.numOfRestTask + data.numOfDoneTask).toBe(data.numOfTask);
  });

  it('미인증 요청은 401을 받는다', async () => {
    await expect(http('/api/dashboard')).rejects.toMatchObject({ status: 401 });
  });
});

describe('GET /api/task', () => {
  const lastPage = Math.ceil(seedTasks.length / TASK_PAGE_SIZE);

  it('페이지당 20건과 hasNext를 반환하고, 항목은 TaskItem 형상만 담는다', async () => {
    signInToStore();

    const page1 = await api<TaskListResponse>('/api/task?page=1');

    expect(TASK_PAGE_SIZE).toBe(20); /* SPEC 결정 5 */
    expect(page1.data).toHaveLength(TASK_PAGE_SIZE);
    expect(page1.hasNext).toBe(true);
    expect(page1.data[0]?.id).toBe(seedTasks[0]?.id);
    /* openapi TaskItem은 additionalProperties: false — registerDatetime은 상세 전용 */
    expect(page1.data[0]).not.toHaveProperty('registerDatetime');
  });

  it('페이지가 겹치지 않고 이어진다', async () => {
    signInToStore();

    const page2 = await api<TaskListResponse>('/api/task?page=2');

    expect(page2.data[0]?.id).toBe(seedTasks[TASK_PAGE_SIZE]?.id);
  });

  it('마지막 페이지는 hasNext=false, 범위 밖 페이지는 빈 배열이다', async () => {
    signInToStore();

    const last = await api<TaskListResponse>(`/api/task?page=${lastPage}`);
    expect(last.data.length).toBeGreaterThan(0);
    expect(last.hasNext).toBe(false);

    const beyond = await api<TaskListResponse>(`/api/task?page=${lastPage + 1}`);
    expect(beyond).toEqual({ data: [], hasNext: false });
  });

  it('page 파라미터가 없거나 1 미만이면 400이다', async () => {
    signInToStore();

    await expect(api('/api/task')).rejects.toMatchObject({ status: 400 });
    await expect(api('/api/task?page=0')).rejects.toMatchObject({ status: 400 });
  });

  it('미인증 요청은 401을 받는다', async () => {
    await expect(http('/api/task?page=1')).rejects.toMatchObject({ status: 401 });
  });
});

describe('GET/DELETE /api/task/:id', () => {
  it('상세는 TaskDetailResponse 형상(registerDatetime 포함)으로 응답한다', async () => {
    signInToStore();
    const seed = seedTasks[0];
    if (!seed) throw new Error('시드가 비어 있다');

    const detail = await api(`/api/task/${seed.id}`);

    expect(detail).toEqual({
      title: seed.title,
      memo: seed.memo,
      registerDatetime: seed.registerDatetime,
    });
  });

  it('존재하지 않는 id는 404다', async () => {
    signInToStore();

    await expect(api('/api/task/unknown-id')).rejects.toMatchObject({ status: 404 });
    await expect(api('/api/task/unknown-id', { method: 'DELETE' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('DELETE는 시드에서 제거하고, 목록·대시보드 집계에 반영된다', async () => {
    signInToStore();
    const target = seedTasks[3];
    if (!target) throw new Error('시드가 비어 있다');
    const before = seedTasks.length;

    await expect(api(`/api/task/${target.id}`, { method: 'DELETE' })).resolves.toEqual({
      success: true,
    });

    expect(seedTasks).toHaveLength(before - 1);
    await expect(api(`/api/task/${target.id}`)).rejects.toMatchObject({ status: 404 });
    const dashboard = await api<DashboardResponse>('/api/dashboard');
    expect(dashboard.numOfTask).toBe(before - 1);

    /* 시드는 모듈 상태라 다른 테스트 격리를 위해 원복한다 */
    seedTasks.splice(3, 0, target);
  });

  it('미인증 요청은 401을 받는다', async () => {
    await expect(http('/api/task/task-1')).rejects.toMatchObject({ status: 401 });
    await expect(http('/api/task/task-1', { method: 'DELETE' })).rejects.toMatchObject({
      status: 401,
    });
  });
});
