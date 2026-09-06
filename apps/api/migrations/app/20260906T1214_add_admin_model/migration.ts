#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7bb20ae7d6faceb6ed459a43ec456c84494821043da5c5280b2a602a617539c0/contract';
import startContract from '../../snapshots/7bb20ae7d6faceb6ed459a43ec456c84494821043da5c5280b2a602a617539c0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/96549f10e6a2fa52a6a29d65d3152548e10ca4dc29d458ea0bcbb8ca13fea7f0/contract';
import endContract from '../../snapshots/96549f10e6a2fa52a6a29d65d3152548e10ca4dc29d458ea0bcbb8ca13fea7f0/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'admin',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
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
            'admin_status_check_5dec1c59',
            "\"status\" IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'admin',
        constraint: 'admin_email_key',
        columns: ['email'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
