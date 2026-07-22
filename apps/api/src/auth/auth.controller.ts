import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Public } from '../common/auth/public.decorator';
import { AuthService } from './auth.service';
import { AuthResultDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  clearRefreshCookieOptions,
  refreshCookieOptions,
  REFRESH_COOKIE_NAME,
  ttlToMs,
} from './refresh-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /** MVP bootstrap endpoint (not in 04_API_Spec) — creates first user + workspace. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.issueAuth(await this.auth.register(dto), res);
  }

  // Brute-force guard: 5 attempts/min/IP, independent of the global 100/min limit.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.issueAuth(await this.auth.login(dto), res);
  }

  /** Reads the refresh token from the httpOnly cookie, rotates it, re-sets the cookie. */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    return this.issueAuth(await this.auth.refresh(token), res);
  }

  /** Revoke the current refresh token (from cookie) and clear it. */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const result = await this.auth.logout(token);
    res.clearCookie(
      REFRESH_COOKIE_NAME,
      clearRefreshCookieOptions({ secure: this.isSecure() }),
    );
    return result;
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(user.userId, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.userId, dto);
  }

  /**
   * Deliver the refresh token via httpOnly cookie and strip it from the JSON body.
   * The body keeps only the access token (frontend holds it in memory).
   */
  private issueAuth(result: AuthResultDto, res: Response): AuthResultDto {
    const { refreshToken, ...publicTokens } = result.tokens;
    if (refreshToken) {
      res.cookie(
        REFRESH_COOKIE_NAME,
        refreshToken,
        refreshCookieOptions({
          secure: this.isSecure(),
          maxAgeMs: ttlToMs(this.config.get<string>('JWT_REFRESH_TTL', '7d')),
        }),
      );
    }
    return { user: result.user, tokens: publicTokens };
  }

  /** Secure cookie only over HTTPS (production); dev runs on plain http. */
  private isSecure(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
