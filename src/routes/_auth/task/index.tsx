import { createFileRoute } from '@tanstack/react-router';

import { TaskListPage } from '@/pages/task-list/TaskListPage';

export const Route = createFileRoute('/_auth/task/')({ component: TaskListPage });
