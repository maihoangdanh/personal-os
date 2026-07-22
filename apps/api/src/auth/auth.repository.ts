import { Injectable } from '@nestjs/common';
import {
  prisma,
  Prisma,
  RefreshToken,
  User,
  UserRole,
} from '@personal-os/database';

export interface CreateUserWithWorkspaceInput {
  email: string;
  name: string;
  passwordHash: string;
  workspaceName: string;
  timezone?: string;
}

/** Only place that touches prisma for the auth domain. */
@Injectable()
export class AuthRepository {
  /** Active (non-deleted) user by email. */
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  /** Number of active users — used to enforce the single-account rule. */
  countActiveUsers(): Promise<number> {
    return prisma.user.count({ where: { deletedAt: null } });
  }

  update(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  // --- Refresh token store (revocable sessions) ---

  /** Persist the SHA-256 hash of a freshly issued refresh token. */
  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data: input });
  }

  /** Lookup by hash (unique index) — used on refresh/logout. */
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  /** Revoke a single token by id (used during rotation). No-op if already revoked. */
  async revokeRefreshTokenById(id: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoke by hash (used on logout). Silent if not found or already revoked. */
  async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Registers the first user as OWNER of a brand-new Workspace and provisions the
   * default ownership chain a Task needs (Vision -> Goal -> Project "Inbox"),
   * because Task.projectId is mandatory in the schema and no Project module ships
   * in this MVP slice. All in one transaction.
   */
  async createUserWithWorkspace(
    input: CreateUserWithWorkspaceInput,
  ): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: input.workspaceName },
      });

      const user = await tx.user.create({
        data: {
          workspaceId: workspace.id,
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          role: UserRole.OWNER,
          ...(input.timezone ? { timezone: input.timezone } : {}),
        },
      });

      const vision = await tx.vision.create({
        data: { userId: user.id, title: 'Personal' },
      });

      const goal = await tx.goal.create({
        data: { visionId: vision.id, title: 'General' },
      });

      await tx.project.create({
        data: { goalId: goal.id, title: 'Inbox' },
      });

      return user;
    });
  }
}
