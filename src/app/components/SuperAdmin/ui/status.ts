import styles from '../superAdmin.module.css';

export function estadoBadgeClass(estado?: string) {
  const e = (estado || '').toUpperCase();
  if (e === 'ACTIVA') return styles.badgeOk;
  if (e === 'PRUEBA') return styles.badgeWarn;
  if (e === 'SUSPENDIDA' || e === 'CANCELADA') return styles.badgeDanger;
  return styles.badgeMuted;
}

export function tipoServidorLabel(tipo?: string) {
  return String(tipo || '').toUpperCase() === 'NUBE' ? 'Nube' : 'Físico';
}
