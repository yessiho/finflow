'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CircleDollarSign,
  CreditCard,
  Eye,
  Landmark,
  Plus,
  RefreshCw,
  WalletCards,
  X,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP';

type Wallet = {
  id: number;
  userId: number;
  currency: Currency;
  balance: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ModalType = 'CREATE' | 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | null;

type ApiError = {
  message?: string;
};

const CURRENCIES: Currency[] = ['NGN', 'USD', 'EUR', 'GBP'];

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  ) {
    return (error as ApiError).message as string;
  }

  return fallback;
}

export default function WalletsPage() {
  const router = useRouter();

  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const [modal, setModal] = useState<ModalType>(null);

  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

  const [currency, setCurrency] = useState<Currency>('NGN');

  const [amount, setAmount] = useState('');

  const [destinationWalletId, setDestinationWalletId] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const loadWallets = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      setError('');

      const data = await apiFetch('/wallets');

      setWallets(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error(error);

      setError(
        getErrorMessage(
          error,
          'Unable to load wallets. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadWallets();
    });
  }, [loadWallets]);

  function handleRefresh() {
    void loadWallets(true);
  }

  function openModal(type: ModalType, wallet?: Wallet) {
    setSelectedWallet(wallet || null);

    setAmount('');

    setDestinationWalletId('');

    setError('');

    setSuccess('');

    setModal(type);
  }

  function closeModal() {
    if (submitting) return;

    setModal(null);

    setSelectedWallet(null);

    setAmount('');

    setDestinationWalletId('');

    setError('');
  }

  function formatBalance(wallet: Wallet) {
    const value = Number(wallet.balance) || 0;

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: wallet.currency,
      minimumFractionDigits: 2,
    }).format(value);
  }

  function formatNumber(value: number) {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function getCurrencySymbol(walletCurrency: string) {
    const symbols: Record<string, string> = {
      NGN: '₦',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };

    return symbols[walletCurrency] || '';
  }

  function getCurrencyName(walletCurrency: Currency) {
    const names: Record<Currency, string> = {
      NGN: 'Nigerian Naira',
      USD: 'US Dollar',
      EUR: 'Euro',
      GBP: 'British Pound',
    };

    return names[walletCurrency];
  }

  function getCurrencyClass(walletCurrency: Currency) {
    return `currency-${walletCurrency.toLowerCase()}`;
  }

  async function createWallet() {
    try {
      setSubmitting(true);

      setError('');

      await apiFetch('/wallets', {
        method: 'POST',

        body: JSON.stringify({
          currency,
        }),
      });

      setSuccess(`${currency} wallet created successfully.`);

      await loadWallets();

      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'Unable to create wallet.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function depositMoney() {
    if (!selectedWallet) return;

    try {
      setSubmitting(true);

      setError('');

      await apiFetch(`/wallets/${selectedWallet.id}/deposit`, {
        method: 'POST',

        body: JSON.stringify({
          amount: Number(amount),
        }),
      });

      setSuccess('Deposit completed successfully.');

      await loadWallets();

      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'Unable to complete deposit.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function withdrawMoney() {
    if (!selectedWallet) return;

    try {
      setSubmitting(true);

      setError('');

      await apiFetch(`/wallets/${selectedWallet.id}/withdraw`, {
        method: 'POST',

        body: JSON.stringify({
          amount: Number(amount),
        }),
      });

      setSuccess('Withdrawal completed successfully.');

      await loadWallets();

      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'Unable to complete withdrawal.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function transferMoney() {
    if (!selectedWallet) return;

    try {
      setSubmitting(true);

      setError('');

      await apiFetch(`/wallets/${selectedWallet.id}/transfer`, {
        method: 'POST',

        body: JSON.stringify({
          destinationWalletId: Number(destinationWalletId),

          amount: Number(amount),
        }),
      });

      setSuccess('Transfer completed successfully.');

      await loadWallets();

      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'Unable to complete transfer.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    if (modal === 'CREATE') {
      void createWallet();

      return;
    }

    if (modal === 'DEPOSIT') {
      void depositMoney();

      return;
    }

    if (modal === 'WITHDRAW') {
      void withdrawMoney();

      return;
    }

    if (modal === 'TRANSFER') {
      void transferMoney();
    }
  }

  const availableDestinationWallets = useMemo(
    () =>
      wallets.filter(
        (wallet) =>
          wallet.id !== selectedWallet?.id &&
          wallet.currency === selectedWallet?.currency,
      ),
    [wallets, selectedWallet],
  );

  const totalWalletBalance = wallets.reduce(
    (total, wallet) => total + (Number(wallet.balance) || 0),
    0,
  );

  const activeWallets = wallets.filter(
    (wallet) => wallet.status.toUpperCase() === 'ACTIVE',
  ).length;

  const currenciesAvailable = new Set(
    wallets.map((wallet) => wallet.currency),
  ).size;

  const canSubmit =
    modal === 'CREATE'
      ? true
      : modal === 'TRANSFER'
        ? Number(amount) > 0 && Boolean(destinationWalletId)
        : Number(amount) > 0;

  return (
    <div className="wallets-page">
      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <section className="wallets-page-header">
        <div className="wallets-header-content">
          <div className="wallets-header-icon">
            <WalletCards size={26} />
          </div>

          <div>
            <div className="page-eyebrow">Financial Management</div>

            <h1>My Wallets</h1>

            <p>
              Manage your balances, deposits, withdrawals and transfers from one
              secure place.
            </p>
          </div>
        </div>

        <div className="wallets-header-actions">
          <button
            type="button"
            className="wallet-secondary-button"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'spin' : ''} />

            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="wallet-primary-button"
            onClick={() => openModal('CREATE')}
          >
            <Plus size={18} />

            <span>Create Wallet</span>
          </button>
        </div>
      </section>

      {/* STATUS MESSAGES */}

      {error && !modal && (
        <div className="wallet-alert wallet-alert-error">
          <span>{error}</span>

          <button type="button" onClick={() => setError('')}>
            <X size={17} />
          </button>
        </div>
      )}

      {success && !modal && (
        <div className="wallet-alert wallet-alert-success">
          <span>{success}</span>

          <button type="button" onClick={() => setSuccess('')}>
            <X size={17} />
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}

      {!loading && (
        <section className="wallet-summary-grid">
          <div className="wallet-summary-card wallet-summary-primary">
            <div className="wallet-summary-icon">
              <Landmark size={22} />
            </div>

            <div className="wallet-summary-content">
              <span>Total Wallet Balance</span>

              <strong>₦{formatNumber(totalWalletBalance)}</strong>

              <small>Combined balance overview</small>
            </div>
          </div>

          <div className="wallet-summary-card">
            <div className="wallet-summary-icon summary-blue">
              <WalletCards size={21} />
            </div>

            <div className="wallet-summary-content">
              <span>Total Wallets</span>

              <strong>{wallets.length}</strong>

              <small>Financial accounts created</small>
            </div>
          </div>

          <div className="wallet-summary-card">
            <div className="wallet-summary-icon summary-green">
              <CreditCard size={21} />
            </div>

            <div className="wallet-summary-content">
              <span>Active Wallets</span>

              <strong>{activeWallets}</strong>

              <small>Currently available accounts</small>
            </div>
          </div>

          <div className="wallet-summary-card">
            <div className="wallet-summary-icon summary-purple">
              <CircleDollarSign size={21} />
            </div>

            <div className="wallet-summary-content">
              <span>Supported Currencies</span>

              <strong>{currenciesAvailable}</strong>

              <small>NGN, USD, EUR and GBP</small>
            </div>
          </div>
        </section>
      )}

      {/* WALLET CONTENT */}

      <section className="wallets-content-section">
        <div className="wallets-section-header">
          <div>
            <h2>Your Financial Wallets</h2>

            <p>View balances and manage your available wallets.</p>
          </div>

          <div className="wallet-count-badge">
            {wallets.length} {wallets.length === 1 ? 'Wallet' : 'Wallets'}
          </div>
        </div>

        {loading ? (
          <div className="wallets-loading-state">
            <div className="wallet-loading-spinner" />

            <h3>Loading your wallets</h3>

            <p>Please wait while we retrieve your financial accounts.</p>
          </div>
        ) : wallets.length === 0 ? (
          <div className="wallets-empty-state">
            <div className="empty-wallet-icon">
              <WalletCards size={42} />
            </div>

            <h3>No wallets available yet</h3>

            <p>
              Create your first wallet and start managing your finances
              securely.
            </p>

            <button
              type="button"
              className="wallet-primary-button"
              onClick={() => openModal('CREATE')}
            >
              <Plus size={18} />
              Create Your First Wallet
            </button>
          </div>
        ) : (
          <div className="fin-wallet-grid">
            {wallets.map((wallet) => (
              <article key={wallet.id} className="fin-wallet-card">
                <div className="fin-wallet-card-top">
                  <div className="fin-wallet-identity">
                    <div
                      className={`fin-wallet-currency-icon ${getCurrencyClass(
                        wallet.currency,
                      )}`}
                    >
                      {getCurrencySymbol(wallet.currency)}
                    </div>

                    <div>
                      <h3>{wallet.currency} Wallet</h3>

                      <span>{getCurrencyName(wallet.currency)}</span>
                    </div>
                  </div>

                  <span
                    className={`fin-wallet-status ${wallet.status.toLowerCase()}`}
                  >
                    <span className="status-dot" />

                    {wallet.status}
                  </span>
                </div>

                <div className="fin-wallet-balance">
                  <span>Available Balance</span>

                  <h2>{formatBalance(wallet)}</h2>
                </div>

                <div className="fin-wallet-meta">
                  <div className="fin-wallet-meta-item">
                    <span>Wallet ID</span>

                    <strong>#{wallet.id}</strong>
                  </div>

                  <div className="fin-wallet-meta-item">
                    <span>Created</span>

                    <strong>
                      {new Date(wallet.createdAt).toLocaleDateString('en-NG', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </div>
                </div>

                <div className="wallet-card-divider" />

                <div className="fin-wallet-actions">
                  <button
                    type="button"
                    className="fin-wallet-action"
                    onClick={() => router.push(`/wallets/${wallet.id}`)}
                  >
                    <Eye size={17} />

                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    className="fin-wallet-action"
                    onClick={() => openModal('DEPOSIT', wallet)}
                  >
                    <ArrowDownToLine size={17} />

                    <span>Deposit</span>
                  </button>

                  <button
                    type="button"
                    className="fin-wallet-action"
                    onClick={() => openModal('WITHDRAW', wallet)}
                  >
                    <ArrowUpFromLine size={17} />

                    <span>Withdraw</span>
                  </button>

                  <button
                    type="button"
                    className="fin-wallet-action"
                    onClick={() => openModal('TRANSFER', wallet)}
                  >
                    <ArrowLeftRight size={17} />

                    <span>Transfer</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* MODAL */}

      {modal && (
        <div className="wallet-modal-overlay" onClick={closeModal}>
          <div
            className="wallet-management-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wallet-modal-header">
              <div>
                <span className="modal-eyebrow">Wallet Management</span>

                <h2>
                  {modal === 'CREATE' && 'Create New Wallet'}

                  {modal === 'DEPOSIT' && 'Deposit Money'}

                  {modal === 'WITHDRAW' && 'Withdraw Money'}

                  {modal === 'TRANSFER' && 'Transfer Money'}
                </h2>

                <p>
                  {modal === 'CREATE' &&
                    'Select the currency for your new financial wallet.'}

                  {modal === 'DEPOSIT' &&
                    'Add funds securely to your selected wallet.'}

                  {modal === 'WITHDRAW' &&
                    'Withdraw funds from your selected wallet.'}

                  {modal === 'TRANSFER' &&
                    'Move funds between wallets of the same currency.'}
                </p>
              </div>

              <button
                type="button"
                className="wallet-modal-close"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {selectedWallet && (
              <div className="modal-selected-wallet">
                <div
                  className={`modal-wallet-icon ${getCurrencyClass(
                    selectedWallet.currency,
                  )}`}
                >
                  {getCurrencySymbol(selectedWallet.currency)}
                </div>

                <div>
                  <span>Selected Wallet</span>

                  <strong>
                    {selectedWallet.currency} Wallet #{selectedWallet.id}
                  </strong>
                </div>

                <div className="modal-wallet-balance">
                  <span>Available</span>

                  <strong>{formatBalance(selectedWallet)}</strong>
                </div>
              </div>
            )}

            {error && (
              <div className="wallet-modal-alert error">
                {error}
              </div>
            )}

            {success && (
              <div className="wallet-modal-alert success">
                {success}
              </div>
            )}

            {/* CREATE WALLET */}

            {modal === 'CREATE' && (
              <div className="wallet-modal-body">
                <div className="wallet-form-group">
                  <label>Wallet Currency</label>

                  <select
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value as Currency)
                    }
                  >
                    {CURRENCIES.map((item) => (
                      <option key={item} value={item}>
                        {item} — {getCurrencyName(item)}
                      </option>
                    ))}
                  </select>

                  <small>
                    You can create wallets in multiple supported currencies.
                  </small>
                </div>
              </div>
            )}

            {/* DEPOSIT / WITHDRAW */}

            {(modal === 'DEPOSIT' || modal === 'WITHDRAW') &&
              selectedWallet && (
                <div className="wallet-modal-body">
                  <div className="wallet-form-group">
                    <label>Amount ({selectedWallet.currency})</label>

                    <div className="wallet-amount-input">
                      <span>
                        {getCurrencySymbol(selectedWallet.currency)}
                      </span>

                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                      />
                    </div>

                    <small>
                      Enter the amount you want to{' '}
                      {modal === 'DEPOSIT' ? 'deposit' : 'withdraw'}.
                    </small>
                  </div>
                </div>
              )}

            {/* TRANSFER */}

            {modal === 'TRANSFER' && selectedWallet && (
              <div className="wallet-modal-body">
                <div className="wallet-form-group">
                  <label>Destination Wallet</label>

                  <select
                    value={destinationWalletId}
                    onChange={(event) =>
                      setDestinationWalletId(event.target.value)
                    }
                  >
                    <option value="">Select destination wallet</option>

                    {availableDestinationWallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        Wallet #{wallet.id} — {wallet.currency}
                      </option>
                    ))}
                  </select>

                  {availableDestinationWallets.length === 0 && (
                    <small className="wallet-form-warning">
                      No other {selectedWallet.currency} wallet is available for
                      transfer.
                    </small>
                  )}
                </div>

                <div className="wallet-form-group">
                  <label>
                    Transfer Amount ({selectedWallet.currency})
                  </label>

                  <div className="wallet-amount-input">
                    <span>
                      {getCurrencySymbol(selectedWallet.currency)}
                    </span>

                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODAL FOOTER */}

            <div className="wallet-modal-footer">
              <button
                type="button"
                className="wallet-secondary-button"
                onClick={closeModal}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="wallet-primary-button"
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
              >
                {submitting
                  ? 'Processing...'
                  : modal === 'CREATE'
                    ? 'Create Wallet'
                    : modal === 'DEPOSIT'
                      ? 'Confirm Deposit'
                      : modal === 'WITHDRAW'
                        ? 'Confirm Withdrawal'
                        : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}