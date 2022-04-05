declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      REDIS_URL: string;
      PORT: string;
      EXPRESS_SESSION_SECRET: string;
      CORS_ORIGIN: string;
    }
  }
}

export {}
