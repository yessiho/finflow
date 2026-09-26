import 'temporal-polyfill/full/global';

import type { Temporal } from 'temporal-spec';

const temporal = (globalThis as typeof globalThis & {
  Temporal: typeof Temporal;
}).Temporal;

export function nowInstant(): Temporal.Instant {
  return temporal.Now.instant();
}

export function toInstant(value: Date): Temporal.Instant {
  return temporal.Instant.from(value.toISOString());
}