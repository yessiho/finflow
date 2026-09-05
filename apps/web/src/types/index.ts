export type Currency =
  | 'NGN'
  | 'USD'
  | 'EUR'
  | 'GBP';

export type WalletStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED';

export interface Wallet {
  id: number;
  userId: number;
  currency: Currency;
  balance: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER';

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED';

export interface Transaction {
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

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}