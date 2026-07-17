import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { TransferDto } from './dto/transfer.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionRepository } from './transaction.repository';

@Injectable()
export class TransactionService {
  constructor(
    private readonly repo: TransactionRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    this.assertPositive(dto.amount);
    await this.assertWalletOwned(dto.walletId, userId);

    const txn = await this.repo.create({
      walletId: dto.walletId,
      type: dto.type,
      amount: dto.amount,
      category: dto.category ?? null,
      description: dto.description ?? null,
      transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
    });
    await this.audit.record({
      userId,
      action: 'transaction.create',
      entityType: 'Transaction',
      entityId: txn.id,
      metadata: { type: txn.type, amount: txn.amount.toNumber() },
    });
    return TransactionResponseDto.from(txn);
  }

  async transfer(userId: string, dto: TransferDto) {
    this.assertPositive(dto.amount);
    if (dto.fromWalletId === dto.toWalletId) {
      throw new UnprocessableEntityException(
        'Source and destination wallets must differ',
      );
    }
    await this.assertWalletOwned(dto.fromWalletId, userId);
    await this.assertWalletOwned(dto.toWalletId, userId);

    const { from, to } = await this.repo.transfer({
      fromWalletId: dto.fromWalletId,
      toWalletId: dto.toWalletId,
      amount: dto.amount,
      category: dto.category ?? null,
      description: dto.description ?? null,
      transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
    });
    await this.audit.record({
      userId,
      action: 'transaction.transfer',
      entityType: 'Transaction',
      entityId: from.transferGroupId ?? from.id,
      metadata: {
        fromWalletId: dto.fromWalletId,
        toWalletId: dto.toWalletId,
        amount: dto.amount,
      },
    });
    return {
      transferGroupId: from.transferGroupId,
      from: TransactionResponseDto.from(from),
      to: TransactionResponseDto.from(to),
    };
  }

  async list(
    userId: string,
    query: QueryTransactionDto,
  ): Promise<Paginated<TransactionResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(userId, {
      page: query.page,
      pageSize: query.pageSize,
      sortOrder: query.sortOrder,
      walletId: query.walletId,
      type: query.type,
      category: query.category,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    return new Paginated(
      items.map(TransactionResponseDto.from),
      pageMeta(query.page, query.pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<TransactionResponseDto> {
    return TransactionResponseDto.from(await this.assertExists(id, userId));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const existing = await this.assertExists(id, userId);
    if (existing.transferGroupId) {
      throw new UnprocessableEntityException(
        'Transfer legs cannot be edited; delete and recreate the transfer',
      );
    }
    if (dto.amount !== undefined) this.assertPositive(dto.amount);
    if (dto.walletId) await this.assertWalletOwned(dto.walletId, userId);

    const data: Prisma.TransactionUncheckedUpdateInput = {};
    if (dto.walletId !== undefined) data.walletId = dto.walletId;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.transactionDate !== undefined) {
      data.transactionDate = new Date(dto.transactionDate);
    }

    const txn = await this.repo.update(id, data, [existing.walletId]);
    await this.audit.record({
      userId,
      action: 'transaction.update',
      entityType: 'Transaction',
      entityId: id,
    });
    return TransactionResponseDto.from(txn);
  }

  async remove(userId: string, id: string) {
    const existing = await this.assertExists(id, userId);
    const { deletedIds } = await this.repo.softDelete(existing);
    await this.audit.record({
      userId,
      action: 'transaction.delete',
      entityType: 'Transaction',
      entityId: id,
      metadata: { deletedIds, transfer: existing.transferGroupId !== null },
    });
    return { deletedIds, deleted: true as const };
  }

  private assertPositive(amount: number): void {
    if (amount <= 0) {
      throw new UnprocessableEntityException('amount must be greater than 0');
    }
  }

  private async assertWalletOwned(walletId: string, userId: string): Promise<void> {
    if (!(await this.repo.findOwnedWalletId(walletId, userId))) {
      throw new NotFoundException('Wallet not found');
    }
  }

  private async assertExists(id: string, userId: string) {
    const txn = await this.repo.findByIdScoped(id, userId);
    if (!txn) {
      throw new NotFoundException('Transaction not found');
    }
    return txn;
  }
}
