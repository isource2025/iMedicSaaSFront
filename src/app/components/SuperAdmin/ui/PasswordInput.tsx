'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from '../superAdmin.module.css';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';

  return (
    <div className={styles.passwordWrap}>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${styles.input} ${className || ''}`.trim()}
        autoComplete={props.autoComplete ?? 'new-password'}
      />
      <button
        type="button"
        className={styles.passwordToggle}
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={label}
        title={label}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
