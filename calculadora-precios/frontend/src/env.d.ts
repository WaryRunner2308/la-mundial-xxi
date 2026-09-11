/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Dominio de las funciones servidor. Opcional: si falta, se usa producción. */
  readonly VITE_URL_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
