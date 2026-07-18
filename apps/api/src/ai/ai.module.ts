import { Module } from '@nestjs/common';
import { AiChatRepository } from './ai-chat.repository';
import { AiChatService } from './ai-chat.service';
import { AiClassifyService } from './ai-classify.service';
import { AiContextRepository } from './ai-context.repository';
import { AiContextService } from './ai-context.service';
import { AiForecastService } from './ai-forecast.service';
import { AiPlanningService } from './ai-planning.service';
import { AiSummaryRepository } from './ai-summary.repository';
import { AiSummaryService } from './ai-summary.service';
import { AiController } from './ai.controller';
import { LlmClient } from './llm-client';

@Module({
  controllers: [AiController],
  providers: [
    LlmClient,
    AiContextRepository,
    AiContextService,
    AiChatRepository,
    AiChatService,
    AiSummaryRepository,
    AiSummaryService,
    AiClassifyService,
    AiPlanningService,
    AiForecastService,
  ],
})
export class AiModule {}
