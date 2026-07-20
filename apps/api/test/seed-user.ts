import { prisma, UserRole } from '@personal-os/database';
import * as bcrypt from 'bcryptjs';

/**
 * Seed a test user directly (bypassing the now-closed /auth/register), mirroring
 * what register used to provision: Workspace + OWNER User + default Vision ->
 * Goal -> Project "Inbox" (so tasks default into Inbox). Log in afterwards to get
 * a token. Password hashed at low cost for speed.
 */
export async function seedUser(email: string, password = 'password123') {
  const passwordHash = await bcrypt.hash(password, 4);
  const workspace = await prisma.workspace.create({ data: { name: 'E2E WS' } });
  const user = await prisma.user.create({
    data: {
      workspaceId: workspace.id,
      email,
      name: 'E2E User',
      passwordHash,
      role: UserRole.OWNER,
    },
  });
  const vision = await prisma.vision.create({
    data: { userId: user.id, title: 'Personal' },
  });
  const goal = await prisma.goal.create({
    data: { visionId: vision.id, title: 'General' },
  });
  await prisma.project.create({ data: { goalId: goal.id, title: 'Inbox' } });
  return { user, workspace, password };
}
