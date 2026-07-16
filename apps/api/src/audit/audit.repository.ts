import { Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@personal-os/database';

/** Only place that touches prisma.activityLog. */
@Injectable()
export class AuditRepository {
  create(data: Prisma.ActivityLogUncheckedCreateInput) {
    return prisma.activityLog.create({ data });
  }
}
