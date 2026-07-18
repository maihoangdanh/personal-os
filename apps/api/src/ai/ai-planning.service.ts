import { Injectable } from '@nestjs/common';
import { AiContextService } from './ai-context.service';
import { planningSystemPrompt } from './ai-prompts';
import { toUtcDateOnly } from './ai-math';
import { PlanScheduleDto } from './dto/planning.dto';
import { LlmClient } from './llm-client';

/**
 * Feature 4 — Smart schedule suggestion (RUNTIME, not stored). Code queries the
 * user's open deadline tasks + calendar and computes the free time slots; the
 * model only arranges the given tasks into the given slots and explains. It never
 * invents availability, and never writes to the calendar (doc 07 §5/§12 — user
 * confirms). The deterministic tasks/busy/freeSlots are returned so the caller
 * can verify the model's plan against real availability.
 */
@Injectable()
export class AiPlanningService {
  constructor(
    private readonly context: AiContextService,
    private readonly llm: LlmClient,
  ) {}

  async plan(userId: string, dto: PlanScheduleDto) {
    const fromDay = dto.date
      ? toUtcDateOnly(new Date(`${dto.date}T00:00:00.000Z`))
      : toUtcDateOnly(new Date());

    const data = await this.context.buildPlanningData(userId, fromDay, dto.horizonDays);

    // No tasks to schedule — skip the model, be honest instead of inventing a plan.
    if (data.tasks.length === 0) {
      return { ...data, plan: 'Bạn chưa có task nào có deadline để sắp lịch.' };
    }

    const result = await this.llm.complete([
      { role: 'system', content: planningSystemPrompt(data) },
    ]);

    return { ...data, plan: result.content, model: result.model };
  }
}
