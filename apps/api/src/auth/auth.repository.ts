import { Injectable } from '@nestjs/common';
import { prisma, User, UserRole } from '@personal-os/database';

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
