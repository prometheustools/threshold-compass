'use client';

/**
 * PostHog Telemetry
 * 
 * Initializes PostHog analytics client-side.
 * Reads NEXT_PUBLIC_POSTHOG_KEY from environment.
 * Returns early if key is missing.
 */

interface TrackEventOptions {
  event: string;
  properties?: Record<string, unknown>;
}

let postHogInitialized = false;
let postHogInstance: unknown = null;

/**
 * Initialize PostHog analytics
 * Returns early if NEXT_PUBLIC_POSTHOG_KEY is not set
 */
export function initPostHog(): void {
  if (typeof window === 'undefined') return;
  
  if (postHogInitialized) return;
  
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  
  if (!apiKey) {
    console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY not set, skipping initialization');
    return;
  }
  
  try {
    // Dynamic import to avoid SSR issues
    import('posthog-js').then((posthog) => {
      posthog.default.init(apiKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        capture_pageview: false, // We handle this manually for SPA navigation
        autocapture: false, // Disable automatic event capture for privacy
        persistence: 'localStorage',
        loaded: (ph) => {
          postHogInstance = ph;
          postHogInitialized = true;
          console.log('[PostHog] Initialized successfully');
        },
      });
    });
  } catch (error) {
    console.error('[PostHog] Failed to initialize:', error);
  }
}

/**
 * Track a custom event
 * Returns early if PostHog is not initialized or key is missing
 */
export function trackEvent({ event, properties = {} }: TrackEventOptions): void {
  if (typeof window === 'undefined') return;
  
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    // Silently skip if key is missing (expected in development)
    return;
  }
  
  if (!postHogInitialized || !postHogInstance) {
    console.warn(`[PostHog] Cannot track event "${event}": not initialized`);
    return;
  }
  
  try {
    const ph = postHogInstance as { capture: (event: string, properties?: Record<string, unknown>) => void };
    ph.capture(event, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[PostHog] Failed to track event "${event}":`, error);
  }
}
