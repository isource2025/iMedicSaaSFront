'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authService } from '@/app/services/authService';
import { notificacionesService, type NotificacionItem } from '@/app/services/notificacionesService';
import styles from './NotificationsFab.module.css';

function valorPersonalFromUser(user: Record<string, unknown> | null): number | null {
  if (!user) return null;
  const raw =
    user.valorPersonal ??
    user.ValorPersonal ??
    user.idValorpersonal ??
    user.idCodOperador ??
    user.codigoOperador;
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const OPEN_EVENT = 'imedic:notifications-open';

export default function NotificationsFab({ stack = false }: { stack?: boolean }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificacionItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshUser = useCallback(() => {
    const u = authService.getCurrentUser() as Record<string, unknown> | null;
    setUserId(valorPersonalFromUser(u));
  }, []);

  const fetchCount = useCallback(async () => {
    const vp = valorPersonalFromUser(authService.getCurrentUser() as Record<string, unknown> | null);
    if (!vp) return;
    try {
      const c = await notificacionesService.getUnreadCount(vp);
      setCount(c);
    } catch {
      /* silencioso: tabla/API puede no existir aún */
    }
  }, []);

  const loadList = useCallback(async () => {
    const vp = valorPersonalFromUser(authService.getCurrentUser() as Record<string, unknown> | null);
    if (!vp) return;
    setLoadingList(true);
    try {
      const { data } = await notificacionesService.listar(vp, { limit: 40, soloNoLeidas: false });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    const onStorage = () => refreshUser();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshUser]);

  useEffect(() => {
    if (!userId) return;
    fetchCount();
    const t = window.setInterval(fetchCount, 45000);
    return () => window.clearInterval(t);
  }, [userId, fetchCount]);

  useEffect(() => {
    if (!open || !userId) return;
    loadList();
  }, [open, userId, loadList]);

  useEffect(() => {
    const onOpenEvent = () => {
      if (userId) setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => window.removeEventListener(OPEN_EVENT, onOpenEvent);
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = panelRef.current;
      if (el && !el.contains(e.target as Node)) {
        const fab = document.getElementById('notifications-fab-trigger');
        if (fab && fab.contains(e.target as Node)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handleOpen = () => {
    if (!userId) return;
    setOpen((v) => !v);
  };

  const marcarUna = async (n: NotificacionItem) => {
    if (!userId) return;
    try {
      await notificacionesService.marcarLeida(userId, n.IdNotificacion);
      setItems((prev) =>
        prev.map((x) => (x.IdNotificacion === n.IdNotificacion ? { ...x, Leida: 1 } : x))
      );
      fetchCount();
    } catch {
      /* noop */
    }
  };

  const marcarTodas = async () => {
    if (!userId) return;
    try {
      await notificacionesService.marcarTodasLeidas(userId);
      setItems((prev) => prev.map((x) => ({ ...x, Leida: 1 })));
      setCount(0);
      setOpen(false);
    } catch {
      /* noop */
    }
  };

  if (!userId) {
    return null;
  }

  const hasUnread = count > 0;

  return (
    <div className={`${styles.wrap} ${stack ? styles.wrapInStack : ''}`} ref={panelRef}>
      <button
        id="notifications-fab-trigger"
        type="button"
        className={`${styles.fab} ${hasUnread ? styles.fabAlert : styles.fabIdle}`}
        onClick={handleOpen}
        aria-expanded={open}
        aria-label={`Notificaciones${hasUnread ? `, ${count} sin leer` : ''}`}
        title="Notificaciones"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasUnread ? (
          <span className={styles.badge} aria-hidden>
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Lista de notificaciones">
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Notificaciones</span>
            {hasUnread ? (
              <button type="button" className={styles.linkBtn} onClick={marcarTodas}>
                Marcar todas leídas
              </button>
            ) : null}
          </div>
          <div className={styles.panelBody}>
            {loadingList ? (
              <p className={styles.muted}>Cargando…</p>
            ) : items.length === 0 ? (
              <p className={styles.muted}>No hay notificaciones</p>
            ) : (
              <ul className={styles.list}>
                {items.map((n) => {
                  const leida = n.Leida === 1 || n.Leida === true;
                  return (
                    <li key={n.IdNotificacion} className={`${styles.item} ${!leida ? styles.itemUnread : ''}`}>
                      <p className={styles.itemText}>{n.DescNotificacion || n.TipoNotificacion || 'Aviso'}</p>
                      {n.FechaCarga ? (
                        <time className={styles.itemTime} dateTime={n.FechaCarga}>
                          {new Date(n.FechaCarga).toLocaleString('es-AR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </time>
                      ) : null}
                      {!leida ? (
                        <button type="button" className={styles.itemAction} onClick={() => marcarUna(n)}>
                          Marcar leída
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
