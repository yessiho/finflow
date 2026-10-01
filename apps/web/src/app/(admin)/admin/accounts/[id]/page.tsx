'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  UserRoundCheck,
  UserRoundX,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';

type AccountDetails = {
  account: {
    id: number;
    accountNumber: string;
    accountName: string;
    accountType: string;
    bankCode: string;
    bankName: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
  };

  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
  };

  wallet: {
    id: number;
    currency: string;
    balance: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
  };

  recentTransactions: Array<{
    id: number;
    reference: string;
    amount: string;
    currency: string;
    type: string;
    status: string;
    createdAt?: string;
  }>;
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

export default function AdminAccountDetailsPage() {
  const params =
    useParams<{ id: string }>();

  const id = Number(params.id);

  const [account, setAccount] =
    useState<AccountDetails | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [changingStatus, setChangingStatus] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  async function load(
    refresh = false,
  ) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response =
        await apiFetch<AccountDetails>(
          `/admin/accounts/${id}`,
        );

      setAccount(response);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load account.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function changeStatus() {
    if (
      !account ||
      changingStatus
    ) {
      return;
    }

    let nextStatus:
      | 'ACTIVE'
      | 'FROZEN'
      | 'CLOSED';

    if (
      account.account.status ===
      'ACTIVE'
    ) {
      nextStatus = 'FROZEN';
    } else if (
      account.account.status ===
      'FROZEN'
    ) {
      nextStatus = 'ACTIVE';
    } else {
      return;
    }

    const action =
      nextStatus === 'FROZEN'
        ? 'freeze'
        : 'reactivate';

    const confirmed =
      window.confirm(
        `Are you sure you want to ${action} account ${account.account.accountNumber}?`,
      );

    if (!confirmed) {
      return;
    }

    setChangingStatus(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(
        `/admin/accounts/${account.account.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: nextStatus,
          }),
        },
      );

      await load(true);

      setSuccess(
        nextStatus === 'FROZEN'
          ? 'Account frozen successfully.'
          : 'Account reactivated successfully.',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to update account status.',
      );
    } finally {
      setChangingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="admin-loader" />
          <span>
            Loading account...
          </span>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="admin-page">
        <div className="admin-alert admin-alert-error">
          {error ||
            'Account not found.'}
        </div>

        <Link
          href="/admin/accounts"
          className="admin-back-link"
        >
          <ArrowLeft size={16} />
          Back to accounts
        </Link>
      </div>
    );
  }

  const initials =
    `${account.customer.firstName?.[0] ?? ''}${account.customer.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="admin-page">
      <div className="admin-detail-topbar">
        <Link
          href="/admin/accounts"
          className="admin-back-link"
        >
          <ArrowLeft size={16} />
          Back to accounts
        </Link>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            void load(true)
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

      {success && (
        <div className="admin-alert admin-alert-success">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      <section className="admin-profile-hero">
        <div className="admin-profile-identity">
          <div className="admin-profile-avatar">
            {initials || 'AC'}
          </div>

          <div className="admin-profile-copy">
            <div className="admin-eyebrow">
              Virtual account
            </div>

            <h1>
              {account.account.accountNumber}
            </h1>

            <p>
              {account.account.accountName}
            </p>
          </div>
        </div>

        <div className="admin-profile-actions">
          <span
            className={`status-badge ${account.account.status.toLowerCase()}`}
          >
            <span className="status-dot" />
            {account.account.status}
          </span>

          {account.account.status !==
            'CLOSED' && (
            <button
              type="button"
              className={
                account.account.status ===
                'ACTIVE'
                  ? 'danger-button'
                  : 'primary-button'
              }
              onClick={() =>
                void changeStatus()
              }
              disabled={
                changingStatus
              }
            >
              {account.account.status ===
              'ACTIVE' ? (
                <>
                  <UserRoundX
                    size={15}
                  />
                  Freeze account
                </>
              ) : (
                <>
                  <UserRoundCheck
                    size={15}
                  />
                  Reactivate account
                </>
              )}
            </button>
          )}
        </div>
      </section>

      <div className="admin-detail-summary-grid">
        <div className="admin-detail-summary-card">
          <span>Account Number</span>
          <strong>
            {account.account.accountNumber}
          </strong>
        </div>

        <div className="admin-detail-summary-card">
          <span>Currency</span>
          <strong>
            {account.wallet.currency}
          </strong>
        </div>

        <div className="admin-detail-summary-card">
          <span>Balance</span>
          <strong>
            {formatBalance(
              account.wallet.balance,
              account.wallet.currency,
            )}
          </strong>
        </div>

        <div className="admin-detail-summary-card">
          <span>Created</span>
          <strong>
            {formatDate(
              account.account.createdAt,
            )}
          </strong>
        </div>
      </div>

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">
                Account
              </span>

              <h2>
                Account information
              </h2>
            </div>
          </div>

          <div className="admin-detail-info-grid">
            <div>
              <span>
                Account number
              </span>

              <strong>
                {
                  account.account
                    .accountNumber
                }
              </strong>
            </div>

            <div>
              <span>
                Account name
              </span>

              <strong>
                {
                  account.account
                    .accountName
                }
              </strong>
            </div>

            <div>
              <span>
                Account type
              </span>

              <strong>
                {
                  account.account
                    .accountType
                }
              </strong>
            </div>

            <div>
              <span>
                Bank
              </span>

              <strong>
                {
                  account.account
                    .bankName
                }
              </strong>
            </div>

            <div>
              <span>
                Bank code
              </span>

              <strong>
                {
                  account.account
                    .bankCode
                }
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong>
                {
                  account.account
                    .status
                }
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">
                Customer
              </span>

              <h2>
                Account owner
              </h2>
            </div>
          </div>

          <div className="admin-detail-info-grid">
            <div>
              <span>
                Customer ID
              </span>

              <strong>
                CUS-
                {String(
                  account.customer.id,
                ).padStart(5, '0')}
              </strong>
            </div>

            <div>
              <span>
                Name
              </span>

              <strong>
                {
                  account.customer
                    .firstName
                }{' '}
                {
                  account.customer
                    .lastName
                }
              </strong>
            </div>

            <div>
              <span>
                Email
              </span>

              <strong>
                {
                  account.customer
                    .email
                }
              </strong>
            </div>

            <div>
              <span>
                Customer status
              </span>

              <strong>
                {
                  account.customer
                    .status
                }
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">
                Wallet
              </span>

              <h2>
                Wallet information
              </h2>
            </div>
          </div>

          <div className="admin-detail-info-grid">
            <div>
              <span>
                Wallet ID
              </span>

              <strong>
                {account.wallet.id}
              </strong>
            </div>

            <div>
              <span>
                Currency
              </span>

              <strong>
                {account.wallet.currency}
              </strong>
            </div>

            <div>
              <span>
                Balance
              </span>

              <strong>
                {formatBalance(
                  account.wallet.balance,
                  account.wallet.currency,
                )}
              </strong>
            </div>

            <div>
              <span>
                Wallet status
              </span>

              <strong>
                {account.wallet.status}
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">
                Security
              </span>

              <h2>
                Account controls
              </h2>
            </div>
          </div>

          <div className="admin-empty">
            <ShieldAlert size={27} />

            <h3>
              Administrative control
            </h3>

            <p>
              Account status changes are
              permission-protected and
              recorded in the audit log.
            </p>
          </div>
        </section>

        <section className="admin-panel admin-full-width">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">
                Activity
              </span>

              <h2>
                Recent transactions
              </h2>
            </div>
          </div>

          {account.recentTransactions
            .length === 0 ? (
            <div className="admin-empty">
              <WalletCards size={27} />

              <h3>
                No transactions
              </h3>

              <p>
                No transaction activity is
                associated with this account
                yet.
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      Reference
                    </th>
                    <th>
                      Type
                    </th>
                    <th>
                      Amount
                    </th>
                    <th>
                      Status
                    </th>
                    <th>
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {account.recentTransactions.map(
                    (transaction) => (
                      <tr
                        key={`account-transaction-${transaction.id}`}
                      >
                        <td>
                          <strong>
                            {
                              transaction.reference
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            transaction.type
                          }
                        </td>

                        <td>
                          {
                            transaction.amount
                          }{' '}
                          {
                            transaction.currency
                          }
                        </td>

                        <td>
                          <span
                            className={`status-badge ${transaction.status.toLowerCase()}`}
                          >
                            <span className="status-dot" />
                            {
                              transaction.status
                            }
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            transaction.createdAt,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}