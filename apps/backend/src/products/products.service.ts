import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toJson, writeAudit } from '../audit/audit';
import type { Actor } from '../common/decorators';
import { pageArgs, pageMeta } from '../common/pagination';
import { CreateProductDto, ListProductsDto, UpdateProductDto } from './products.dto';
import { PRODUCT_INCLUDE, toApi } from './products.mapper';

const ADMIN_ONLY = ['price', 'stock', 'uom'] as const;
const notFound = () => new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async list(q: ListProductsDto, actor: Actor) {
    if (q.status === 'archived' && actor.role !== 'ADMIN') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only ADMIN can list archived products' });
    }
    const where: Prisma.ProductWhereInput = {
      ...(q.status === 'archived' ? { archivedAt: { not: null } } : { archivedAt: null }),
      ...(q.status === 'active' ? { isActive: true } : {}),
      ...(q.status === 'inactive' ? { isActive: false } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.search
        ? { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { sku: { contains: q.search, mode: 'insensitive' } }] }
        : {}),
    };
    // `sort` is whitelisted by the DTO; `id` breaks ties so pages never overlap
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { [q.sort]: q.order } as Prisma.ProductOrderByWithRelationInput,
      { id: 'asc' },
    ];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, orderBy, include: PRODUCT_INCLUDE, ...pageArgs(q) }),
      this.prisma.product.count({ where }),
    ]);
    return { data: rows.map(toApi), meta: pageMeta(q, total) };
  }

  /** STAFF never see archived products (404); ADMIN do. */
  private async findVisible(id: number, actor: Actor) {
    const product = await this.prisma.product.findFirst({
      where: { id, ...(actor.role === 'ADMIN' ? {} : { archivedAt: null }) },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw notFound();
    return product;
  }

  async findOne(id: number, actor: Actor) {
    return toApi(await this.findVisible(id, actor));
  }

  async create(dto: CreateProductDto, actor: Actor) {
    await this.assertImageExists(dto.image);
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Spreading the DTO is safe here: ValidationPipe strips unknown fields and products have no secret column.
        const created = await tx.product.create({ data: { ...dto, createdById: actor.id, updatedById: actor.id }, include: PRODUCT_INCLUDE });
        const product = toApi(created);
        await writeAudit(tx, { actorId: actor.id, action: 'product.create', entityType: 'product', entityId: product.id, after: toJson(product), ip: actor.ip, userAgent: actor.userAgent });
        return product;
      });
    } catch (e) {
      throw this.skuConflict(e);
    }
  }

  async update(id: number, dto: UpdateProductDto, actor: Actor) {
    const { reason, ...fields } = dto;
    await this.assertImageExists(fields.image);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.product.findFirst({ where: { id, archivedAt: null }, include: PRODUCT_INCLUDE });
        if (!before) throw notFound(); // archived products are read-only

        // Compare with current values, not field presence: the edit form always sends every field.
        const touched = ADMIN_ONLY.filter((k) => fields[k] !== undefined && fields[k] !== before[k]);
        if (touched.length && actor.role !== 'ADMIN') {
          throw new ForbiddenException({ code: 'ADMIN_ONLY_FIELDS', message: `Only ADMIN can change: ${touched.join(', ')}` });
        }
        if (touched.length && !reason) {
          throw new BadRequestException({ code: 'REASON_REQUIRED', message: 'A reason is required when price, stock or unit changes' });
        }
        if (touched.includes('uom') && (fields.price === undefined || fields.stock === undefined)) {
          throw new BadRequestException({ code: 'UOM_CHANGE_INCOMPLETE', message: 'Changing the unit requires the new price and stock in the same request' });
        }

        const updated = await tx.product.update({ where: { id }, data: { ...fields, updatedById: actor.id }, include: PRODUCT_INCLUDE });
        const product = toApi(updated);
        await writeAudit(tx, { actorId: actor.id, action: 'product.update', entityType: 'product', entityId: id, before: toJson(toApi(before)), after: toJson(product), reason, ip: actor.ip, userAgent: actor.userAgent });
        return product;
      });
    } catch (e) {
      throw this.skuConflict(e);
    }
  }

  async archive(id: number, actor: Actor) {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findFirst({ where: { id, archivedAt: null }, include: PRODUCT_INCLUDE });
      if (!before) throw notFound();
      const after = await tx.product.update({ where: { id }, data: { archivedAt: new Date(), isActive: false, updatedById: actor.id }, include: PRODUCT_INCLUDE });
      await writeAudit(tx, { actorId: actor.id, action: 'product.archive', entityType: 'product', entityId: id, before: toJson(toApi(before)), after: toJson(toApi(after)), ip: actor.ip, userAgent: actor.userAgent });
    });
  }

  async restore(id: number, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findFirst({ where: { id, archivedAt: { not: null } }, include: PRODUCT_INCLUDE });
      if (!before) throw notFound();
      // stays inactive: the admin re-activates it on purpose
      const after = await tx.product.update({ where: { id }, data: { archivedAt: null, updatedById: actor.id }, include: PRODUCT_INCLUDE });
      const product = toApi(after);
      await writeAudit(tx, { actorId: actor.id, action: 'product.restore', entityType: 'product', entityId: id, before: toJson(toApi(before)), after: toJson(product), ip: actor.ip, userAgent: actor.userAgent });
      return product;
    });
  }

  async history(id: number, actor: Actor) {
    await this.findVisible(id, actor);
    return this.prisma.auditLog.findMany({
      where: { entityType: 'product', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      // never ip or userAgent
      select: { id: true, action: true, before: true, after: true, reason: true, createdAt: true, actor: { select: { id: true, name: true, role: true } } },
    });
  }

  private async assertImageExists(image: string | null | undefined) {
    if (!image) return;
    const file = path.join(path.resolve(this.config.get<string>('UPLOAD_DIR') ?? 'uploads'), image.replace(/^\/uploads\//, ''));
    try {
      await access(file);
    } catch {
      throw new BadRequestException({ code: 'IMAGE_NOT_FOUND', message: 'Upload the image first' });
    }
  }

  private skuConflict(e: unknown) {
    return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
      ? new ConflictException({ code: 'SKU_TAKEN', message: 'SKU is already used by another product' })
      : e;
  }
}