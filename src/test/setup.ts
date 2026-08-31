import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { useAuthStore } from '@/shared/auth/auth-store';

import { server } from './server';

/* jsdom은 <dialog>의 showModal/close를 구현하지 않아 최소 동작만 polyfill한다.
 * 실제 브라우저 동작(포커스 트랩 포함)은 브라우저 구동 검증으로 확인한다. */
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  useAuthStore.setState({ accessToken: null });
});

afterAll(() => server.close());
