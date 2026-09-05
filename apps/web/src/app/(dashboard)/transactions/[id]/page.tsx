'use client';

import { useEffect, useState } from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

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

interface Transaction {
  id: number;

  reference: string;

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

  amount: string;

  currency:
    | 'NGN'
    | 'USD'
    | 'EUR'
    | 'GBP';

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

export default function TransactionDetailsPage() {
  const params = useParams();

  const router = useRouter();

  const transactionId = params.id;

  const [transaction, setTransaction] =
    useState<Transaction | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [showModal, setShowModal] =
    useState(false);

  const [reversing, setReversing] =
    useState(false);

  const [success, setSuccess] =
    useState('');

  /*
   * ==========================================
   * LOAD TRANSACTION
   * ==========================================
   */

  async function loadTransaction() {
    try {
      setLoading(true);

      setError('');

      const data =
        await apiFetch(
          `/transactions/${transactionId}`,
        );

      setTransaction(data);
    } catch (error: any) {
      setError(
        error.message ||
          'Unable to load transaction.',
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==========================================
   * LOAD ON PAGE OPEN
   * ==========================================
   */

  useEffect(() => {
    if (transactionId) {
      loadTransaction();
    }
  }, [transactionId]);

  /*
   * ==========================================
   * REVERSE TRANSACTION
   * ==========================================
   */

  async function handleReverse() {
    if (!transaction) {
      return;
    }

    /*
     * Prevent duplicate requests.
     */

    if (reversing) {
      return;
    }

    try {
      setReversing(true);

      setError('');

      setSuccess('');

      const response =
        await apiFetch(
          `/transactions/${transaction.id}/reverse`,
          {
            method: 'POST',
          },
        ) as ReversalResponse;

      /*
       * Update immediately from response
       * if backend returns original transaction.
       */

      if (
        response.originalTransaction
      ) {
        setTransaction(
          response.originalTransaction,
        );
      }

      /*
       * Close modal after successful reversal.
       */

      setShowModal(false);

      /*
       * Success message.
       */

      setSuccess(
        response.message ||
          'Transaction reversed successfully.',
      );

      /*
       * Reload transaction from backend
       * to ensure UI reflects database state.
       */

      await loadTransaction();
    } catch (error: any) {
      /*
       * Keep modal open when reversal fails.
       * This allows the user to see the error
       * and avoid confusion.
       */

      setError(
        error.message ||
          'Unable to reverse transaction.',
      );
    } finally {
      setReversing(false);
    }
  }

  /*
   * ==========================================
   * FORMAT AMOUNT
   * ==========================================
   */

  function formatAmount(
    amount: string,
    currency: string,
  ) {
    const value = Number(amount);

    return new Intl.NumberFormat(
      'en-NG',
      {
        style: 'currency',

        currency,

        minimumFractionDigits: 2,

        maximumFractionDigits: 2,
      },
    ).format(value);
  }

  /*
   * ==========================================
   * FORMAT DATE
   * ==========================================
   */

  function formatDate(
    date: string,
  ) {
    return new Intl.DateTimeFormat(
      'en-NG',
      {
        dateStyle: 'medium',

        timeStyle: 'short',
      },
    ).format(
      new Date(date),
    );
  }

  /*
   * ==========================================
   * STATUS CLASS
   * ==========================================
   */

  function getStatusClass(
    status: string,
  ) {
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

  /*
   * ==========================================
   * CHECK REVERSAL ELIGIBILITY
   *
   * Banking rule:
   * Only completed transfers can be reversed.
   * ==========================================
   */

  function canReverse() {
    return (
      transaction?.status === 'COMPLETED' &&
      transaction?.type === 'TRANSFER'
    );
  }

  /*
   * ==========================================
   * LOADING STATE
   * ==========================================
   */

  if (loading) {
    return (
      <div className="transaction-loading">
        <Loader2
          size={34}
          className="spin"
        />

        <p>
          Loading transaction...
        </p>
      </div>
    );
  }

  /*
   * ==========================================
   * NOT FOUND
   * ==========================================
   */

  if (!transaction) {
    return (
      <div className="transaction-error-page">
        <AlertTriangle size={38} />

        <h2>
          Transaction Not Found
        </h2>

        <p>
          The transaction could not be found
          or you do not have permission to
          view it.
        </p>

        <button
          className="secondary-button"
          onClick={() =>
            router.push(
              '/transactions',
            )
          }
        >
          Back to Transactions
        </button>
      </div>
    );
  }

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <div className="transaction-details-page">

      {/* PAGE HEADER */}

      <div className="transaction-page-header">

        <div>

          <button
            className="back-button"
            onClick={() =>
              router.push(
                '/transactions',
              )
            }
          >
            <ArrowLeft size={19} />

            Back to Transactions
          </button>

          <h1>
            Transaction Details
          </h1>

          <p>
            Review transaction information
            and account activity.
          </p>

        </div>

        {canReverse() && (
          <button
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

          <span>
            {success}
          </span>

          <button
            onClick={() =>
              setSuccess('')
            }
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* ERROR MESSAGE */}

      {error && (
        <div className="transaction-error">

          <AlertTriangle size={20} />

          <span>
            {error}
          </span>

          <button
            onClick={() =>
              setError('')
            }
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

            <h3>
              Transaction Information
            </h3>

          </div>

          <div className="transaction-info-list">

            <div className="transaction-info-row">

              <span>
                <Hash size={16} />

                Transaction ID
              </span>

              <strong>
                #{transaction.id}
              </strong>

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

              <strong>
                {transaction.type}
              </strong>

            </div>

            <div className="transaction-info-row">

              <span>
                Status
              </span>

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

            <h3>
              Timeline
            </h3>

          </div>

          <div className="transaction-info-list">

            <div className="transaction-info-row">

              <span>
                Created
              </span>

              <strong>
                {formatDate(
                  transaction.createdAt,
                )}
              </strong>

            </div>

            <div className="transaction-info-row">

              <span>
                Last Updated
              </span>

              <strong>
                {formatDate(
                  transaction.updatedAt,
                )}
              </strong>

            </div>

          </div>

        </section>

      </div>

      {/* WALLET MOVEMENT */}

      <section className="transaction-card wallet-movement-card">

        <div className="transaction-card-header">

          <Wallet size={20} />

          <h3>
            Wallet Movement
          </h3>

        </div>

        <div className="wallet-movement">

          <div className="wallet-movement-item">

            <span>
              Source Wallet
            </span>

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

            <span>
              Destination Wallet
            </span>

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
              The original wallet movement has
              been compensated and corresponding
              reversal accounting entries have
              been created.
            </p>

          </div>

        </section>

      )}

      {/* CONFIRMATION MODAL */}

      {showModal && (

        <div className="modal-overlay">

          <div className="reversal-modal">

            <button
              className="modal-close"
              disabled={reversing}
              onClick={() => {
                if (!reversing) {
                  setShowModal(false);
                }
              }}
            >
              <X size={20} />
            </button>

            <div className="reversal-modal-icon">

              <AlertTriangle size={30} />

            </div>

            <h2>
              Reverse Transaction?
            </h2>

            <p>
              You are about to reverse this
              transaction.
            </p>

            <div className="reversal-warning">

              <strong>
                Important:
              </strong>

              <span>
                This action will restore the
                original wallet balances and
                create reversal accounting
                entries.
              </span>

            </div>

            <div className="reversal-amount">

              {formatAmount(
                transaction.amount,
                transaction.currency,
              )}

            </div>

            {/* SHOW ERROR INSIDE MODAL */}

            {error && (
              <div className="transaction-error modal-error">

                <AlertTriangle size={18} />

                <span>
                  {error}
                </span>

              </div>
            )}

            <div className="modal-actions">

              <button
                className="modal-cancel"
                disabled={reversing}
                onClick={() =>
                  setShowModal(false)
                }
              >
                Cancel
              </button>

              <button
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