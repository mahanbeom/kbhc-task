/* openapi.yaml 스키마 대응 타입 */

export interface TaskItem {
  id: string;
  title: string;
  memo: string;
  status: 'TODO' | 'DONE';
}

export interface TaskListResponse {
  data: TaskItem[];
  hasNext: boolean;
}

export interface TaskDetailResponse {
  title: string;
  memo: string;
  registerDatetime: string;
}
