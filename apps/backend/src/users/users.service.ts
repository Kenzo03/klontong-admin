import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toJson, writeAudit } from '../audit/audit';
import type { Actor } from '../common/decorators';
import { PUBLIC_USER } from './user.select';
import { ListUsersDto, UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListUsersDto) {
    // No filter = everyone except rejected registrations (they have their own "Ditolak" filter).
    const where: Prisma.UserWhereInput = q.status ? { status: q.status } : { status: { not: 'REJECTED' } };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: PUBLIC_USER, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) } };
  }

  update(id: number, dto: UpdateUserDto, actor: Actor) {
    if (id === actor.id) {
      throw new ConflictException({ code: 'SELF_CHANGE', message: 'You cannot change your own role or status' });
    }
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id }, select: PUBLIC_USER });
      if (dto.status === 'REJECTED' && before.status !== 'PENDING') {
        throw new BadRequestException({ code: 'INVALID_STATUS_CHANGE', message: 'Only pending registrations can be rejected' });
      }
      const after = await tx.user.update({ where: { id }, data: { role: dto.role, status: dto.status }, select: PUBLIC_USER });
      const action =
        after.status === 'REJECTED' && before.status === 'PENDING' ? 'user.reject'
        : (before.status === 'PENDING' || before.status === 'REJECTED') && after.status === 'ACTIVE' ? 'user.approve' // a rejection can be reconsidered
        : 'user.update';
      await writeAudit(tx, { actorId: actor.id, action, entityType: 'user', entityId: id, before: toJson(before), after: toJson(after), ip: actor.ip, userAgent: actor.userAgent });
      return after;
    });
  }
}