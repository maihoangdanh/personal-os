import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  classifySystemPrompt,
  classifyUserPrompt,
} from './ai-prompts';
import {
  clampInt,
  eisenhowerQuadrant,
  extractJsonObject,
  priorityScore,
} from './ai-math';
import { ClassifyTaskDto } from './dto/classify.dto';
import { LlmClient } from './llm-client';

/**
 * Feature 3 — Eisenhower auto-classification (RUNTIME, not stored). The model
 * makes the subjective impact/urgency judgment (1-5) from the task text; the
 * derived priorityScore and quadrant are computed in code. This is only a
 * SUGGESTION — the user still overrides on save (doc 07 safety §12).
 */
@Injectable()
export class AiClassifyService {
  private readonly logger = new Logger(AiClassifyService.name);

  constructor(private readonly llm: LlmClient) {}

  async classify(dto: ClassifyTaskDto) {
    const result = await this.llm.complete(
      [
        { role: 'system', content: classifySystemPrompt() },
        { role: 'user', content: classifyUserPrompt(dto.title, dto.description) },
      ],
      { maxTokens: 2000, temperature: 0.2 },
    );

    let parsed: { impact?: unknown; urgency?: unknown; reason?: unknown };
    try {
      parsed = extractJsonObject(result.content);
    } catch (err) {
      this.logger.error(`Classify parse failed: ${(err as Error).message}; raw=${result.content.slice(0, 200)}`);
      throw new ServiceUnavailableException('AI returned an unexpected classification format');
    }

    const impact = clampInt(parsed.impact, 1, 5);
    const urgency = clampInt(parsed.urgency, 1, 5);

    return {
      impact,
      urgency,
      priorityScore: priorityScore(impact, urgency),
      quadrant: eisenhowerQuadrant(impact, urgency),
      reason: typeof parsed.reason === 'string' ? parsed.reason : null,
      suggestion: true as const,
    };
  }
}
