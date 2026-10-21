import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { Role, UserStatus } from '../generated/prisma/client';
import { PaginationQueryDto } from '../common/pagination';

export class ListUsersDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

export class UpdateUserDto {
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'REJECTED']) status?: 'ACTIVE' | 'INACTIVE' | 'REJECTED';
}