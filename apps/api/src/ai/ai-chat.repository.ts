import { Injectable } from '@nestjs/common';
import {
  AiConversation,
  AiMessage,
  AiMessageRole,
  Prisma,
  prisma,
} from '@personal-os/database';

/** Only place the AI chat domain touches prisma. Always filters deletedAt: null. */
@Injectable()
export class AiChatRepository {
  createConversation(userId: string, title: string | null): Promise<AiConversation> {
    return prisma.aiConversation.create({ data: { userId, title } });
  }

  findConversationScoped(id: string, userId: string): Promise<AiConversation | null> {
    return prisma.aiConversation.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async listConversations(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: AiConversation[]; total: number }> {
    const where: Prisma.AiConversationWhereInput = { userId, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.aiConversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.aiConversation.count({ where }),
    ]);
    return { items, total };
  }

  /** Messages of a conversation, oldest first (chronological chat order). */
  findMessages(conversationId: string): Promise<AiMessage[]> {
    return prisma.aiMessage.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  createMessage(
    conversationId: string,
    role: AiMessageRole,
    content: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<AiMessage> {
    return prisma.aiMessage.create({
      data: { conversationId, role, content, metadata },
    });
  }

  /** Bump updatedAt so the conversation floats to the top of the list. */
  touchConversation(id: string): Promise<AiConversation> {
    return prisma.aiConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  /** Soft-delete the conversation and all its messages in one transaction. */
  softDeleteConversation(id: string): Promise<void> {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.aiMessage.updateMany({
        where: { conversationId: id, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.aiConversation.update({ where: { id }, data: { deletedAt: now } });
    });
  }
}
