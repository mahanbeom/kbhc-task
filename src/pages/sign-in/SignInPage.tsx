import { SignInForm } from '@/features/sign-in/ui/SignInForm';

export function SignInPage() {
  return (
    <div className="mx-auto mt-16 flex w-full max-w-sm flex-col gap-6">
      <h1 className="text-xl font-bold">로그인</h1>
      <SignInForm />
    </div>
  );
}
