'use client';

import Link from 'next/link';

import {
  LayoutDashboard,
  WalletCards,
  ReceiptText,
  Settings,
  LogOut,
  Landmark,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';

import { usePathname } from 'next/navigation';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Wallets',
    href: '/wallets',
    icon: WalletCards,
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: ReceiptText,
  },
  {
    name: 'Ledger',
    href: '/ledger',
    icon: BookOpen,
  },
  {
    name: 'Audit Logs',
    href: '/audit',
    icon: ShieldCheck,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    window.location.href = '/login';
  }

  function isActive(href: string) {
    if (href === '/dashboard') {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <aside className="sidebar">
      {/* BRAND */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Landmark size={24} />
        </div>

        <span>FinFlow</span>
      </div>

      {/* MAIN NAVIGATION */}
      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const Icon = item.icon;

          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${
                active ? 'active' : ''
              }`}
            >
              <Icon size={20} />

              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* BOTTOM NAVIGATION */}
      <div className="sidebar-bottom">
        <Link
          href="/settings"
          className={`nav-item ${
            pathname === '/settings'
              ? 'active'
              : ''
          }`}
        >
          <Settings size={20} />

          <span>Settings</span>
        </Link>

        <button
          type="button"
          className="nav-item logout-button"
          onClick={logout}
        >
          <LogOut size={20} />

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}