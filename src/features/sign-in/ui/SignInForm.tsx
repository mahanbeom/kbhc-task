import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useAuthStore } from '@/shared/auth/auth-store';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';

import { signIn } from '../api/sign-in';
import { signInSchema, type SignInInput } from '../model/schema';

interface SignInFormProps {
  /* 가드가 심어준 복귀 목적지(href). 없으면 대시보드로 이동한다(SPEC 결정 3) */
  redirectTo?: string | undefined;
}

export function SignInForm({ redirectTo }: SignInFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange',
  });
  /* 입력을 전부 지우면 에러 문구를 숨긴다(빈 값 자체는 지적 대상이 아님 —
   * 미충족 상태는 제출 비활성이 이미 표현). 다시 틀리게 입력하면 재표시. */
  const [emailValue, passwordValue] = watch(['email', 'password']);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const router = useRouter();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  const onSubmit = async (input: SignInInput) => {
    try {
      setAccessToken(await signIn(input));
      /* redirectTo는 라우트 테이블 밖의 런타임 href라 타입 안전한 to로 표현할 수
       * 없어 history로 이동한다(TanStack 인증 가이드의 복귀 패턴) */
      if (redirectTo !== undefined) router.history.push(redirectTo);
      else await navigate({ to: '/' });
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
          error={emailValue ? errors.email?.message : undefined}
          {...register('email')}
        />
        <Input
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          error={passwordValue ? errors.password?.message : undefined}
          {...register('password')}
        />
        <Button type="submit" disabled={!isValid || isSubmitting}>
          제출
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
