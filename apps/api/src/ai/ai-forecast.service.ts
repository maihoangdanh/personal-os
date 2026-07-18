import { Injectable } from '@nestjs/common';
import { AiContextService } from './ai-context.service';
import { forecastSystemPrompt } from './ai-prompts';
import { LlmClient } from './llm-client';

/**
 * Feature 5 — KPI/finance forecast (RUNTIME, not stored). Every projection
 * (progress %, implied daily rate, projected value, on-track flag, 3-month
 * finance trend) is computed in code from real historical data; the model only
 * narrates the trend and flags at-risk goals. The base numbers are returned
 * alongside the narrative so figures are verifiable against the DB.
 */
@Injectable()
export class AiForecastService {
  constructor(
    private readonly context: AiContextService,
    private readonly llm: LlmClient,
  ) {}

  async forecast(userId: string) {
    const data = await this.context.buildForecastData(userId);

    // Nothing to forecast — don't fabricate a projection.
    if (data.goals.length === 0 && data.kpis.length === 0) {
      const hasFinance = data.financeTrend.some((m) => m.income > 0 || m.expense > 0);
      if (!hasFinance) {
        return { ...data, narrative: 'Bạn chưa có Goal/KPI hay dữ liệu tài chính để dự báo.' };
      }
    }

    const result = await this.llm.complete([
      { role: 'system', content: forecastSystemPrompt(data) },
    ]);

    return { ...data, narrative: result.content, model: result.model };
  }
}
