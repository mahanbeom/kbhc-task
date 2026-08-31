import { create } from 'zustand';

/* SPEC 결정 2: accessToken은 메모리에만 보관한다(persist 미사용 — localStorage
 * 저장은 XSS 노출면을 넓힌다). 새로고침 시에는 refresh 쿠키로 세션을 복원한다.
 * refreshToken은 쿠키가 유일한 보관처이므로 스토어에 두지 않는다.
 * React 밖(API 클라이언트)에서는 useAuthStore.getState()로 읽는다. */

interface AuthState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
}));

/* UI는 토큰 원문 대신 이 파생 셀렉터만 구독한다(refresh 시 리렌더 방지) */
export const selectIsAuthenticated = (state: AuthState) => state.accessToken !== null;
