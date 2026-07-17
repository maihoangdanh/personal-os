import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { AssetResponseDto } from './dto/asset-response.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetRepository } from './asset.repository';

@Injectable()
export class AssetService {
  constructor(
    private readonly repo: AssetRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateAssetDto): Promise<AssetResponseDto> {
    const asset = await this.repo.create({
      userId,
      name: dto.name,
      type: dto.type ?? null,
      value: dto.value,
    });
    await this.audit.record({
      userId,
      action: 'asset.create',
      entityType: 'Asset',
      entityId: asset.id,
    });
    return AssetResponseDto.from(asset);
  }

  async list(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
  ): Promise<Paginated<AssetResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(userId, page, pageSize, sortOrder);
    return new Paginated(
      items.map(AssetResponseDto.from),
      pageMeta(page, pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<AssetResponseDto> {
    return AssetResponseDto.from(await this.assertExists(id, userId));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    await this.assertExists(id, userId);
    const data: Prisma.AssetUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.value !== undefined) data.value = dto.value;

    const asset = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'asset.update',
      entityType: 'Asset',
      entityId: id,
    });
    return AssetResponseDto.from(asset);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'asset.delete',
      entityType: 'Asset',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const asset = await this.repo.findByIdScoped(id, userId);
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }
}
