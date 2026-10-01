'use client';

import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  RefreshCw,
  UserRound,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';

type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
};

type WalletSummary = {
  id: number;
  currency: string;
  balance?: string;
  status: string;
};

type Transaction = {
  id: number;
  reference: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer | null;
  sourceWallet: WalletSummary | null;
  destinationWallet: WalletSummary | null;
};

type LedgerAccount = {
  id: number;
  code: string;
  name: string;
  type: string;
  currency: string;
  active: boolean;
};

type LedgerEntry = {
  id: number;
  transactionId: number;
  accountId: number;
  account: LedgerAccount | null;
  debit: string;
  credit: string;
  createdAt: string;
};

type TransactionResponse = {
  transaction: Transaction;
  ledgerEntries: LedgerEntry[];
};

function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (typeof value === 'number') {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'epochMilliseconds' in value
  ) {
    const epochMilliseconds = (
      value as {
        epochMilliseconds?: unknown;
      }
    ).epochMilliseconds;

    if (
      typeof epochMilliseconds === 'number' &&
      Number.isFinite(epochMilliseconds)
    ) {
      const date = new Date(
        epochMilliseconds,
      );

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }
  }

  return null;
}

function formatDate(value: unknown): string {
  const date = toDate(value);

  if (!date) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatAmount(
  amount: string,
  currency: string,
): string {
  if (!amount) {
    return '—';
  }

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatLedgerAmount(
  amount: string,
  currency: string,
): string {
  if (!amount || amount === '0') {
    return '—';
  }

  return formatAmount(amount, currency);
}

function getStatusClass(
  status: string,
): string {
  switch (status) {
    case 'COMPLETED':
      return 'completed';

    case 'PENDING':
      return 'pending';

    case 'FAILED':
      return 'failed';

    case 'REVERSED':
      return 'reversed';

    default:
      return 'inactive';
  }
}

function getInitials(
  customer: Customer | null,
): string {
  if (!customer) {
    return '—';
  }

  return `${customer.firstName?.[0] ?? ''}${customer.lastName?.[0] ?? ''}`
    .toUpperCase()
    .slice(0, 2);
}

function getTransactionIcon(
  type: string,
) {
  switch (type) {
    case 'DEPOSIT':
      return <ArrowDownLeft size={24} />;

    case 'WITHDRAWAL':
      return <ArrowUpRight size={24} />;

    case 'TRANSFER':
      return <ArrowUpRight size={24} />;

    default:
      return <ArrowUpRight size={24} />;
  }
}

function getStatusIcon(
  status: string,
) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 size={18} />;

    case 'FAILED':
      return <XCircle size={18} />;

    case 'PENDING':
      return <Clock3 size={18} />;

    case 'REVERSED':
      return <RefreshCw size={18} />;

    default:
      return <Clock3 size={18} />;
  }
}

