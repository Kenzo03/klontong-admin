import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '../generated/prisma/client';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export type AuthUser = { id: number; name: string; email: string; role: Role };
export type RequestMeta = { ip: string | null; userAgent: string | null };
export type Actor = AuthUser & RequestMeta;

const metaOf = (req: Request): RequestMeta => ({ ip: req.ip ?? null, userAgent: req.get('user-agent') ?? null });

/** Client IP and user agent; works on public routes too (register). */
export const ReqMeta = createParamDecorator((_: unknown, ctx: ExecutionContext) => metaOf(ctx.switchToHttp().getRequest<Request>()));

/** The logged-in user plus request meta, for services and the audit log. */
export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
  return { ...req.user, ...metaOf(req) };
});