'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  RefreshCw,
  Landmark,
  TrendingUp,
  TrendingDown,
  WalletCards,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

type LedgerAccount = {
  id: number;
  code: string;
  name: string;
  type:
    | 'ASSET'
    | 'LIABILITY'
    | 'REVENUE'
    | 'EXPENSE'
    | 'EQUITY';
  currency: string;
  active: boolean;
  totalDebit: string;
  totalCredit: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
};

function formatAmount(
  amount: string | number,
  currency: string,
) {
  const value = Number(amount);

  try {
    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      },
    ).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function getTypeClass(type: string) {
  switch (type) {
    case 'ASSET':
      return 'ledger-badge asset';

    case 'LIABILITY':
      return 'ledger-badge liability';

    case 'REVENUE':
      return 'ledger-badge revenue';

    case 'EXPENSE':
      return 'ledger-badge expense';

    case 'EQUITY':
      return 'ledger-badge equity';

    default:
      return 'ledger-badge';
  }
}

export default function LedgerPage() {
  const [accounts, setAccounts] =
    useState<LedgerAccount[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const loadAccounts = useCallback(
    async (isRefresh = false) => {
      try {
        setError('');

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await apiFetch(
            '/ledger/accounts',
          );

        setAccounts(
          Array.isArray(response)
            ? response
            : [],
        );
      } catch (error: any) {
        setError(
          error.message ||
            'Unable to load ledger accounts.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const totalAssets = accounts
    .filter(
      (account) =>
        account.type === 'ASSET',
    )
    .reduce(
      (total, account) =>
        total +
        Number(account.balance),
      0,
    );

  const totalLiabilities = accounts
    .filter(
      (account) =>
        account.type === 'LIABILITY',
    )
    .reduce(
      (total, account) =>
        total +
        Number(account.balance),
      0,
    );

  const activeAccounts = accounts.filter(
    (account) => account.active,
  ).length;

  const currencies = [
    ...new Set(
      accounts.map(
        (account) =>
          account.currency,
      ),
    ),
  ];

  return (
    <div className="ledger-page">

      {/* PAGE HEADER */}

      <div className="ledger-header">
        <div>
          <div className="ledger-title-row">
            <Landmark size={28} />

            <h1>
              General Ledger
            </h1>
          </div>

          <p>
            Monitor financial accounts,
            balances, and double-entry
            accounting activity.
          </p>
        </div>

        <button
          type="button"
          className="ledger-refresh-button"
          onClick={() =>
            loadAccounts(true)
          }
          disabled={
            loading ||
            refreshing
          }
        >
          {refreshing ? (
            <Loader2
              size={18}
              className="spin"
            />
          ) : (
            <RefreshCw size={18} />
          )}

          {refreshing
            ? 'Refreshing...'
            : 'Refresh'}
        </button>
      </div>

      {/* ERROR STATE */}

      {error && (
        <div className="ledger-error">
          <AlertCircle size={20} />

          <div>
            <strong>
              Unable to load ledger
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              loadAccounts()
            }
          >
            Try Again
          </button>
        </div>
      )}

      {/* LOADING STATE */}

      {loading ? (
        <div className="ledger-loading">
          <Loader2
            size={34}
            className="spin"
          />

          <p>
            Loading ledger accounts...
          </p>
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}

          <div className="ledger-summary-grid">

            <div className="ledger-summary-card">
              <div className="summary-icon accounts">
                <WalletCards size={22} />
              </div>

              <div>
                <span>
                  Total Accounts
                </span>

                <strong>
                  {accounts.length}
                </strong>

                <small>
                  {activeAccounts} active
                </small>
              </div>
            </div>

            <div className="ledger-summary-card">
              <div className="summary-icon asset">
                <TrendingUp size={22} />
              </div>

              <div>
                <span>
                  Asset Accounts
                </span>

                <strong>
                  {
                    accounts.filter(
                      (account) =>
                        account.type ===
                        'ASSET',
                    ).length
                  }
                </strong>

                <small>
                  {currencies.length}{' '}
                  currencies supported
                </small>
              </div>
            </div>

            <div className="ledger-summary-card">
              <div className="summary-icon liability">
                <TrendingDown size={22} />
              </div>

              <div>
                <span>
                  Liability Accounts
                </span>

                <strong>
                  {
                    accounts.filter(
                      (account) =>
                        account.type ===
                        'LIABILITY',
                    ).length
                  }
                </strong>

                <small>
                  Customer balances
                  tracked
                </small>
              </div>
            </div>

            <div className="ledger-summary-card">
              <div className="summary-icon currencies">
                <Landmark size={22} />
              </div>

              <div>
                <span>
                  Supported Currencies
                </span>

                <strong>
                  {currencies.length}
                </strong>

                <small>
                  {currencies.join(', ')}
                </small>
              </div>
            </div>

          </div>

          {/* ACCOUNTING INFORMATION */}

          <div className="ledger-info-grid">

            <div className="ledger-info-card">
              <div className="ledger-info-icon asset">
                <TrendingUp size={22} />
              </div>

              <div>
                <span>
                  Total Asset Balance
                </span>

                <strong>
                  {totalAssets.toLocaleString()}
                </strong>

                <small>
                  Across all currencies
                </small>
              </div>
            </div>

            <div className="ledger-info-card">
              <div className="ledger-info-icon liability">
                <TrendingDown size={22} />
              </div>

              <div>
                <span>
                  Total Liability Balance
                </span>

                <strong>
                  {totalLiabilities.toLocaleString()}
                </strong>

                <small>
                  Across all currencies
                </small>
              </div>
            </div>

          </div>

          {/* LEDGER TABLE */}

          <section className="ledger-table-section">

            <div className="ledger-table-header">
              <div>
                <h2>
                  Ledger Accounts
                </h2>

                <p>
                  Real-time account balances
                  generated from double-entry
                  ledger records.
                </p>
              </div>

              <span className="ledger-count">
                {accounts.length} Accounts
              </span>
            </div>

            {accounts.length === 0 ? (
              <div className="ledger-empty">
                <Landmark size={42} />

                <h3>
                  No Ledger Accounts
                </h3>

                <p>
                  Ledger accounts will appear
                  here once financial
                  transactions are processed.
                </p>
              </div>
            ) : (
              <div className="ledger-table-wrapper">

                <table className="ledger-table">

                  <thead>
                    <tr>
                      <th>
                        Account
                      </th>

                      <th>
                        Code
                      </th>

                      <th>
                        Type
                      </th>

                      <th>
                        Currency
                      </th>

                      <th className="number">
                        Total Debit
                      </th>

                      <th className="number">
                        Total Credit
                      </th>

                      <th className="number">
                        Balance
                      </th>

                      <th>
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {accounts.map(
                      (account) => (
                        <tr
                          key={account.id}
                        >
                          <td>
                            <div className="ledger-account-name">
                              <div className="ledger-account-icon">
                                <Landmark
                                  size={18}
                                />
                              </div>

                              <div>
                                <strong>
                                  {
                                    account.name
                                  }
                                </strong>

                                <span>
                                  Account ID #
                                  {account.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <code>
                              {account.code}
                            </code>
                          </td>

                          <td>
                            <span
                              className={getTypeClass(
                                account.type,
                              )}
                            >
                              {account.type}
                            </span>
                          </td>

                          <td>
                            <span className="currency-pill">
                              {
                                account.currency
                              }
                            </span>
                          </td>

                          <td className="number debit">
                            {formatAmount(
                              account.totalDebit,
                              account.currency,
                            )}
                          </td>

                          <td className="number credit">
                            {formatAmount(
                              account.totalCredit,
                              account.currency,
                            )}
                          </td>

                          <td className="number balance">
                            {formatAmount(
                              account.balance,
                              account.currency,
                            )}
                          </td>

                          <td>
                            <span
                              className={`ledger-status ${
                                account.active
                                  ? 'active'
                                  : 'inactive'
                              }`}
                            >
                              <span />

                              {account.active
                                ? 'Active'
                                : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>

                </table>

              </div>
            )}

          </section>

        </>
      )}

    </div>
  );
}