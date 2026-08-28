import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/user')({
  component: () => <h1 className="text-xl font-bold">회원정보</h1>,
});
