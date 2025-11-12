export interface EnvInterface {
  NODE_ENV: string; // 'development' | 'production'
  APP_PORT: string;
  APPLICATION: string;

  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SCHEMA: string;
  DB_SYNC: boolean;
  DB_LOG: boolean;

  ENCRYPTION_SECRET_KEY: string;

  FRONTEND_URL: string;
}
