import { Nunito } from 'next/font/google';
import styles from './ImedicBrand.module.css';

export const loginNunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
});

type MarkProps = {
  size?: number;
  title?: string;
};

export function HeartPulseMark({ size = 36, title }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M32 56.2C32 56.2 7.2 40.4 5.6 26.6C4.1 15.6 14.2 8.6 22.8 13.2C26.8 15.3 30 20.4 32 24.8C34 20.4 37.2 15.3 41.2 13.2C49.8 8.6 59.9 15.6 58.4 26.6C56.8 40.4 32 56.2 32 56.2Z"
        fill="#00C2EE"
      />
      <path
        d="M12 31.2H22.2L25.4 24.4L31.1 40.2L35.2 29.6L37.8 33.4H52"
        stroke="#fff"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type WordmarkProps = {
  size?: 'sm' | 'md' | 'lg';
};

export function ImedicWordmark({ size = 'lg' }: WordmarkProps) {
  return (
    <div className={`${styles.brand} ${styles[size]} ${loginNunito.className}`}>
      <HeartPulseMark size={size === 'lg' ? 42 : size === 'md' ? 34 : 28} />
      <span className={styles.word}>iMedic</span>
    </div>
  );
}
