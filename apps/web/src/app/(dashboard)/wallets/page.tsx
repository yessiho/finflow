'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CircleDollarSign,
  Copy,
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

type WalletStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

type WalletAccountType = 'SAVINGS' | 'CURRENT' | 'VIRTUAL';

type WalletAccountStatus =
  | 'ACTIVE'
  | 'FROZEN'
  | 'SUSPENDED'
  | 'CLOSED';

type WalletAccount = {
  id: number;
  walletId: number;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string | null;
  accountType: WalletAccountType;
  status: WalletAccountStatus;
  createdAt: string;
  updatedAt: string;
};

type Wallet = {
  id: number;
  userId: number;
  currency: Currency;
  balance: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
  account: WalletAccount | null;
};

type ModalType =
  | 'CREATE'
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'TRANSFER'
  | null;

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
    return (error as ApiError).message;
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

  const [selectedWallet, setSelectedWallet] =
    useState<Wallet | null>(null);

  const [currency, setCurrency] = useState<Currency>('NGN');

  const [amount, setAmount] = useState('');

  const [destinationWalletId, setDestinationWalletId] =
    useState('');

  const [submitting, setSubmitting] = useState(false);

  /*
   * ============================================================
   * LOAD WALLETS
   * ============================================================
   */

  const loadWallets = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        }

        setError('');

        const data = await apiFetch<Wallet[]>('/wallets');

        setWallets(Array.isArray(data) ? data : []);
      } catch (error: unknown) {
        console.error('LOAD WALLETS ERROR:', error);

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
    },
    [],
  );

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  function handleRefresh() {
    void loadWallets(true);
  }

  /*
   * ============================================================
   * MODAL FUNCTIONS
   * ============================================================
   */

  function openModal(type: ModalType, wallet?: Wallet) {
    setSelectedWallet(wallet ?? null);

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

  /*
   * ============================================================
   * COPY ACCOUNT NUMBER
   * ============================================================
   */

  async function copyAccountNumber(accountNumber?: string) {
    if (!accountNumber) return;

    try {
      await navigator.clipboard.writeText(accountNumber);

      setSuccess('Account number copied successfully.');

      setTimeout(() => {
        setSuccess('');
      }, 2500);
    } catch {
      setError('Unable to copy account number.');
    }
  }

  /*
   * ============================================================
   * FORMATTERS
   * ============================================================
   */

  function formatBalance(wallet: Wallet) {
    const value = Number(wallet.balance) || 0;

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: wallet.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatNumber(value: number) {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function getCurrencySymbol(walletCurrency: Currency) {
    const symbols: Record<Currency, string> = {
      NGN: '₦',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };

    return symbols[walletCurrency];
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

  /*
   * ============================================================
   * CREATE WALLET
   * ============================================================
   */

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

      setSuccess(
        `${currency} wallet created successfully with a virtual account.`,
      );

      await loadWallets();

      setTimeout(() => {
        closeModal();
      }, 1000);
    } catch (error: unknown) {
      setError(
        getErrorMessage(
          error,
          'Unable to create wallet.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ============================================================
   * DEPOSIT
   * ============================================================
   */

  async function depositMoney() {
    if (!selectedWallet) return;

    if (Number(amount) <= 0) {
      setError('Please enter a valid deposit amount.');

      return;
    }

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
      }, 1000);
    } catch (error: unknown) {
      setError(
        getErrorMessage(
          error,
          'Unable to complete deposit.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ============================================================
   * WITHDRAW
   * ============================================================
   */

  async function withdrawMoney() {
    if (!selectedWallet) return;

    if (Number(amount) <= 0) {
      setError('Please enter a valid withdrawal amount.');

      return;
    }

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
      }, 1000);
    } catch (error: unknown) {
      setError(
        getErrorMessage(
          error,
          'Unable to complete withdrawal.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ============================================================
   * TRANSFER
   * ============================================================
   */

  async function transferMoney() {
    if (!selectedWallet) return;

    if (!destinationWalletId) {
      setError('Please select a destination wallet.');

      return;
    }

    if (Number(amount) <= 0) {
      setError('Please enter a valid transfer amount.');

      return;
    }

    try {
      setSubmitting(true);

      setError('');

      await apiFetch(
        `/wallets/${selectedWallet.id}/transfer`,
        {
          method: 'POST',

          body: JSON.stringify({
            destinationWalletId:
              Number(destinationWalletId),

            amount: Number(amount),
          }),
        },
      );

      setSuccess('Transfer completed successfully.');

      await loadWallets();

      setTimeout(() => {
        closeModal();
      }, 1000);
    } catch (error: unknown) {
      setError(
        getErrorMessage(
          error,
          'Unable to complete transfer.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ============================================================
   * SUBMIT HANDLER
   * ============================================================
   */

  function handleSubmit() {
    switch (modal) {
      case 'CREATE':
        void createWallet();
        break;

      case 'DEPOSIT':
        void depositMoney();
        break;

      case 'WITHDRAW':
        void withdrawMoney();
        break;

      case 'TRANSFER':
        void transferMoney();
        break;
    }
  }

  /*
   * ============================================================
   * DESTINATION WALLETS
   *
   * Important:
   * Only same-currency wallets can be transferred between.
   * ============================================================
   */

  const availableDestinationWallets = useMemo(() => {
    return wallets.filter(
      (wallet) =>
        wallet.id !== selectedWallet?.id &&
        wallet.currency === selectedWallet?.currency &&
        wallet.status === 'ACTIVE',
    );
  }, [wallets, selectedWallet]);

  /*
   * ============================================================
   * STATISTICS
   * ============================================================
   */

  const totalWalletBalance = wallets.reduce(
    (total, wallet) =>
      total + (Number(wallet.balance) || 0),
    0,
  );

  const activeWallets = wallets.filter(
    (wallet) => wallet.status === 'ACTIVE',
  ).length;

  const currenciesAvailable = new Set(
    wallets.map((wallet) => wallet.currency),
  ).size;

  const walletsWithAccounts = wallets.filter(
    (wallet) => wallet.account !== null,
  ).length;

  /*
   * ============================================================
   * FORM VALIDATION
   * ============================================================
   */

  const canSubmit =
    modal === 'CREATE'
      ? true
      : modal === 'TRANSFER'
        ? Number(amount) > 0 &&
          Boolean(destinationWalletId)
        : Number(amount) > 0;

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="wallets-page">

      {/* ======================================================
          PAGE HEADER
      ======================================================= */}

      <section className="wallets-page-header">

        <div className="wallets-header-content">

          <div className="wallets-header-icon">
            <WalletCards size={26} />
          </div>

          <div>
            <div className="page-eyebrow">
              Financial Management
            </div>

            <h1>My Wallets</h1>

            <p>
              Manage your balances, virtual accounts, deposits,
              withdrawals and transfers from one secure place.
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
            <RefreshCw
              size={18}
              className={refreshing ? 'spin' : ''}
            />

            <span>
              {refreshing
                ? 'Refreshing...'
                : 'Refresh'}
            </span>
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

      {/* ======================================================
          STATUS MESSAGES
      ======================================================= */}

      {error && !modal && (
        <div className="wallet-alert wallet-alert-error">

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Close error"
          >
            <X size={17} />
          </button>

        </div>
      )}

      {success && !modal && (
        <div className="wallet-alert wallet-alert-success">

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Close success"
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* ======================================================
          SUMMARY CARDS
      ======================================================= */}

      {!loading && (
        <section className="wallet-summary-grid">

          <div className="wallet-summary-card wallet-summary-primary">

            <div className="wallet-summary-icon">
              <Landmark size={22} />
            </div>

            <div className="wallet-summary-content">
              <span>Total Wallet Balance</span>

              <strong>
                ₦{formatNumber(totalWalletBalance)}
              </strong>

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

              <small>Financial wallets created</small>
            </div>

          </div>

          <div className="wallet-summary-card">

            <div className="wallet-summary-icon summary-green">
              <CreditCard size={21} />
            </div>

            <div className="wallet-summary-content">
              <span>Virtual Accounts</span>

              <strong>{walletsWithAccounts}</strong>

              <small>Accounts successfully assigned</small>
            </div>

          </div>

          <div className="wallet-summary-card">

            <div className="wallet-summary-icon summary-purple">
              <CircleDollarSign size={21} />
            </div>

            <div className="wallet-summary-content">
              <span>Supported Currencies</span>

              <strong>{currenciesAvailable}</strong>

              <small>
                {activeWallets} active wallet
                {activeWallets === 1 ? '' : 's'}
              </small>
            </div>

          </div>

        </section>
      )}

      {/* ======================================================
          WALLETS CONTENT
      ======================================================= */}

      <section className="wallets-content-section">

        <div className="wallets-section-header">

          <div>
            <h2>Your Financial Wallets</h2>

            <p>
              View balances, virtual account details and manage
              your available wallets.
            </p>
          </div>

          <div className="wallet-count-badge">
            {wallets.length}{' '}
            {wallets.length === 1
              ? 'Wallet'
              : 'Wallets'}
          </div>

        </div>

        {/* LOADING */}

        {loading ? (

          <div className="wallets-loading-state">

            <div className="wallet-loading-spinner" />

            <h3>Loading your wallets</h3>

            <p>
              Please wait while we retrieve your financial accounts.
            </p>

          </div>

        ) : wallets.length === 0 ? (

          /* EMPTY STATE */

          <div className="wallets-empty-state">

            <div className="empty-wallet-icon">
              <WalletCards size={42} />
            </div>

            <h3>No wallets available yet</h3>

            <p>
              Create your first wallet and start managing your
              finances securely.
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

          /* WALLET GRID */

          <div className="fin-wallet-grid">

            {wallets.map((wallet) => (

              <article
                key={wallet.id}
                className="fin-wallet-card"
              >

                {/* CARD TOP */}

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

                      <h3>
                        {wallet.currency} Wallet
                      </h3>

                      <span>
                        {getCurrencyName(wallet.currency)}
                      </span>

                    </div>

                  </div>

                  <span
                    className={`fin-wallet-status ${wallet.status.toLowerCase()}`}
                  >

                    <span className="status-dot" />

                    {wallet.status}

                  </span>

                </div>

                {/* BALANCE */}

                <div className="fin-wallet-balance">

                  <span>Available Balance</span>

                  <h2>
                    {formatBalance(wallet)}
                  </h2>

                </div>

                {/* ==================================================
                    VIRTUAL ACCOUNT DETAILS
                =================================================== */}

                {wallet.account ? (

                  <div className="wallet-account-details">

                    <div className="wallet-account-header">

                      <div>

                        <span className="wallet-account-label">
                          Virtual Account
                        </span>

                        <strong>
                          {wallet.account.bankName}
                        </strong>

                      </div>

                      <CreditCard size={20} />

                    </div>

                    <div className="wallet-account-number-row">

                      <div>

                        <span>Account Number</span>

                        <strong className="wallet-account-number">
                          {wallet.account.accountNumber}
                        </strong>

                      </div>

                      <button
                        type="button"
                        className="copy-account-button"
                        onClick={() =>
                          void copyAccountNumber(
                            wallet.account?.accountNumber,
                          )
                        }
                        title="Copy account number"
                        aria-label="Copy account number"
                      >
                        <Copy size={17} />
                      </button>

                    </div>

                    <div className="wallet-account-info">

                      <div>

                        <span>Account Name</span>

                        <strong>
                          {wallet.account.accountName}
                        </strong>

                      </div>

                      <div>

                        <span>Account Type</span>

                        <strong>
                          {wallet.account.accountType}
                        </strong>

                      </div>

                    </div>

                  </div>

                ) : (

                  <div className="wallet-no-account">

                    <CreditCard size={18} />

                    <div>

                      <strong>
                        Account number pending
                      </strong>

                      <span>
                        Refresh to retrieve account details.
                      </span>

                    </div>

                  </div>

                )}

                {/* WALLET META */}

                <div className="fin-wallet-meta">

                  <div className="fin-wallet-meta-item">

                    <span>Wallet ID</span>

                    <strong>
                      #{wallet.id}
                    </strong>

                  </div>

                  <div className="fin-wallet-meta-item">

                    <span>Created</span>

                    <strong>
                      {new Date(
                        wallet.createdAt,
                      ).toLocaleDateString('en-NG', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>

                  </div>

                </div>

                <div className="wallet-card-divider" />

                {/* ACTIONS */}

                <div className="fin-wallet-actions">

                  <button
                    type="button"
                    className="fin-wallet-action"
                    onClick={() =>
                      router.push(`/wallets/${wallet.id}`)
                    }
                  >

                    <Eye size={17} />

                    <span>View</span>

                  </button>

                  <button
                    type="button"
                    className="fin-wallet-action"
                    onClick={() =>
                      openModal('DEPOSIT', wallet)
                    }
                    disabled={wallet.status !== 'ACTIVE'}
                  >

                    <ArrowDownToLine size={17} />

                    <span>Deposit</span>

                  </button>

                  <button
                    type="button"
                    className="fin-wallet-action"
                    onClick={() =>
                      openModal('WITHDRAW', wallet)
                    }
                    disabled={wallet.status !== 'ACTIVE'}
                  >

                    <ArrowUpFromLine size={17} />

                    <span>Withdraw</span>

                  </button>

                  <button
                    type="button"
                    className="fin-wallet-action"
                    onClick={() =>
                      openModal('TRANSFER', wallet)
                    }
                    disabled={wallet.status !== 'ACTIVE'}
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

      {/* ======================================================
          MODAL
      ======================================================= */}

      {modal && (

        <div
          className="wallet-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="wallet-management-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="wallet-modal-header">

              <div>

                <span className="modal-eyebrow">
                  Wallet Management
                </span>

                <h2>

                  {modal === 'CREATE' &&
                    'Create New Wallet'}

                  {modal === 'DEPOSIT' &&
                    'Deposit Money'}

                  {modal === 'WITHDRAW' &&
                    'Withdraw Money'}

                  {modal === 'TRANSFER' &&
                    'Transfer Money'}

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

            {/* SELECTED WALLET */}

            {selectedWallet && (

              <div className="modal-selected-wallet">

                <div
                  className={`modal-wallet-icon ${getCurrencyClass(
                    selectedWallet.currency,
                  )}`}
                >
                  {getCurrencySymbol(
                    selectedWallet.currency,
                  )}
                </div>

                <div>

                  <span>
                    Selected Wallet
                  </span>

                  <strong>
                    {selectedWallet.currency} Wallet #
                    {selectedWallet.id}
                  </strong>

                </div>

                <div className="modal-wallet-balance">

                  <span>Available</span>

                  <strong>
                    {formatBalance(selectedWallet)}
                  </strong>

                </div>

              </div>

            )}

            {/* MODAL ERROR */}

            {error && (

              <div className="wallet-modal-alert error">
                {error}
              </div>

            )}

            {/* MODAL SUCCESS */}

            {success && (

              <div className="wallet-modal-alert success">
                {success}
              </div>

            )}

            {/* CREATE WALLET */}

            {modal === 'CREATE' && (

              <div className="wallet-modal-body">

                <div className="wallet-form-group">

                  <label>
                    Wallet Currency
                  </label>

                  <select
                    value={currency}
                    onChange={(event) =>
                      setCurrency(
                        event.target.value as Currency,
                      )
                    }
                  >

                    {CURRENCIES.map((item) => (

                      <option
                        key={item}
                        value={item}
                      >
                        {item} — {getCurrencyName(item)}
                      </option>

                    ))}

                  </select>

                  <small>
                    A virtual account will automatically be created
                    for the new wallet.
                  </small>

                </div>

              </div>

            )}

            {/* DEPOSIT / WITHDRAW */}

            {(modal === 'DEPOSIT' ||
              modal === 'WITHDRAW') &&
              selectedWallet && (

                <div className="wallet-modal-body">

                  <div className="wallet-form-group">

                    <label>
                      Amount ({selectedWallet.currency})
                    </label>

                    <div className="wallet-amount-input">

                      <span>
                        {getCurrencySymbol(
                          selectedWallet.currency,
                        )}
                      </span>

                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(event) =>
                          setAmount(event.target.value)
                        }
                      />

                    </div>

                    <small>
                      Enter the amount you want to{' '}
                      {modal === 'DEPOSIT'
                        ? 'deposit'
                        : 'withdraw'}.
                    </small>

                  </div>

                </div>

              )}

            {/* TRANSFER */}

            {modal === 'TRANSFER' &&
              selectedWallet && (

                <div className="wallet-modal-body">

                  <div className="wallet-form-group">

                    <label>
                      Destination Wallet
                    </label>

                    <select
                      value={destinationWalletId}
                      onChange={(event) =>
                        setDestinationWalletId(
                          event.target.value,
                        )
                      }
                    >

                      <option value="">
                        Select destination wallet
                      </option>

                      {availableDestinationWallets.map(
                        (wallet) => (

                          <option
                            key={wallet.id}
                            value={wallet.id}
                          >
                            Wallet #{wallet.id} —{' '}
                            {wallet.currency}
                          </option>

                        ),
                      )}

                    </select>

                    {availableDestinationWallets.length === 0 && (

                      <small className="wallet-form-warning">

                        No other{' '}
                        {selectedWallet.currency} wallet is
                        available for transfer.

                      </small>

                    )}

                  </div>

                  <div className="wallet-form-group">

                    <label>
                      Transfer Amount (
                      {selectedWallet.currency})
                    </label>

                    <div className="wallet-amount-input">

                      <span>
                        {getCurrencySymbol(
                          selectedWallet.currency,
                        )}
                      </span>

                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(event) =>
                          setAmount(event.target.value)
                        }
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