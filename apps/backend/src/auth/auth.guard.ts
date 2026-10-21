import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, IS_PUBLIC } from '../common/decorators';

export const AUTH_COOKIE = 'access_token';
const unauthenticated = () => new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Please log in' });

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token: string | undefined = req.cookies?.[AUTH_COOKIE];
    if (!token) throw unauthenticated();

    let payload: { sub: number };
    try {
      // verifyAsync checks the signature AND the `exp` claim (set from JWT_TTL_SECONDS at login).
      payload = await this.jwt.verifyAsync(token);
    } catch (e) {
      if (e instanceof Error && e.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Session expired, please log in again' });
      }
      throw unauthenticated(); // bad signature, malformed token
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') throw unauthenticated();

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return true;
  }
}