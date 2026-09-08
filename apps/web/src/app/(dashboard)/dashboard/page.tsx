'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  Landmark,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

/* ============================================================
   TYPES
============================================================ */

interface WalletAccount {
  id: number;
  walletId: number;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string | null;
  accountType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface WalletData {
  id: number;
  userId: number;
  balance: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  /*
   * Account can be null for older wallets.
   */
  account: WalletAccount | null;
}

interface Transaction {
  id: number;
  reference: string;
  amount: string;
  currency: string;
  type: string;
  status: string;
  createdAt: string;
}

/* ============================================================
   COMPONENT
============================================================ */

export default function DashboardPage() {
  const router = useRouter();

  const [wallets, setWallets] = useState<WalletData[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  /* ============================================================
     ERROR MESSAGE HELPER
  ============================================================ */

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unable to load dashboard';
  };

  /* ============================================================
     LOAD DASHBOARD
  ============================================================ */

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        /*
         * Confirm user is authenticated.
         */
        const token = localStorage.getItem('access_token');

        if (!token) {
          router.push('/login');
          return;
        }

        /*
         * Load wallets and transactions simultaneously.
         */
        const [walletsData, transactionsData] = await Promise.all([
          apiFetch<WalletData[]>('/wallets'),
          apiFetch<Transaction[]>('/transactions/recent?limit=5'),
        ]);

        /*
         * Protect against unexpected API responses.
         */
        setWallets(Array.isArray(walletsData) ? walletsData : []);

        setTransactions(
          Array.isArray(transactionsData) ? transactionsData : [],
        );
      } catch (error: unknown) {
        console.error('Dashboard loading error:', error);

        const message = getErrorMessage(error);

        /*
         * Redirect unauthorized users.
         */
        if (message === 'Unauthorized') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');

          router.push('/login');

          return;
        }

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /* ============================================================
     FORMAT AMOUNT
  ============================================================ */

