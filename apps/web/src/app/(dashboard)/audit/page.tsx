'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AuditResponse {
  data: AuditLog[];
  pagination: Pagination;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

const actionLabels: Record<string, string> = {
  WALLET_CREATED: 'Wallet Created',
  WALLET_DEPOSIT: 'Wallet Deposit',
  WALLET_WITHDRAWAL: 'Wallet Withdrawal',
  WALLET_TRANSFER: 'Wallet Transfer',
  WALLET_FROZEN: 'Wallet Frozen',
  WALLET_UNFROZEN: 'Wallet Unfrozen',

  TRANSACTION_CREATED: 'Transaction Created',
  TRANSACTION_COMPLETED: 'Transaction Completed',
  TRANSACTION_REVERSED: 'Transaction Reversed',
  TRANSACTION_FAILED: 'Transaction Failed',

  USER_LOGIN: 'User Login',
  USER_CREATED: 'User Created',
};

function formatAction(action: string) {
  return (
    actionLabels[action] ||
    action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      )
  );
}

function getActionClass(action: string) {
  const value = action.toUpperCase();

  if (
    value.includes('REVERSED') ||
    value.includes('FAILED')
  ) {
    return 'audit-action-danger';
  }

  if (value.includes('FROZEN')) {
    return 'audit-action-warning';
  }

  if (
    value.includes('DEPOSIT') ||
    value.includes('CREATED') ||
    value.includes('COMPLETED')
  ) {
    return 'audit-action-success';
  }

  if (
    value.includes('WITHDRAWAL') ||
    value.includes('TRANSFER')
  ) {
    return 'audit-action-info';
  }

  return 'audit-action-default';
}

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat(
      'en-NG',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    ).format(new Date(date));
  } catch {
    return date;
  }
}

function parseMetadata(metadata: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    return JSON.parse(metadata);
  } catch {
    return metadata;
  }
}

