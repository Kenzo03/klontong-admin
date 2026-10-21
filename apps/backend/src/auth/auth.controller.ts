import { Body, Controller, Get, HttpCode, Patch, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { CurrentActor, Public, ReqMeta } from '../common/decorators';
import type { Actor, RequestMeta } from '../common/decorators';
import { AUTH_COOKIE } from './auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: this.config.get('COOKIE_SECURE') === 'true',
      maxAge: Number(this.config.get('JWT_TTL_SECONDS') ?? 28800) * 1000,
    });
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @ReqMeta() meta: RequestMeta) {
    return { data: await this.auth.register(dto, meta) };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.auth.login(dto);
    this.setCookie(res, token);
    return { data: user };
  }

  @Public() // always allowed, so an expired session can still clear its cookie
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
  }

  @Get('me')
  me(@CurrentActor() actor: Actor) {
    return { data: { id: actor.id, name: actor.name, email: actor.email, role: actor.role } };
  }

  @Patch('password')
  async changePassword(@CurrentActor() actor: Actor, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(actor, dto);
    return { data: { changed: true } };
  }
}