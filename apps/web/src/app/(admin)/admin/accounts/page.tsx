'use client';

import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  RefreshCw,
  Search,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';

type Account = {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  bankCode: string;
  bankName: string;
  status: string;
  wallet: {
    id: number;
    currency: string;
    balance: string;
    status: string;
  } | null;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

type AccountResponse = {
  data: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    totalAccounts: number;
    activeAccounts: number;
    frozenAccounts: number;
    closedAccounts: number;
  };
};

function formatDate(value?: string) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatBalance(
  balance: string,
  currency: string,
) {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(balance));
  } catch {
    return `${balance} ${currency}`;
  }
}

function getInitials(account: Account) {
  const first =
    account.customer?.firstName?.[0] ?? '';

  const last =
    account.customer?.lastName?.[0] ?? '';

  return `${first}${last}`.toUpperCase() || 'NA';
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(
    [],
  );

  const [statistics, setStatistics] =
    useState<AccountResponse['statistics']>({
      totalAccounts: 0,
      activeAccounts: 0,
      frozenAccounts: 0,
      closedAccounts: 0,
    });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [currency, setCurrency] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState('');

  async function loadAccounts(
    requestedPage = page,
    refresh = false,
  ) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const params = new URLSearchParams();

      params.set(
        'page',
        String(requestedPage),
      );

      params.set('limit', '20');

      if (search.trim()) {
        params.set(
          'search',
          search.trim(),
        );
      }

      if (status) {
        params.set('status', status);
      }

      if (currency) {
        params.set('currency', currency);
      }

      const response =
        await apiFetch<AccountResponse>(
          `/admin/accounts?${params.toString()}`,
        );

      setAccounts(response.data);
      setStatistics(response.statistics);
      setPage(
        response.pagination.page,
      );
      setTotalPages(
        response.pagination.totalPages || 1,
      );
      setTotal(
        response.pagination.total,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load accounts.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAccounts(1);
  }, [status, currency]);

  function handleSearchSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();
    void loadAccounts(1);
  }

  function handleClearFilters() {
    setSearch('');
    setStatus('');
    setCurrency('');
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <div className="admin-eyebrow">
            Account management
          </div>

          <h1 className="page-title">
            Accounts
          </h1>

          <p className="page-description">
            Manage customer virtual accounts,
            wallets, balances and account status.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            void loadAccounts(
              page,
              true,
            )
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? 'admin-refresh-spin'
                : ''
            }
          />

          Refresh
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span>Total accounts</span>
          <strong>
            {statistics.totalAccounts}
          </strong>
        </div>

        <div className="admin-stat-card">
          <span>Active accounts</span>
          <strong>
            {statistics.activeAccounts}
          </strong>
        </div>

        <div className="admin-stat-card">
          <span>Frozen accounts</span>
          <strong>
            {statistics.frozenAccounts}
          </strong>
        </div>

        <div className="admin-stat-card">
          <span>Closed accounts</span>
          <strong>
            {statistics.closedAccounts}
          </strong>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-filter-bar">
          <form
            className="admin-search-box"
            onSubmit={handleSearchSubmit}
          >
            <Search size={17} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search account, customer or bank..."
            />

            <button
              type="submit"
              className="primary-button"
            >
              Search
            </button>
          </form>

          <div className="admin-filter-group">
            <Filter size={16} />

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value,
                )
              }
            >
              <option value="">
                All statuses
              </option>
              <option value="ACTIVE">
                Active
              </option>
              <option value="FROZEN">
                Frozen
              </option>
              <option value="CLOSED">
                Closed
              </option>
            </select>

            <select
              value={currency}
              onChange={(event) =>
                setCurrency(
                  event.target.value,
                )
              }
            >
              <option value="">
                All currencies
              </option>
              <option value="NGN">
                NGN
              </option>
              <option value="USD">
                USD
              </option>
              <option value="EUR">
                EUR
              </option>
              <option value="GBP">
                GBP
              </option>
            </select>

            {(search ||
              status ||
              currency) && (
              <button
                type="button"
                className="text-button"
                onClick={
                  handleClearFilters
                }
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loader" />
            <span>
              Loading accounts...
            </span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="admin-empty">
            <WalletCards size={32} />

            <h3>
              No accounts found
            </h3>

            <p>
              There are no accounts matching
              your current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Customer</th>
                    <th>Bank</th>
                    <th>Currency</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {accounts.map(
                    (account) => (
                      <tr
                        key={`admin-account-${account.id}`}
                      >
                        <td>
                          <div className="admin-table-primary">
                            <strong>
                              {
                                account.accountNumber
                              }
                            </strong>

                            <span>
                              {
                                account.accountName
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="admin-customer-cell">
                            <div className="admin-customer-avatar">
                              {getInitials(
                                account,
                              )}
                            </div>

                            <div className="admin-table-primary">
                              <strong>
                                {account.customer
                                  ? `${account.customer.firstName} ${account.customer.lastName}`
                                  : 'Unknown customer'}
                              </strong>

                              <span>
                                {
                                  account
                                    .customer
                                    ?.email
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="admin-table-primary">
                            <strong>
                              {
                                account.bankName
                              }
                            </strong>

                            <span>
                              {
                                account.bankCode
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="admin-currency-badge">
                            {
                              account.wallet
                                ?.currency ??
                                '—'
                            }
                          </span>
                        </td>

                        <td>
                          <strong>
                            {account.wallet
                              ? formatBalance(
                                  account
                                    .wallet
                                    .balance,
                                  account
                                    .wallet
                                    .currency,
                                )
                              : '—'}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${account.status.toLowerCase()}`}
                          >
                            <span className="status-dot" />
                            {
                              account.status
                            }
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            account.createdAt,
                          )}
                        </td>

                        <td>
                          <Link
                            href={`/admin/accounts/${account.id}`}
                            className="icon-button"
                            aria-label={`View account ${account.accountNumber}`}
                            title="View account"
                          >
                            <Eye
                              size={17}
                            />
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span>
                Showing {accounts.length} of{' '}
                {total} accounts
              </span>

              <div className="admin-pagination-controls">
                <button
                  type="button"
                  className="icon-button"
                  disabled={
                    page <= 1
                  }
                  onClick={() =>
                    void loadAccounts(
                      page - 1,
                    )
                  }
                  aria-label="Previous page"
                >
                  <ChevronLeft
                    size={17}
                  />
                </button>

                <span>
                  Page {page} of{' '}
                  {totalPages}
                </span>

                <button
                  type="button"
                  className="icon-button"
                  disabled={
                    page >=
                    totalPages
                  }
                  onClick={() =>
                    void loadAccounts(
                      page + 1,
                    )
                  }
                  aria-label="Next page"
                >
                  <ChevronRight
                    size={17}
                  />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}