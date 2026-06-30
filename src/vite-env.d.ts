/// <reference types="vite/client" />
/// <reference types="./types/electron.d.ts" />

interface ImportMetaEnv {
  readonly VITE_DEV_SERVER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
