'use client';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpFromLine,
  Calendar,
  CreditCard,
  Eye,
  Landmark,
  Loader2,
  ReceiptText,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';

import { useParams } from 'next/navigation';

import { apiFetch } from '@/lib/api';

type Currency =
  | 'NGN'
  | 'USD'
  | 'EUR'
  | 'GBP';

interface WalletData {
  id: number;
  userId: number;
  currency: Currency;
  balance: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TransactionData {
  id: number;

  amount: string;

  currency: Currency;

  type:
    | 'DEPOSIT'
    | 'WITHDRAWAL'
    | 'TRANSFER';

  status:
    | 'PENDING'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'FAILED'
    | 'REVERSED';

  reference: string;

  sourceWalletId: number | null;

  destinationWalletId: number | null;

  createdAt: string;

  updatedAt: string;
}

type ModalType =
  | 'deposit'
  | 'withdraw'
  | 'transfer'
  | null;

export default function WalletDetailsPage() {
  const params = useParams();

  const walletId =
    Number(params.id);

  const [wallet, setWallet] =
    useState<WalletData | null>(null);

  const [wallets, setWallets] =
    useState<WalletData[]>([]);

  const [transactions, setTransactions] =
    useState<TransactionData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [modalError, setModalError] =
    useState('');

  const [modal, setModal] =
    useState<ModalType>(null);

  const [amount, setAmount] =
    useState('');

  const [
    destinationWalletId,
    setDestinationWalletId,
  ] = useState('');

  const [submitting, setSubmitting] =
    useState(false);

  /*
   * ==========================================
   * LOAD WALLET DATA
   * ==========================================
   */

  async function fetchWalletData(
    showRefresh = false,
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const walletResponse =
        await apiFetch('/wallets');

      const allWallets =
        Array.isArray(walletResponse)
          ? walletResponse
          : [];

      setWallets(allWallets);

      const currentWallet =
        allWallets.find(
          (item: WalletData) =>
            item.id === walletId,
        );

      if (!currentWallet) {
        throw new Error(
          'Wallet not found',
        );
      }

      setWallet(currentWallet);

      const transactionResponse =
        await apiFetch(
          '/transactions?limit=100',
        );

      let allTransactions:
        TransactionData[] = [];

      if (
        Array.isArray(
          transactionResponse,
        )
      ) {
        allTransactions =
          transactionResponse;
      } else if (
        Array.isArray(
          transactionResponse?.data,
        )
      ) {
        allTransactions =
          transactionResponse.data;
      } else if (
        Array.isArray(
          transactionResponse?.transactions,
        )
      ) {
        allTransactions =
          transactionResponse.transactions;
      }

      const walletTransactions =
        allTransactions.filter(
          (transaction) =>
            transaction.sourceWalletId ===
              walletId ||
            transaction.destinationWalletId ===
              walletId,
        );

      setTransactions(
        walletTransactions,
      );
    } catch (error: any) {
      console.error(error);

      setError(
        error.message ||
          'Unable to load wallet information.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!Number.isNaN(walletId)) {
      fetchWalletData();
    }
  }, [walletId]);

  /*
   * ==========================================
   * WALLET STATISTICS
   * ==========================================
   */

  const walletStats = useMemo(() => {
    let credits = 0;

    let debits = 0;

    transactions.forEach(
      (transaction) => {
        const amount =
          Number(transaction.amount) || 0;

        const direction =
          getTransactionDirection(
            transaction,
          );

        if (direction === 'credit') {
          credits += amount;
        } else {
          debits += amount;
        }
      },
    );

    return {
      credits,
      debits,
      transactionCount:
        transactions.length,
    };
  }, [transactions, walletId]);

  /*
   * ==========================================
   * FORMAT CURRENCY
   * ==========================================
   */

