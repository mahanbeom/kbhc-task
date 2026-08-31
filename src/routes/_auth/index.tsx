import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/')({
  component: () => <h1 className="text-xl font-bold">대시보드</h1>,
});
