import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { serveUploads } from '../src/uploads/serve-upload';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPassword } from '../src/auth/password';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

describe('Products (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let categoryId: number;
  let productId: number;
  const http = () => request(app.getHttpServer());

  async function loginAs(email: string) {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email, password: 'Rahasia123' }).expect(200);
    return agent;
  }

  const product = (over: Record<string, unknown> = {}) => ({
    sku: 'TST-0001', name: 'Indomie Goreng 85g', categoryId, uom: 'PCS', price: 3500, stock: 10,
    weight: 0.085, width: 12, length: 3.5, height: 15.5, ...over,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    serveUploads(app);
    await app.init();
    prisma = app.get(PrismaService);
    const password = await hashPassword('Rahasia123');
    await prisma.user.createMany({
      data: [
        { name: 'Admin Produk', email: 'padmin@test.local', password, role: 'ADMIN', status: 'ACTIVE' },
        { name: 'Staf Produk', email: 'pstaff@test.local', password, role: 'STAFF', status: 'ACTIVE' },
      ],
    });
    categoryId = (await prisma.category.create({ data: { name: 'Mi Instan Test' } })).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('7 + 17. STAFF creates a product; history shows it, without ip or user agent', async () => {
    const staff = await loginAs('pstaff@test.local');
    const res = await staff.post('/api/products').send(product({ sku: ' tst-0001 ' })).expect(201);
    expect(res.body.data).toMatchObject({ sku: 'TST-0001', categoryName: 'Mi Instan Test', price: 3500, weight: 0.085, length: 3.5 });
    productId = res.body.data.id;

    const history = (await staff.get(`/api/products/${productId}/history`).expect(200)).body.data;
    expect(history[0]).toMatchObject({ action: 'product.create', actor: { name: 'Staf Produk' } });
    expect(history[0].ip).toBeUndefined();
    expect(history[0].userAgent).toBeUndefined();
  });

  it('8. rejects a duplicate SKU with 409 SKU_TAKEN', async () => {
    const staff = await loginAs('pstaff@test.local');
    const res = await staff.post('/api/products').send(product()).expect(409);
    expect(res.body.code).toBe('SKU_TAKEN');
  });

  it('9. lets STAFF save the full form with an unchanged price and a new name', async () => {
    const staff = await loginAs('pstaff@test.local');
    const res = await staff.patch(`/api/products/${productId}`).send(product({ name: 'Indomie Goreng Spesial' })).expect(200);
    expect(res.body.data.name).toBe('Indomie Goreng Spesial');
  });

  it('10. forbids STAFF from changing the price', async () => {
    const staff = await loginAs('pstaff@test.local');
    const res = await staff.patch(`/api/products/${productId}`).send({ price: 4000 }).expect(403);
    expect(res.body.code).toBe('ADMIN_ONLY_FIELDS');
  });

  it('11. requires a reason from ADMIN for a price change and records it', async () => {
    const admin = await loginAs('padmin@test.local');
    expect((await admin.patch(`/api/products/${productId}`).send({ price: 4000 }).expect(400)).body.code).toBe('REASON_REQUIRED');
    await admin.patch(`/api/products/${productId}`).send({ price: 4000, reason: 'Harga supplier naik' }).expect(200);
    const [latest] = (await admin.get(`/api/products/${productId}/history`).expect(200)).body.data;
    expect(latest).toMatchObject({ action: 'product.update', reason: 'Harga supplier naik', before: { price: 3500 }, after: { price: 4000 } });
  });

  it('12. requires price and stock when ADMIN changes the unit', async () => {
    const admin = await loginAs('padmin@test.local');
    const res = await admin.patch(`/api/products/${productId}`).send({ uom: 'BOX', reason: 'Dijual per dus' }).expect(400);
    expect(res.body.code).toBe('UOM_CHANGE_INCOMPLETE');
    await admin.patch(`/api/products/${productId}`).send({ uom: 'BOX', price: 140000, stock: 1, reason: 'Dijual per dus' }).expect(200);
  });

  it('13. never allows negative stock, in the API or the database', async () => {
    const admin = await loginAs('padmin@test.local');
    const res = await admin.patch(`/api/products/${productId}`).send({ stock: -1, reason: 'x' }).expect(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    await expect(prisma.$executeRaw`UPDATE products SET stock = -1 WHERE id = ${productId}`).rejects.toThrow();
  });

  it('14. archive and restore: ADMIN only; archived products are hidden from STAFF', async () => {
    const staff = await loginAs('pstaff@test.local');
    const admin = await loginAs('padmin@test.local');
    await staff.delete(`/api/products/${productId}`).expect(403);
    await admin.delete(`/api/products/${productId}`).expect(204);

    const visible = (await staff.get('/api/products').expect(200)).body.data as { id: number }[];
    expect(visible.some((p) => p.id === productId)).toBe(false);
    await staff.get(`/api/products/${productId}`).expect(404);
    await staff.get('/api/products?status=archived').expect(403);
    const archived = (await admin.get('/api/products?status=archived').expect(200)).body.data as { id: number }[];
    expect(archived.some((p) => p.id === productId)).toBe(true);

    const restored = (await admin.post(`/api/products/${productId}/restore`).expect(200)).body.data;
    expect(restored).toMatchObject({ archivedAt: null, isActive: false });
  });

  it('15. lists with search, category filter, sort and paging meta', async () => {
    const admin = await loginAs('padmin@test.local');
    await admin.post('/api/products').send(product({ sku: 'TST-0002', name: 'Chitato Sapi Panggang', price: 11500 })).expect(201);
    await admin.post('/api/products').send(product({ sku: 'TST-0003', name: 'Qtela Balado', price: 9000 })).expect(201);
    await admin.post('/api/products').send(product({ sku: 'TST-0004', name: 'Taro Net', price: 8500 })).expect(201);

    const bySku = (await admin.get('/api/products?search=tst-0003').expect(200)).body;
    expect(bySku.data.map((p: { sku: string }) => p.sku)).toEqual(['TST-0003']);
    const byName = (await admin.get('/api/products?search=chit').expect(200)).body;
    expect(byName.data[0].name).toBe('Chitato Sapi Panggang');

    const page = (await admin.get(`/api/products?categoryId=${categoryId}&sort=price&order=asc&pageSize=2`).expect(200)).body;
    expect(page.meta).toEqual({ page: 1, pageSize: 2, total: 4, totalPages: 2 });
    expect(page.data.map((p: { price: number }) => p.price)).toEqual([8500, 9000]);
        
    await admin.get('/api/products?sort=category&order=asc').expect(200);

    const active = (await admin.get('/api/products?status=active').expect(200)).body.data as { id: number }[];
    expect(active.some((p) => p.id === productId)).toBe(false); // restored product is still inactive
  });

  it('16. uploads: PNG accepted and served; fake 415; too big 413; logged out 401; unknown path 400', async () => {
    const staff = await loginAs('pstaff@test.local');
    const ok = await staff.post('/api/uploads/images').attach('file', PNG_1X1, { filename: 'tiny.png', contentType: 'image/png' }).expect(201);
    expect(ok.body.data.url).toMatch(/^\/uploads\/products\/[0-9a-f-]{36}\.png$/);
    const served = await http().get(ok.body.data.url).expect(200);
    expect(served.headers['content-type']).toBe('image/png');

    await staff.post('/api/uploads/images').attach('file', Buffer.from('hello'), { filename: 'fake.png', contentType: 'image/png' }).expect(415);
    await staff.post('/api/uploads/images').attach('file', Buffer.concat([PNG_1X1, Buffer.alloc(3 * 1024 * 1024)]), { filename: 'big.png', contentType: 'image/png' }).expect(413);
    await http().post('/api/uploads/images').attach('file', PNG_1X1, { filename: 'tiny.png', contentType: 'image/png' }).expect(401);

    await staff.patch(`/api/products/${productId}`).send({ image: ok.body.data.url }).expect(200);
    const missing = await staff.patch(`/api/products/${productId}`).send({ image: '/uploads/products/00000000-0000-4000-8000-999999999999.png' }).expect(400);
    expect(missing.body.code).toBe('IMAGE_NOT_FOUND');
  });
});