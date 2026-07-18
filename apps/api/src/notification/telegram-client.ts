import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * The ONLY place that calls the Telegram Bot API. Sends a plain-text message to
 * the configured chat. Throws on an API/network error so the caller can decide
 * NOT to mark a reminder as sent (and retry on the next cron tick). Returns
 * false (without throwing) only when Telegram is not configured.
 */
@Injectable()
export class TelegramClient {
  private readonly logger = new Logger(TelegramClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return (
      !!this.config.get<string>('TELEGRAM_BOT_TOKEN') &&
      !!this.config.get<string>('TELEGRAM_CHAT_ID')
    );
  }

  async sendMessage(text: string): Promise<boolean> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_CHAT_ID');
    if (!token || !chatId) {
      this.logger.warn('Telegram not configured (missing token/chat id); skipping send');
      return false;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const body: unknown = await res.json().catch(() => null);
    const ok = res.ok && !!body && (body as { ok?: boolean }).ok === true;
    if (!ok) {
      const detail =
        (body as { description?: string })?.description ?? `HTTP ${res.status}`;
      throw new Error(`Telegram sendMessage failed: ${detail}`);
    }
    return true;
  }
}
