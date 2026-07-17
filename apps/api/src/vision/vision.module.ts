import { Module } from '@nestjs/common';
import { VisionController } from './vision.controller';
import { VisionRepository } from './vision.repository';
import { VisionService } from './vision.service';

@Module({
  controllers: [VisionController],
  providers: [VisionService, VisionRepository],
  exports: [VisionService],
})
export class VisionModule {}
