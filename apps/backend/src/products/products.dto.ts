import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { Uom } from '../generated/prisma/client';
import { PaginationQueryDto } from '../common/pagination';
import { trim, trimToNull, trimUpper } from '../common/transforms';

export const IMAGE_PATH = /^\/uploads\/products\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export class CreateProductDto {
  @Transform(trimUpper)
  @Matches(/^[A-Z0-9-]{3,50}$/, { message: 'sku must be 3-50 uppercase letters, digits or hyphens' })
  sku: string;

  @Transform(trim) @IsString() @Length(1, 255) name: string;
  @IsOptional() @Transform(trimToNull) @IsString() @MaxLength(2000) description?: string | null;
  @Type(() => Number) @IsInt() @Min(1) categoryId: number;
  @IsOptional() @IsEnum(Uom) uom?: Uom;
  @IsInt() @Min(0) @Max(1_000_000_000) price: number;
  @IsInt() @Min(0) @Max(1_000_000) stock: number;
  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0.0001) @Max(100) weight: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(500) width: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(500) length: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(500) height: number;
  @IsOptional() @Matches(IMAGE_PATH, { message: 'image must be a path returned by POST /api/uploads/images' }) image?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Every field optional (same rules), plus the reason that goes into the history. */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) reason?: string;
}

export const PRODUCT_SORTS = ['updatedAt', 'name', 'category', 'price', 'stock'] as const;

export class ListProductsDto extends PaginationQueryDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) categoryId?: number;
  @IsOptional() @IsIn(['active', 'inactive', 'archived']) status?: 'active' | 'inactive' | 'archived';
  @IsOptional() @IsIn(PRODUCT_SORTS) sort: (typeof PRODUCT_SORTS)[number] = 'updatedAt';
  @IsOptional() @IsIn(['asc', 'desc']) order: 'asc' | 'desc' = 'desc';
}