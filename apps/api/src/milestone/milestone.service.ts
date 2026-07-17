import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
import { QueryMilestoneDto } from './dto/query-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestoneRepository } from './milestone.repository';

@Injectable()
export class MilestoneService {
  constructor(
    private readonly repo: MilestoneRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    dto: CreateMilestoneDto,
  ): Promise<MilestoneResponseDto> {
    if (!(await this.repo.isProjectOwned(dto.projectId, userId))) {
      throw new NotFoundException('Project not found');
    }
    const milestone = await this.repo.create({
      projectId: dto.projectId,
      title: dto.title,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });
    await this.audit.record({
      userId,
      action: 'milestone.create',
      entityType: 'Milestone',
      entityId: milestone.id,
    });
    return MilestoneResponseDto.from(milestone);
  }

  async list(
    userId: string,
    query: QueryMilestoneDto,
  ): Promise<Paginated<MilestoneResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(
      userId,
      query.page,
      query.pageSize,
      query.sortOrder,
      query.projectId,
    );
    return new Paginated(
      items.map(MilestoneResponseDto.from),
      pageMeta(query.page, query.pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<MilestoneResponseDto> {
    return MilestoneResponseDto.from(await this.assertExists(id, userId));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateMilestoneDto,
  ): Promise<MilestoneResponseDto> {
    await this.assertExists(id, userId);
    const data: Prisma.MilestoneUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    const milestone = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'milestone.update',
      entityType: 'Milestone',
      entityId: id,
    });
    return MilestoneResponseDto.from(milestone);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    if ((await this.repo.countActiveTasks(id)) > 0) {
      throw new UnprocessableEntityException(
        'Cannot delete a milestone that still has tasks assigned',
      );
    }
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'milestone.delete',
      entityType: 'Milestone',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const milestone = await this.repo.findByIdScoped(id, userId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }
    return milestone;
  }
}
