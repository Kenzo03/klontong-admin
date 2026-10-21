import type { Prisma } from '../generated/prisma/client';

export type AuditEntry = {
  actorId: number | null;
  action: string;
  entityType: 'user' | 'product';
  entityId: number;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  reason?: string;
  ip?: string | null;
  userAgent?: string | null;
};

/** Dates and Decimals become plain JSON values. Never pass objects that contain a password. */
export const toJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export function writeAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  return tx.auditLog.create({ data: { ...entry, userAgent: entry.userAgent?.slice(0, 255) } });
}