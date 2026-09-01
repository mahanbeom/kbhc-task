/* openapi.yaml DashboardResponse. 쿼리는 대시보드 페이지가 소유하고(SPEC
 * 규칙), 계약 타입만 페이지·mock이 공유하므로 entity로 둔다 */
export interface DashboardResponse {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
}
