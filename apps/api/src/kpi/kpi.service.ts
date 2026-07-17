import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { CreateKpiDto } from './dto/create-kpi.dto';
import { KpiResponseDto } from './dto/kpi-response.dto';
import { QueryKpiDto } from './dto/query-kpi.dto';
import { UpdateKpiDto } from './dto/update-kpi.dto';
import { KpiRepository } from './kpi.repository';

@Injectable()
export class KpiService {
  constructor(
    private readonly repo: KpiRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateKpiDto): Promise<KpiResponseDto> {
    if (!(await this.repo.isGoalOwned(dto.goalId, userId))) {
      throw new NotFoundException('Goal not found');
    }
    const kpi = await this.repo.create({
      goalId: dto.goalId,
      name: dto.name,
      unit: dto.unit ?? null,
      targetValue: dto.targetValue ?? null,
      currentValue: dto.currentValue ?? 0,
    });
    await this.audit.record({
      userId,
      action: 'kpi.create',
      entityType: 'KPI',
      entityId: kpi.id,
    });
    return KpiResponseDto.from(kpi);
  }

  async list(
    userId: string,
    query: QueryKpiDto,
  ): Promise<Paginated<KpiResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(
      userId,
      query.page,
      query.pageSize,
      query.sortOrder,
      query.goalId,
    );
    return new Paginated(
      items.map(KpiResponseDto.from),
      pageMeta(query.page, query.pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<KpiResponseDto> {
    return KpiResponseDto.from(await this.assertExists(id, userId));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateKpiDto,
  ): Promise<KpiResponseDto> {
    await this.assertExists(id, userId);
    const data: Prisma.KPIUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.targetValue !== undefined) data.targetValue = dto.targetValue;
    if (dto.currentValue !== undefined) data.currentValue = dto.currentValue;

    const kpi = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'kpi.update',
      entityType: 'KPI',
      entityId: id,
    });
    return KpiResponseDto.from(kpi);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'kpi.delete',
      entityType: 'KPI',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const kpi = await this.repo.findByIdScoped(id, userId);
    if (!kpi) {
      throw new NotFoundException('KPI not found');
    }
    return kpi;
  }
}
