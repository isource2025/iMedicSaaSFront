'use client'

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Home, 
  Calendar, 
  ClipboardList, 
  Bed, 
  Receipt, 
  BarChart3, 
  Settings,
  User,
  ChevronRight,
  ChevronLeft,
  LucideIcon
} from 'lucide-react'
import styles from './Sidebar.module.css'
import { useAppContext } from '../../contexts/AppContext'

interface SubItem {
  label: string
  path: string
}

interface MenuItem {
  id: string
  label: string
  icon: LucideIcon
  path?: string
  subItems: SubItem[]
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard', subItems: [] },
  {
    id: 'turnos', label: 'Turnos', icon: Calendar,
    subItems: [
      { label: 'Agenda', path: '/dashboard/turnos/agenda' },
      { label: 'Admin de Turnos', path: '/dashboard/turnos/admin' },
      { label: 'Excepciones', path: '/dashboard/turnos/excepciones' },
      { label: 'Configuración', path: '/dashboard/turnos/configuracion' },
      { label: 'Tabla de Turnos', path: '/dashboard/turnos/tabla' }
    ]
  },
  {
    id: 'admision', label: 'Admisión', icon: ClipboardList,
    subItems: [
      { label: 'Pacientes', path: '/dashboard/patients' },
      { label: 'Nueva Admisión', path: '/dashboard/admission/new' },
      { label: 'Admisiones Vigentes', path: '/dashboard/admission/current' },
      { label: 'Tabla de Admisiones', path: '/dashboard/admission/tables' }
    ]
  },
  {
    id: 'internacion', label: 'Internación', icon: Bed,
    subItems: [
      { label: 'Gestión de Camas', path: '/dashboard/beds' },
      { label: 'Ocupación de Camas', path: '/dashboard/beds/occupation' },
      { label: 'Tabla de Internación', path: '/dashboard/beds/tables' }
    ]
  },
  {
    id: 'facturacion', label: 'Facturación', icon: Receipt,
    subItems: [
      { label: 'Convenios', path: '/dashboard/billing/convenios' },
      { label: 'Rendiciones', path: '/dashboard/billing/rendiciones' },
      { label: 'Liquidaciones', path: '/dashboard/billing/liquidaciones' },
      { label: 'Tabla de Facturación', path: '/dashboard/billing/tables' }
    ]
  },
  {
    id: 'reportes', label: 'Reportes', icon: BarChart3,
    subItems: [
      { label: 'Estadísticas', path: '/dashboard/reports/estadisticas' },
      { label: 'Facturación', path: '/dashboard/reports/facturacion' },
      { label: 'Ocupación', path: '/dashboard/reports/ocupacion' }
    ]
  },
  {
    id: 'configuracion', label: 'Configuración', icon: Settings,
    subItems: [
      { label: 'General', path: '/dashboard/settings/general' },
      { label: 'Usuarios', path: '/dashboard/settings/usuarios' },
      { label: 'Permisos', path: '/dashboard/settings/permisos' },
      { label: 'Sectores', path: '/dashboard/settings/sectores' }
    ]
  },
  {
    id: 'usuario', label: 'Usuario', icon: User,
    subItems: [
      { label: 'Mi Perfil', path: '/profile' },
      { label: 'Configuración', path: '/settings' },
      { label: 'Ayuda', path: '/help' },
      { label: 'Cerrar Sesión', path: '/logout' }
    ]
  }
]

interface SidebarProps {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

export default function Sidebar({ expanded, onExpandedChange }: SidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { empresaInfo, sectorSeleccionado } = useAppContext()

  const getActiveModuleId = (): string | null => {
    for (const item of menuItems) {
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
      {/* Logo y datos de empresa */}
      <div className={styles.logo}>
        <div className={styles.logoContent}>
          <span className={styles.logoIcon}>iM</span>
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
      
      {/* Navegación */}
      <nav className={styles.nav}>
        {menuItems.map((item) => (
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
                      key={subItem.path}
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
