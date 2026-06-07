'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
  ChevronRight,
  ChevronLeft,
  LucideIcon
} from 'lucide-react'
import styles from './Sidebar.module.css'
import { useAppContext } from '../../contexts/AppContext'
import { usePermiso } from '@/app/hooks/usePermiso'
import { authService } from '@/app/services/authService'
import type { UserData } from '@/app/types/AuthInterface'

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
  { id: 'dashboard', moduloId: 'DASHBOARD', label: 'Dashboard', icon: Home, path: '/dashboard', subItems: [] },
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
      { submoduloId: 'ADMIN',  label: 'Admin de Turnos',     path: '/dashboard/turnos/admin' },
      { submoduloId: 'ADMIN',  label: 'Configuración bot',   path: '/dashboard/turnos/bot' },
    ]
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
    id: 'plataforma', moduloId: 'PLATAFORMA', label: 'Super Admin', icon: Shield,
    path: '/dashboard/super-admin',
    subItems: [
      { submoduloId: 'PANEL',      label: 'Panel',         path: '/dashboard/super-admin' },
      { submoduloId: 'EMPRESAS',   label: 'Empresas',      path: '/dashboard/super-admin' },
      { submoduloId: 'USUARIOS',   label: 'Usuarios',      path: '/dashboard/super-admin' },
      { submoduloId: 'ONBOARDING', label: 'Onboarding',    path: '/dashboard/super-admin' },
      { submoduloId: 'COBRANZA',   label: 'Cobranza',      path: '/dashboard/super-admin' },
      { submoduloId: 'CONFIG',     label: 'Configuración', path: '/dashboard/super-admin' },
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
  const router = useRouter()
  const pathname = usePathname()
  const { empresaInfo, sectorSeleccionado } = useAppContext()
  const { rol, loaded, puedeModulo, puedeSubmodulo } = usePermiso()

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser())
  }, [])

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

    // SUPER_ADMIN: solo módulo Plataforma (sin agenda, admisión, internación, etc.)
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

  const getActiveModuleId = (): string | null => {
    for (const item of visibleMenu) {
      if (item.path && pathname === item.path) return item.id
      if (item.subItems.some(sub => pathname === sub.path || pathname.startsWith(sub.path + '/'))) return item.id
    }
    return null
  }

  const activeModuleId = getActiveModuleId()

  const handleMenuClick = (item: MenuItem) => {
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
    router.push(path)
    setTimeout(() => {
      onExpandedChange(false)
      setOpenMenuId(null)
    }, 200)
  }

  const isSelected = (item: MenuItem): boolean => {
    if (expanded) {
      return openMenuId === item.id
    } else {
      return activeModuleId === item.id
    }
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
            <span className={styles.companyName}>{empresaInfo?.descripcion || ''}</span>
            <span className={styles.sectorName}>
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
          <span className={styles.userFullName}>{userDisplay.full || 'Usuario'}</span>
          <span className={rol ? styles.userRolPill : styles.userRolPillMuted}>
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
            
            <div className={styles.menuItem}>
              <button
                className={`${styles.menuButton} ${isSelected(item) ? styles.selected : ''}`}
                onClick={() => handleMenuClick(item)}
              >
                <item.icon className={styles.menuIcon} size={22} strokeWidth={1.5} />
                <span className={styles.menuLabel}>{item.label}</span>
                {item.subItems.length > 0 && (
                  <ChevronRight 
                    className={`${styles.chevron} ${openMenuId === item.id ? styles.chevronOpen : ''}`} 
                    size={16} 
                  />
                )}
              </button>
              
              {/* Submenú */}
              {item.subItems.length > 0 && openMenuId === item.id && expanded && (
                <div className={styles.subMenu}>
                  {item.subItems.map((subItem) => (
                    <button
                      key={`${item.id}-${subItem.submoduloId || subItem.label}-${subItem.path}`}
                      className={`${styles.subMenuItem} ${pathname === subItem.path || pathname.startsWith(subItem.path + '/') ? styles.subActive : ''}`}
                      onClick={() => handleSubItemClick(subItem.path)}
                    >
                      {subItem.label}
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
