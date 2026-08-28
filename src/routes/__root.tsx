import { createRootRoute } from '@tanstack/react-router';

import { AppLayout } from '@/app/layout/AppLayout';

export const Route = createRootRoute({ component: AppLayout });
