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
      /* 목록으로 먼저 이동한 뒤 캐시를 정리한다 — 삭제된 상세 쿼리를
       * invalidate로 refetch시키면 404가 나므로 remove로 버린다.
       * 목록·대시보드는 invalidate로 감소분을 다시 읽는다(SPEC 완료 기준). */
      await navigate({ to: '/task' });
      queryClient.removeQueries({ queryKey: ['task', 'detail', taskId] });
      await queryClient.invalidateQueries({ queryKey: ['task', 'list'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