  function formatCurrency(
    value: string | number,
    currency: Currency,
  ) {
    const numericValue =
      Number(value) || 0;

    return new Intl.NumberFormat(
      'en-NG',
      {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(numericValue);
  }

  /*
   * ==========================================
   * CURRENCY FLAG
   * ==========================================
   */

  function getCurrencyFlag(
    currency: Currency,
  ) {
    const flags: Record<
      Currency,
      string
    > = {
      NGN: '🇳🇬',
      USD: '🇺🇸',
      EUR: '🇪🇺',
      GBP: '🇬🇧',
    };

    return flags[currency];
  }

  /*
   * ==========================================
   * DATE FORMAT
   * ==========================================
   */

  function formatDate(
    date: string,
  ) {
    return new Intl.DateTimeFormat(
      'en-NG',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    ).format(
      new Date(date),
    );
  }

  function formatDateTime(
    date: string,
  ) {
    return new Intl.DateTimeFormat(
      'en-NG',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(date),
    );
  }

  /*
   * ==========================================
   * MODAL MANAGEMENT
   * ==========================================
   */

  function openModal(
    type: ModalType,
  ) {
    setModalError('');
    setAmount('');
    setDestinationWalletId('');
    setModal(type);
  }

  function closeModal() {
    if (submitting) return;

    setModal(null);

    setAmount('');

    setDestinationWalletId('');

    setModalError('');
  }

  /*
   * ==========================================
   * DEPOSIT
   * ==========================================
   */

  async function handleDeposit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!wallet) return;

    try {
      setSubmitting(true);

      setModalError('');

      await apiFetch(
        `/wallets/${wallet.id}/deposit`,
        {
          method: 'POST',

          body: JSON.stringify({
            amount: Number(amount),
          }),
        },
      );

      closeModal();

      await fetchWalletData(true);
    } catch (error: any) {
      setModalError(
        error.message ||
          'Unable to complete deposit.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ==========================================
   * WITHDRAW
   * ==========================================
   */

  async function handleWithdraw(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!wallet) return;

    try {
      setSubmitting(true);

      setModalError('');

      await apiFetch(
        `/wallets/${wallet.id}/withdraw`,
        {
          method: 'POST',

          body: JSON.stringify({
            amount: Number(amount),
          }),
        },
      );

      closeModal();

      await fetchWalletData(true);
    } catch (error: any) {
      setModalError(
        error.message ||
          'Unable to complete withdrawal.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ==========================================
   * TRANSFER
   * ==========================================
   */

  async function handleTransfer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!wallet) return;

    try {
      setSubmitting(true);

      setModalError('');

      await apiFetch(
        `/wallets/${wallet.id}/transfer`,
        {
          method: 'POST',

          body: JSON.stringify({
            destinationWalletId:
              Number(
                destinationWalletId,
              ),

            amount:
              Number(amount),
          }),
        },
      );

      closeModal();

      await fetchWalletData(true);
    } catch (error: any) {
      setModalError(
        error.message ||
          'Unable to complete transfer.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ==========================================
   * TRANSACTION DIRECTION
   * ==========================================
   */

  function getTransactionDirection(
    transaction: TransactionData,
  ) {
    if (
      transaction.type ===
      'DEPOSIT'
    ) {
      return 'credit';
    }

    if (
      transaction.type ===
      'WITHDRAWAL'
    ) {
      return 'debit';
    }

    if (
      transaction.destinationWalletId ===
      walletId
    ) {
      return 'credit';
    }

    return 'debit';
  }

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <div className="wallet-detail-loading">
        <Loader2
          size={34}
          className="wallet-detail-spinner"
        />

        <h3>
          Loading wallet
        </h3>

        <p>
          Please wait while we load your
          financial information.
        </p>
      </div>
    );
  }

  /*
   * ==========================================
   * ERROR
   * ==========================================
   */

  if (error && !wallet) {
    return (
      <div className="wallet-detail-error-page">

        <div className="wallet-detail-error-icon">
          <Wallet size={30} />
        </div>

        <h2>
          Unable to load wallet
        </h2>

        <p>
          {error}
        </p>

        <Link
          href="/wallets"
          className="wallet-detail-primary-button"
        >
          <ArrowLeft size={18} />

          Back to Wallets
        </Link>

      </div>
    );
  }

  if (!wallet) {
    return null;
  }

  return (
    <div className="wallet-detail-page">

      {/* ======================================
          PAGE HEADER
      ====================================== */}

      <div className="wallet-detail-header">

        <div className="wallet-detail-header-left">

          <Link
            href="/wallets"
            className="wallet-detail-back-button"
          >
            <ArrowLeft size={17} />

            <span>
              Back to Wallets
            </span>
          </Link>

          <div className="wallet-detail-title">

            <div className="wallet-detail-currency-icon">
              {getCurrencyFlag(
                wallet.currency,
              )}
            </div>

            <div>

              <div className="wallet-detail-title-top">

                <h1>
                  {wallet.currency} Wallet
                </h1>

                <span
                  className={`wallet-detail-status ${wallet.status.toLowerCase()}`}
                >
                  {wallet.status}
                </span>

              </div>

              <p>
                Manage your wallet balance,
                transactions and transfers.
              </p>

            </div>

          </div>

        </div>

        <button
          type="button"
          className="wallet-detail-refresh-button"
          onClick={() =>
            fetchWalletData(true)
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? 'wallet-detail-spinning'
                : ''
            }
          />

          {refreshing
            ? 'Refreshing...'
            : 'Refresh'}
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="wallet-detail-alert">
          {error}
        </div>
      )}

      {/* ======================================
          MAIN BALANCE CARD
      ====================================== */}

      <section className="wallet-detail-balance-card">

        <div className="wallet-detail-balance-main">

          <div className="wallet-detail-balance-label">

            <Wallet size={18} />

            Available Balance

          </div>

          <h2>
            {formatCurrency(
              wallet.balance,
              wallet.currency,
            )}
          </h2>

          <p>
            Current available funds in this
            wallet.
          </p>

        </div>

        <div className="wallet-detail-balance-meta">

          <div>

            <span>
              Wallet ID
            </span>

            <strong>
              #{wallet.id}
            </strong>

          </div>

          <div>

            <span>
              Currency
            </span>

            <strong>
              {wallet.currency}
            </strong>

          </div>

          <div>

            <span>
              Created
            </span>

            <strong>
              {formatDate(
                wallet.createdAt,
              )}
            </strong>

          </div>

        </div>

      </section>

      {/* ======================================
          WALLET STATS
      ====================================== */}

      <section className="wallet-detail-stats-grid">

        <div className="wallet-detail-stat-card">

          <div className="wallet-detail-stat-icon credit">
            <ArrowDownToLine size={20} />
          </div>

          <div>

            <span>
              Total Credits
            </span>

            <strong>
              {formatCurrency(
                walletStats.credits,
                wallet.currency,
              )}
            </strong>

          </div>

        </div>

        <div className="wallet-detail-stat-card">

          <div className="wallet-detail-stat-icon debit">
            <ArrowUpFromLine size={20} />
          </div>

          <div>

            <span>
              Total Debits
            </span>

            <strong>
              {formatCurrency(
                walletStats.debits,
                wallet.currency,
              )}
            </strong>

          </div>

        </div>

        <div className="wallet-detail-stat-card">

          <div className="wallet-detail-stat-icon neutral">
            <ReceiptText size={20} />
          </div>

          <div>

            <span>
              Transactions
            </span>

            <strong>
              {walletStats.transactionCount}
            </strong>

          </div>

        </div>

      </section>

      {/* ======================================
          WALLET ACTIONS
      ====================================== */}

      <section className="wallet-detail-actions-section">

        <div className="wallet-detail-section-heading">

          <div>

            <h2>
              Wallet Actions
            </h2>

            <p>
              Perform financial operations
              securely.
            </p>

          </div>

        </div>

        <div className="wallet-detail-actions-grid">

          <button
            type="button"
            onClick={() =>
              openModal('deposit')
            }
            className="wallet-detail-action-card"
          >

            <div className="wallet-detail-action-icon deposit">
              <ArrowDownToLine size={22} />
            </div>

            <div>

              <strong>
                Deposit Money
              </strong>

              <span>
                Add funds to this wallet
              </span>

            </div>

          </button>

          <button
            type="button"
            onClick={() =>
              openModal('withdraw')
            }
            className="wallet-detail-action-card"
          >

            <div className="wallet-detail-action-icon withdraw">
              <ArrowUpFromLine size={22} />
            </div>

            <div>

              <strong>
                Withdraw Money
              </strong>

              <span>
                Withdraw available funds
              </span>

            </div>

          </button>

          <button
            type="button"
            onClick={() =>
              openModal('transfer')
            }
            className="wallet-detail-action-card"
          >

            <div className="wallet-detail-action-icon transfer">
              <ArrowLeftRight size={22} />
            </div>

            <div>

              <strong>
                Transfer Money
              </strong>

              <span>
                Send funds to another wallet
              </span>

            </div>

          </button>

        </div>

      </section>

      {/* ======================================
          TRANSACTION HISTORY
      ====================================== */}

      <section className="wallet-detail-history">

        <div className="wallet-detail-history-header">

          <div>

            <div className="wallet-detail-section-icon">
              <ReceiptText size={20} />
            </div>

            <div>

              <h2>
                Transaction History
              </h2>

              <p>
                Recent financial activity
                associated with this wallet.
              </p>

            </div>

          </div>

          <Link
            href="/transactions"
            className="wallet-detail-view-all"
          >
            View All

            <Eye size={17} />
          </Link>

        </div>

        {transactions.length === 0 ? (

          <div className="wallet-detail-empty">

            <div className="wallet-detail-empty-icon">
              <ReceiptText size={38} />
            </div>

            <h3>
              No transactions yet
            </h3>

            <p>
              Your wallet transactions will
              appear here once activity begins.
            </p>

          </div>

        ) : (

          <div className="wallet-detail-transaction-list">

            {transactions.map(
              (transaction) => {
                const direction =
                  getTransactionDirection(
                    transaction,
                  );

                return (

                  <Link
                    key={transaction.id}
                    href={`/transactions/${transaction.id}`}
                    className="wallet-detail-transaction-item"
                  >

                    <div
                      className={`wallet-detail-transaction-icon ${direction}`}
                    >

                      {direction ===
                      'credit' ? (
                        <ArrowDownToLine
                          size={19}
                        />
                      ) : (
                        <ArrowUpFromLine
                          size={19}
                        />
                      )}

                    </div>

                    <div className="wallet-detail-transaction-info">

                      <strong>
                        {transaction.type}
                      </strong>

                      <span>
                        {transaction.reference}
                      </span>

                      <small>

                        <Calendar size={13} />

                        {formatDateTime(
                          transaction.createdAt,
                        )}

                      </small>

                    </div>

                    <div className="wallet-detail-transaction-right">

                      <strong
                        className={
                          direction ===
                          'credit'
                            ? 'wallet-detail-credit'
                            : 'wallet-detail-debit'
                        }
                      >

                        {direction ===
                        'credit'
                          ? '+'
                          : '-'}

                        {formatCurrency(
                          transaction.amount,
                          transaction.currency,
                        )}

                      </strong>

                      <span
                        className={`wallet-detail-transaction-status ${transaction.status.toLowerCase()}`}
                      >
                        {transaction.status}
                      </span>

                    </div>

                  </Link>

                );
              },
            )}

          </div>

        )}

      </section>

      {/* ======================================
          DEPOSIT MODAL
      ====================================== */}

      {modal === 'deposit' && (

        <div className="wallet-detail-modal-overlay">

          <div className="wallet-detail-modal">

            <div className="wallet-detail-modal-header">

              <div className="wallet-detail-modal-title">

                <div className="wallet-detail-modal-icon deposit">
                  <ArrowDownToLine size={21} />
                </div>

                <div>

                  <h2>
                    Deposit Money
                  </h2>

                  <p>
                    Add funds to your{' '}
                    {wallet.currency} wallet.
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="wallet-detail-modal-close"
                onClick={closeModal}
                disabled={submitting}
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleDeposit}
            >

              {modalError && (
                <div className="wallet-detail-modal-error">
                  {modalError}
                </div>
              )}

              <div className="wallet-detail-form-field">

                <label>
                  Deposit Amount
                </label>

                <div className="wallet-detail-input-wrapper">

                  <span>
                    {wallet.currency}
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value,
                      )
                    }
                    required
                  />

                </div>

              </div>

              <div className="wallet-detail-modal-actions">

                <button
                  type="button"
                  className="wallet-detail-secondary-button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="wallet-detail-primary-button"
                  disabled={submitting}
                >

                  {submitting && (
                    <Loader2
                      size={17}
                      className="wallet-detail-spinning"
                    />
                  )}

                  {submitting
                    ? 'Processing...'
                    : 'Deposit Money'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ======================================
          WITHDRAW MODAL
      ====================================== */}

      {modal === 'withdraw' && (

        <div className="wallet-detail-modal-overlay">

          <div className="wallet-detail-modal">

            <div className="wallet-detail-modal-header">

              <div className="wallet-detail-modal-title">

                <div className="wallet-detail-modal-icon withdraw">
                  <ArrowUpFromLine size={21} />
                </div>

                <div>

                  <h2>
                    Withdraw Money
                  </h2>

                  <p>
                    Withdraw funds from your{' '}
                    {wallet.currency} wallet.
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="wallet-detail-modal-close"
                onClick={closeModal}
                disabled={submitting}
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleWithdraw}
            >

              {modalError && (
                <div className="wallet-detail-modal-error">
                  {modalError}
                </div>
              )}

              <div className="wallet-detail-current-balance">

                <span>
                  Available Balance
                </span>

                <strong>
                  {formatCurrency(
                    wallet.balance,
                    wallet.currency,
                  )}
                </strong>

              </div>

              <div className="wallet-detail-form-field">

                <label>
                  Withdrawal Amount
                </label>

                <div className="wallet-detail-input-wrapper">

                  <span>
                    {wallet.currency}
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value,
                      )
                    }
                    required
                  />

                </div>

              </div>

              <div className="wallet-detail-modal-actions">

                <button
                  type="button"
                  className="wallet-detail-secondary-button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="wallet-detail-danger-button"
                  disabled={submitting}
                >

                  {submitting && (
                    <Loader2
                      size={17}
                      className="wallet-detail-spinning"
                    />
                  )}

                  {submitting
                    ? 'Processing...'
                    : 'Withdraw Money'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ======================================
          TRANSFER MODAL
      ====================================== */}

      {modal === 'transfer' && (

        <div className="wallet-detail-modal-overlay">

          <div className="wallet-detail-modal">

            <div className="wallet-detail-modal-header">

              <div className="wallet-detail-modal-title">

                <div className="wallet-detail-modal-icon transfer">
                  <ArrowLeftRight size={21} />
                </div>

                <div>

                  <h2>
                    Transfer Money
                  </h2>

                  <p>
                    Transfer funds securely to
                    another wallet.
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="wallet-detail-modal-close"
                onClick={closeModal}
                disabled={submitting}
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleTransfer}
            >

              {modalError && (
                <div className="wallet-detail-modal-error">
                  {modalError}
                </div>
              )}

              <div className="wallet-detail-form-field">

                <label>
                  From Wallet
                </label>

                <div className="wallet-detail-readonly-field">

                  <Wallet size={18} />

                  <span>
                    {wallet.currency} Wallet
                  </span>

                  <strong>
                    {formatCurrency(
                      wallet.balance,
                      wallet.currency,
                    )}
                  </strong>

                </div>

              </div>

              <div className="wallet-detail-form-field">

                <label>
                  Destination Wallet
                </label>

                <select
                  value={
                    destinationWalletId
                  }
                  onChange={(event) =>
                    setDestinationWalletId(
                      event.target.value,
                    )
                  }
                  required
                >

                  <option value="">
                    Select destination wallet
                  </option>

                  {wallets
                    .filter(
                      (item) =>
                        item.id !==
                          wallet.id &&
                        item.currency ===
                          wallet.currency,
                    )
                    .map((item) => (

                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.currency} Wallet
                        {' '}— Wallet #{item.id}
                      </option>

                    ))}

                </select>

              </div>

              <div className="wallet-detail-form-field">

                <label>
                  Transfer Amount
                </label>

                <div className="wallet-detail-input-wrapper">

                  <span>
                    {wallet.currency}
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value,
                      )
                    }
                    required
                  />

                </div>

              </div>

              <div className="wallet-detail-modal-actions">

                <button
                  type="button"
                  className="wallet-detail-secondary-button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="wallet-detail-primary-button"
                  disabled={submitting}
                >

                  {submitting && (
                    <Loader2
                      size={17}
                      className="wallet-detail-spinning"
                    />
                  )}

                  {submitting
                    ? 'Processing...'
                    : 'Transfer Money'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}