import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { CreateVisionDto } from './dto/create-vision.dto';
import { UpdateVisionDto } from './dto/update-vision.dto';
import { VisionResponseDto } from './dto/vision-response.dto';
import { VisionRepository } from './vision.repository';

@Injectable()
export class VisionService {
  constructor(
    private readonly repo: VisionRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateVisionDto): Promise<VisionResponseDto> {
    const vision = await this.repo.create({
      userId,
      title: dto.title,
      targetYear: dto.targetYear ?? null,
    });
    await this.audit.record({
      userId,
      action: 'vision.create',
      entityType: 'Vision',
      entityId: vision.id,
    });
    return VisionResponseDto.from(vision);
  }

  async list(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
  ): Promise<Paginated<VisionResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(
      userId,
      page,
      pageSize,
      sortOrder,
    );
    return new Paginated(
      items.map(VisionResponseDto.from),
      pageMeta(page, pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<VisionResponseDto> {
    return VisionResponseDto.from(await this.assertExists(id, userId));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateVisionDto,
  ): Promise<VisionResponseDto> {
    await this.assertExists(id, userId);
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.targetYear !== undefined) data.targetYear = dto.targetYear;

    const vision = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'vision.update',
      entityType: 'Vision',
      entityId: id,
    });
    return VisionResponseDto.from(vision);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    const activeGoals = await this.repo.countActiveGoals(id);
    if (activeGoals > 0) {
      throw new UnprocessableEntityException(
        'Cannot delete a vision that still has goals',
      );
    }
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'vision.delete',
      entityType: 'Vision',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const vision = await this.repo.findByIdScoped(id, userId);
    if (!vision) {
      throw new NotFoundException('Vision not found');
    }
    return vision;
  }
}
