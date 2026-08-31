/* mock 데이터 시드. 로그인 계정은 README에도 안내한다. */

export const seedUser = {
  id: 'user-1',
  email: 'user@kbhc.co.kr',
  password: 'password1234',
  name: '김국민',
  memo: 'KB헬스케어 프론트엔드 과제 계정입니다.',
};

/* accessToken을 짧게 잡아 refresh 플로우가 실제로 동작함을 시연한다 (SPEC 결정 7) */
export const ACCESS_TOKEN_TTL_SECONDS = 60;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24;

export interface SeedTask {
  id: string;
  title: string;
  memo: string;
  status: 'TODO' | 'DONE';
  registerDatetime: string;
}

/* 고정 시드 PRNG(mulberry32) — 실행마다 같은 데이터가 나와서 집계 테스트와
 * 브라우저 디버깅이 재현 가능하다. Math.random이면 매 실행 값이 달라진다. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TASK_COUNT = 500;

const actions = ['정리하기', '검토하기', '작성하기', '예약하기', '문의하기', '준비하기'];
const subjects = [
  '주간 운동 계획',
  '건강검진 결과',
  '병원 진료 일정',
  '식단 기록',
  '복약 알림',
  '수면 리포트',
  '걷기 챌린지',
  '가족 건강 체크',
];
const memos = [
  '이번 주 안에 끝내기',
  '담당자 확인 필요',
  '지난달 자료 참고',
  '우선순위 높음',
  '시간 날 때 처리',
  '',
];

function pick(pool: readonly string[], random: () => number): string {
  return pool[Math.floor(random() * pool.length)] ?? '';
}

/* 삭제(슬라이스 5)가 splice로 조작할 수 있도록 mutable 배열로 둔다.
 * dashboard/목록 핸들러는 매 요청 이 배열에서 다시 읽는다. */
export const seedTasks: SeedTask[] = Array.from({ length: TASK_COUNT }, (_, i) => {
  const random = mulberry32(i + 1);
  const base = Date.parse('2026-08-01T00:00:00.000Z');
  return {
    id: `task-${i + 1}`,
    title: `${pick(subjects, random)} ${pick(actions, random)}`,
    memo: pick(memos, random),
    status: random() < 0.6 ? 'TODO' : 'DONE',
    registerDatetime: new Date(
      base - Math.floor(random() * 365 * 24 * 60 * 60 * 1000),
    ).toISOString(),
  };
});
