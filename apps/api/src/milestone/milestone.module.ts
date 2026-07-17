import { Module } from '@nestjs/common';
import { MilestoneController } from './milestone.controller';
import { MilestoneRepository } from './milestone.repository';
import { MilestoneService } from './milestone.service';

@Module({
  controllers: [MilestoneController],
  providers: [MilestoneService, MilestoneRepository],
  exports: [MilestoneService],
})
export class MilestoneModule {}
