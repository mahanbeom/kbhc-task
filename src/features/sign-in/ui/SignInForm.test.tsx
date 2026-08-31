import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { routeTree } from '@/routeTree.gen';
import { useAuthStore } from '@/shared/auth/auth-store';

async function renderSignInPage() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/sign-in'] }),
  });
  render(<RouterProvider router={router} />);
  return {
    email: await screen.findByLabelText('이메일'),
    password: await screen.findByLabelText('비밀번호'),
    submit: await screen.findByRole('button', { name: '로그인' }),
  };
}

describe('SignInForm', () => {
  it('초기 상태와 유효성 미충족 시 제출 버튼이 비활성화된다', async () => {
    const user = userEvent.setup();
    const { email, password, submit } = await renderSignInPage();

    expect(submit).toBeDisabled();

    await user.type(email, 'not-an-email');
    await user.type(password, 'password1234');
    expect(submit).toBeDisabled();
    expect(screen.getByText('이메일 형식이 올바르지 않습니다.')).toBeInTheDocument();
  });

  it('조건 충족 시 제출이 활성화되고, 자격 증명이 틀리면 errorMessage 모달을 띄운다', async () => {
    const user = userEvent.setup();
    const { email, password, submit } = await renderSignInPage();

    await user.type(email, 'wrong@kbhc.co.kr');
    await user.type(password, 'wrongpass12');
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(
      await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.'),
    ).toBeInTheDocument();
  });

  it('로그인 성공 시 accessToken을 저장하고 대시보드로 이동한다', async () => {
    const user = userEvent.setup();
    const { email, password, submit } = await renderSignInPage();

    await user.type(email, 'user@kbhc.co.kr');
    await user.type(password, 'password1234');
    await user.click(submit);

    expect(await screen.findByRole('heading', { name: '대시보드' })).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).not.toBeNull();
  });
});
