import { Module } from '@nestjs/common';
import { JournalController } from './journal.controller';
import { JournalRepository } from './journal.repository';
import { JournalService } from './journal.service';

@Module({
  controllers: [JournalController],
  providers: [JournalService, JournalRepository],
  exports: [JournalService],
})
export class JournalModule {}
