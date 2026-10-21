import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 10;
}

export const pageArgs = (q: PaginationQueryDto) => ({ skip: (q.page - 1) * q.pageSize, take: q.pageSize });

export const pageMeta = (q: PaginationQueryDto, total: number) => ({
  page: q.page,
  pageSize: q.pageSize,
  total,
  totalPages: Math.ceil(total / q.pageSize),
});