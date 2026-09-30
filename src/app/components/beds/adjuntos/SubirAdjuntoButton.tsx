'use client';

import styles from './SubirAdjuntoButton.module.css';

interface SubirAdjuntoButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export default function SubirAdjuntoButton({
  onClick,
  disabled,
  label = '+ Subir nuevo',
  className,
}: SubirAdjuntoButtonProps) {
  return (
    <button
      type="button"
      className={className ? `${styles.btn} ${className}` : styles.btn}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
