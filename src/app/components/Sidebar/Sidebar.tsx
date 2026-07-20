'use client'

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import {
  Home,
  Calendar,
  ClipboardList,
  FileSearch,
  Bed,
  Receipt,
  BarChart3,
  Settings,
  User,
  Shield,
  LogOut,
  Inbox,
  ChevronRight,
  ChevronLeft,
  LucideIcon
} from 'lucide-react'
import styles from './Sidebar.module.css'
import { useAppContext } from '../../contexts/AppContext'
import { usePermiso } from '@/app/hooks/usePermiso'
import { useWhatsAppInboxUnread } from '@/app/hooks/useWhatsAppInboxUnread'
import { useBandejaPedidosCount } from '@/app/hooks/useBandejaPedidosCount'
import { authService } from '@/app/services/authService'
import type { UserData } from '@/app/types/AuthInterface'

const CHATS_PATH = '/dashboard/turnos/chats'
const BANDEJA_PATH = '/dashboard/bandeja-pedidos'
const BANDEJA_MENU_ID = 'bandeja-pedidos'

interface SubItem {
  label: string
  path: string
  /** id del submódulo en utils/permisos. Si no se mata el match por path. */
  submoduloId?: string
  /** Módulo de permisos distinto al del ítem padre (ej. tablas bajo Configuración). */
  permisoModuloId?: string
}

