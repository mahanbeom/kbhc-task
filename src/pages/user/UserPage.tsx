import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import type { UserResponse } from '@/entities/user';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/shared/auth/auth-store';
import { Button } from '@/shared/ui/Button';

/* /user에서만 쓰는 쿼리라 entity로 승격하지 않고 페이지가 소유한다(SPEC 규칙) */

export function UserPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery({
    queryKey: ['user'],
    queryFn: () => api<UserResponse>('/api/user'),
  });

  const signOut = async () => {
    /* 최소 로그아웃(SPEC 결정 6): refresh 쿠키 만료는 서버(mock sign-out)가,
     * 메모리 상태 정리는 클라이언트가 담당한다. sign-out 실패가 로그아웃을
     * 막지는 않는다(로컬 상태만이라도 정리). */
    await api('/api/sign-out', { method: 'POST' }).catch(() => undefined);
    useAuthStore.getState().setAccessToken(null);
    await navigate({ to: '/sign-in' });
    queryClient.clear();
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-xl font-bold">회원정보</h1>

      {isPending && <p className="text-text-muted">불러오는 중…</p>}
      {isError && (
        <p role="alert" className="text-danger">
          회원정보를 불러오지 못했습니다.
        </p>
      )}
      {data && (
        <dl className="flex flex-col gap-3 rounded border border-border bg-background p-6">
          <div className="flex gap-4">
            <dt className="w-16 shrink-0 font-semibold">이름</dt>
            <dd>{data.name}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-16 shrink-0 font-semibold">메모</dt>
            <dd className="text-text-muted">{data.memo}</dd>
          </div>
        </dl>
      )}

      <div>
        <Button onClick={() => void signOut()}>로그아웃</Button>
      </div>
    </div>
  );
}
