'use client';

import React from 'react';
import Link from 'next/link';

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Menu icon for mobile */}
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden text-gray-500 hover:text-gray-600 focus:outline-none"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="sr-only">Open sidebar</span>
              <span className="text-2xl">☰</span>
            </button>
            
            {/* Page title */}
            <h1 className="ml-2 lg:ml-0 text-pantone-314c text-xl font-semibold">
              Dashboard
            </h1>
          </div>

          {/* Right side - User options */}
          <div className="flex items-center">
            {/* Notifications */}
            <button className="p-2 text-gray-500 hover:text-gray-600">
              <span className="sr-only">Ver notificaciones</span>
              <span className="text-xl">🔔</span>
            </button>
            
            {/* User profile dropdown */}
            <div className="relative ml-3">
              <div className="flex items-center">
                <button className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-pantone-313u flex items-center justify-center text-white font-bold">
                    A
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">
                    Admin
                  </span>
                  <span className="ml-1 text-gray-500">▼</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
