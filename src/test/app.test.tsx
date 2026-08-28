import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { routeTree } from '@/routeTree.gen';

describe('앱 라우터', () => {
  it('루트 레이아웃에 LNB 메뉴가 렌더링된다', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '할 일' })).toBeInTheDocument();
  });
});
