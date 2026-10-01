'use client';

import type { ReactNode } from 'react';

import AdminAuthGuard from '@/components/auth/AdminAuthGuard';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div className="admin-app-shell">
        <AdminSidebar />

        <main className="admin-app-main">
          <div className="admin-app-content">
            {children}
          </div>
        </main>
      </div>
    </AdminAuthGuard>
  );
}