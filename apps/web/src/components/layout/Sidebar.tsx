'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  BookOpen,
  Landmark,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

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
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  /*
   * ==========================================
   * LOAD LOGGED-IN USER
   *
   * Listens for profile updates from Settings.
   * ==========================================
   */
  useEffect(() => {
    function loadUser() {
      const storedUser = localStorage.getItem('user');

      if (!storedUser) {
        setUser(null);
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser);

        setUser(parsedUser);
      } catch {
        localStorage.removeItem('user');

        setUser(null);
      }
    }

    /*
     * Load user when Sidebar mounts.
     */
    loadUser();

    /*
     * Listen for profile updates.
     */
    window.addEventListener(
      'user-profile-updated',
      loadUser,
    );

    /*
     * Listen for storage changes.
     *
     * Useful when multiple browser tabs are open.
     */
    window.addEventListener(
      'storage',
      loadUser,
    );

    return () => {
      window.removeEventListener(
        'user-profile-updated',
        loadUser,
      );

      window.removeEventListener(
        'storage',
        loadUser,
      );
    };
  }, []);

  /*
   * ==========================================
   * LOGOUT
   * ==========================================
   */
  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    setUser(null);

    router.replace('/login');
  }

  /*
   * ==========================================
   * ACTIVE NAVIGATION
   * ==========================================
   */
  function isActive(href: string) {
    if (href === '/dashboard') {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  /*
   * ==========================================
   * USER INITIALS
   * ==========================================
   */
  function getInitials() {
    if (!user) {
      return 'U';
    }

    const first =
      user.firstName?.charAt(0) || '';

    const last =
      user.lastName?.charAt(0) || '';

    const initials =
      `${first}${last}`.toUpperCase();

    return initials || 'U';
  }

  return (
    <aside className="sidebar">
      {/* ======================================
          BRAND
      ====================================== */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Landmark size={24} />
        </div>

        <span>FinFlow</span>
      </div>

      {/* ======================================
          MAIN NAVIGATION
      ====================================== */}
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

      {/* ======================================
          USER PROFILE
      ====================================== */}
      {user && (
        <Link
          href="/profile"
          className={`sidebar-user ${
            pathname === '/profile'
              ? 'active'
              : ''
          }`}
        >
          <div className="sidebar-user-avatar">
            {getInitials()}
          </div>

          <div className="sidebar-user-details">
            <strong>
              {user.firstName} {user.lastName}
            </strong>

            <span>
              {user.email}
            </span>
          </div>
        </Link>
      )}

      {/* ======================================
          BOTTOM NAVIGATION
      ====================================== */}
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