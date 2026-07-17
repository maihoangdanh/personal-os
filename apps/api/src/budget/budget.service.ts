import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { BudgetResponseDto } from './dto/budget-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetRepository } from './budget.repository';

/** Current calendar month [start, end] in UTC — the default budget window. */
function currentMonthRange(now = new Date()): { from: Date; to: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return {
    from: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
  };
}

@Injectable()
export class BudgetService {
  constructor(
    private readonly repo: BudgetRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateBudgetDto): Promise<BudgetResponseDto> {
    const budget = await this.repo.create({
      userId,
      name: dto.name,
      category: dto.category ?? null,
      amount: dto.amount,
      ...(dto.period ? { period: dto.period } : {}),
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
    await this.audit.record({
      userId,
      action: 'budget.create',
      entityType: 'Budget',
      entityId: budget.id,
    });
    return BudgetResponseDto.from(budget);
  }

  async list(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
    category?: string,
  ): Promise<Paginated<BudgetResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(
      userId,
      page,
      pageSize,
      sortOrder,
      category,
    );
    return new Paginated(
      items.map(BudgetResponseDto.from),
      pageMeta(page, pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<BudgetResponseDto> {
    return BudgetResponseDto.from(await this.assertExists(id, userId));
  }

  /** Budget-vs-actual. Window = budget dates if set, else the current month. */
  async status(userId: string, id: string) {
    const budget = await this.assertExists(id, userId);
    const fallback = currentMonthRange();
    const from = budget.startDate ?? fallback.from;
    const to = budget.endDate ?? fallback.to;

    const amount = budget.amount.toNumber();
    const actual = await this.repo.computeActual(userId, budget.category, from, to);
    const remaining = Math.round((amount - actual) * 100) / 100;
    return {
      budgetId: budget.id,
      category: budget.category,
      amount,
      actual,
      remaining,
      exceeded: actual > amount,
      period: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    await this.assertExists(id, userId);
    const data: Prisma.BudgetUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.period !== undefined) data.period = dto.period;
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }
    const budget = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'budget.update',
      entityType: 'Budget',
      entityId: id,
    });
    return BudgetResponseDto.from(budget);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'budget.delete',
      entityType: 'Budget',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const budget = await this.repo.findByIdScoped(id, userId);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }
}
