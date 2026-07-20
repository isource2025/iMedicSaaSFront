import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProvider } from './contexts/AppContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'iMedic — Espacio de trabajo médico',
  description: 'Plataforma hospitalaria iMedic (español)',
  other: {
    google: 'notranslate',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" translate="no">
      <body className={`${inter.className} notranslate`} translate="no">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
