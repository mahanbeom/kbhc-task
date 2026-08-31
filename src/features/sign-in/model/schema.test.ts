import { describe, expect, it } from 'vitest';

import { signInSchema } from './schema';

const valid = { email: 'user@kbhc.co.kr', password: 'password1234' };

describe('signInSchema', () => {
  it('올바른 email과 password를 통과시킨다', () => {
    expect(signInSchema.safeParse(valid).success).toBe(true);
  });

  it('email 형식이 아니면 실패한다', () => {
    for (const email of ['', 'user', 'user@', 'user@kbhc', '@kbhc.co.kr']) {
      expect(signInSchema.safeParse({ ...valid, email }).success).toBe(false);
    }
  });

  it('password는 8자 이상 24자 이하만 통과시킨다', () => {
    expect(signInSchema.safeParse({ ...valid, password: 'abcd123' }).success).toBe(false);
    expect(signInSchema.safeParse({ ...valid, password: 'abcd1234' }).success).toBe(true);
    expect(signInSchema.safeParse({ ...valid, password: 'a1'.repeat(12) }).success).toBe(true);
    expect(signInSchema.safeParse({ ...valid, password: 'a1'.repeat(12) + 'a' }).success).toBe(
      false,
    );
  });

  it('password에 영문/숫자 외 문자가 있으면 실패한다', () => {
    for (const password of ['password12!', 'pass word12', '비밀번호12345', 'pass-1234']) {
      expect(signInSchema.safeParse({ ...valid, password }).success).toBe(false);
    }
  });
});
