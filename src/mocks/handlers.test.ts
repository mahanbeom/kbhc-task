import { describe, expect, it } from 'vitest';

import { api } from '@/shared/api/client';
import { http } from '@/shared/api/http';
import { useAuthStore } from '@/shared/auth/auth-store';

import { createToken } from './jwt';
import { seedTasks, seedUser } from './seed';

interface DashboardResponse {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
}

describe('GET /api/dashboard', () => {
  it('시드 500건 이상을 기준으로 집계가 정확하다', async () => {
    useAuthStore.getState().setAccessToken(createToken(seedUser.id, 60));

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
