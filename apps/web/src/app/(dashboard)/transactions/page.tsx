'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  ReceiptText,
  TrendingUp,
  CircleCheck,
  Eye,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

interface Transaction {
  id: number;
  reference: string;
  amount: string;
  currency: string;
  type: string;
  status: string;
  sourceWalletId: number | null;
  destinationWalletId: number | null;
  createdAt: string;
}

interface TransactionsResponse {
  data: Transaction[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function TransactionsPage() {
  const router = useRouter();

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [type, setType] =
    useState('');

  const [status, setStatus] =
    useState('');

  const [page, setPage] =
    useState(1);

  const [meta, setMeta] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });

  async function loadTransactions(
    selectedPage = page,
    filters = {
      search,
      type,
      status,
    },
  ) {
    try {
      setLoading(true);
      setError('');

      const params =
        new URLSearchParams();

      params.set(
        'page',
        String(selectedPage),
      );

      params.set('limit', '10');

      if (filters.search.trim()) {
        params.set(
          'search',
          filters.search.trim(),
        );
      }

      if (filters.type) {
        params.set(
          'type',
          filters.type,
        );
      }

      if (filters.status) {
        params.set(
          'status',
          filters.status,
        );
      }

      const response =
        await apiFetch(
          `/transactions?${params.toString()}`,
        );

      if (Array.isArray(response)) {
        setTransactions(response);

        setMeta({
          page: 1,
          limit: response.length,
          total: response.length,
          totalPages: 1,
        });

        return;
      }

      const data =
        response as TransactionsResponse;

      setTransactions(
        data.data || [],
      );

      if (data.meta) {
        setMeta(data.meta);
      }
    } catch (error: any) {
      console.error(error);

      if (
        error.message === 'Unauthorized'
      ) {
        localStorage.removeItem(
          'access_token',
        );

        localStorage.removeItem(
          'user',
        );

        router.push('/login');

        return;
      }

      setError(
        error.message ||
          'Unable to load transactions',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions(1);
  }, []);

  function handleSearch(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setPage(1);

    loadTransactions(
      1,
      {
        search,
        type,
        status,
      },
    );
  }

  function handleTypeChange(
    value: string,
  ) {
    setType(value);
    setPage(1);

    loadTransactions(
      1,
      {
        search,
        type: value,
        status,
      },
    );
  }

  function handleStatusChange(
    value: string,
  ) {
    setStatus(value);
    setPage(1);

    loadTransactions(
      1,
      {
        search,
        type,
        status: value,
      },
    );
  }

  function changePage(
    newPage: number,
  ) {
    if (
      newPage < 1 ||
      newPage > meta.totalPages
    ) {
      return;
    }

    setPage(newPage);

    loadTransactions(
      newPage,
    );
  }

  function formatAmount(
    amount: string,
    currency: string,
  ) {
    try {
      return new Intl.NumberFormat(
        'en-NG',
        {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
        },
      ).format(
        Number(amount),
      );
    } catch {
      return `${currency} ${Number(
        amount,
      ).toLocaleString()}`;
    }
  }

  function formatDate(
    date: string,
  ) {
    return new Date(
      date,
    ).toLocaleString(
      'en-NG',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    );
  }

  function getTransactionIcon(
    transactionType: string,
  ) {
    switch (transactionType) {
      case 'DEPOSIT':
        return (
          <ArrowDownLeft size={18} />
        );

      case 'WITHDRAWAL':
        return (
          <ArrowUpRight size={18} />
        );

      case 'TRANSFER':
        return (
          <ArrowLeftRight size={18} />
        );

      default:
        return (
          <RefreshCcw size={18} />
        );
    }
  }

  function getTransactionIconClass(
    transactionType: string,
  ) {
    switch (transactionType) {
      case 'DEPOSIT':
        return 'transaction-type-icon deposit';

      case 'WITHDRAWAL':
        return 'transaction-type-icon withdrawal';

      case 'TRANSFER':
        return 'transaction-type-icon transfer';

      default:
        return 'transaction-type-icon';
    }
  }

  function getStatusClass(
    transactionStatus: string,
  ) {
    return transactionStatus
      .toLowerCase()
      .replace(/\s/g, '-');
  }

  const completedTransactions =
    transactions.filter(
      (transaction) =>
        transaction.status === 'COMPLETED',
    ).length;

  const depositTransactions =
    transactions.filter(
      (transaction) =>
        transaction.type === 'DEPOSIT',
    ).length;

  const transferTransactions =
    transactions.filter(
      (transaction) =>
        transaction.type === 'TRANSFER',
    ).length;

  return (
    <div className="transactions-page">

      {/* PAGE HEADER */}

      <section className="transactions-hero">

        <div className="transactions-header-content">

          <div className="transactions-page-icon">
            <ReceiptText size={24} />
          </div>

          <div>

            <div className="page-eyebrow">
              Financial Activity
            </div>

            <h1>
              Transactions
            </h1>

            <p>
              Monitor, search and manage all
              financial transactions from one
              secure location.
            </p>

          </div>

        </div>

        <button
          className="refresh-button"
          onClick={() =>
            loadTransactions(page)
          }
          disabled={loading}
        >
          <RefreshCcw
            size={18}
            className={
              loading
                ? 'refresh-spin'
                : ''
            }
          />

          {loading
            ? 'Refreshing...'
            : 'Refresh'}

        </button>

      </section>


      {/* ERROR */}

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}


      {/* SUMMARY CARDS */}

      <section className="transaction-summary-grid">

        <div className="transaction-summary-card">

          <div className="summary-icon summary-blue">
            <ReceiptText size={20} />
          </div>

          <div>
            <span>
              Total Transactions
            </span>

            <strong>
              {meta.total}
            </strong>

            <small>
              All recorded activity
            </small>
          </div>

        </div>


        <div className="transaction-summary-card">

          <div className="summary-icon summary-green">
            <CircleCheck size={20} />
          </div>

          <div>
            <span>
              Completed
            </span>

            <strong>
              {completedTransactions}
            </strong>

            <small>
              Successful transactions
            </small>
          </div>

        </div>


        <div className="transaction-summary-card">

          <div className="summary-icon summary-purple">
            <ArrowDownLeft size={20} />
          </div>

          <div>
            <span>
              Deposits
            </span>

            <strong>
              {depositTransactions}
            </strong>

            <small>
              Incoming transactions
            </small>
          </div>

        </div>


        <div className="transaction-summary-card">

          <div className="summary-icon summary-orange">
            <TrendingUp size={20} />
          </div>

          <div>
            <span>
              Transfers
            </span>

            <strong>
              {transferTransactions}
            </strong>

            <small>
              Wallet movement activity
            </small>
          </div>

        </div>

      </section>


      {/* FILTER PANEL */}

      <section className="transaction-filter-card">

        <div className="filter-card-header">

          <div>
            <h2>
              Transaction Records
            </h2>

            <p>
              Search and filter financial activity.
            </p>
          </div>

          <div className="transaction-count">
            {meta.total} Records
          </div>

        </div>


        <div className="transaction-filters">

          <form
            className="transaction-search"
            onSubmit={handleSearch}
          >

            <Search size={19} />

            <input
              type="text"
              placeholder="Search by transaction reference..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />

            <button type="submit">
              Search
            </button>

          </form>


          <div className="filter-controls">

            <div className="filter-select">

              <Filter size={17} />

              <select
                value={type}
                onChange={(event) =>
                  handleTypeChange(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  All Types
                </option>

                <option value="DEPOSIT">
                  Deposit
                </option>

                <option value="WITHDRAWAL">
                  Withdrawal
                </option>

                <option value="TRANSFER">
                  Transfer
                </option>

              </select>

            </div>


            <div className="filter-select">

              <CircleCheck size={17} />

              <select
                value={status}
                onChange={(event) =>
                  handleStatusChange(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  All Statuses
                </option>

                <option value="COMPLETED">
                  Completed
                </option>

                <option value="REVERSED">
                  Reversed
                </option>

                <option value="FAILED">
                  Failed
                </option>

                <option value="PENDING">
                  Pending
                </option>

              </select>

            </div>

          </div>

        </div>

      </section>


      {/* TABLE */}

      <section className="transactions-table-card">

        {loading ? (

          <div className="transactions-loading">

            <div className="transactions-loader" />

            <h3>
              Loading transactions
            </h3>

            <p>
              Retrieving your financial activity...
            </p>

          </div>

        ) : transactions.length === 0 ? (

          <div className="empty-state transaction-empty">

            <div className="empty-state-icon">
              <ReceiptText size={34} />
            </div>

            <h3>
              No transactions found
            </h3>

            <p>
              Try adjusting your filters or
              search criteria.
            </p>

          </div>

        ) : (

          <div className="transactions-table-wrapper">

            <table className="transactions-table">

              <thead>

                <tr>

                  <th>
                    Transaction
                  </th>

                  <th>
                    Reference
                  </th>

                  <th>
                    Date & Time
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {transactions.map(
                  (transaction) => (

                    <tr
                      key={transaction.id}
                    >

                      {/* TYPE */}

                      <td>

                        <div className="transaction-table-type">

                          <div
                            className={getTransactionIconClass(
                              transaction.type,
                            )}
                          >
                            {getTransactionIcon(
                              transaction.type,
                            )}
                          </div>


                          <div className="transaction-type-details">

                            <strong>
                              {transaction.type}
                            </strong>

                            <span>
                              Transaction #
                              {transaction.id}
                            </span>

                          </div>

                        </div>

                      </td>


                      {/* REFERENCE */}

                      <td>

                        <span className="transaction-reference">
                          {transaction.reference}
                        </span>

                      </td>


                      {/* DATE */}

                      <td>

                        <span className="transaction-date">
                          {formatDate(
                            transaction.createdAt,
                          )}
                        </span>

                      </td>


                      {/* AMOUNT */}

                      <td>

                        <strong className="transaction-amount-value">
                          {formatAmount(
                            transaction.amount,
                            transaction.currency,
                          )}
                        </strong>

                      </td>


                      {/* STATUS */}

                      <td>

                        <span
                          className={`transaction-status ${getStatusClass(
                            transaction.status,
                          )}`}
                        >
                          {transaction.status}
                        </span>

                      </td>


                      {/* ACTION */}

                      <td>

                        <button
                          className="view-transaction-button"
                          onClick={() =>
                            router.push(
                              `/transactions/${transaction.id}`,
                            )
                          }
                        >

                          <Eye size={16} />

                          View

                        </button>

                      </td>

                    </tr>

                  ),
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* PAGINATION */}

      {!loading &&
        transactions.length > 0 &&
        meta.totalPages > 1 && (

          <div className="pagination">

            <button
              onClick={() =>
                changePage(page - 1)
              }
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>


            <div className="pagination-info">

              <span>
                Page
              </span>

              <strong>
                {page}
              </strong>

              <span>
                of {meta.totalPages}
              </span>

            </div>


            <button
              onClick={() =>
                changePage(page + 1)
              }
              disabled={
                page === meta.totalPages
              }
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>

          </div>

        )}

    </div>
  );
}