'use client';

import { useCallback, useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import {
  ArrowLeft,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ReceiptText,
  ArrowRightLeft,
  Calendar,
  Hash,
  Wallet,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';

type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED';

type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP';

interface Transaction {
  id: number;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  currency: Currency;
  sourceWalletId: number | null;
  destinationWalletId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ReversalResponse {
  message?: string;
  originalTransaction?: Transaction;
  reversalTransaction?: Transaction;
  amount?: string;
}

interface ApiError {
  message?: string;
}

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

function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'id' in value &&
    typeof value.id === 'number' &&
    'reference' in value &&
    typeof value.reference === 'string' &&
    'type' in value &&
    typeof value.type === 'string' &&
    'status' in value &&
    typeof value.status === 'string' &&
    'amount' in value &&
    typeof value.amount === 'string' &&
    'currency' in value &&
    typeof value.currency === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'updatedAt' in value &&
    typeof value.updatedAt === 'string'
  );
}

function isReversalResponse(value: unknown): value is ReversalResponse {
  return typeof value === 'object' && value !== null;
}

export default function TransactionDetailsPage() {
  const params = useParams();

  const router = useRouter();

  const rawTransactionId = params.id;

  const transactionId =
    typeof rawTransactionId === 'string'
      ? rawTransactionId
      : Array.isArray(rawTransactionId)
        ? rawTransactionId[0]
        : null;

  const [transaction, setTransaction] =
    useState<Transaction | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);

  const [reversing, setReversing] = useState(false);

  const [success, setSuccess] = useState('');

  /* =====================================================
     HANDLE UNAUTHORIZED ACCESS
  ===================================================== */

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('access_token');

    localStorage.removeItem('user');

    router.push('/login');
  }, [router]);

  /* =====================================================
     LOAD TRANSACTION
  ===================================================== */

  const loadTransaction = useCallback(async () => {
    if (!transactionId) {
      setTransaction(null);

      setError('Invalid transaction ID.');

      setLoading(false);

      return;
    }

    try {
      setLoading(true);

      setError('');

      const response: unknown = await apiFetch(
        `/transactions/${transactionId}`,
      );

      if (!isTransaction(response)) {
        throw new Error(
          'Unexpected response received from the transaction API.',
        );
      }

      setTransaction(response);
    } catch (caughtError: unknown) {
      console.error(caughtError);

      const message = getErrorMessage(
        caughtError,
        'Unable to load transaction.',
      );

      if (message === 'Unauthorized') {
        handleUnauthorized();

        return;
      }

      setTransaction(null);

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized, transactionId]);

  /* =====================================================
     LOAD ON PAGE OPEN

     The timeout schedules the async state updates outside
     the synchronous effect execution and resolves the
     react-hooks/set-state-in-effect ESLint error.
  ===================================================== */

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTransaction();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadTransaction]);

  /* =====================================================
     REVERSE TRANSACTION
  ===================================================== */

  async function handleReverse() {
    if (!transaction || reversing) {
      return;
    }

    try {
      setReversing(true);

      setError('');

      setSuccess('');

      const response: unknown = await apiFetch(
        `/transactions/${transaction.id}/reverse`,
        {
          method: 'POST',
        },
      );

      if (!isReversalResponse(response)) {
        throw new Error(
          'Unexpected response received while reversing transaction.',
        );
      }

      /*
       * Update immediately if backend returns
       * the original transaction.
       */

      if (
        response.originalTransaction &&
        isTransaction(response.originalTransaction)
      ) {
        setTransaction(response.originalTransaction);
      }

      setShowModal(false);

      setSuccess(
        response.message || 'Transaction reversed successfully.',
      );

      /*
       * Reload from backend to ensure
       * database state is reflected.
       */

      await loadTransaction();
    } catch (caughtError: unknown) {
      console.error(caughtError);

      const message = getErrorMessage(
        caughtError,
        'Unable to reverse transaction.',
      );

      if (message === 'Unauthorized') {
        handleUnauthorized();

        return;
      }

      /*
       * Keep modal open so the user can
       * understand the failure.
       */

      setError(message);
    } finally {
      setReversing(false);
    }
  }

  /* =====================================================
     FORMAT AMOUNT
  ===================================================== */

  function formatAmount(amount: string, currency: string): string {
    const value = Number(amount);

    if (Number.isNaN(value)) {
      return `${currency} ${amount}`;
    }

    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${currency} ${value.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }

  /* =====================================================
     FORMAT DATE
  ===================================================== */

  function formatDate(date: string): string {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Invalid date';
    }

    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsedDate);
  }

  /* =====================================================
     STATUS CLASS
  ===================================================== */

  function getStatusClass(status: TransactionStatus): string {
    switch (status) {
      case 'COMPLETED':
        return 'status-completed';

      case 'REVERSED':
        return 'status-reversed';

      case 'FAILED':
        return 'status-failed';

      case 'PENDING':
        return 'status-pending';

      case 'PROCESSING':
        return 'status-processing';

      default:
        return '';
    }
  }

  /* =====================================================
     CHECK REVERSAL ELIGIBILITY

     Banking rule:
     Only completed transfers can be reversed.
  ===================================================== */

  const canReverse =
    transaction?.status === 'COMPLETED' &&
    transaction?.type === 'TRANSFER';

  /* =====================================================
     LOADING STATE
  ===================================================== */

  if (loading) {
    return (
      <div className="transaction-loading">
        <Loader2 size={34} className="spin" />

        <p>Loading transaction...</p>
      </div>
    );
  }

  /* =====================================================
     NOT FOUND / ERROR STATE
  ===================================================== */

  if (!transaction) {
    return (
      <div className="transaction-error-page">
        <AlertTriangle size={38} />

        <h2>Transaction Not Found</h2>

        <p>
          {error ||
            'The transaction could not be found or you do not have permission to view it.'}
        </p>

        <button
          type="button"
          className="secondary-button"
          onClick={() => router.push('/transactions')}
        >
          <ArrowLeft size={18} />

          Back to Transactions
        </button>
      </div>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="transaction-details-page">
      {/* PAGE HEADER */}

      <div className="transaction-page-header">
        <div>
          <button
            type="button"
            className="back-button"
            onClick={() => router.push('/transactions')}
          >
            <ArrowLeft size={19} />

            Back to Transactions
          </button>

          <h1>Transaction Details</h1>

          <p>
            Review transaction information and account activity.
          </p>
        </div>

        {canReverse && (
          <button
            type="button"
            className="reverse-button"
            onClick={() => {
              setError('');

              setSuccess('');

              setShowModal(true);
            }}
          >
            <RefreshCcw size={18} />

            Reverse Transaction
          </button>
        )}
      </div>

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="transaction-success">
          <CheckCircle2 size={20} />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss success message"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ERROR MESSAGE */}

      {error && (
        <div className="transaction-error">
          <AlertTriangle size={20} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error message"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* TRANSACTION SUMMARY */}

      <section className="transaction-summary-card">
        <div className="transaction-summary-icon">
          <ReceiptText size={30} />
        </div>

        <div className="transaction-summary-content">
          <div className="transaction-summary-top">
            <div>
              <span className="transaction-label">
                Transaction Amount
              </span>

              <h2>
                {formatAmount(
                  transaction.amount,
                  transaction.currency,
                )}
              </h2>
            </div>

            <span
              className={`transaction-status ${getStatusClass(
                transaction.status,
              )}`}
            >
              {transaction.status}
            </span>
          </div>

          <p className="transaction-reference">
            {transaction.reference}
          </p>
        </div>
      </section>

      {/* DETAILS GRID */}

      <div className="transaction-details-grid">
        {/* TRANSACTION INFORMATION */}

        <section className="transaction-card">
          <div className="transaction-card-header">
            <ArrowRightLeft size={20} />

            <h3>Transaction Information</h3>
          </div>

          <div className="transaction-info-list">
            <div className="transaction-info-row">
              <span>
                <Hash size={16} />

                Transaction ID
              </span>

              <strong>#{transaction.id}</strong>
            </div>

            <div className="transaction-info-row">
              <span>
                <ReceiptText size={16} />

                Reference
              </span>

              <strong className="reference-value">
                {transaction.reference}
              </strong>
            </div>

            <div className="transaction-info-row">
              <span>
                <ArrowRightLeft size={16} />

                Type
              </span>

              <strong>{transaction.type}</strong>
            </div>

            <div className="transaction-info-row">
              <span>Status</span>

              <span
                className={`transaction-status small ${getStatusClass(
                  transaction.status,
                )}`}
              >
                {transaction.status}
              </span>
            </div>
          </div>
        </section>

        {/* TIMELINE */}

        <section className="transaction-card">
          <div className="transaction-card-header">
            <Calendar size={20} />

            <h3>Timeline</h3>
          </div>

          <div className="transaction-info-list">
            <div className="transaction-info-row">
              <span>Created</span>

              <strong>
                {formatDate(transaction.createdAt)}
              </strong>
            </div>

            <div className="transaction-info-row">
              <span>Last Updated</span>

              <strong>
                {formatDate(transaction.updatedAt)}
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* WALLET MOVEMENT */}

      <section className="transaction-card wallet-movement-card">
        <div className="transaction-card-header">
          <Wallet size={20} />

          <h3>Wallet Movement</h3>
        </div>

        <div className="wallet-movement">
          <div className="wallet-movement-item">
            <span>Source Wallet</span>

            <strong>
              {transaction.sourceWalletId
                ? `Wallet #${transaction.sourceWalletId}`
                : 'External / System'}
            </strong>
          </div>

          <ArrowRightLeft
            size={22}
            className="wallet-arrow"
          />

          <div className="wallet-movement-item">
            <span>Destination Wallet</span>

            <strong>
              {transaction.destinationWalletId
                ? `Wallet #${transaction.destinationWalletId}`
                : 'External / System'}
            </strong>
          </div>
        </div>
      </section>

      {/* REVERSAL INFORMATION */}

      {transaction.status === 'REVERSED' && (
        <section className="reversed-information">
          <AlertTriangle size={21} />

          <div>
            <strong>
              This transaction has been reversed
            </strong>

            <p>
              The original wallet movement has been compensated
              and corresponding reversal accounting entries have
              been created.
            </p>
          </div>
        </section>
      )}

      {/* CONFIRMATION MODAL */}

      {showModal && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            if (!reversing) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="reversal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reversal-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              disabled={reversing}
              onClick={() => {
                if (!reversing) {
                  setShowModal(false);
                }
              }}
              aria-label="Close reversal confirmation"
            >
              <X size={20} />
            </button>

            <div className="reversal-modal-icon">
              <AlertTriangle size={30} />
            </div>

            <h2 id="reversal-modal-title">
              Reverse Transaction?
            </h2>

            <p>
              You are about to reverse this transaction.
            </p>

            <div className="reversal-warning">
              <strong>Important:</strong>

              <span>
                This action will restore the original wallet
                balances and create reversal accounting entries.
              </span>
            </div>

            <div className="reversal-amount">
              {formatAmount(
                transaction.amount,
                transaction.currency,
              )}
            </div>

            {/* ERROR INSIDE MODAL */}

            {error && (
              <div className="transaction-error modal-error">
                <AlertTriangle size={18} />

                <span>{error}</span>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel"
                disabled={reversing}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-confirm-reversal"
                disabled={reversing}
                onClick={handleReverse}
              >
                {reversing ? (
                  <>
                    <Loader2
                      size={18}
                      className="spin"
                    />

                    Reversing...
                  </>
                ) : (
                  <>
                    <RefreshCcw size={18} />

                    Confirm Reversal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}