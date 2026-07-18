import { Injectable, NotFoundException } from '@nestjs/common';
import { AiConversation, AiMessage, AiMessageRole } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { AiChatRepository } from './ai-chat.repository';
import { AiContextService } from './ai-context.service';
import { chatSystemPrompt } from './ai-prompts';
import { CreateConversationDto, ListConversationsDto, SendMessageDto } from './dto/chat.dto';
import { LlmClient, LlmMessage } from './llm-client';

/** Keep the model prompt bounded: replay at most the last N turns. */
const HISTORY_LIMIT = 10;

function toConversationDto(c: AiConversation) {
  return {
    id: c.id,
    userId: c.userId,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toMessageDto(m: AiMessage) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    metadata: m.metadata ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

/**
 * Feature 1 — AI Chat over the user's own data (SYNC). Every reply is grounded
 * on a code-computed snapshot injected as the system prompt; the model answers
 * from that data only. Strictly scoped: a conversation and its messages are only
 * ever reachable by their owning user (404 otherwise) — no cross-user leakage.
 */
@Injectable()
export class AiChatService {
  constructor(
    private readonly repo: AiChatRepository,
    private readonly context: AiContextService,
    private readonly llm: LlmClient,
    private readonly audit: AuditService,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    const conversation = await this.repo.createConversation(userId, dto.title ?? null);
    await this.audit.record({
      userId,
      action: 'ai.conversation.create',
      entityType: 'AiConversation',
      entityId: conversation.id,
    });
    return toConversationDto(conversation);
  }

  async listConversations(userId: string, dto: ListConversationsDto) {
    const { items, total } = await this.repo.listConversations(userId, dto.page, dto.pageSize);
    return new Paginated(
      items.map(toConversationDto),
      pageMeta(dto.page, dto.pageSize, total),
    );
  }

  async getConversation(userId: string, id: string) {
    const conversation = await this.assertConversation(id, userId);
    const messages = await this.repo.findMessages(id);
    return {
      ...toConversationDto(conversation),
      messages: messages.map(toMessageDto),
    };
  }

  async deleteConversation(userId: string, id: string) {
    await this.assertConversation(id, userId);
    await this.repo.softDeleteConversation(id);
    await this.audit.record({
      userId,
      action: 'ai.conversation.delete',
      entityType: 'AiConversation',
      entityId: id,
    });
    return { id, deleted: true as const };
  }

  /** Persist the user turn, ground on real data, call the LLM, persist the reply. */
  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.assertConversation(conversationId, userId);

    const userMessage = await this.repo.createMessage(
      conversationId,
      AiMessageRole.USER,
      dto.content,
    );

    // Auto-title a fresh conversation from its first question.
    if (!conversation.title) {
      await this.repo.touchConversation(conversationId);
    }

    const snapshot = await this.context.buildChatSnapshot(userId);
    const history = await this.repo.findMessages(conversationId);

    const llmMessages: LlmMessage[] = [
      { role: 'system', content: chatSystemPrompt(snapshot) },
      ...history
        .filter((m) => m.role !== AiMessageRole.SYSTEM)
        .slice(-HISTORY_LIMIT)
        .map((m) => ({
          role: m.role === AiMessageRole.USER ? ('user' as const) : ('assistant' as const),
          content: m.content,
        })),
    ];

    const result = await this.llm.complete(llmMessages);

    const assistantMessage = await this.repo.createMessage(
      conversationId,
      AiMessageRole.ASSISTANT,
      result.content,
      {
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        latencyMs: result.latencyMs,
      },
    );
    await this.repo.touchConversation(conversationId);
    await this.audit.record({
      userId,
      action: 'ai.chat.message',
      entityType: 'AiConversation',
      entityId: conversationId,
      metadata: { messageId: assistantMessage.id, model: result.model },
    });

    return {
      userMessage: toMessageDto(userMessage),
      assistantMessage: toMessageDto(assistantMessage),
    };
  }

  private async assertConversation(id: string, userId: string) {
    const conversation = await this.repo.findConversationScoped(id, userId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }
}
