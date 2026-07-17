import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { WalletRepository } from './wallet.repository';

@Injectable()
export class WalletService {
  constructor(
    private readonly repo: WalletRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateWalletDto): Promise<WalletResponseDto> {
    const wallet = await this.repo.create({
      userId,
      name: dto.name,
      type: dto.type,
    });
    await this.audit.record({
      userId,
      action: 'wallet.create',
      entityType: 'Wallet',
      entityId: wallet.id,
    });
    return WalletResponseDto.from(wallet);
  }

  async list(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
  ): Promise<Paginated<WalletResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(userId, page, pageSize, sortOrder);
    return new Paginated(
      items.map(WalletResponseDto.from),
      pageMeta(page, pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<WalletResponseDto> {
    return WalletResponseDto.from(await this.assertExists(id, userId));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateWalletDto,
  ): Promise<WalletResponseDto> {
    await this.assertExists(id, userId);
    const data: Prisma.WalletUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;

    const wallet = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'wallet.update',
      entityType: 'Wallet',
      entityId: id,
    });
    return WalletResponseDto.from(wallet);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    if ((await this.repo.countActiveTransactions(id)) > 0) {
      throw new UnprocessableEntityException(
        'Cannot delete a wallet that still has transactions',
      );
    }
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'wallet.delete',
      entityType: 'Wallet',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const wallet = await this.repo.findByIdScoped(id, userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }
}
