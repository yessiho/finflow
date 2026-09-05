'use client';

import { FormEvent, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

import { apiFetch } from '@/lib/api';

type Wallet = {
  id: number;
  currency: string;
  balance: string;
};

type WithdrawModalProps = {
  wallet: Wallet;
  onClose: () => void;
  onSuccess: () => void;
};

export default function WithdrawModal({
  wallet,
  onClose,
  onSuccess,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');

    const numericAmount = Number(amount);

    if (
      !numericAmount ||
      numericAmount <= 0
    ) {
      setError(
        'Please enter a valid amount greater than zero.',
      );

      return;
    }

    setLoading(true);

    try {
      await apiFetch(
        `/wallets/${wallet.id}/withdraw`,
        {
          method: 'POST',

          body: JSON.stringify({
            amount: numericAmount,
          }),
        },
      );

      onSuccess();

      onClose();
    } catch (error: any) {
      setError(
        error.message ||
          'Unable to withdraw money.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="wallet-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-header">
          <div>
            <h2>Withdraw Money</h2>

            <p>
              Withdraw money from your wallet.
            </p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            type="button"
          >
            <X size={22} />
          </button>
        </div>

        <div className="wallet-summary">
          <span>
            {wallet.currency} Wallet
          </span>

          <strong>
            Available Balance:{' '}
            {wallet.balance}
          </strong>
        </div>

        <form
          onSubmit={handleSubmit}
          className="wallet-action-form"
        >
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Amount</label>

            <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              min="1"
              onChange={(event) =>
                setAmount(event.target.value)
              }
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="spinner"
                  />

                  Processing...
                </>
              ) : (
                'Confirm Withdrawal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}