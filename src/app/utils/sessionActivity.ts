'use client';

import { apiService } from '@/app/services/axios';

let activityTimer: ReturnType<typeof setInterval> | null = null;
let pingInFlight: Promise<void> | null = null;

/**
 * Marca actividad de sesión (idle timeout en AuthSessions).
 * Usa GET /auth/me (Bearer + cookies) — NO rota el refresh token.
 * Rotar en cada ping cruzaba pestañas y, con SameSite mal configurado, tiraba 401 en loop.
 */
export function startSessionActivityMonitor() {
  if (typeof window === 'undefined') return;
  stopSessionActivityMonitor();

  const ping = () => {
    if (!localStorage.getItem('token')) return;
    if (pingInFlight) return;
    pingInFlight = apiService
      .get('/auth/me')
      .then(() => undefined)
      .catch(() => {
        /* 401: el interceptor limpia y redirige al login */
      })
      .finally(() => {
        pingInFlight = null;
      });
  };

  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
  let last = 0;
  const onActivity = () => {
    const now = Date.now();
    if (now - last < 60_000) return;
    last = now;
    ping();
  };

  for (const ev of events) {
    window.addEventListener(ev, onActivity, { passive: true });
  }

  activityTimer = setInterval(ping, 5 * 60_000);
  (window as unknown as { __imedicActivityCleanup?: () => void }).__imedicActivityCleanup = () => {
    for (const ev of events) window.removeEventListener(ev, onActivity);
  };
}

export function stopSessionActivityMonitor() {
  if (activityTimer) {
    clearInterval(activityTimer);
    activityTimer = null;
  }
  const cleanup = (window as unknown as { __imedicActivityCleanup?: () => void }).__imedicActivityCleanup;
  cleanup?.();
}
