import { ServiceUnavailableException } from '@nestjs/common';
import { AiClassifyService } from '../ai-classify.service';
import { LlmClient, LlmResult } from '../llm-client';

function llmReturning(content: string): LlmClient {
  return {
    complete: jest.fn(
      async (): Promise<LlmResult> => ({
        content,
        model: 'claude-sonnet-5',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        latencyMs: 42,
      }),
    ),
  } as unknown as LlmClient;
}

describe('AiClassifyService', () => {
  it('derives priorityScore + quadrant from the model 1-5 outputs', async () => {
    const svc = new AiClassifyService(
      llmReturning('{"impact":5,"urgency":4,"reason":"Ảnh hưởng lớn và gấp"}'),
    );
    const out = await svc.classify({ title: 'Nộp báo cáo thuế' });
    expect(out.impact).toBe(5);
    expect(out.urgency).toBe(4);
    expect(out.priorityScore).toBe(20); // computed in code, not from the model
    expect(out.quadrant).toBe('DO_NOW');
    expect(out.reason).toBe('Ảnh hưởng lớn và gấp');
    expect(out.suggestion).toBe(true);
  });

  it('clamps out-of-range model values into 1-5', async () => {
    const svc = new AiClassifyService(llmReturning('{"impact":9,"urgency":0}'));
    const out = await svc.classify({ title: 'x' });
    expect(out.impact).toBe(5);
    expect(out.urgency).toBe(1);
  });

  it('parses a fenced json block', async () => {
    const svc = new AiClassifyService(
      llmReturning('```json\n{"impact":2,"urgency":2}\n```'),
    );
    const out = await svc.classify({ title: 'x' });
    expect(out.quadrant).toBe('ELIMINATE');
  });

  it('raises 503 when the model output is not parseable', async () => {
    const svc = new AiClassifyService(llmReturning('không phải json'));
    await expect(svc.classify({ title: 'x' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
