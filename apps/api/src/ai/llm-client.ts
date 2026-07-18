import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmOptions {
  maxTokens?: number;
  temperature?: number;
  /** Abort the request after this many ms (default 60s). */
  timeoutMs?: number;
}

export interface LlmUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface LlmResult {
  content: string;
  model: string;
  usage: LlmUsage;
  latencyMs: number;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * THE SINGLE outbound door to the external LLM router. Every AI feature calls
 * `complete()` here — no other file talks to the model provider.
 *
 * Router = OpenAI-compatible (`POST {AI_API_BASE}/chat/completions`,
 * `Authorization: Bearer {AI_API_KEY}`). Verified quirk: it streams SSE by
 * DEFAULT even without `stream`, so we ALWAYS send `stream: false` to get a
 * single JSON body. Config comes from apps/api/.env (AI_API_BASE / AI_API_KEY /
 * AI_MODEL) — never hard-coded per feature.
 */
@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * The router is a load balancer that may serve different backend models per
   * request — including reasoning models that spend the whole token budget on
   * hidden reasoning and return empty content (finish_reason "length"). So we
   * budget generously and retry once on empty content (the retry may land on a
   * non-reasoning backend).
   */
  async complete(messages: LlmMessage[], options: LlmOptions = {}): Promise<LlmResult> {
    try {
      return await this.callOnce(messages, options);
    } catch (err) {
      if (err instanceof EmptyCompletionError) {
        this.logger.warn('Empty completion — retrying once (router may re-route)');
        try {
          return await this.callOnce(messages, options);
        } catch (retryErr) {
          if (retryErr instanceof EmptyCompletionError) {
            throw new ServiceUnavailableException('AI service returned an empty response');
          }
          throw retryErr;
        }
      }
      throw err;
    }
  }

  private async callOnce(messages: LlmMessage[], options: LlmOptions): Promise<LlmResult> {
    const base = this.requireConfig('AI_API_BASE').replace(/\/$/, '');
    const apiKey = this.requireConfig('AI_API_KEY');
    const model = this.requireConfig('AI_MODEL');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
    const startedAt = Date.now();

    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          // Generous budget: reasoning backends consume tokens on hidden
          // reasoning before any content, so a small cap yields empty/truncated
          // output. Headroom lets the prose finish after the reasoning phase.
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.4,
          stream: false, // MUST be explicit — router streams SSE otherwise
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await safeText(res);
        this.logger.error(`LLM router ${res.status}: ${body.slice(0, 500)}`);
        throw new ServiceUnavailableException('AI service returned an error');
      }

      const json = (await res.json()) as ChatCompletionResponse;
      const content = json.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        const finish = json.choices?.[0]?.finish_reason;
        this.logger.error(
          `LLM router returned no content (finish_reason=${finish}, model=${json.model}): ${JSON.stringify(json.usage)}`,
        );
        throw new EmptyCompletionError();
      }

      return {
        content,
        model: json.model ?? model,
        usage: {
          promptTokens: json.usage?.prompt_tokens ?? null,
          completionTokens: json.usage?.completion_tokens ?? null,
          totalTokens: json.usage?.total_tokens ?? null,
        },
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      if (err instanceof EmptyCompletionError) throw err; // let complete() retry
      if (err instanceof ServiceUnavailableException) throw err;
      const reason = (err as Error).name === 'AbortError' ? 'timed out' : (err as Error).message;
      this.logger.error(`LLM router request failed: ${reason}`);
      throw new ServiceUnavailableException('AI service is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  private requireConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new ServiceUnavailableException(`AI is not configured (${key} missing)`);
    }
    return value;
  }
}

/** Internal signal: a 200 response whose content was empty (reasoning backend
 *  ate the token budget). Triggers one retry in complete(). */
class EmptyCompletionError extends Error {}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}
