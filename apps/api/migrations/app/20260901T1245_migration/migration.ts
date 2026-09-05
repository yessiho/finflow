#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1e8412e162dbbe69f4bb3bf8d07f0280ae67eaab15c34dcf201e67468315428d/contract';
import startContract from '../../snapshots/1e8412e162dbbe69f4bb3bf8d07f0280ae67eaab15c34dcf201e67468315428d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a2c3691f3fd460c8593f21d9207f6b2f61bb3f423a95df556dda2182e0b8dcb4/contract';
import endContract from '../../snapshots/a2c3691f3fd460c8593f21d9207f6b2f61bb3f423a95df556dda2182e0b8dcb4/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  placeholder,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'post' }),
      this.dropColumn({ schema: 'public', table: 'user', column: 'name' }),
      this.dropColumn({ schema: 'public', table: 'user', column: 'username' }),
      this.createTable({
        schema: 'public',
        table: 'auditLog',
        columns: [
          col('action', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('entity', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('entityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ledgerAccount',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('code', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('name', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ledgerAccount_currency_check_4538a556',
            "\"currency\" IN ('NGN', 'USD', 'EUR', 'GBP')",
          ),
          checkExpression(
            'ledgerAccount_type_check_e2bdb04f',
            "\"type\" IN ('ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ledgerEntry',
        columns: [
          col('accountId', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('credit', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('debit', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('id', 'SERIAL', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('transactionId', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'transaction',
        columns: [
          col('amount', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('destinationWalletId', 'int4', {
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('reference', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('sourceWalletId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'transaction_currency_check_4538a556',
            "\"currency\" IN ('NGN', 'USD', 'EUR', 'GBP')",
          ),
          checkExpression(
            'transaction_status_check_bc4cb609',
            "\"status\" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED')",
          ),
          checkExpression(
            'transaction_type_check_3c3bc052',
            "\"type\" IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'wallet',
        columns: [
          col('balance', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'wallet_currency_check_4538a556',
            "\"currency\" IN ('NGN', 'USD', 'EUR', 'GBP')",
          ),
          checkExpression(
            'wallet_status_check_166abea7',
            "\"status\" IN ('ACTIVE', 'FROZEN', 'CLOSED')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('status', 'text', {
          notNull: true,
          default: lit('ACTIVE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('firstName', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.dataTransform(endContract, 'backfill-user-firstName', {
        check: () => placeholder('backfill-user-firstName:check'),
        run: () => placeholder('backfill-user-firstName:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'firstName' }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('lastName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-user-lastName', {
        check: () => placeholder('backfill-user-lastName:check'),
        run: () => placeholder('backfill-user-lastName:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'lastName' }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('passwordHash', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.dataTransform(endContract, 'backfill-user-passwordHash', {
        check: () => placeholder('backfill-user-passwordHash:check'),
        run: () => placeholder('backfill-user-passwordHash:run'),
      }),
      this.setNotNull({
        schema: 'public',
        table: 'user',
        column: 'passwordHash',
      }),
      this.addUnique({
        schema: 'public',
        table: 'ledgerAccount',
        constraint: 'ledgerAccount_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'transaction',
        constraint: 'transaction_reference_key',
        columns: ['reference'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_status_check_5dec1c59',
        expression: "\"status\" IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'wallet',
        constraint: 'wallet_userId_currency_key',
        columns: ['userId', 'currency'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_entity_entityId_idx_efadd7fc',
        columns: ['entity', 'entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledgerEntry',
        index: 'ledgerEntry_accountId_idx_cbfb3085',
        columns: ['accountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledgerEntry',
        index: 'ledgerEntry_transactionId_idx_d3180832',
        columns: ['transactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'transaction',
        index: 'transaction_sourceWalletId_idx_2e316d30',
        columns: ['sourceWalletId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'wallet',
        index: 'wallet_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditLog',
        foreignKey: {
          name: 'auditLog_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ledgerEntry',
        foreignKey: {
          name: 'ledgerEntry_transactionId_fkey',
          columns: ['transactionId'],
          references: {
            schema: 'public',
            table: 'transaction',
            columns: ['id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ledgerEntry',
        foreignKey: {
          name: 'ledgerEntry_accountId_fkey',
          columns: ['accountId'],
          references: {
            schema: 'public',
            table: 'ledgerAccount',
            columns: ['id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'transaction',
        foreignKey: {
          name: 'transaction_sourceWalletId_fkey',
          columns: ['sourceWalletId'],
          references: { schema: 'public', table: 'wallet', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'wallet',
        foreignKey: {
          name: 'wallet_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
