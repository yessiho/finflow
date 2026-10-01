'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, Plus, RefreshCw, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type Status = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
type Admin = { id: number; email: string; firstName: string; lastName: string; status: Status; createdAt?: string };

const formatDate = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
};

const getInitials = (firstName?: string, lastName?: string) => {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  return initials || 'AD';
};

const getStatusLabel = (status: Status) => {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'SUSPENDED') return 'Suspended';
  if (status === 'DEACTIVATED') return 'Deactivated';
  return status;
};

export default function AdministratorsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | Status>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(options?: { refresh?: boolean }) {
    const isRefresh = options?.refresh === true;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await apiFetch<Admin[]>('/admins');
      setAdmins(Array.isArray(data) ? data : []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load administrators.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return admins.filter((admin) => {
      const searchableText = `${admin.id} ${admin.email} ${admin.firstName} ${admin.lastName}`.toLowerCase();
      return (!normalizedQuery || searchableText.includes(normalizedQuery)) && (status === 'ALL' || admin.status === status);
    });
  }, [admins, query, status]);

  const stats = useMemo(() => ({
    total: admins.length,
    active: admins.filter((admin) => admin.status === 'ACTIVE').length,
    suspended: admins.filter((admin) => admin.status === 'SUSPENDED').length,
    deactivated: admins.filter((admin) => admin.status === 'DEACTIVATED').length,
  }), [admins]);

  return (
    <div className="admin-page">
      <header className="page-header">
        <div>
          <div className="admin-eyebrow"><ShieldCheck size={15} />Access & Security</div>
          <h1 className="page-title">Administrators</h1>
          <p className="page-description">Manage administrator accounts, access status and privileged access.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-button" onClick={() => void load({ refresh: true })} disabled={loading || refreshing}>
            <RefreshCw size={16} className={refreshing ? 'admin-refresh-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link className="primary-button" href="/admin/administrators/new"><Plus size={16} />Add administrator</Link>
        </div>
      </header>

      <div className="admin-stat-grid">
        <div className="admin-stat-card"><Users size={20} /><div><span>Total</span><strong>{stats.total}</strong></div></div>
        <div className="admin-stat-card"><ShieldCheck size={20} /><div><span>Active</span><strong>{stats.active}</strong></div></div>
        <div className="admin-stat-card"><Clock3 size={20} /><div><span>Suspended</span><strong>{stats.suspended}</strong></div></div>
        <div className="admin-stat-card"><UserCog size={20} /><div><span>Deactivated</span><strong>{stats.deactivated}</strong></div></div>
      </div>

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={17} />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or ID..." aria-label="Search administrators" />
          </div>
          <select className="admin-filter-select" value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | Status)} aria-label="Filter administrators by status">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>

        {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}

        {loading ? <div className="admin-loading"><div className="admin-loader" /><span>Loading administrators...</span></div> : rows.length === 0 ? (
          <div className="admin-empty">
            <UserCog size={28} />
            <h3>No administrators found</h3>
            <p>{query || status !== 'ALL' ? 'Try changing your search or status filter.' : 'Create an administrator account to get started.'}</p>
            {!query && status === 'ALL' && <Link href="/admin/administrators/new" className="primary-button"><Plus size={15} />Add administrator</Link>}
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="data-table admin-table">
              <thead><tr><th>Administrator</th><th>ID</th><th>Status</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {rows.map((admin) => <tr key={admin.id}>
                  <td><div className="admin-person"><div className="admin-avatar">{getInitials(admin.firstName, admin.lastName)}</div><div><strong>{admin.firstName} {admin.lastName}</strong><span>{admin.email}</span></div></div></td>
                  <td>ADM-{String(admin.id).padStart(4, '0')}</td>
                  <td><span className={`status-badge ${admin.status.toLowerCase()}`}><span className="status-dot" />{getStatusLabel(admin.status)}</span></td>
                  <td>{formatDate(admin.createdAt)}</td>
                  <td><Link className="admin-view-link" href={`/admin/administrators/${admin.id}`}>View details <ArrowRight size={14} /></Link></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
