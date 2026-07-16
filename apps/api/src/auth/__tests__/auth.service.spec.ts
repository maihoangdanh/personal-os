import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@personal-os/database';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';

type MockRepo = {
  findByEmail: jest.Mock;
  findById: jest.Mock;
  createUserWithWorkspace: jest.Mock;
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
});
