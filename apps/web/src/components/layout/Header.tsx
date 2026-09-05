'use client';

import { Bell, Menu, UserCircle } from 'lucide-react';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export default function Header({
  title = 'Dashboard',
  onMenuClick,
}: HeaderProps) {
  const user =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') || '{}')
      : {};

  return (
    <header className="header">
      <div className="header-left">
        <button className="mobile-menu" onClick={onMenuClick}>
          <Menu size={22} />
        </button>

        <h1>{title}</h1>
      </div>

      <div className="header-right">
        <button className="icon-button">
          <Bell size={21} />
        </button>

        <div className="user-profile">
          <UserCircle size={34} />

          <div className="user-info">
            <strong>{user.firstName || 'User'}</strong>

            <span>{user.email || ''}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
