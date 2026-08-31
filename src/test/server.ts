import { setupServer } from 'msw/node';

import { handlers } from '@/mocks/handlers';

/* 브라우저 worker와 동일한 핸들러를 테스트(node)에서 재사용한다 */
export const server = setupServer(...handlers);
