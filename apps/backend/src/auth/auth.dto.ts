import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { trim, trimLower } from '../common/transforms';

export class RegisterDto {
  @Transform(trim) @IsString() @Length(1, 255) name: string;
  @Transform(trimLower) @IsEmail() @MaxLength(254) email: string;
  @IsString() @Length(8, 128) password: string;
}

export class LoginDto {
  @Transform(trimLower) @IsEmail() email: string;
  @IsString() @MaxLength(128) password: string;
}

export class ChangePasswordDto {
  @IsString() @MaxLength(128) currentPassword: string;
  @IsString() @Length(8, 128) newPassword: string;
}