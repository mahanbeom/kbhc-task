/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 실백엔드 주소. 미설정이면 같은 origin + MSW mock 모드로 동작한다. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
