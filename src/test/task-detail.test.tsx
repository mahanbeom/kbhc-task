import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createToken } from '@/mocks/jwt';
import { seedTasks, seedUser } from '@/mocks/seed';
import { useAuthStore } from '@/shared/auth/auth-store';
import { renderApp } from '@/test/render';

function signInToStore() {
  useAuthStore.getState().setAccessToken(createToken(seedUser.id, 60));
}

function seedAt(index: number) {
  const task = seedTasks[index];
  if (!task) throw new Error('시드가 비어 있다');
  return task;
}

describe('할 일 상세와 삭제', () => {
  it('title/memo/등록 일시를 표시한다', async () => {
    signInToStore();
    const target = seedAt(0);

    renderApp(`/task/${target.id}`);

    expect(await screen.findByRole('heading', { name: target.title })).toBeInTheDocument();
    expect(screen.getByText(target.memo || '메모 없음')).toBeInTheDocument();
    const formatted = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(target.registerDatetime));
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it('존재하지 않는 id는 404 대체 화면과 목록 복귀 버튼을 보여준다', async () => {
    signInToStore();

    renderApp('/task/unknown-id');

    expect(
      await screen.findByRole('heading', { name: '할 일을 찾을 수 없습니다' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '목록으로 돌아가기' })).toBeInTheDocument();
  });

  it('삭제 확인은 id가 정확히 일치할 때만 활성화된다(string 비교)', async () => {
    const user = userEvent.setup();
    signInToStore();
    const target = seedAt(1);
    renderApp(`/task/${target.id}`);
    await screen.findByRole('heading', { name: target.title });

    await user.click(screen.getByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: '제출' });
    const input = within(dialog).getByLabelText('할 일 ID');

    expect(submit).toBeDisabled();
    await user.type(input, 'wrong-id');
    expect(submit).toBeDisabled();
    await user.clear(input);
    await user.type(input, target.id);
    expect(submit).toBeEnabled();
    /* 부분 일치·초과 입력도 불일치로 취급된다 */
    await user.type(input, 'x');
    expect(submit).toBeDisabled();
  });

  it('삭제 성공 시 목록으로 이동하고 상세 캐시가 제거된다', async () => {
    const user = userEvent.setup();
    signInToStore();
    const index = 2;
    const target = seedAt(index);
    const { router, queryClient } = renderApp(`/task/${target.id}`);
    await screen.findByRole('heading', { name: target.title });

    await user.click(screen.getByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('할 일 ID'), target.id);
    await user.click(within(dialog).getByRole('button', { name: '제출' }));

    expect(await screen.findByRole('heading', { name: '할 일' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/task');
    expect(queryClient.getQueryData(['task', 'detail', target.id])).toBeUndefined();
    expect(seedTasks.find((task) => task.id === target.id)).toBeUndefined();

    /* 시드는 모듈 상태 — 다른 테스트 격리를 위해 원복 */
    seedTasks.splice(index, 0, target);
  });
});
