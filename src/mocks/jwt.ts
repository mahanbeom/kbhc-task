/* 서명 검증 없는 mock용 JWT — payload는 스펙대로 id와 exp를 담는다 */

interface TokenPayload {
  id: string;
  exp: number;
}

const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');

export function createToken(id: string, expiresInSeconds: number): string {
  const header = encode({ alg: 'none', typ: 'JWT' });
  const payload = encode({
    id,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
  return `${header}.${payload}.mock-signature`;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1];
    if (payload === undefined) return null;
    return JSON.parse(atob(payload)) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string | undefined): boolean {
  if (token === undefined) return false;
  const payload = decodeToken(token);
  return payload !== null && payload.exp > Math.floor(Date.now() / 1000);
}