interface MenuItem {
  id: string
  /** id del módulo en utils/permisos (uppercase). */
  moduloId: string
  label: string
  icon: LucideIcon
  path?: string
  /** Si true: el item siempre se muestra aunque no haya submódulo permitido (ej. logout). */
  alwaysVisible?: boolean
  subItems: SubItem[]
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', moduloId: 'DASHBOARD', label: 'Inicio', icon: Home, path: '/dashboard', subItems: [] },
  {
    id: 'consulta-hc',
    moduloId: 'ADMISION',
    label: 'Consultar Historia Clínica',
    icon: FileSearch,
    path: '/dashboard/admission/search',
    subItems: []
  },
  {
    id: 'turnos', moduloId: 'TURNOS', label: 'Turnos', icon: Calendar,
    subItems: [
      { submoduloId: 'AGENDA', label: 'Agenda',              path: '/dashboard/turnos/agenda' },
      { submoduloId: 'AGENDA', label: 'Conversaciones',      path: '/dashboard/turnos/chats' },
      { submoduloId: 'ADMIN',  label: 'Gestión de turnos',   path: '/dashboard/turnos/admin' },
      { submoduloId: 'ADMIN',  label: 'Configuración',       path: '/dashboard/turnos/configuracion' },
    ]
  },
  {
    id: BANDEJA_MENU_ID,
    moduloId: 'TURNOS',
    label: 'Bandeja',
    icon: Inbox,
    path: BANDEJA_PATH,
    subItems: [
      { submoduloId: 'AGENDA', label: 'Estudios', path: `${BANDEJA_PATH}?tab=estudios` },
      { submoduloId: 'AGENDA', label: 'Interconsultas', path: `${BANDEJA_PATH}?tab=interconsultas` },
    ],
  },
  {
    id: 'admision', moduloId: 'ADMISION', label: 'Admisión', icon: ClipboardList,
    subItems: [
      { submoduloId: 'PACIENTES', label: 'Pacientes',           path: '/dashboard/patients' },
      { submoduloId: 'NUEVA',     label: 'Nueva Admisión',      path: '/dashboard/admission/new' },
      { submoduloId: 'VIGENTES',  label: 'Admisiones Vigentes', path: '/dashboard/admission/current' },
    ]
  },
  {
    id: 'internacion', moduloId: 'INTERNACION', label: 'Internación', icon: Bed,
    subItems: [
      { submoduloId: 'CAMAS',     label: 'Gestión de Camas',   path: '/dashboard/beds' },
      { submoduloId: 'OCUPACION', label: 'Ocupación de Camas', path: '/dashboard/beds/occupation' },
    ]
  },
  {
    id: 'facturacion', moduloId: 'FACTURACION', label: 'Facturación', icon: Receipt,
    subItems: [
      { submoduloId: 'CONVENIOS',     label: 'Convenios',     path: '/dashboard/billing/convenios' },
      { submoduloId: 'RENDICIONES',   label: 'Rendiciones',   path: '/dashboard/billing/rendiciones' },
      { submoduloId: 'LIQUIDACIONES', label: 'Liquidaciones', path: '/dashboard/billing/liquidaciones' },
    ]
  },
  {
    id: 'reportes', moduloId: 'REPORTES', label: 'Reportes', icon: BarChart3,
    subItems: [
      { submoduloId: 'ESTADISTICAS', label: 'Estadísticas', path: '/dashboard/reports/estadisticas' },
      { submoduloId: 'FACTURACION',  label: 'Facturación',  path: '/dashboard/reports/facturacion' },
      { submoduloId: 'OCUPACION',    label: 'Ocupación',    path: '/dashboard/reports/ocupacion' }
    ]
  },
  {
    id: 'plataforma', moduloId: 'PLATAFORMA', label: 'Plataforma', icon: Shield,
    path: '/dashboard/super-admin',
    subItems: [
      { submoduloId: 'PANEL',      label: 'Panel',              path: '/dashboard/super-admin' },
      { submoduloId: 'EMPRESAS',   label: 'Empresas',           path: '/dashboard/super-admin' },
      { submoduloId: 'USUARIOS',   label: 'Usuarios',           path: '/dashboard/super-admin' },
      { submoduloId: 'ONBOARDING', label: 'Puesta en marcha',   path: '/dashboard/super-admin' },
      { submoduloId: 'COBRANZA',   label: 'Cobranza',           path: '/dashboard/super-admin' },
      { submoduloId: 'CONFIG',     label: 'Configuración',      path: '/dashboard/super-admin' },
    ]
  },
  {
    id: 'configuracion', moduloId: 'CONFIGURACION', label: 'Configuración', icon: Settings,
    subItems: [
      { submoduloId: 'GENERAL',  label: 'General',  path: '/dashboard/settings/general' },
      { submoduloId: 'USUARIOS', label: 'Usuarios', path: '/dashboard/settings/usuarios' },
      { submoduloId: 'PERMISOS', label: 'Permisos', path: '/dashboard/settings/permisos' },
      { submoduloId: 'SECTORES', label: 'Sectores', path: '/dashboard/settings/sectores' },
      { submoduloId: 'PERSONAL', label: 'Personal', path: '/dashboard/personal' },
      { submoduloId: 'TABLA', permisoModuloId: 'TURNOS',      label: 'Tabla de Turnos',      path: '/dashboard/turnos/tabla' },
      { submoduloId: 'TABLA', permisoModuloId: 'ADMISION',    label: 'Tabla de Admisiones',  path: '/dashboard/admission/tables' },
      { submoduloId: 'TABLA', permisoModuloId: 'INTERNACION', label: 'Tabla de Internación', path: '/dashboard/beds/tables' },
      { submoduloId: 'TABLA', permisoModuloId: 'FACTURACION', label: 'Tabla de Facturación', path: '/dashboard/billing/tables' },
    ]
  },
  {
    id: 'usuario', moduloId: 'USUARIO', label: 'Usuario', icon: User, alwaysVisible: true,
    subItems: [
      { submoduloId: 'PERFIL', label: 'Mi Perfil',     path: '/dashboard/profile' },
      // Estos cuatro son utilitarios del usuario actual y siempre se muestran:
      { label: 'Configuración', path: '/settings' },
      { label: 'Ayuda',         path: '/help' },
      { label: 'Cerrar Sesión', path: '/' }
    ]
  }
]

