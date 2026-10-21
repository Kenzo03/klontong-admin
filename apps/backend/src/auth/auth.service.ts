import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_USER } from '../users/user.select';
import { toJson, writeAudit } from '../audit/audit';
import type { Actor, RequestMeta } from '../common/decorators';
import { hashPassword, verifyPassword } from './password';
import { ChangePasswordDto, LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  sign(userId: number) {
    return this.jwt.signAsync({ sub: userId });
  }

  async register(dto: RegisterDto, meta: RequestMeta) {
    const password = await hashPassword(dto.password);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { name: dto.name, email: dto.email, password }, select: PUBLIC_USER });
        await writeAudit(tx, { actorId: user.id, action: 'user.register', entityType: 'user', entityId: user.id, after: toJson(user), ...meta });
        return user;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const found = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { ...PUBLIC_USER, password: true } });
    if (!found || !(await verifyPassword(dto.password, found.password))) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Wrong email or password' });
    }
    if (found.status === 'PENDING') throw new ForbiddenException({ code: 'ACCOUNT_PENDING', message: 'Account is waiting for admin approval' });
    if (found.status === 'INACTIVE') throw new ForbiddenException({ code: 'ACCOUNT_INACTIVE', message: 'Account is deactivated' });
    if (found.status === 'REJECTED') throw new ForbiddenException({ code: 'ACCOUNT_REJECTED', message: 'Registration was rejected' });
    const { password: _password, ...user } = found;
    return { user, token: await this.sign(user.id) };
  }

  async changePassword(actor: Actor, dto: ChangePasswordDto) {
    const { password: current } = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.id }, select: { password: true } });
    if (!(await verifyPassword(dto.currentPassword, current))) {
      throw new BadRequestException({ code: 'WRONG_PASSWORD', message: 'Current password is wrong' });
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({ code: 'SAME_PASSWORD', message: 'New password must differ from the current one' });
    }
    const password = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: actor.id }, data: { password } });
      await writeAudit(tx, { actorId: actor.id, action: 'user.password_change', entityType: 'user', entityId: actor.id, ip: actor.ip, userAgent: actor.userAgent });
    });
    // Other sessions stay valid until they expire: a known gap, listed in Production Gaps.
  }
}