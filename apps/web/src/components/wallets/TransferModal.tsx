'use client';

import { FormEvent, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

import { apiFetch } from '@/lib/api';

type Wallet = {
  id: number;
  currency: string;
  balance: string;
};

type TransferModalProps = {
  wallet: Wallet;
  wallets: Wallet[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function TransferModal({
  wallet,
  wallets,
  onClose,
  onSuccess,
}: TransferModalProps) {
  const [destinationWalletId, setDestinationWalletId] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const availableWallets =
    wallets.filter(
      (item) =>
        item.id !== wallet.id &&
        item.currency === wallet.currency,
    );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');

    const numericAmount =
      Number(amount);

    if (!destinationWalletId) {
      setError(
        'Please select a destination wallet.',
      );

      return;
    }

    if (
      !numericAmount ||
      numericAmount <= 0
    ) {
      setError(
        'Please enter a valid amount.',
      );

      return;
    }

    setLoading(true);

    try {
      await apiFetch(
        `/wallets/${wallet.id}/transfer`,
        {
          method: 'POST',

          body: JSON.stringify({
            destinationWalletId:
              Number(destinationWalletId),

            amount: numericAmount,
          }),
        },
      );

      onSuccess();

      onClose();
    } catch (error: any) {
      setError(
        error.message ||
          'Unable to transfer money.',
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
            <h2>Transfer Money</h2>

            <p>
              Send money to another wallet.
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
            From: {wallet.currency} Wallet
          </span>

          <strong>
            Balance: {wallet.balance}
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
              required
            >
              <option value="">
                Select wallet
              </option>

              {availableWallets.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.currency} Wallet
                  </option>
                ),
              )}
            </select>

            {availableWallets.length === 0 && (
              <small className="form-hint">
                No other wallet with matching
                currency is available.
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Amount</label>

            <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              min="1"
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
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
              disabled={
                loading ||
                availableWallets.length === 0
              }
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
                'Confirm Transfer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}