import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@personal-os/database';
import * as bcrypt from 'bcryptjs';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../common/auth/auth-user';
import { AuditService } from '../audit/audit.service';
import { AuthRepository } from './auth.repository';
import { AuthResultDto, TokensDto, UserProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResultDto> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.repo.createUserWithWorkspace({
      email: dto.email,
      name: dto.name,
      passwordHash,
      workspaceName: dto.workspaceName?.trim() || `${dto.name}'s Workspace`,
      timezone: dto.timezone,
    });

    await this.audit.record({
      userId: user.id,
      action: 'auth.register',
      entityType: 'User',
      entityId: user.id,
    });

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResultDto> {
    const user = await this.repo.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.audit.record({
      userId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
    });

    return this.buildAuthResult(user);
  }

  /** Stateless refresh: verify the refresh JWT and mint a fresh token pair. */
  async refresh(refreshToken: string): Promise<AuthResultDto> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.repo.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.buildAuthResult(user);
  }

  async me(userId: string): Promise<UserProfileDto> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return UserProfileDto.from(user);
  }

  private async buildAuthResult(user: User): Promise<AuthResultDto> {
    const tokens = await this.signTokens(user);
    return { user: UserProfileDto.from(user), tokens };
  }

  private async signTokens(user: User): Promise<TokensDto> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    };
    const refreshPayload: RefreshTokenPayload = { sub: user.id };

    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL', '15m');
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessTtl,
    };
  }
}
