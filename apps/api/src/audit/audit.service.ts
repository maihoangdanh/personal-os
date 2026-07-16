import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditRepository } from './audit.repository';

export interface AuditEntry {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes the ActivityLog audit trail required by 02_Business_Rules
 * ("Mọi thao tác Create/Update/Delete phải ghi Activity Log"; login is sensitive).
 * Failures are logged but never break the primary business action.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repo: AuditRepository) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.create({
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        metadata: (entry.metadata as Prisma.InputJsonValue) ?? undefined,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write audit log (${entry.action}): ${(err as Error).message}`,
      );
    }
  }
}
