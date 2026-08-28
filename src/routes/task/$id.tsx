import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/task/$id')({
  component: () => <h1 className="text-xl font-bold">할 일 상세</h1>,
});