  function formatAmount(amount: string | number, currency: string) {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
      return `${currency} 0.00`;
    }

    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numericAmount);
    } catch {
      return `${currency} ${numericAmount.toLocaleString('en-NG')}`;
    }
  }

  /* ============================================================
     FORMAT NUMBER
  ============================================================ */

  function formatNumber(amount: number) {
    if (!Number.isFinite(amount)) {
      return '0.00';
    }

    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /* ============================================================
     FORMAT DATE
  ============================================================ */

  function formatDate(date: string) {
    try {
      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        return date;
      }

      return new Intl.DateTimeFormat('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(parsedDate);
    } catch {
      return date;
    }
  }

  /* ============================================================
     TRANSACTION ICON
  ============================================================ */

  function getTransactionIcon(type: string) {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownLeft size={19} />;

      case 'WITHDRAWAL':
        return <ArrowUpRight size={19} />;

      case 'TRANSFER':
        return <RefreshCcw size={18} />;

      default:
        return <Activity size={19} />;
    }
  }

  /* ============================================================
     TRANSACTION CLASS
  ============================================================ */

  function getTransactionClass(type: string) {
    switch (type) {
      case 'DEPOSIT':
        return 'dashboard-transaction-icon deposit';

      case 'WITHDRAWAL':
        return 'dashboard-transaction-icon withdrawal';

      case 'TRANSFER':
        return 'dashboard-transaction-icon transfer';

      default:
        return 'dashboard-transaction-icon';
    }
  }

  /* ============================================================
     STATUS CLASS
  ============================================================ */

  function getStatusClass(status: string) {
    return status.toLowerCase();
  }

  /* ============================================================
     CALCULATIONS
  ============================================================ */

  const totalBalance = wallets.reduce((total, wallet) => {
    const balance = Number(wallet.balance);

    return total + (Number.isFinite(balance) ? balance : 0);
  }, 0);

  const activeWallets = wallets.filter(
    (wallet) => wallet.status === 'ACTIVE',
  ).length;

  const totalAccounts = wallets.filter(
    (wallet) => wallet.account !== null,
  ).length;

  /* ============================================================
     LOADING SCREEN
  ============================================================ */

  if (loading) {
    return (
      <div className="dashboard-loading-page">
        <div className="dashboard-loading-content">
          <div className="dashboard-loader-logo">
            <Landmark size={26} />
          </div>

          <div className="dashboard-loader-spinner" />

          <p>Loading your financial overview...</p>
        </div>
      </div>
    );
  }

  /* ============================================================
     DASHBOARD
  ============================================================ */

  return (
    <main className="dashboard-page">
      {/* ========================================================
          PAGE HEADER
      ======================================================== */}

      <section className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-badge">
            <Activity size={15} />
            Financial Overview
          </div>

          <h1>Dashboard</h1>

          <p>
            Monitor your wallets, virtual accounts, transactions, and financial
            activity in one place.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-refresh-button"
          onClick={() => void loadDashboard(true)}
          disabled={refreshing}
        >
          <RefreshCcw
            size={17}
            className={
              refreshing
                ? 'refresh-icon spinning'
                : 'refresh-icon'
            }
          />

          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {/* ========================================================
          ERROR MESSAGE
      ======================================================== */}

      {error && (
        <div className="dashboard-error" role="alert">
          <strong>Something went wrong.</strong>

          <span>{error}</span>
        </div>
      )}

      {/* ========================================================
          OVERVIEW CARDS
      ======================================================== */}

      <section className="dashboard-overview-grid">
        {/* TOTAL BALANCE */}

        <div className="dashboard-stat-card dashboard-stat-primary">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon">
              <Wallet size={23} />
            </div>

            <div className="dashboard-stat-trend">
              <TrendingUp size={15} />
              Overview
            </div>
          </div>

          <div className="dashboard-stat-content">
            <span>Total Wallet Balance</span>

            <h2>{formatNumber(totalBalance)}</h2>

            <p>Combined balance across all currencies</p>
          </div>
        </div>

        {/* ACTIVE WALLETS */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon">
              <CircleDollarSign size={23} />
            </div>
          </div>

          <div className="dashboard-stat-content">
            <span>Active Wallets</span>

            <h2>{activeWallets}</h2>

            <p>
              {wallets.length} total wallet
              {wallets.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* VIRTUAL ACCOUNTS */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon">
              <Landmark size={23} />
            </div>
          </div>

          <div className="dashboard-stat-content">
            <span>Virtual Accounts</span>

            <h2>{totalAccounts}</h2>

            <p>Wallets with account numbers</p>
          </div>
        </div>

        {/* TRANSACTIONS */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon">
              <Activity size={23} />
            </div>
          </div>

          <div className="dashboard-stat-content">
            <span>Recent Transactions</span>

            <h2>{transactions.length}</h2>

            <p>Latest recorded transactions</p>
          </div>
        </div>
      </section>

      {/* ========================================================
          WALLETS SECTION
      ======================================================== */}

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <div className="dashboard-section-label">
              <CircleDollarSign size={16} />
              Financial Accounts
            </div>

            <h2>My Wallets</h2>

            <p>
              Manage and monitor your available currency wallets and virtual
              account details.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-view-button"
            onClick={() => router.push('/wallets')}
          >
            View All
            <ArrowRight size={16} />
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-icon">
              <Wallet size={30} />
            </div>

            <h3>No wallets found</h3>

            <p>
              Create your first wallet to begin managing your finances.
            </p>

            <button
              type="button"
              onClick={() => router.push('/wallets')}
            >
              Go to Wallets
            </button>
          </div>
        ) : (
          <div className="dashboard-wallet-grid">
            {wallets.map((wallet) => (
              <article
                key={wallet.id}
                className="dashboard-wallet-card"
              >
                {/* WALLET HEADER */}

                <div className="dashboard-wallet-card-top">
                  <div className="dashboard-wallet-icon">
                    <Wallet size={21} />
                  </div>

                  <span
                    className={`dashboard-wallet-status ${wallet.status.toLowerCase()}`}
                  >
                    <span className="status-dot" />

                    {wallet.status}
                  </span>
                </div>

                <div className="dashboard-wallet-divider" />

                {/* WALLET BALANCE */}

                <div className="dashboard-wallet-content">
                  <span className="dashboard-wallet-currency">
                    {wallet.currency} Wallet
                  </span>

                  <h3>
                    {formatAmount(
                      wallet.balance,
                      wallet.currency,
                    )}
                  </h3>
                </div>

                {/* ================================================
                    VIRTUAL ACCOUNT DETAILS
                ================================================= */}

                <div className="dashboard-wallet-account">
                  <div className="dashboard-account-row">
                    <span>Account Number</span>

                    <strong>
                      {wallet.account?.accountNumber ??
                        'Not available'}
                    </strong>
                  </div>

                  <div className="dashboard-account-row">
                    <span>Account Name</span>

                    <strong>
                      {wallet.account?.accountName ??
                        'Not available'}
                    </strong>
                  </div>

                  <div className="dashboard-account-row">
                    <span>Bank</span>

                    <strong>
                      {wallet.account?.bankName ??
                        'Not available'}
                    </strong>
                  </div>
                </div>

                {/* WALLET FOOTER */}

                <div className="dashboard-wallet-footer">
                  <span>Wallet ID</span>

                  <strong>#{wallet.id}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================
          RECENT TRANSACTIONS
      ======================================================== */}

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <div className="dashboard-section-label">
              <Clock3 size={16} />
              Latest Activity
            </div>

            <h2>Recent Transactions</h2>

            <p>A quick overview of your latest financial activity.</p>
          </div>

          <button
            type="button"
            className="dashboard-view-button"
            onClick={() => router.push('/transactions')}
          >
            View All
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="dashboard-transactions-card">
          {transactions.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-icon">
                <Activity size={30} />
              </div>

              <h3>No transactions yet</h3>

              <p>
                Your financial activity will appear here once transactions are
                made.
              </p>
            </div>
          ) : (
            <div className="dashboard-transaction-list">
              {transactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="dashboard-transaction-row"
                >
                  <div
                    className={getTransactionClass(
                      transaction.type,
                    )}
                  >
                    {getTransactionIcon(transaction.type)}
                  </div>

                  <div className="dashboard-transaction-info">
                    <strong>{transaction.type}</strong>

                    <span>{transaction.reference}</span>
                  </div>

                  <div className="dashboard-transaction-date">
                    <Clock3 size={14} />

                    {formatDate(transaction.createdAt)}
                  </div>

                  <div className="dashboard-transaction-amount">
                    <strong>
                      {formatAmount(
                        transaction.amount,
                        transaction.currency,
                      )}
                    </strong>

                    <span
                      className={`dashboard-transaction-status ${getStatusClass(
                        transaction.status,
                      )}`}
                    >
                      {transaction.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}