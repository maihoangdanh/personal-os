import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { GoalResponseDto, computeGoalProgress } from './dto/goal-response.dto';
import { QueryGoalDto } from './dto/query-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalRepository } from './goal.repository';

@Injectable()
export class GoalService {
  constructor(
    private readonly repo: GoalRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateGoalDto): Promise<GoalResponseDto> {
    if (!(await this.repo.isVisionOwned(dto.visionId, userId))) {
      throw new NotFoundException('Vision not found');
    }
    const goal = await this.repo.create({
      visionId: dto.visionId,
      title: dto.title,
      targetValue: dto.targetValue ?? null,
      currentValue: dto.currentValue ?? 0,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      ...(dto.status ? { status: dto.status } : {}),
    });
    await this.audit.record({
      userId,
      action: 'goal.create',
      entityType: 'Goal',
      entityId: goal.id,
    });
    return GoalResponseDto.from(goal);
  }

  async list(
    userId: string,
    query: QueryGoalDto,
  ): Promise<Paginated<GoalResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(userId, {
      page: query.page,
      pageSize: query.pageSize,
      sortOrder: query.sortOrder,
      visionId: query.visionId,
      status: query.status,
    });
    // Only non-KPI goals (targetValue === null) fall back to project average.
    const nonKpiIds = items
      .filter((g) => g.targetValue === null)
      .map((g) => g.id);
    const avgMap = nonKpiIds.length
      ? await this.repo.getProjectAvgProgressByGoalIds(nonKpiIds)
      : new Map<string, number>();
    return new Paginated(
      items.map((g) =>
        GoalResponseDto.from(
          g,
          g.targetValue === null ? avgMap.get(g.id) : undefined,
        ),
      ),
      pageMeta(query.page, query.pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<GoalResponseDto> {
    const goal = await this.assertExists(id, userId);
    const avg = await this.projectAvgForNonKpiGoal(goal.id, goal.targetValue);
    return GoalResponseDto.from(goal, avg);
  }

  async getProgress(userId: string, id: string) {
    const goal = await this.assertExists(id, userId);
    const avg = await this.projectAvgForNonKpiGoal(goal.id, goal.targetValue);
    return {
      goalId: goal.id,
      currentValue: goal.currentValue.toNumber(),
      targetValue: goal.targetValue ? goal.targetValue.toNumber() : null,
      progress: computeGoalProgress(goal.currentValue, goal.targetValue, avg),
    };
  }

  /** Average child-project progress for a non-KPI goal; undefined for KPI goals. */
  private async projectAvgForNonKpiGoal(
    goalId: string,
    targetValue: Prisma.Decimal | null,
  ): Promise<number | undefined> {
    if (targetValue !== null) return undefined;
    const map = await this.repo.getProjectAvgProgressByGoalIds([goalId]);
    return map.get(goalId);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    await this.assertExists(id, userId);
    const data: Prisma.GoalUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.targetValue !== undefined) data.targetValue = dto.targetValue;
    if (dto.currentValue !== undefined) data.currentValue = dto.currentValue;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.deadline !== undefined) {
      data.deadline = dto.deadline ? new Date(dto.deadline) : null;
    }

    const goal = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'goal.update',
      entityType: 'Goal',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });
    return GoalResponseDto.from(goal);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    if ((await this.repo.countActiveProjects(id)) > 0) {
      throw new UnprocessableEntityException(
        'Cannot delete a goal that still has projects',
      );
    }
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'goal.delete',
      entityType: 'Goal',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const goal = await this.repo.findByIdScoped(id, userId);
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    return goal;
  }
}
