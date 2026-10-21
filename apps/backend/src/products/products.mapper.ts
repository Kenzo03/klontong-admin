import type { Prisma } from '../generated/prisma/client';

export const PRODUCT_INCLUDE = {
  category: { select: { name: true } },
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

/** Field names from the brief, Decimals as JSON numbers (Prisma would send strings), category name flattened. */
export function toApi(p: ProductRow) {
  const { category, ...rest } = p;
  return {
    ...rest,
    categoryName: category.name,
    weight: p.weight.toNumber(),
    width: p.width.toNumber(),
    length: p.length.toNumber(),
    height: p.height.toNumber(),
  };
}