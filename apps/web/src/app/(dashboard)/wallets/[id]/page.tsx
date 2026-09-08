'use client';

import {
  FormEvent,
  useCallback,
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
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  Landmark,
  Loader2,
  ReceiptText,
  RefreshCw,
  Wallet as WalletIcon,
  X,
} from 'lucide-react';

import { useParams } from 'next/navigation';

import { apiFetch } from '@/lib/api';

import type {
  Currency,
  Transaction,
  Wallet,
} from '@/types';

/* ============================================================
   TYPES
============================================================ */

type ModalType =
  | 'deposit'
  | 'withdraw'
  | 'transfer'
  | null;

type ApiError = {
  message?: string | string[];
};

/* ============================================================
   COMPONENT
============================================================ */

export default function WalletDetailsPage() {
  const params = useParams();

  const rawWalletId = params?.id;

  const walletId = Number(
    Array.isArray(rawWalletId)
      ? rawWalletId[0]
      : rawWalletId,
  );

  const [wallet, setWallet] =
    useState<Wallet | null>(null);

  const [wallets, setWallets] =
    useState<Wallet[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

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

  const [copied, setCopied] =
    useState(false);

  /* ============================================================
     ERROR MESSAGE HELPER
  ============================================================ */

  const getErrorMessage = useCallback(
    (
      error: unknown,
      fallback: string,
    ) => {
      if (
        error &&
        typeof error === 'object' &&
        'message' in error
      ) {
        const message =
          (error as ApiError).message;

        if (typeof message === 'string') {
          return message;
        }

        if (Array.isArray(message)) {
          return message.join(', ');
        }
      }

      return fallback;
    },
    [],
  );

  /* ============================================================
     LOAD WALLET DATA
  ============================================================ */

  const fetchWalletData = useCallback(
    async (showRefresh = false) => {
      if (
        !Number.isInteger(walletId) ||
        walletId <= 0
      ) {
        setError('Invalid wallet ID.');
        setLoading(false);

        return;
      }

      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        /*
         * Fetch all wallets.
         *
         * We use this because the transfer modal
         * also needs the user's other wallets.
         */
        const walletResponse: unknown =
          await apiFetch('/wallets');

        const allWallets: Wallet[] =
          Array.isArray(walletResponse)
            ? (walletResponse as Wallet[])
            : [];

        setWallets(allWallets);

        /*
         * Find current wallet.
         */
        const currentWallet =
          allWallets.find(
            (item) =>
              item.id === walletId,
          );

        if (!currentWallet) {
          throw new Error(
            'Wallet not found.',
          );
        }

        setWallet(currentWallet);

        /*
         * Fetch transactions.
         */
        const transactionResponse: unknown =
          await apiFetch(
            '/transactions?limit=100',
          );

        let allTransactions:
          Transaction[] = [];

        if (
          Array.isArray(
            transactionResponse,
          )
        ) {
          allTransactions =
            transactionResponse as Transaction[];
        } else if (
          transactionResponse &&
          typeof transactionResponse ===
            'object' &&
          'data' in transactionResponse &&
          Array.isArray(
            (
              transactionResponse as {
                data?: unknown;
              }
            ).data,
          )
        ) {
          allTransactions =
            (
              transactionResponse as {
                data: Transaction[];
              }
            ).data;
        } else if (
          transactionResponse &&
          typeof transactionResponse ===
            'object' &&
          'transactions' in
            transactionResponse &&
          Array.isArray(
            (
              transactionResponse as {
                transactions?: unknown;
              }
            ).transactions,
          )
        ) {
          allTransactions =
            (
              transactionResponse as {
                transactions: Transaction[];
              }
            ).transactions;
        }

        /*
         * Filter transactions related
         * to this wallet.
         */
        const walletTransactions =
          allTransactions.filter(
            (transaction) =>
              transaction.sourceWalletId ===
                walletId ||
              transaction.destinationWalletId ===
                walletId,
          );

        /*
         * Most recent first.
         */
        walletTransactions.sort(
          (a, b) =>
            new Date(
              b.createdAt,
            ).getTime() -
            new Date(
              a.createdAt,
            ).getTime(),
        );

        setTransactions(
          walletTransactions,
        );
      } catch (error: unknown) {
        console.error(
          'WALLET DETAIL ERROR:',
          error,
        );

        setError(
          getErrorMessage(
            error,
            'Unable to load wallet information.',
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      getErrorMessage,
      walletId,
    ],
  );

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    void fetchWalletData();
  }, [fetchWalletData]);

  /* ============================================================
     WALLET STATISTICS
  ============================================================ */

  const walletStats = useMemo(() => {
    let credits = 0;

    let debits = 0;

    transactions.forEach(
      (transaction) => {
        const transactionAmount =
          Number(transaction.amount) || 0;

        const direction =
          getTransactionDirection(
            transaction,
            walletId,
          );

        if (direction === 'credit') {
          credits += transactionAmount;
        } else {
          debits += transactionAmount;
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

  /* ============================================================
     FORMAT CURRENCY
  ============================================================ */

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

  /* ============================================================
     CURRENCY FLAG
  ============================================================ */

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

  /* ============================================================
     FORMAT DATE
  ============================================================ */

  function formatDate(
    date: string,
  ) {
    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      return 'N/A';
    }

    return new Intl.DateTimeFormat(
      'en-NG',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    ).format(parsedDate);
  }

  function formatDateTime(
    date: string,
  ) {
    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      return 'N/A';
    }

    return new Intl.DateTimeFormat(
      'en-NG',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(parsedDate);
  }

  /* ============================================================
     COPY ACCOUNT NUMBER
  ============================================================ */

  async function copyAccountNumber() {
    if (
      !wallet?.account?.accountNumber
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        wallet.account.accountNumber,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        'Unable to copy account number:',
        error,
      );
    }
  }

  /* ============================================================
     MODAL MANAGEMENT
  ============================================================ */

  function openModal(
    type: ModalType,
  ) {
    setModalError('');
    setAmount('');
    setDestinationWalletId('');
    setModal(type);
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setModal(null);
    setAmount('');
    setDestinationWalletId('');
    setModalError('');
  }

  /* ============================================================
     VALIDATE AMOUNT
  ============================================================ */

  function validateAmount() {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      throw new Error(
        'Please enter a valid amount greater than zero.',
      );
    }

    return numericAmount;
  }

  /* ============================================================
     DEPOSIT
  ============================================================ */

  async function handleDeposit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!wallet) {
      return;
    }

    try {
      setSubmitting(true);

      setModalError('');

      const numericAmount =
        validateAmount();

      await apiFetch(
        `/wallets/${wallet.id}/deposit`,
        {
          method: 'POST',

          body: JSON.stringify({
            amount: numericAmount,
          }),
        },
      );

      setModal(null);
      setAmount('');

      await fetchWalletData(true);
    } catch (error: unknown) {
      setModalError(
        getErrorMessage(
          error,
          'Unable to complete deposit.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ============================================================
     WITHDRAW
  ============================================================ */

  async function handleWithdraw(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!wallet) {
      return;
    }

    try {
      setSubmitting(true);

      setModalError('');

      const numericAmount =
        validateAmount();

      const availableBalance =
        Number(wallet.balance);

      if (
        numericAmount >
        availableBalance
      ) {
        throw new Error(
          'Withdrawal amount cannot exceed your available balance.',
        );
      }

      await apiFetch(
        `/wallets/${wallet.id}/withdraw`,
        {
          method: 'POST',

          body: JSON.stringify({
            amount: numericAmount,
          }),
        },
      );

      setModal(null);
      setAmount('');

      await fetchWalletData(true);
    } catch (error: unknown) {
      setModalError(
        getErrorMessage(
          error,
          'Unable to complete withdrawal.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ============================================================
     TRANSFER
  ============================================================ */

  async function handleTransfer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!wallet) {
      return;
    }

    try {
      setSubmitting(true);

      setModalError('');

      const numericAmount =
        validateAmount();

      const targetWalletId =
        Number(destinationWalletId);

      if (
        !Number.isInteger(
          targetWalletId,
        ) ||
        targetWalletId <= 0
      ) {
        throw new Error(
          'Please select a valid destination wallet.',
        );
      }

      if (
        targetWalletId === wallet.id
      ) {
        throw new Error(
          'You cannot transfer money to the same wallet.',
        );
      }

      const availableBalance =
        Number(wallet.balance);

      if (
        numericAmount >
        availableBalance
      ) {
        throw new Error(
          'Transfer amount cannot exceed your available balance.',
        );
      }

      await apiFetch(
        `/wallets/${wallet.id}/transfer`,
        {
          method: 'POST',

          body: JSON.stringify({
            destinationWalletId:
              targetWalletId,

            amount:
              numericAmount,
          }),
        },
      );

      setModal(null);
      setAmount('');
      setDestinationWalletId('');

      await fetchWalletData(true);
    } catch (error: unknown) {
      setModalError(
        getErrorMessage(
          error,
          'Unable to complete transfer.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ============================================================
     LOADING
  ============================================================ */

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

  /* ============================================================
     ERROR
  ============================================================ */

  if (error && !wallet) {
    return (
      <div className="wallet-detail-error-page">
        <div className="wallet-detail-error-icon">
          <WalletIcon size={30} />
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

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

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
                account and transactions.
              </p>

            </div>

          </div>

        </div>

        <button
          type="button"
          className="wallet-detail-refresh-button"
          onClick={() =>
            void fetchWalletData(true)
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

      {/* ERROR ALERT */}

      {error && (
        <div className="wallet-detail-alert">
          {error}
        </div>
      )}

      {/* ======================================================
          MAIN BALANCE CARD
      ====================================================== */}

      <section className="wallet-detail-balance-card">

        <div className="wallet-detail-balance-main">

          <div className="wallet-detail-balance-label">

            <WalletIcon size={18} />

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

      {/* ======================================================
          VIRTUAL ACCOUNT DETAILS
      ====================================================== */}

      <section className="wallet-detail-history">

        <div className="wallet-detail-history-header">

          <div>

            <div className="wallet-detail-section-icon">
              <CreditCard size={20} />
            </div>

            <div>

              <h2>
                Account Details
              </h2>

              <p>
                Your virtual account information
                for receiving funds.
              </p>

            </div>

          </div>

        </div>

        {wallet.account ? (

          <div className="wallet-detail-account-card">

            <div className="wallet-detail-account-main">

              <div className="wallet-detail-account-icon">
                <Landmark size={24} />
              </div>

              <div>

                <span>
                  Account Number
                </span>

                <div className="wallet-detail-account-number">

                  <strong>
                    {wallet.account.accountNumber}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      void copyAccountNumber()
                    }
                    title="Copy account number"
                    className="wallet-detail-copy-button"
                  >
                    {copied ? (
                      <CheckCircle2 size={17} />
                    ) : (
                      <Copy size={17} />
                    )}
                  </button>

                </div>

              </div>

            </div>

            <div className="wallet-detail-account-grid">

              <div>

                <span>
                  Account Name
                </span>

                <strong>
                  {wallet.account.accountName}
                </strong>

              </div>

              <div>

                <span>
                  Bank Name
                </span>

                <strong>
                  {wallet.account.bankName}
                </strong>

              </div>

              <div>

                <span>
                  Account Type
                </span>

                <strong>
                  {wallet.account.accountType}
                </strong>

              </div>

              <div>

                <span>
                  Account Status
                </span>

                <strong>
                  {wallet.account.status}
                </strong>

              </div>

              {wallet.account.bankCode && (

                <div>

                  <span>
                    Bank Code
                  </span>

                  <strong>
                    {wallet.account.bankCode}
                  </strong>

                </div>

              )}

            </div>

          </div>

        ) : (

          <div className="wallet-detail-empty">

            <div className="wallet-detail-empty-icon">
              <CreditCard size={38} />
            </div>

            <h3>
              Account details unavailable
            </h3>

            <p>
              A virtual account has not yet been
              assigned to this wallet. Refresh the
              page or contact support if the issue
              continues.
            </p>

          </div>

        )}

      </section>

      {/* ======================================================
          WALLET STATISTICS
      ====================================================== */}

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

      {/* ======================================================
          WALLET ACTIONS
      ====================================================== */}

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

      {/* ======================================================
          TRANSACTION HISTORY
      ====================================================== */}

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
                    wallet.id,
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

      {/* ======================================================
          DEPOSIT MODAL
      ====================================================== */}

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

      {/* ======================================================
          WITHDRAW MODAL
      ====================================================== */}

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

      {/* ======================================================
          TRANSFER MODAL
      ====================================================== */}

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

                  <WalletIcon size={18} />

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
                          wallet.currency &&
                        item.status ===
                          'ACTIVE',
                    )
                    .map((item) => (

                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.currency} Wallet
                        {' — '}
                        {item.account
                          ?.accountNumber
                          ? item.account
                              .accountNumber
                          : `Wallet #${item.id}`}
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

/* ============================================================
   TRANSACTION DIRECTION HELPER
============================================================ */

function getTransactionDirection(
  transaction: Transaction,
  walletId: number,
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