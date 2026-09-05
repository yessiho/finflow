'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import Sidebar from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const publicRoutes = ['/login'];

  const isPublicRoute = publicRoutes.includes(pathname);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-main">{children}</main>
    </div>
  );
}
