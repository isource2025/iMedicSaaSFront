'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Iconos simulados con caracteres
const Icons = {
  Home: () => <span className="text-lg">🏠</span>,
  Beds: () => <span className="text-lg">🛏️</span>,
  Patients: () => <span className="text-lg">👤</span>,
  Appointments: () => <span className="text-lg">📅</span>,
  Reports: () => <span className="text-lg">📊</span>,
  Settings: () => <span className="text-lg">⚙️</span>,
};

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Icons.Home },
    { name: 'Gestión de Camas', href: '/dashboard/beds', icon: Icons.Beds },
    { name: 'Pacientes', href: '/dashboard/patients', icon: Icons.Patients },
    { name: 'Citas', href: '/dashboard/appointments', icon: Icons.Appointments },
    { name: 'Reportes', href: '/dashboard/reports', icon: Icons.Reports },
    { name: 'Configuración', href: '/dashboard/settings', icon: Icons.Settings },
  ];

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 w-64 h-screen transition-transform transform lg:transform-none lg:relative 
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                    bg-white border-r shadow-md lg:shadow-none`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-center border-b">
          <div className="text-2xl font-bold text-pantone-314c flex items-center">
            <span className="bg-gradient-to-r from-pantone-313u to-pantone-314c text-white p-1 rounded mr-2">
              i
            </span>
            MedicWS
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-4 top-4 lg:hidden text-gray-500 hover:text-gray-800"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-2">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-pantone-311u text-pantone-314c'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{<item.icon />}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Sidebar Footer */}
        <div className="absolute bottom-0 w-full p-4 border-t">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-pantone-313u flex items-center justify-center text-white font-bold">
              A
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Admin</p>
              <Link href="/" className="text-xs text-red-500 hover:underline">
                Cerrar Sesión
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
