import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useAuthStore } from '@/shared/auth/auth-store';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';

import { signIn } from '../api/sign-in';
import { signInSchema, type SignInInput } from '../model/schema';

export function SignInForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  const onSubmit = async (input: SignInInput) => {
    try {
      setAccessToken(await signIn(input));
      await navigate({ to: '/' });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-4">
        <Input
          label="이메일"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" disabled={!isValid || isSubmitting}>
          로그인
        </Button>
      </form>

      <Modal open={errorMessage !== null} title="로그인 실패" onClose={() => setErrorMessage(null)}>
        <p>{errorMessage}</p>
        <div className="mt-4 text-right">
          <Button onClick={() => setErrorMessage(null)}>확인</Button>
        </div>
      </Modal>
    </>
  );
}
