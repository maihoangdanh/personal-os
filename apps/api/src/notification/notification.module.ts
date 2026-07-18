import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationRepository } from './notification.repository';
import { NotificationScheduler } from './notification.scheduler';
import { NotificationService } from './notification.service';
import { TelegramClient } from './telegram-client';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationScheduler,
    TelegramClient,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
