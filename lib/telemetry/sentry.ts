'use client';

/**
 * Sentry Error Tracking
 * 
 * Initializes Sentry error tracking client-side.
 * Reads NEXT_PUBLIC_SENTRY_DSN from environment.
 * Returns early if DSN is missing.
 */

interface SentryConfig {
  dsn: string | undefined;
  environment?: string;
  release?: string;
}

let sentryInitialized = false;

/**
 * Initialize Sentry error tracking
 * Returns early if NEXT_PUBLIC_SENTRY_DSN is not set
 */
export function initSentry(): void {
  if (typeof window === 'undefined') return;
  
  if (sentryInitialized) return;
  
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('[Sentry] NEXT_PUBLIC_SENTRY_DSN not set, skipping initialization');
    return;
  }
  
  try {
    // Dynamic import to avoid SSR issues
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',
        release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
        
        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Replay session recording (disabled by default for privacy)
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Error filtering
        beforeSend(event) {
          // Filter out common non-actionable errors
          const errorMessage = event.exception?.values?.[0]?.value || '';
          
          // Skip common browser extension errors
          if (errorMessage.includes('chrome-extension://') || 
              errorMessage.includes('moz-extension://')) {
            return null;
          }
          
          // Skip network errors that are typically transient
          if (errorMessage.includes('NetworkError') || 
              errorMessage.includes('Failed to fetch')) {
            return null;
          }
          
          return event;
        },
        
        // Initialize
        integrations: [],
      });
      
      sentryInitialized = true;
      console.log('[Sentry] Initialized successfully');
    });
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return sentryInitialized;
}
