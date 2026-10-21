import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPassword } from '../src/auth/password';

describe('Auth and users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  /** A supertest agent keeps cookies between requests, like a browser. */
  async function loginAs(email: string, password: string) {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email, password }).expect(200);
    return agent;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.create({
      data: { name: 'Admin Test', email: 'admin@test.local', password: await hashPassword('Admin12345'), role: 'ADMIN', status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. registers as PENDING with an argon2id hash and refuses login until approved', async () => {
    const res = await http().post('/api/auth/register').send({ name: 'Budi', email: ' Budi@Test.local ', password: 'Rahasia123' }).expect(201);
    expect(res.body.data).toMatchObject({ email: 'budi@test.local', status: 'PENDING', role: 'STAFF' });
    expect(res.body.data.password).toBeUndefined();

    const row = await prisma.user.findUniqueOrThrow({ where: { email: 'budi@test.local' } });
    expect(row.password.startsWith('$argon2id$')).toBe(true);

    const login = await http().post('/api/auth/login').send({ email: 'budi@test.local', password: 'Rahasia123' }).expect(403);
    expect(login.body.code).toBe('ACCOUNT_PENDING');
  });

  it('2. lets an admin approve the user, who can then log in', async () => {
    const admin = await loginAs('admin@test.local', 'Admin12345');
    const budi = await prisma.user.findUniqueOrThrow({ where: { email: 'budi@test.local' } });
    await admin.patch(`/api/users/${budi.id}`).send({ status: 'ACTIVE', role: 'STAFF' }).expect(200);
    await loginAs('budi@test.local', 'Rahasia123');
    expect(await prisma.auditLog.count({ where: { entityId: budi.id, action: 'user.approve' } })).toBe(1);
  });

  it('2b. lets an admin reject a spam registration, hidden from the default list', async () => {
    await http().post('/api/auth/register').send({ name: 'Spam Bot', email: 'spam@test.local', password: 'Spammy12345' }).expect(201);
    const spam = await prisma.user.findUniqueOrThrow({ where: { email: 'spam@test.local' } });
    const admin = await loginAs('admin@test.local', 'Admin12345');
    await admin.patch(`/api/users/${spam.id}`).send({ status: 'REJECTED' }).expect(200);
    expect(await prisma.auditLog.count({ where: { entityId: spam.id, action: 'user.reject' } })).toBe(1);

    const login = await http().post('/api/auth/login').send({ email: 'spam@test.local', password: 'Spammy12345' }).expect(403);
    expect(login.body.code).toBe('ACCOUNT_REJECTED');
    const again = await http().post('/api/auth/register').send({ name: 'Spam Bot', email: 'spam@test.local', password: 'Spammy12345' }).expect(409);
    expect(again.body.code).toBe('EMAIL_TAKEN');

    const all = (await admin.get('/api/users').expect(200)).body.data as { email: string }[];
    expect(all.some((u) => u.email === 'spam@test.local')).toBe(false);
    const rejected = (await admin.get('/api/users?status=REJECTED').expect(200)).body.data as { email: string }[];
    expect(rejected.map((u) => u.email)).toContain('spam@test.local');

    const budi = await prisma.user.findUniqueOrThrow({ where: { email: 'budi@test.local' } });
    const invalid = await admin.patch(`/api/users/${budi.id}`).send({ status: 'REJECTED' }).expect(400); // only PENDING can be rejected
    expect(invalid.body.code).toBe('INVALID_STATUS_CHANGE');
  });

  it('3. stops an admin from changing their own role or status', async () => {
    const admin = await loginAs('admin@test.local', 'Admin12345');
    const me = (await admin.get('/api/auth/me').expect(200)).body.data;
    const res = await admin.patch(`/api/users/${me.id}`).send({ role: 'STAFF' }).expect(409);
    expect(res.body.code).toBe('SELF_CHANGE');
  });

  it('4. forbids STAFF from the users API', async () => {
    const staff = await loginAs('budi@test.local', 'Rahasia123');
    await staff.get('/api/users').expect(403);
  });

  it('5. ends an existing session as soon as the user is deactivated', async () => {
    const staff = await loginAs('budi@test.local', 'Rahasia123');
    await staff.get('/api/auth/me').expect(200);
    const admin = await loginAs('admin@test.local', 'Admin12345');
    const budi = await prisma.user.findUniqueOrThrow({ where: { email: 'budi@test.local' } });
    await admin.patch(`/api/users/${budi.id}`).send({ status: 'INACTIVE' }).expect(200);
    await staff.get('/api/auth/me').expect(401);
    await admin.patch(`/api/users/${budi.id}`).send({ status: 'ACTIVE' }).expect(200); // restore for test 6
  });

  it('6. changes the password: the old one stops working, the new one works', async () => {
    const budi = await loginAs('budi@test.local', 'Rahasia123');
    const wrong = await budi.patch('/api/auth/password').send({ currentPassword: 'salah12345', newPassword: 'BaruSekali1' }).expect(400);
    expect(wrong.body.code).toBe('WRONG_PASSWORD');
    await budi.patch('/api/auth/password').send({ currentPassword: 'Rahasia123', newPassword: 'BaruSekali1' }).expect(200);
    await http().post('/api/auth/login').send({ email: 'budi@test.local', password: 'Rahasia123' }).expect(401);
    await loginAs('budi@test.local', 'BaruSekali1');
  });

  it('rejects an expired token with SESSION_EXPIRED', async () => {
    const budi = await prisma.user.findUniqueOrThrow({ where: { email: 'budi@test.local' } });
    const token = await app.get(JwtService).signAsync({ sub: budi.id }, { expiresIn: 1 }); // expires after 1 second
    await new Promise((resolve) => setTimeout(resolve, 2100));
    const res = await http().get('/api/auth/me').set('Cookie', `access_token=${token}`).expect(401);
    expect(res.body.code).toBe('SESSION_EXPIRED');
  });

  it('rejects a tampered token with UNAUTHENTICATED', async () => {
    const res = await http().get('/api/auth/me').set('Cookie', 'access_token=not.a.real.token').expect(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('returns validation errors in the shared format', async () => {
    const res = await http().post('/api/auth/register').send({ name: '', email: 'not-an-email', password: 'short', extra: 1 }).expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
  });
});