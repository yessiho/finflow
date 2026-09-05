'use client';

import { FormEvent, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

import { apiFetch } from '@/lib/api';

type Wallet = {
  id: number;
  currency: string;
  balance: string;
};

type DepositModalProps = {
  wallet: Wallet;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DepositModal({
  wallet,
  onClose,
  onSuccess,
}: DepositModalProps) {
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
        `/wallets/${wallet.id}/deposit`,
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
          'Unable to deposit money.',
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
            <h2>Deposit Money</h2>

            <p>
              Add money to your wallet.
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
            Current Balance:{' '}
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
                'Confirm Deposit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}