'use client';

import { apiService } from '@/app/services/axios';

let activityTimer: ReturnType<typeof setInterval> | null = null;

/** Renueva la sesión ante actividad del usuario (respeta timeout por inactividad en servidor). */
export function startSessionActivityMonitor() {
  if (typeof window === 'undefined') return;
  stopSessionActivityMonitor();

  const ping = () => {
    apiService.post('/auth/refresh', {}).catch(() => {
      /* sesión expirada: el interceptor 401 redirige al login */
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
