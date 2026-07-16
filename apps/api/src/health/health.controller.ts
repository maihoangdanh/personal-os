import { Controller, Get } from '@nestjs/common';
import { prisma } from '@personal-os/database';
import { Public } from '../common/auth/public.decorator';

@Controller('health')
export class HealthController {
  /** Liveness + DB connectivity probe for devops. Public (no auth). */
  @Public()
  @Get()
  async check() {
    let db = 'up';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