interface SidebarProps {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

export default function Sidebar({ expanded, onExpandedChange }: SidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null)
  const bandejaBtnRef = useRef<HTMLButtonElement | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { empresaInfo, sectorSeleccionado } = useAppContext()
  const { rol, loaded, puedeModulo, puedeSubmodulo } = usePermiso()
  const puedeVerChats = loaded && puedeSubmodulo('TURNOS', 'AGENDA')
  const puedeVerBandeja = loaded && puedeSubmodulo('TURNOS', 'AGENDA')
  const { count: chatsUnread } = useWhatsAppInboxUnread(puedeVerChats)
  const { count: bandejaLibres } = useBandejaPedidosCount(puedeVerBandeja)

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser())
  }, [])

  useLayoutEffect(() => {
    if (openMenuId !== BANDEJA_MENU_ID) {
      setFlyoutPos(null)
      return
    }
    const update = () => {
      const el = bandejaBtnRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const top = Math.min(r.top, window.innerHeight - 220)
      setFlyoutPos({ top: Math.max(8, top), left: r.right + 10 })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [openMenuId, expanded])

  useEffect(() => {
    if (openMenuId !== BANDEJA_MENU_ID) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest(`[data-menu-id="${BANDEJA_MENU_ID}"]`)) return
      if (t?.closest('[data-bandeja-flyout]')) return
      setOpenMenuId(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenuId])

  const userDisplay = useMemo(() => {
    const nombre = String(currentUser?.nombre || '').trim()
    const apellido = String(currentUser?.apellido || '').trim()
    const full = [nombre, apellido].filter(Boolean).join(' ').trim()
    const nombreRed = String(currentUser?.nombreRed || '').trim()
    const cod =
      currentUser?.idCodOperador != null && currentUser?.idCodOperador !== ''
        ? String(currentUser.idCodOperador)
        : ''
    const vp =
      currentUser?.idValorpersonal != null && currentUser?.idValorpersonal !== ''
        ? String(currentUser.idValorpersonal)
        : ''
    return { full, nombreRed, cod, vp }
  }, [currentUser])

  /**
   * visibleMenu se calcula de la misma manera que la propiedad `menu` del
   * hook, pero aplicado sobre la definición `menuItems` local (que lleva
   * iconos Lucide + metadatos de UI que el hook no conoce).
   *
   * Reglas:
   * - Si los permisos aún no cargaron (SSR inicial) → lista vacía (evita flash).
   * - Si cargaron pero el usuario no tiene rol asignado → sólo Dashboard + Usuario.
   * - Si tiene rol → permisos del rol (módulo y submódulo).
   */
  const visibleMenu = useMemo(() => {
    // SSR: no sabemos nada todavía — devolvemos vacío para no mostrar items incorrectos
    if (!loaded) return []

    // SUPER_ADMIN: solo módulo Plataforma + cerrar sesión (sin agenda, admisión, etc.)
    if (rol?.nombre === 'SUPER_ADMIN') {
      const plataforma = menuItems.find((item) => item.moduloId === 'PLATAFORMA')
      if (!plataforma) return []
      return [
        {
          ...plataforma,
          label: 'Plataforma',
          path: '/dashboard/super-admin',
          subItems: [],
        },
        {
          id: 'logout',
          moduloId: 'USUARIO',
          label: 'Cerrar sesión',
          icon: LogOut,
          path: '/',
          alwaysVisible: true,
          subItems: [],
        },
      ]
    }

    // Sin rol asignado: sólo Dashboard y el menú de usuario (siempre visibles)
    if (!rol) {
      return menuItems.filter((item) => item.id === 'dashboard' || item.alwaysVisible)
    }

    return menuItems
      .filter((item) => item.moduloId !== 'PLATAFORMA')
      .map((item) => {
        if (item.alwaysVisible) return item

        const permisoModulo = (sub: SubItem) => sub.permisoModuloId || item.moduloId

        // Bandeja: ítem de primer nivel para roles clínicos (no depende de submenú Turnos)
        if (item.id === BANDEJA_MENU_ID) {
          const nombre = String(rol?.nombre || '').toUpperCase()
          const rolClinico = ['MEDICO', 'ENFERMERO', 'ADMIN', 'ADMINISTRATIVO', 'CARGA_HC'].includes(
            nombre,
          )
          const ok =
            rolClinico ||
            puedeSubmodulo('TURNOS', 'AGENDA') ||
            puedeSubmodulo('INTERNACION', 'ESTUDIOS') ||
            puedeSubmodulo('INTERNACION', 'INTERCONSULTAS')
          return ok ? item : null
        }

        // Configuración: visible si el usuario tiene acceso a cualquier subítem
        // (incluye tablas cuyos permisos viven en otros módulos).
        if (item.id === 'configuracion') {
          const subs = item.subItems.filter((sub) => {
            if (!sub.submoduloId) return true
            return puedeSubmodulo(permisoModulo(sub), sub.submoduloId)
          })
          if (subs.filter((s) => s.submoduloId).length === 0) return null
          return { ...item, subItems: subs }
        }

        if (!puedeModulo(item.moduloId)) return null

        // Filtrar subitems: si el subitem no tiene submoduloId siempre se muestra
        const subs = item.subItems.filter((sub) => {
          if (rol?.nombre === 'MEDICO' && sub.path === CHATS_PATH) return false
          if (!sub.submoduloId) return true
          return puedeSubmodulo(permisoModulo(sub), sub.submoduloId)
        })

        // Si el item requería subItems y todos fueron filtrados, ocultarlo
        if (item.subItems.some((s) => s.submoduloId) && subs.filter((s) => s.submoduloId).length === 0) return null

        return { ...item, subItems: subs }
      })
      .filter((x): x is MenuItem => x !== null)
  // puedeModulo y puedeSubmodulo son closures que cambian cuando cambia el estado del hook
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, loaded, puedeModulo, puedeSubmodulo])

  const pathBase = (p: string) => p.split('?')[0]

  const getActiveModuleId = (): string | null => {
    let best: { id: string; len: number } | null = null
    const consider = (id: string, base: string) => {
      if (!base) return
      if (pathname === base || pathname.startsWith(base + '/')) {
        if (!best || base.length > best.len) best = { id, len: base.length }
      }
    }
    for (const item of visibleMenu) {
      if (item.path) consider(item.id, pathBase(item.path))
      for (const sub of item.subItems) consider(item.id, pathBase(sub.path))
    }
    return best?.id ?? null
  }

  const activeModuleId = getActiveModuleId()

  const handleMenuClick = (item: MenuItem) => {
    if (item.id === 'logout' || (item.subItems.length === 0 && item.path === '/')) {
      void (async () => {
        await authService.logout()
        router.replace('/')
        onExpandedChange(false)
        setOpenMenuId(null)
      })()
      return
    }
    // Bandeja: popup flotante con menú cerrado o abierto (no fuerza expandir)
    if (item.id === BANDEJA_MENU_ID) {
      setOpenMenuId((prev) => (prev === BANDEJA_MENU_ID ? null : BANDEJA_MENU_ID))
      return
    }
    if (item.subItems.length === 0) {
      router.push(item.path || '/dashboard')
      onExpandedChange(false)
      setOpenMenuId(null)
    } else {
      if (expanded) {
        if (openMenuId === item.id) {
          setOpenMenuId(null)
        } else {
          setOpenMenuId(item.id)
        }
      } else {
        setOpenMenuId(item.id)
        onExpandedChange(true)
      }
    }
  }

  const handleSubItemClick = (path: string) => {
    if (path === '/') {
      void (async () => {
        await authService.logout()
        router.replace('/')
        onExpandedChange(false)
        setOpenMenuId(null)
      })()
      return
    }
    router.push(path)
    setTimeout(() => {
      onExpandedChange(false)
      setOpenMenuId(null)
    }, 200)
  }

  const isSubActive = (path: string) => {
    const base = pathBase(path)
    if (pathname !== base && !pathname.startsWith(base + '/')) return false
    const q = path.includes('?') ? path.slice(path.indexOf('?') + 1) : ''
    if (!q) return true
    if (typeof window === 'undefined') return pathname === base
    const want = new URLSearchParams(q)
    const have = new URLSearchParams(window.location.search)
    for (const [k, v] of want.entries()) {
      if (have.get(k) !== v) return false
    }
    return true
  }

  const isSelected = (item: MenuItem): boolean => {
    if (item.id === BANDEJA_MENU_ID) {
      return openMenuId === item.id || activeModuleId === item.id
    }
    if (expanded) {
      return openMenuId === item.id
    }
    return activeModuleId === item.id
  }

  return (
    <aside className={`${styles.sidebar} ${expanded ? styles.expanded : ''}`}>
      {/* Logo y empresa primero; usuario debajo (solo con menú expandido) */}
      <div className={styles.logo}>
        <div className={styles.logoContent}>
          <img
            className={styles.logoMark}
            src="/logo-isource.png"
            alt="iSource"
            width={48}
            height={48}
          />
          <div className={styles.companyInfo}>
            <span className={`${styles.companyName} notranslate`} translate="no">
              {empresaInfo?.descripcion || ''}
            </span>
            <span className={`${styles.sectorName} notranslate`} translate="no">
              {sectorSeleccionado ? `Sector: ${sectorSeleccionado.descripcion}` : ''}
            </span>
          </div>
        </div>
        <button 
          className={styles.collapseBtn}
          onClick={() => onExpandedChange(false)}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className={styles.userHeader}>
        <div className={styles.userHeaderText}>
          <span className={`${styles.userFullName} notranslate`} translate="no">
            {userDisplay.full || 'Usuario'}
          </span>
          <span
            className={`${rol ? styles.userRolPill : styles.userRolPillMuted} notranslate`}
            translate="no"
          >
            {!loaded ? '…' : rol ? rol.nombre : 'Sin rol'}
          </span>
        </div>
      </div>
      
      {/* Navegación */}
      <nav className={styles.nav}>
        {visibleMenu.map((item) => (
          <React.Fragment key={item.id}>
            {/* Separador antes de Configuración */}
            {item.id === 'configuracion' && <div className={styles.separator} />}
            
            <div
              className={styles.menuItem}
              data-menu-id={item.id}
            >
              <button
                ref={item.id === BANDEJA_MENU_ID ? bandejaBtnRef : undefined}
                className={`${styles.menuButton} ${isSelected(item) ? styles.selected : ''}`}
                onClick={() => handleMenuClick(item)}
                aria-expanded={item.subItems.length > 0 ? openMenuId === item.id : undefined}
              >
                <span className={styles.menuIconWrap}>
                  <item.icon className={styles.menuIcon} size={22} strokeWidth={1.5} />
                  {item.id === 'turnos' && chatsUnread > 0 ? (
                    <span className={styles.menuBadge} aria-label={`${chatsUnread} mensajes sin leer`}>
                      {chatsUnread > 99 ? '99+' : chatsUnread}
                    </span>
                  ) : null}
                  {item.id === BANDEJA_MENU_ID && bandejaLibres > 0 ? (
                    <span
                      className={styles.menuBadge}
                      aria-label={`${bandejaLibres} pedidos libres`}
                    >
                      {bandejaLibres > 99 ? '99+' : bandejaLibres}
                    </span>
                  ) : null}
                </span>
                <span className={styles.menuLabel}>{item.label}</span>
                {item.subItems.length > 0 && (
                  <ChevronRight 
                    className={`${styles.chevron} ${openMenuId === item.id ? styles.chevronOpen : ''}`} 
                    size={16} 
                  />
                )}
              </button>

              {/* Bandeja: popup lateral (menú cerrado u abierto) */}
              {item.id === BANDEJA_MENU_ID &&
                openMenuId === item.id &&
                flyoutPos &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    className={styles.flyoutMenu}
                    role="menu"
                    data-bandeja-flyout
                    style={{ top: flyoutPos.top, left: flyoutPos.left }}
                  >
                    <div className={styles.flyoutTitle}>Bandeja de pedidos</div>
                    <p className={styles.flyoutHint}>
                      Estudios e interconsultas · un pedido, una persona
                    </p>
                    {item.subItems.map((subItem) => (
                      <button
                        key={`${item.id}-${subItem.label}-${subItem.path}`}
                        type="button"
                        role="menuitem"
                        className={`${styles.flyoutItem} ${isSubActive(subItem.path) ? styles.flyoutItemActive : ''}`}
                        onClick={() => handleSubItemClick(subItem.path)}
                      >
                        {subItem.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={styles.flyoutPrimary}
                      onClick={() => handleSubItemClick(BANDEJA_PATH)}
                    >
                      Abrir bandeja
                      {bandejaLibres > 0 ? (
                        <span className={styles.subMenuBadge}>
                          {bandejaLibres > 99 ? '99+' : bandejaLibres}
                        </span>
                      ) : null}
                    </button>
                  </div>,
                  document.body,
                )}
              
              {/* Submenú acordeón (resto de módulos, solo expandido) */}
              {item.id !== BANDEJA_MENU_ID &&
                item.subItems.length > 0 &&
                openMenuId === item.id &&
                expanded && (
                <div className={styles.subMenu}>
                  {item.subItems.map((subItem) => (
                    <button
                      key={`${item.id}-${subItem.submoduloId || subItem.label}-${subItem.path}`}
                      className={`${styles.subMenuItem} ${isSubActive(subItem.path) ? styles.subActive : ''}`}
                      onClick={() => handleSubItemClick(subItem.path)}
                    >
                      <span className={styles.subMenuLabel}>{subItem.label}</span>
                      {subItem.path === CHATS_PATH && chatsUnread > 0 ? (
                        <span className={styles.subMenuBadge}>
                          {chatsUnread > 99 ? '99+' : chatsUnread}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
      </nav>
    </aside>
  )
}
