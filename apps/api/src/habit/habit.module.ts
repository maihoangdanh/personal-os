import { Module } from '@nestjs/common';
import { HabitController } from './habit.controller';
import { HabitRepository } from './habit.repository';
import { HabitService } from './habit.service';

@Module({
  controllers: [HabitController],
  providers: [HabitService, HabitRepository],
  exports: [HabitService],
})
export class HabitModule {}
