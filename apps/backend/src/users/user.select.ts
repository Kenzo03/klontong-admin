import type { Prisma } from '../generated/prisma/client';

export const PUBLIC_USER = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;