export default function AdminTransactionDetailsPage() {
  const params = useParams();

  const transactionId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : '';

  const [transaction, setTransaction] =
    useState<Transaction | null>(null);

  const [ledgerEntries, setLedgerEntries] =
    useState<LedgerEntry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [copied, setCopied] =
    useState(false);

  async function loadTransaction(
    refresh = false,
  ) {
    if (!transactionId) {
      setError(
        'Invalid transaction ID.',
      );
      setLoading(false);
      return;
    }

    try {
      setError('');

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response =
        await apiFetch<TransactionResponse>(
          `/admin/transactions/${transactionId}`,
        );

      setTransaction(
        response.transaction,
      );

      setLedgerEntries(
        response.ledgerEntries ?? [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load transaction.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadTransaction();

    // transactionId is intentionally the
    // only dependency for this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  async function copyReference() {
    if (!transaction?.reference) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        transaction.reference,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="admin-loading-spinner" />

          <p>
            Loading transaction...
          </p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="admin-page">
        <Link
          href="/admin/transactions"
          className="admin-back-link"
        >
          <ArrowLeft size={16} />

          Back to transactions
        </Link>

        <div className="admin-alert admin-alert-error">
          <strong>
            Unable to load transaction
          </strong>

          <span>
            {error ||
              'Transaction not found.'}
          </span>
        </div>
      </div>
    );
  }

  const customerName =
    transaction.customer
      ? `${transaction.customer.firstName} ${transaction.customer.lastName}`
      : 'Unknown customer';

  return (
    <div className="admin-page">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="admin-detail-topbar">
        <div>
          <Link
            href="/admin/transactions"
            className="admin-back-link"
          >
            <ArrowLeft size={16} />

            Back to transactions
          </Link>

          <div className="admin-page-eyebrow">
            Transaction Investigation
          </div>

          <div className="admin-detail-title-row">
            <div className="admin-transaction-hero-icon">
              {getTransactionIcon(
                transaction.type,
              )}
            </div>

            <div>
              <h1 className="page-title">
                {transaction.reference}
              </h1>

              <p className="page-description">
                Transaction ID #
                {transaction.id}
              </p>
            </div>
          </div>
        </div>

        <div className="admin-detail-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              void loadTransaction(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? 'admin-refresh-spin'
                  : undefined
              }
            />

            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>
        </div>
      </div>

      {/* =====================================================
          REFRESH ERROR
          ===================================================== */}

      {error && (
        <div className="admin-alert admin-alert-error">
          <strong>
            Unable to refresh transaction
          </strong>

          <span>{error}</span>
        </div>
      )}

      {/* =====================================================
          TRANSACTION HERO
          ===================================================== */}

      <section className="admin-transaction-hero">
        <div className="admin-transaction-hero-main">
          <div>
            <span className="admin-detail-label">
              Transaction amount
            </span>

            <div className="admin-transaction-amount">
              {formatAmount(
                transaction.amount,
                transaction.currency,
              )}
            </div>

            <div className="admin-transaction-meta">
              <span>
                {transaction.currency}
              </span>

              <span>•</span>

              <span>
                {transaction.type}
              </span>
            </div>
          </div>

          <span
            className={`status-badge ${getStatusClass(
              transaction.status,
            )} admin-large-status`}
          >
            {getStatusIcon(
              transaction.status,
            )}

            {transaction.status}
          </span>
        </div>
      </section>

      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <div className="admin-detail-summary-grid">
        <div className="admin-detail-summary-card">
          <span>Reference</span>

          <strong className="admin-copy-value">
            {transaction.reference}

            <button
              type="button"
              className="admin-copy-button"
              onClick={
                copyReference
              }
              title="Copy reference"
              aria-label="Copy transaction reference"
            >
              <Copy size={15} />
            </button>
          </strong>

          {copied && (
            <small className="admin-copy-success">
              Copied
            </small>
          )}
        </div>

        <div className="admin-detail-summary-card">
          <span>
            Transaction type
          </span>

          <strong>
            {transaction.type}
          </strong>
        </div>

        <div className="admin-detail-summary-card">
          <span>Created</span>

          <strong>
            {formatDate(
              transaction.createdAt,
            )}
          </strong>
        </div>

        <div className="admin-detail-summary-card">
          <span>Last updated</span>

          <strong>
            {formatDate(
              transaction.updatedAt,
            )}
          </strong>
        </div>
      </div>

      {/* =====================================================
          DETAIL GRID
          ===================================================== */}

      <div className="admin-detail-grid">
        {/* ===================================================
            CUSTOMER
            =================================================== */}

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Customer</h2>

              <p>
                Customer associated with
                this transaction
              </p>
            </div>

            <UserRound size={19} />
          </div>

          {transaction.customer ? (
            <div className="admin-transaction-customer">
              <div className="admin-profile-avatar">
                {getInitials(
                  transaction.customer,
                )}
              </div>

              <div>
                <strong>
                  {customerName}
                </strong>

                <span>
                  {
                    transaction.customer
                      .email
                  }
                </span>

                <small>
                  Customer #
                  {
                    transaction.customer
                      .id
                  }
                </small>
              </div>
            </div>
          ) : (
            <div className="admin-empty compact">
              <UserRound size={28} />

              <p>
                No customer record
                found.
              </p>
            </div>
          )}
        </section>

        {/* ===================================================
            STATUS
            =================================================== */}

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>
                Transaction status
              </h2>

              <p>
                Current processing state
              </p>
            </div>

            {getStatusIcon(
              transaction.status,
            )}
          </div>

          <div className="admin-status-detail">
            <span
              className={`status-badge ${getStatusClass(
                transaction.status,
              )}`}
            >
              {transaction.status}
            </span>

            <p>
              This transaction was
              created on{' '}
              <strong>
                {formatDate(
                  transaction.createdAt,
                )}
              </strong>
              .
            </p>
          </div>
        </section>

        {/* ===================================================
            SOURCE WALLET
            =================================================== */}

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>
                Source wallet
              </h2>

              <p>
                Origin of the
                transaction
              </p>
            </div>

            <WalletCards size={19} />
          </div>

          {transaction.sourceWallet ? (
            <div className="admin-wallet-detail">
              <div>
                <span>
                  Wallet ID
                </span>

                <strong>
                  #
                  {
                    transaction
                      .sourceWallet
                      .id
                  }
                </strong>
              </div>

              <div>
                <span>
                  Currency
                </span>

                <strong>
                  {
                    transaction
                      .sourceWallet
                      .currency
                  }
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {
                    transaction
                      .sourceWallet
                      .status
                  }
                </strong>
              </div>
            </div>
          ) : (
            <div className="admin-empty compact">
              <WalletCards size={28} />

              <p>
                No source wallet.
              </p>
            </div>
          )}
        </section>

        {/* ===================================================
            DESTINATION WALLET
            =================================================== */}

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>
                Destination wallet
              </h2>

              <p>
                Recipient of the
                transaction
              </p>
            </div>

            <WalletCards size={19} />
          </div>

          {transaction.destinationWallet ? (
            <div className="admin-wallet-detail">
              <div>
                <span>
                  Wallet ID
                </span>

                <strong>
                  #
                  {
                    transaction
                      .destinationWallet
                      .id
                  }
                </strong>
              </div>

              <div>
                <span>
                  Currency
                </span>

                <strong>
                  {
                    transaction
                      .destinationWallet
                      .currency
                  }
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {
                    transaction
                      .destinationWallet
                      .status
                  }
                </strong>
              </div>
            </div>
          ) : (
            <div className="admin-empty compact">
              <WalletCards size={28} />

              <p>
                No destination wallet.
              </p>
            </div>
          )}
        </section>

        {/* ===================================================
            TRANSACTION INFORMATION
            =================================================== */}

        <section className="admin-panel admin-full-width">
          <div className="admin-panel-header">
            <div>
              <h2>
                Transaction information
              </h2>

              <p>
                Core transaction
                record
              </p>
            </div>

            <FileText size={19} />
          </div>

          <div className="admin-detail-info-grid">
            <div>
              <span>
                Transaction ID
              </span>

              <strong>
                #{transaction.id}
              </strong>
            </div>

            <div>
              <span>
                Reference
              </span>

              <strong>
                {transaction.reference}
              </strong>
            </div>

            <div>
              <span>
                Amount
              </span>

              <strong>
                {formatAmount(
                  transaction.amount,
                  transaction.currency,
                )}
              </strong>
            </div>

            <div>
              <span>
                Currency
              </span>

              <strong>
                {transaction.currency}
              </strong>
            </div>

            <div>
              <span>
                Type
              </span>

              <strong>
                {transaction.type}
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong>
                {transaction.status}
              </strong>
            </div>

            <div>
              <span>
                Created
              </span>

              <strong>
                {formatDate(
                  transaction.createdAt,
                )}
              </strong>
            </div>

            <div>
              <span>
                Updated
              </span>

              <strong>
                {formatDate(
                  transaction.updatedAt,
                )}
              </strong>
            </div>
          </div>
        </section>

        {/* ===================================================
            LEDGER ENTRIES
            =================================================== */}

        <section className="admin-panel admin-full-width">
          <div className="admin-panel-header">
            <div>
              <h2>
                Ledger entries
              </h2>

              <p>
                Double-entry accounting
                records associated with
                this transaction
              </p>
            </div>

            <FileText size={19} />
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="admin-empty compact">
              <FileText size={28} />

              <p>
                No ledger entries found
                for this transaction.
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="data-table admin-ledger-entry-table">
                <thead>
                  <tr>
                    <th>Entry</th>
                    <th>Account</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Currency</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {ledgerEntries.map(
                    (entry) => {
                      const currency =
                        entry.account
                          ?.currency ??
                        transaction.currency;

                      return (
                        <tr
                          key={entry.id}
                        >
                          {/* Entry */}
                          <td>
                            <div className="admin-table-primary">
                              #{entry.id}
                            </div>

                            <div className="admin-table-secondary">
                              Transaction #
                              {
                                entry.transactionId
                              }
                            </div>
                          </td>

                          {/* Account */}
                          <td>
                            <div className="admin-ledger-account">
                              <strong>
                                {entry.account
                                  ?.name ??
                                  `Account #${entry.accountId}`}
                              </strong>

                              <small>
                                {entry.account
                                  ?.code ??
                                  `Account #${entry.accountId}`}
                              </small>
                            </div>
                          </td>

                          {/* Debit */}
                          <td>
                            <span className="admin-ledger-debit">
                              {formatLedgerAmount(
                                entry.debit,
                                currency,
                              )}
                            </span>
                          </td>

                          {/* Credit */}
                          <td>
                            <span className="admin-ledger-credit">
                              {formatLedgerAmount(
                                entry.credit,
                                currency,
                              )}
                            </span>
                          </td>

                          {/* Currency */}
                          <td>
                            <span className="admin-currency-badge">
                              {currency}
                            </span>
                          </td>

                          {/* Created */}
                          <td>
                            <div className="admin-date-cell">
                              {formatDate(
                                entry.createdAt,
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    },
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