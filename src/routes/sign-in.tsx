import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sign-in')({
  component: () => <h1 className="text-xl font-bold">로그인</h1>,
});
