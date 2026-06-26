import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  enabled: process.env.NODE_ENV === "production",
  
  beforeSend(event) {
    if (event.exception?.values?.[0]?.type === "ChunkLoadError") {
      return null;
    }
    return event;
  },
});
