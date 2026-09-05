import type { ReactNode } from 'react';

import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}