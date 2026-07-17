import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { InvestmentResponseDto } from './dto/investment-response.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentRepository } from './investment.repository';

@Injectable()
export class InvestmentService {
  constructor(
    private readonly repo: InvestmentRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    dto: CreateInvestmentDto,
  ): Promise<InvestmentResponseDto> {
    const investment = await this.repo.create({
      userId,
      name: dto.name,
      type: dto.type ?? null,
      amount: dto.amount,
      // Net Worth uses currentValue; default it to invested amount when omitted.
      currentValue: dto.currentValue ?? dto.amount,
    });
    await this.audit.record({
      userId,
      action: 'investment.create',
      entityType: 'Investment',
      entityId: investment.id,
    });
    return InvestmentResponseDto.from(investment);
  }

  async list(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
  ): Promise<Paginated<InvestmentResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(userId, page, pageSize, sortOrder);
    return new Paginated(
      items.map(InvestmentResponseDto.from),
      pageMeta(page, pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<InvestmentResponseDto> {
    return InvestmentResponseDto.from(await this.assertExists(id, userId));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateInvestmentDto,
  ): Promise<InvestmentResponseDto> {
    await this.assertExists(id, userId);
    const data: Prisma.InvestmentUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.currentValue !== undefined) data.currentValue = dto.currentValue;

    const investment = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'investment.update',
      entityType: 'Investment',
      entityId: id,
    });
    return InvestmentResponseDto.from(investment);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'investment.delete',
      entityType: 'Investment',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const investment = await this.repo.findByIdScoped(id, userId);
    if (!investment) {
      throw new NotFoundException('Investment not found');
    }
    return investment;
  }
}
