'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './superAdmin.module.css';

const LINKS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/dashboard/super-admin', label: 'Panel', exact: true },
  { href: '/dashboard/super-admin/empresas', label: 'Empresas' },
  { href: '/dashboard/super-admin/alta', label: 'Nueva empresa' },
  { href: '/dashboard/super-admin/usuarios', label: 'Usuarios' },
  { href: '/dashboard/super-admin/cobranza', label: 'Cobranza' },
  { href: '/dashboard/super-admin/chats-ia', label: 'Chats IA' },
  { href: '/dashboard/super-admin/analitica', label: 'Analítica' },
  { href: '/dashboard/super-admin/seguridad', label: 'Seguridad' },
  { href: '/dashboard/super-admin/configuracion', label: 'Configuración' },
];

function activo(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SuperAdminNav() {
  const pathname = usePathname() || '';

  return (
    <nav className={styles.nav} aria-label="Secciones de plataforma">
      {LINKS.map((link) => {
        const isActive = activo(pathname, link.href, link.exact);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
