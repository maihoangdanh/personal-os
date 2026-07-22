import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRole } from '@personal-os/database';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';

type MockRepo = {
  findByEmail: jest.Mock;
  findById: jest.Mock;
  createUserWithWorkspace: jest.Mock;
  countActiveUsers: jest.Mock;
  update: jest.Mock;
  createRefreshToken: jest.Mock;
  findRefreshTokenByHash: jest.Mock;
  revokeRefreshTokenById: jest.Mock;
  revokeRefreshTokenByHash: jest.Mock;
};

const makeUser = (over: Partial<any> = {}) => ({
  id: 'user-1',
  workspaceId: 'ws-1',
  email: 'owner@test.com',
  name: 'Owner',
  passwordHash: 'hash',
  role: UserRole.OWNER,
  timezone: 'Asia/Ho_Chi_Minh',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('AuthService', () => {
  let service: AuthService;
  let repo: MockRepo;
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let config: { get: jest.Mock; getOrThrow: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(() => {
    repo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUserWithWorkspace: jest.fn(),
      countActiveUsers: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
      createRefreshToken: jest.fn().mockResolvedValue({}),
      findRefreshTokenByHash: jest.fn(),
      revokeRefreshTokenById: jest.fn().mockResolvedValue(undefined),
      revokeRefreshTokenByHash: jest.fn().mockResolvedValue(undefined),
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.token'),
      verifyAsync: jest.fn(),
    };
    config = {
      get: jest.fn((k: string, d?: unknown) => d),
      getOrThrow: jest.fn(() => 'secret'),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      repo as any,
      jwt as any,
      config as any,
      audit as any,
    );
  });

  describe('register', () => {
    it('creates a user + workspace and returns tokens', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.createUserWithWorkspace.mockResolvedValue(makeUser());

      const result = await service.register({
        email: 'owner@test.com',
        password: 'password123',
        name: 'Owner',
      });

      expect(repo.createUserWithWorkspace).toHaveBeenCalledTimes(1);
      const arg = repo.createUserWithWorkspace.mock.calls[0][0];
      expect(arg.passwordHash).not.toBe('password123'); // hashed
      expect(result.user.email).toBe('owner@test.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens.accessToken).toBe('signed.token');
      expect(result.tokens.refreshToken).toBe('signed.token');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.register' }),
      );
    });

    it('rejects a duplicate email with 409', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());
      await expect(
        service.register({
          email: 'owner@test.com',
          password: 'password123',
          name: 'Owner',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('is CLOSED (403) once an account already exists (single-account system)', async () => {
      repo.countActiveUsers.mockResolvedValue(1);
      await expect(
        service.register({
          email: 'second@test.com',
          password: 'password123',
          name: 'Second',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.createUserWithWorkspace).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('logs in with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      repo.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      const result = await service.login({
        email: 'owner@test.com',
        password: 'password123',
      });

      expect(result.tokens.accessToken).toBe('signed.token');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login' }),
      );
    });

    it('rejects a wrong password with 401', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      repo.findByEmail.mockResolvedValue(makeUser({ passwordHash }));
      await expect(
        service.login({ email: 'owner@test.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown email with 401', async () => {
      repo.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@test.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('token store on issue', () => {
    it('persists a SHA-256 (64 hex) refresh-token hash on login', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      repo.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      await service.login({ email: 'owner@test.com', password: 'password123' });

      expect(repo.createRefreshToken).toHaveBeenCalledTimes(1);
      const arg = repo.createRefreshToken.mock.calls[0][0];
      expect(arg.userId).toBe('user-1');
      expect(arg.tokenHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
      expect(arg.tokenHash).not.toBe('signed.token'); // hashed, not plaintext
      expect(arg.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('refresh (rotation)', () => {
    const validRecord = {
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hash',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    };

    it('rotates: revokes the old token and mints a new pair', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      repo.findRefreshTokenByHash.mockResolvedValue(validRecord);
      repo.findById.mockResolvedValue(makeUser());

      const res = await service.refresh('some.refresh.jwt');

      expect(repo.revokeRefreshTokenById).toHaveBeenCalledWith('rt-1');
      expect(repo.createRefreshToken).toHaveBeenCalledTimes(1); // new record
      expect(res.tokens.accessToken).toBe('signed.token');
    });

    it('rejects a missing cookie/token with 401', async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwt.verifyAsync).not.toHaveBeenCalled();
    });

    it('rejects when the token is not in the store (401)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      repo.findRefreshTokenByHash.mockResolvedValue(null);
      await expect(service.refresh('x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.revokeRefreshTokenById).not.toHaveBeenCalled();
    });

    it('rejects a revoked token (401)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      repo.findRefreshTokenByHash.mockResolvedValue({
        ...validRecord,
        revokedAt: new Date(),
      });
      await expect(service.refresh('x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an expired token (401)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      repo.findRefreshTokenByHash.mockResolvedValue({
        ...validRecord,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the token by hash and returns loggedOut', async () => {
      const res = await service.logout('some.refresh.jwt');
      expect(repo.revokeRefreshTokenByHash).toHaveBeenCalledTimes(1);
      expect(repo.revokeRefreshTokenByHash.mock.calls[0][0]).toMatch(
        /^[0-9a-f]{64}$/,
      );
      expect(res).toEqual({ loggedOut: true });
    });

    it('is a no-op when no cookie is present', async () => {
      const res = await service.logout(undefined);
      expect(repo.revokeRefreshTokenByHash).not.toHaveBeenCalled();
      expect(res).toEqual({ loggedOut: true });
    });
  });

  describe('updateProfile', () => {
    it('updates name/timezone and returns the profile (no passwordHash)', async () => {
      repo.findById.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue(makeUser({ name: 'New Name', timezone: 'UTC' }));

      const res = await service.updateProfile('user-1', {
        name: 'New Name',
        timezone: 'UTC',
      });

      expect(repo.update).toHaveBeenCalledWith('user-1', {
        name: 'New Name',
        timezone: 'UTC',
      });
      expect(res.name).toBe('New Name');
      expect(res).not.toHaveProperty('passwordHash');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.profile.update' }),
      );
    });
  });

  describe('changePassword', () => {
    it('changes the password when the current one is correct', async () => {
      const passwordHash = await bcrypt.hash('oldpass123', 4);
      repo.findById.mockResolvedValue(makeUser({ passwordHash }));
      repo.update.mockResolvedValue(makeUser());

      const res = await service.changePassword('user-1', {
        currentPassword: 'oldpass123',
        newPassword: 'newpass456',
      });

      expect(res).toEqual({ changed: true });
      const arg = repo.update.mock.calls[0][1];
      expect(arg.passwordHash).toBeDefined();
      expect(arg.passwordHash).not.toBe('newpass456'); // hashed
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.password.change' }),
      );
    });

    it('rejects a wrong current password with 422', async () => {
      const passwordHash = await bcrypt.hash('oldpass123', 4);
      repo.findById.mockResolvedValue(makeUser({ passwordHash }));
      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong',
          newPassword: 'newpass456',
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
