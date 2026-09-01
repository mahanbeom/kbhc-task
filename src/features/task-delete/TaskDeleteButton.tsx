import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { deleteTask } from '@/entities/task';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';

interface TaskDeleteButtonProps {
  taskId: string;
}

/* 삭제 확인 모달 — id 재입력이 정확히 일치(string 비교)할 때만 제출 활성화.
 * 지역 상태라 RHF 없이 useState로 처리한다(SPEC 규칙). 포커스 트랩은
 * 네이티브 dialog(showModal)가 보장. */
export function TaskDeleteButton({ taskId }: TaskDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: async () => {
      /* 순서가 요청 횟수를 결정한다(SPEC 완료 기준: 목록 캐시 무효화).
       * ① 이동 전에 목록·대시보드 invalidate — 상세 페이지에 있는 동안 두
       *    쿼리는 비활성이라 refetch 없이 stale 마킹만 된다. 이동 후에
       *    invalidate하면 마운트 refetch와 겹쳐 목록을 두 번 조회한다.
       * ② 이동 후에 상세 캐시 remove — 상세 화면에 머문 채 건드리면
       *    refetch가 삭제된 리소스에 404를 내므로 invalidate가 아닌 remove. */
      await queryClient.invalidateQueries({ queryKey: ['task', 'list'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await navigate({ to: '/task' });
      queryClient.removeQueries({ queryKey: ['task', 'detail', taskId] });
    },
  });

  const close = () => {
    setOpen(false);
    setConfirmInput('');
  };

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        삭제
      </Button>

      <Modal open={open} title="할 일 삭제" onClose={close}>
        <div className="flex flex-col gap-4">
          <p className="text-text-muted">
            삭제하려면 아래에 <strong className="text-text">{taskId}</strong>를 입력하세요. 삭제된
            할 일은 되돌릴 수 없습니다.
          </p>
          <Input
            label="할 일 ID"
            value={confirmInput}
            onChange={(event) => setConfirmInput(event.target.value)}
            autoComplete="off"
          />
          {isError && (
            <p role="alert" className="text-sm text-danger">
              삭제에 실패했습니다. 잠시 후 다시 시도해주세요.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={close}>취소</Button>
            {/* requirement.md가 확인 모달의 버튼 문구를 `제출`로 명시 */}
            <Button
              variant="danger"
              disabled={confirmInput !== taskId || isPending}
              onClick={() => mutate()}
            >
              제출
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
