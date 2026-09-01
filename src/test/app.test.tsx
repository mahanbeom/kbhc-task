import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/render';

describe('앱 라우터', () => {
  it('루트 레이아웃에 LNB 메뉴가 렌더링된다', async () => {
    renderApp('/');

    expect(await screen.findByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '할 일' })).toBeInTheDocument();
  });
});