export default function AuditPage() {
  const [logs, setLogs] =
    useState<AuditLog[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState('');

  const [actionFilter, setActionFilter] =
    useState('ALL');

  const [selectedLog, setSelectedLog] =
    useState<AuditLog | null>(null);

  async function fetchAuditLogs(
    page = pagination.page,
    showRefresh = false,
  ) {
    try {
      setError(null);

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token =
        localStorage.getItem(
          'access_token',
        );

      if (!token) {
        window.location.href = '/login';
        return;
      }

      const params =
        new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit),
        });

      if (actionFilter !== 'ALL') {
        params.append(
          'action',
          actionFilter,
        );
      }

      const response =
        await fetch(
          `${API_URL}/audit?${params.toString()}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
              'Content-Type':
                'application/json',
            },
          },
        );

      if (response.status === 401) {
        localStorage.removeItem(
          'access_token',
        );

        localStorage.removeItem('user');

        window.location.href = '/login';

        return;
      }

      if (!response.ok) {
        throw new Error(
          'Failed to load audit logs',
        );
      }

      const result: AuditResponse =
        await response.json();

      setLogs(result.data || []);

      setPagination(
        result.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while loading audit logs.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchAuditLogs(1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) {
      return logs;
    }

    const searchTerm =
      search.toLowerCase();

    return logs.filter((log) => {
      return (
        log.action
          .toLowerCase()
          .includes(searchTerm) ||
        log.entity
          .toLowerCase()
          .includes(searchTerm) ||
        log.entityId
          ?.toLowerCase()
          .includes(searchTerm) ||
        String(log.userId || '')
          .toLowerCase()
          .includes(searchTerm)
      );
    });
  }, [logs, search]);

  const stats = useMemo(() => {
    const today = new Date();

    const todayLogs = logs.filter((log) => {
      const date =
        new Date(log.createdAt);

      return (
        date.getDate() ===
          today.getDate() &&
        date.getMonth() ===
          today.getMonth() &&
        date.getFullYear() ===
          today.getFullYear()
      );
    });

    const transactionLogs =
      logs.filter((log) =>
        log.entity
          .toLowerCase()
          .includes('transaction'),
      );

    const walletLogs =
      logs.filter((log) =>
        log.entity
          .toLowerCase()
          .includes('wallet'),
      );

    return {
      total: pagination.total,
      today: todayLogs.length,
      transactions:
        transactionLogs.length,
      wallets: walletLogs.length,
    };
  }, [logs, pagination.total]);

  const availableActions = useMemo(() => {
    const actions = new Set(
      logs.map((log) => log.action),
    );

    return Array.from(actions);
  }, [logs]);

  return (
    <div className="audit-page">

      {/* PAGE HEADER */}

      <div className="audit-header">

        <div className="audit-header-content">

          <div className="audit-header-icon">
            <ClipboardList size={24} />
          </div>

          <div>
            <p className="audit-eyebrow">
              Security & Monitoring
            </p>

            <h1>Audit Logs</h1>

            <p>
              Monitor and review important system
              activities across your FinFlow platform.
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={() =>
            fetchAuditLogs(
              pagination.page,
              true,
            )
          }
          disabled={refreshing}
          className="audit-refresh-button"
        >
          <RefreshCw
            size={17}
            className={
              refreshing ? 'spin' : ''
            }
          />

          {refreshing
            ? 'Refreshing...'
            : 'Refresh Logs'}
        </button>

      </div>

      {/* STATISTICS */}

      <section className="audit-stats-grid">

        <div className="audit-stat-card">
          <div className="audit-stat-content">
            <div>
              <p>Total Activities</p>
              <h2>
                {stats.total.toLocaleString()}
              </h2>
            </div>

            <div className="audit-stat-icon neutral">
              <Activity size={22} />
            </div>
          </div>

          <span>
            Recorded system activities
          </span>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-content">
            <div>
              <p>Today's Activities</p>
              <h2>{stats.today}</h2>
            </div>

            <div className="audit-stat-icon blue">
              <ShieldCheck size={22} />
            </div>
          </div>

          <span>
            Activities recorded today
          </span>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-content">
            <div>
              <p>Transaction Events</p>
              <h2>
                {stats.transactions}
              </h2>
            </div>

            <div className="audit-stat-icon green">
              <FileText size={22} />
            </div>
          </div>

          <span>
            Transaction-related activities
          </span>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-content">
            <div>
              <p>Wallet Events</p>
              <h2>
                {stats.wallets}
              </h2>
            </div>

            <div className="audit-stat-icon purple">
              <Database size={22} />
            </div>
          </div>

          <span>
            Wallet-related activities
          </span>
        </div>

      </section>

      {/* AUDIT TABLE */}

      <section className="audit-card">

        <div className="audit-card-header">

          <div>
            <h2>System Activity</h2>

            <p>
              Review user actions, transactions
              and system events.
            </p>
          </div>

          <div className="audit-filters">

            <div className="audit-search">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search activity..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="audit-filter-select">
              <Filter size={17} />

              <select
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(
                    event.target.value,
                  )
                }
              >
                <option value="ALL">
                  All Actions
                </option>

                {availableActions.map(
                  (action) => (
                    <option
                      key={action}
                      value={action}
                    >
                      {formatAction(action)}
                    </option>
                  ),
                )}
              </select>
            </div>

          </div>

        </div>

        {error && (
          <div className="audit-error">
            <AlertCircle size={21} />

            <div>
              <strong>
                Unable to load audit logs
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="audit-loading">
            <RefreshCw
              size={30}
              className="spin"
            />

            <p>
              Loading audit activities...
            </p>
          </div>
        )}

        {!loading && !error && (
          <>

            <div className="audit-table-wrapper">

              <table className="audit-table">

                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Entity</th>
                    <th>User</th>
                    <th>Date & Time</th>
                    <th className="audit-table-action">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="audit-empty-cell"
                      >
                        <div className="audit-empty-state">

                          <div>
                            <ClipboardList
                              size={28}
                            />
                          </div>

                          <h3>
                            No audit logs found
                          </h3>

                          <p>
                            There are currently no
                            activities matching your
                            search criteria.
                          </p>

                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (

                      <tr key={log.id}>

                        <td>
                          <span
                            className={`audit-action-badge ${getActionClass(
                              log.action,
                            )}`}
                          >
                            {formatAction(
                              log.action,
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="audit-entity">
                            <strong>
                              {log.entity}
                            </strong>

                            {log.entityId && (
                              <span>
                                ID: {log.entityId}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="audit-user">

                            <div className="audit-user-avatar">
                              <User size={15} />
                            </div>

                            <span>
                              {log.userId
                                ? `User #${log.userId}`
                                : 'System'}
                            </span>

                          </div>
                        </td>

                        <td>
                          <span className="audit-date">
                            {formatDate(
                              log.createdAt,
                            )}
                          </span>
                        </td>

                        <td className="audit-table-action">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedLog(log)
                            }
                            className="audit-view-button"
                          >
                            View
                          </button>
                        </td>

                      </tr>

                    ))
                  )}

                </tbody>

              </table>

            </div>

            {pagination.total > 0 && (
              <div className="audit-pagination">

                <p>
                  Showing{' '}

                  <strong>
                    {filteredLogs.length}
                  </strong>

                  {' '}of{' '}

                  <strong>
                    {pagination.total}
                  </strong>

                  {' '}activities
                </p>

                <div className="audit-pagination-controls">

                  <button
                    type="button"
                    disabled={
                      pagination.page <= 1
                    }
                    onClick={() =>
                      fetchAuditLogs(
                        pagination.page - 1,
                      )
                    }
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span>
                    Page {pagination.page} of{' '}

                    {Math.max(
                      pagination.totalPages,
                      1,
                    )}
                  </span>

                  <button
                    type="button"
                    disabled={
                      pagination.page >=
                      pagination.totalPages
                    }
                    onClick={() =>
                      fetchAuditLogs(
                        pagination.page + 1,
                      )
                    }
                    aria-label="Next page"
                  >
                    <ChevronRight size={18} />
                  </button>

                </div>

              </div>
            )}

          </>
        )}

      </section>

      {/* AUDIT DETAILS MODAL */}

      {selectedLog && (

        <div
          className="audit-modal-overlay"
          onClick={() =>
            setSelectedLog(null)
          }
        >

          <div
            className="audit-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="audit-modal-header">

              <div>
                <p>Activity Details</p>

                <h2>
                  Audit Log Information
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
                className="audit-modal-close"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

            </div>

            <div className="audit-modal-body">

              <div className="audit-details-grid">

                <div className="audit-detail-item">
                  <span>Action</span>

                  <div>
                    <span
                      className={`audit-action-badge ${getActionClass(
                        selectedLog.action,
                      )}`}
                    >
                      {formatAction(
                        selectedLog.action,
                      )}
                    </span>
                  </div>
                </div>

                <div className="audit-detail-item">
                  <span>Entity</span>

                  <strong>
                    {selectedLog.entity}
                  </strong>
                </div>

                <div className="audit-detail-item">
                  <span>Entity ID</span>

                  <strong>
                    {selectedLog.entityId ||
                      'Not available'}
                  </strong>
                </div>

                <div className="audit-detail-item">
                  <span>User</span>

                  <strong>
                    {selectedLog.userId
                      ? `User #${selectedLog.userId}`
                      : 'System'}
                  </strong>
                </div>

                <div className="audit-detail-item full-width">
                  <span>
                    Activity Time
                  </span>

                  <strong>
                    {formatDate(
                      selectedLog.createdAt,
                    )}
                  </strong>
                </div>

              </div>

              <div className="audit-metadata">

                <div className="audit-metadata-header">
                  <h3>Metadata</h3>

                  <p>
                    Additional information
                    recorded for this activity.
                  </p>
                </div>

                <div className="audit-code-block">
                  <pre>
                    {JSON.stringify(
                      parseMetadata(
                        selectedLog.metadata,
                      ),
                      null,
                      2,
                    )}
                  </pre>
                </div>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}