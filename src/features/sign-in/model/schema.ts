import { z } from 'zod';

/* openapi.yaml SignInRequest 규칙을 그대로 옮긴 스키마 */
export const signInSchema = z.object({
  email: z.email('이메일 형식이 올바르지 않습니다.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .max(24, '비밀번호는 24자 이하여야 합니다.')
    .regex(/^[A-Za-z0-9]+$/, '비밀번호는 영문과 숫자만 사용할 수 있습니다.'),
});

export type SignInInput = z.infer<typeof signInSchema>;
