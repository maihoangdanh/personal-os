import { Module } from '@nestjs/common';
import { InvestmentController } from './investment.controller';
import { InvestmentRepository } from './investment.repository';
import { InvestmentService } from './investment.service';

@Module({
  controllers: [InvestmentController],
  providers: [InvestmentService, InvestmentRepository],
  exports: [InvestmentService],
})
export class InvestmentModule {}
