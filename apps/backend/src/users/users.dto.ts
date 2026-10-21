import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Role, UserStatus } from '../generated/prisma/client';

export class ListUsersDto {
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}

export class UpdateUserDto {
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'REJECTED']) status?: 'ACTIVE' | 'INACTIVE' | 'REJECTED';
}