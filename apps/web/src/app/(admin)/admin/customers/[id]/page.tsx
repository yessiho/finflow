'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  UserRoundCheck,
  UserRoundX,
  WalletCards,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

type Customer = {
  profile: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
  };
  summary: {
    walletCount: number;
    transactionCount: number;
    totalWalletBalance: string;
  };
  wallets: Array<{
    id: number;
    currency: string;
    balance: string;
    status: string;
    account: {
      accountName: string;
      accountNumber: string;
      accountType: string;
      bankName: string;
      status: string;
    } | null;
  }>;
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

export default function AdminCustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [customer, setCustomer] =
    useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changingStatus, setChangingStatus] =
    useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const response = await apiFetch<Customer>(
        `/admin/customers/${id}`,
      );
      setCustomer(response);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load customer.',
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
    if (!customer || changingStatus) return;

    const nextStatus =
      customer.profile.status === 'ACTIVE'
        ? 'SUSPENDED'
        : 'ACTIVE';

    const confirmed = window.confirm(
      nextStatus === 'SUSPENDED'
        ? `Suspend ${customer.profile.firstName} ${customer.profile.lastName}?`
        : `Reactivate ${customer.profile.firstName} ${customer.profile.lastName}?`,
    );

    if (!confirmed) return;

    setChangingStatus(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(
        `/admin/customers/${customer.profile.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: nextStatus,
          }),
        },
      );

      await load(true);

      setSuccess(
        nextStatus === 'SUSPENDED'
          ? 'Customer suspended successfully.'
          : 'Customer reactivated successfully.',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to update customer status.',
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
          <span>Loading customer...</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="admin-page">
        <div className="admin-alert admin-alert-error">
          {error || 'Customer not found.'}
        </div>
        <Link
          href="/admin/customers"
          className="admin-back-link"
        >
          <ArrowLeft size={16} />
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-detail-topbar">
        <Link
          href="/admin/customers"
          className="admin-back-link"
        >
          <ArrowLeft size={16} />
          Back to customers
        </Link>

        <button
          type="button"
          className="secondary-button"
          onClick={() => void load(true)}
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
            {customer.profile.firstName[0]}
            {customer.profile.lastName[0]}
          </div>

          <div className="admin-profile-copy">
            <div className="admin-eyebrow">
              Customer account
            </div>
            <h1>
              {customer.profile.firstName}{' '}
              {customer.profile.lastName}
            </h1>
            <p>{customer.profile.email}</p>
          </div>
        </div>

        <div className="admin-profile-actions">
          <span
            className={`status-badge ${customer.profile.status.toLowerCase()}`}
          >
            <span className="status-dot" />
            {customer.profile.status}
          </span>

          {customer.profile.status !== 'DEACTIVATED' && (
            <button
              type="button"
              className={
                customer.profile.status === 'ACTIVE'
                  ? 'danger-button'
                  : 'primary-button'
              }
              onClick={() => void changeStatus()}
              disabled={changingStatus}
            >
              {customer.profile.status === 'ACTIVE' ? (
                <>
                  <UserRoundX size={15} />
                  Suspend customer
                </>
              ) : (
                <>
                  <UserRoundCheck size={15} />
                  Reactivate customer
                </>
              )}
            </button>
          )}
        </div>
      </section>

      <div className="admin-detail-summary-grid">
        <div className="admin-detail-summary-card">
          <span>Customer ID</span>
          <strong>
            CUS-{String(customer.profile.id).padStart(5, '0')}
          </strong>
        </div>
        <div className="admin-detail-summary-card">
          <span>Wallets</span>
          <strong>
            {customer.summary.walletCount}
          </strong>
        </div>
        <div className="admin-detail-summary-card">
          <span>Transactions</span>
          <strong>
            {customer.summary.transactionCount}
          </strong>
        </div>
        <div className="admin-detail-summary-card">
          <span>Registered</span>
          <strong>
            {customer.profile.createdAt
              ? new Intl.DateTimeFormat('en-NG', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date(customer.profile.createdAt))
              : '—'}
          </strong>
        </div>
      </div>

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">
                Customer profile
              </span>
              <h2>Account information</h2>
            </div>
          </div>

          <div className="admin-detail-info-grid">
            <div>
              <span>First name</span>
              <strong>{customer.profile.firstName}</strong>
            </div>
            <div>
              <span>Last name</span>
              <strong>{customer.profile.lastName}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{customer.profile.email}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{customer.profile.status}</strong>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">
                Wallets
              </span>
              <h2>Customer wallets</h2>
            </div>
          </div>

          {customer.wallets.length === 0 ? (
            <div className="admin-empty">
              <WalletCards size={27} />
              <h3>No wallets</h3>
              <p>
                This customer does not have any wallets.
              </p>
            </div>
          ) : (
            <div className="admin-wallet-list">
              {customer.wallets.map((wallet) => (
                <div
                  key={`customer-wallet-${wallet.id}`}
                  className="admin-wallet-card"
                >
                  <div>
                    <strong>
                      {wallet.currency} Wallet
                    </strong>
                    <span>
                      {wallet.account?.bankName ||
                        'Wallet account'}
                    </span>
                  </div>
                  <div className="admin-wallet-balance">
                    {wallet.balance}
                  </div>
                  <span
                    className={`status-badge ${wallet.status.toLowerCase()}`}
                  >
                    {wallet.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel admin-full-width">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">
                Activity
              </span>
              <h2>Recent transactions</h2>
            </div>
          </div>

          {customer.recentTransactions.length === 0 ? (
            <div className="admin-empty">
              <ShieldAlert size={27} />
              <h3>No transactions</h3>
              <p>
                No transaction activity is associated
                with this customer yet.
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.recentTransactions.map(
                    (transaction) => (
                      <tr
                        key={`customer-transaction-${transaction.id}`}
                      >
                        <td>
                          <strong>
                            {transaction.reference}
                          </strong>
                        </td>
                        <td>
                          {transaction.type}
                        </td>
                        <td>
                          {transaction.amount}{' '}
                          {transaction.currency}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${transaction.status.toLowerCase()}`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td>
                          {transaction.createdAt
                            ? new Intl.DateTimeFormat(
                                'en-NG',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                },
                              ).format(
                                new Date(
                                  transaction.createdAt,
                                ),
                              )
                            : '—'}
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
