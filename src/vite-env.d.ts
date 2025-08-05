interface ImportMetaEnv {
  readonly VITE_SOCKET_URL: string;
  // 他のVITE_環境変数があればここに追加
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}