'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/app/services/authService';
import { notificacionesService, type NotificacionItem } from '@/app/services/notificacionesService';
import { INBOX_UNREAD_EVENT } from '@/app/hooks/useWhatsAppInboxUnread';
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

function esNotificacionWhatsApp(n: NotificacionItem): boolean {
  const tipo = String(n.TipoNotificacion || '').toUpperCase();
  const ent = String(n.EntidadTipo || '').toUpperCase();
  return tipo === 'WHATSAPP_MENSAJE' || ent === 'BOT_CONVERSACION';
}

function esNotificacionPedido(n: NotificacionItem): boolean {
  const tipo = String(n.TipoNotificacion || '').toUpperCase();
  const ent = String(n.EntidadTipo || '').toUpperCase();
  return (
    tipo === 'PEDIDO_ESTUDIO' ||
    tipo === 'INTERCONSULTA' ||
    ent === 'PEDIDO_ESTUDIO' ||
    ent === 'INTERCONSULTA'
  );
}

function esInterconsultaNotif(n: NotificacionItem): boolean {
  const tipo = String(n.TipoNotificacion || '').toUpperCase();
  const ent = String(n.EntidadTipo || '').toUpperCase();
  const cat = String((n.DatosJSON as { categoria?: string } | null)?.categoria || '').toUpperCase();
  return tipo === 'INTERCONSULTA' || ent === 'INTERCONSULTA' || cat === 'INTERCONSULTA';
}

export default function NotificationsFab({ stack = false }: { stack?: boolean }) {
  const router = useRouter();
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
    const onInbox = () => fetchCount();
    window.addEventListener(INBOX_UNREAD_EVENT, onInbox);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(INBOX_UNREAD_EVENT, onInbox);
    };
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

  const abrirNotificacion = async (n: NotificacionItem) => {
    if (!userId) return;
    const leida = n.Leida === 1 || n.Leida === true;
    if (!leida) {
      try {
        await notificacionesService.marcarLeida(userId, n.IdNotificacion);
        setItems((prev) =>
          prev.map((x) => (x.IdNotificacion === n.IdNotificacion ? { ...x, Leida: 1 } : x))
        );
        fetchCount();
      } catch {
        /* noop */
      }
    }
    if (esNotificacionWhatsApp(n)) {
      setOpen(false);
      router.push('/dashboard/turnos/chats');
      return;
    }
    if (esNotificacionPedido(n)) {
      setOpen(false);
      const datos = (n.DatosJSON || {}) as {
        idSectorReceptor?: string;
        idVisita?: number;
        idPedido?: number;
      };
      const sector = String(datos.idSectorReceptor || '').trim();
      const qs = new URLSearchParams();
      if (sector) qs.set('sector', sector);
      if (datos.idPedido) qs.set('pedido', String(datos.idPedido));
      if (datos.idVisita) qs.set('visita', String(datos.idVisita));
      const q = qs.toString();
      if (esInterconsultaNotif(n)) {
        router.push(`/dashboard/turnos/agenda${q ? `?${q}&bandeja=interconsultas` : '?bandeja=interconsultas'}`);
      } else {
        router.push(`/dashboard/beds${q ? `?${q}&section=estudios` : '?section=estudios'}`);
      }
    }
  };

  const marcarUna = async (n: NotificacionItem) => {
    await abrirNotificacion(n);
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
                      <button
                        type="button"
                        className={styles.itemOpen}
                        onClick={() => abrirNotificacion(n)}
                      >
                        {esNotificacionWhatsApp(n) ? (
                          <span className={styles.itemTag}>WhatsApp</span>
                        ) : esInterconsultaNotif(n) ? (
                          <span className={styles.itemTag}>Interconsulta</span>
                        ) : esNotificacionPedido(n) ? (
                          <span className={styles.itemTag}>Estudio</span>
                        ) : null}
                        <p className={styles.itemText}>{n.DescNotificacion || n.TipoNotificacion || 'Aviso'}</p>
                      </button>
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
                          {esNotificacionWhatsApp(n)
                            ? 'Ver chat'
                            : esNotificacionPedido(n)
                              ? 'Ver pedido'
                              : 'Marcar leída'}
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
