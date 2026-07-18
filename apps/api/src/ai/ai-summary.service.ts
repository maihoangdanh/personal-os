import { Injectable } from '@nestjs/common';
import { AiSummary, AiSummaryType, Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { AiContextService } from './ai-context.service';
import { summarySystemPrompt } from './ai-prompts';
import { AiSummaryRepository } from './ai-summary.repository';
import { periodRange, toUtcDateOnly } from './ai-math';
import { GenerateSummaryDto, ListSummaryDto } from './dto/summary.dto';
import { LlmClient } from './llm-client';

function toSummaryDto(s: AiSummary) {
  return {
    id: s.id,
    userId: s.userId,
    type: s.type,
    periodStart: s.periodStart.toISOString().slice(0, 10),
    periodEnd: s.periodEnd.toISOString().slice(0, 10),
    content: s.content,
    metadata: s.metadata ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

/**
 * Feature 2 — Daily/Weekly/Monthly summary (STORED, upsert by
 * [userId,type,periodStart]). Step 1: code computes every metric from real data.
 * Step 2: the LLM only writes prose from those metrics — it never re-computes.
 * Metrics are persisted in `metadata` so the numbers behind the text are auditable.
 */
@Injectable()
export class AiSummaryService {
  constructor(
    private readonly repo: AiSummaryRepository,
    private readonly context: AiContextService,
    private readonly llm: LlmClient,
    private readonly audit: AuditService,
  ) {}

  async generate(userId: string, dto: GenerateSummaryDto) {
    const anchor = dto.date ? toUtcDateOnly(new Date(`${dto.date}T00:00:00.000Z`)) : toUtcDateOnly(new Date());
    const type = dto.type;

    const metrics = await this.context.buildPeriodMetrics(userId, type, anchor);
    const { periodStart, periodEnd } = periodRange(type, anchor);

    const result = await this.llm.complete([
      { role: 'system', content: summarySystemPrompt(metrics) },
    ]);

    const summary = await this.repo.upsert(
      userId,
      type,
      periodStart,
      periodEnd,
      result.content,
      { ...metrics, _model: result.model } as Prisma.InputJsonValue,
    );

    await this.audit.record({
      userId,
      action: 'ai.summary.generate',
      entityType: 'AiSummary',
      entityId: summary.id,
      metadata: { type, periodStart: summary.periodStart.toISOString().slice(0, 10) },
    });

    return toSummaryDto(summary);
  }

  async list(userId: string, dto: ListSummaryDto) {
    const { items, total } = await this.repo.list(userId, dto.type, dto.page, dto.pageSize);
    return new Paginated(items.map(toSummaryDto), pageMeta(dto.page, dto.pageSize, total));
  }
}
