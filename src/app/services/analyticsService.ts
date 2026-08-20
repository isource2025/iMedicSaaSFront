import { apiService, getResolvedApiBaseUrl } from './axios';

export const ANALYTICS_EVENTS = {
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  MODAL_VIEWED: 'MODAL_VIEWED',
  LOGIN_CLICKED: 'LOGIN_CLICKED',
  MODAL_DISMISSED: 'MODAL_DISMISSED',
  LOGIN_PAGE_VIEWED: 'LOGIN_PAGE_VIEWED',
  LOGIN_VISUAL_IMPRESSION: 'LOGIN_VISUAL_IMPRESSION',
  LOGIN_VISUAL_CLICK: 'LOGIN_VISUAL_CLICK',
} as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

const TRACK_KEY = 'imedic_idle_track';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';

export function sessionIdFromToken(token?: string | null): string | null {
  const t = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (!t || t.split('.').length < 2) return null;
  try {
    const b64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload?.sessionId ? String(payload.sessionId) : null;
  } catch {
    return null;
  }
}

export function rememberIdleTracking(sessionId: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(TRACK_KEY, JSON.stringify({ sessionId, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function getIdleTrackingSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TRACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sessionId?: string };
    return parsed?.sessionId ? String(parsed.sessionId) : null;
  } catch {
    return null;
  }
}

export function clearIdleTracking() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(TRACK_KEY);
  } catch {
    /* ignore */
  }
}

const ANON_VID_KEY = 'imedic_anon_vid';

function getAnonymousVisitorId() {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(ANON_VID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(ANON_VID_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

function postAnalytics(body: Record<string, unknown>, token?: string | null) {
  const url = `${getResolvedApiBaseUrl().replace(/\/+$/, '')}/analytics/events`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    void fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/** Evento anónimo de la pantalla de login (sin sesión). */
export function trackPublicEvent(
  event: AnalyticsEventType,
  opts?: { metadata?: Record<string, unknown> },
) {
  if (typeof window === 'undefined') return;
  postAnalytics({
    event,
    visitorId: getAnonymousVisitorId(),
    metadata: {
      appVersion: APP_VERSION,
      ...(opts?.metadata || {}),
    },
  });
}
export function trackProductEvent(
  event: AnalyticsEventType,
  opts?: { sessionId?: string | null; metadata?: Record<string, unknown>; token?: string | null },
) {
  if (typeof window === 'undefined') return;
  const sessionId = opts?.sessionId || getIdleTrackingSessionId() || sessionIdFromToken(opts?.token);
  if (!sessionId) return;
  const token = opts?.token ?? localStorage.getItem('token');
  postAnalytics(
    {
      event,
      sessionId,
      metadata: {
        appVersion: APP_VERSION,
        ...(opts?.metadata || {}),
      },
    },
    token,
  );
}

export interface SessionExpirationKpis {
  from: string;
  to: string;
  totalExpirations: number;
  uniqueUsers: number;
  uniqueEmpresas: number;
  modalViews: number;
  loginClicks: number;
  modalDismissals: number;
  conversionRate: number;
  reauthCount: number;
  reauthRate: number;
  avgModalDwellMs: number;
  potentialImpressions: number;
  logins: number;
  logouts: number;
  activeNow: { sessions: number; users: number; empresas: number };
  byDay: { date: string; expirations: number; loginClicks: number; logins: number }[];
  byRole: { role: string; count: number; pct: number }[];
  byEmpresa: { idEmpresa: number; nombre: string; expirations: number; uniqueUsers: number }[];
  byDevice: { device: string; count: number }[];
  loginScreen: {
    pageViews: number;
    uniqueVisitors: number;
    visualImpressions: number;
    visualClicks: number;
    ctr: number;
    bySlide: { slide: string; impressions: number; clicks: number; ctr: number }[];
  };
}

export type SessionExpirationFilters = {
  from?: string;
  to?: string;
  idEmpresa?: string | number;
  role?: string;
};

export const analyticsService = {
  async getSessionExpiration(filters: SessionExpirationFilters = {}): Promise<SessionExpirationKpis> {
    const res = await apiService.get<{ success: boolean; data: SessionExpirationKpis }>(
      '/analytics/session-expiration',
      { params: filters },
    );
    return res.data.data;
  },
};
