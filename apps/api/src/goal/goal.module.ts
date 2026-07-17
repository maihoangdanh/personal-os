import { Module } from '@nestjs/common';
import { GoalController } from './goal.controller';
import { GoalRepository } from './goal.repository';
import { GoalService } from './goal.service';

@Module({
  controllers: [GoalController],
  providers: [GoalService, GoalRepository],
  exports: [GoalService],
})
export class GoalModule {}
