import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, ProjectStatus } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectRepository } from './project.repository';

@Injectable()
export class ProjectService {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    if (!(await this.repo.isGoalOwned(dto.goalId, userId))) {
      throw new NotFoundException('Goal not found');
    }
    const project = await this.repo.create({
      goalId: dto.goalId,
      title: dto.title,
      ...(dto.status ? { status: dto.status } : {}),
    });
    await this.audit.record({
      userId,
      action: 'project.create',
      entityType: 'Project',
      entityId: project.id,
    });
    return ProjectResponseDto.from(project);
  }

  async list(
    userId: string,
    query: QueryProjectDto,
  ): Promise<Paginated<ProjectResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(userId, {
      page: query.page,
      pageSize: query.pageSize,
      sortOrder: query.sortOrder,
      goalId: query.goalId,
      status: query.status,
    });
    return new Paginated(
      items.map(ProjectResponseDto.from),
      pageMeta(query.page, query.pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<ProjectResponseDto> {
    return ProjectResponseDto.from(await this.assertExists(id, userId));
  }

  async getProgress(userId: string, id: string) {
    await this.assertExists(id, userId);
    const { progress, doneTasks, totalTasks } = await this.repo.computeProgress(id);
    return { projectId: id, progress, doneTasks, totalTasks };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    await this.assertExists(id, userId);

    // Business Rule doc 02: cannot close (COMPLETED) a project while a task is DOING.
    if (dto.status === ProjectStatus.COMPLETED) {
      const doing = await this.repo.countDoingTasks(id);
      if (doing > 0) {
        throw new UnprocessableEntityException(
          'Cannot complete a project while it has tasks in DOING',
        );
      }
    }

    const data: Prisma.ProjectUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.status !== undefined) data.status = dto.status;

    const project = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'project.update',
      entityType: 'Project',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });
    return ProjectResponseDto.from(project);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    if ((await this.repo.countActiveTasks(id)) > 0) {
      throw new UnprocessableEntityException(
        'Cannot delete a project that still has tasks',
      );
    }
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'project.delete',
      entityType: 'Project',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const project = await this.repo.findByIdScoped(id, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}
