import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated } from '../common/http/paginated';
import { pageMeta } from '../common/http/pagination-query.dto';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JournalResponseDto } from './dto/journal-response.dto';
import { QueryJournalDto } from './dto/query-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { JournalRepository } from './journal.repository';

/** Parse YYYY-MM-DD to a UTC-midnight Date (matches @db.Date storage). */
function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

@Injectable()
export class JournalService {
  constructor(
    private readonly repo: JournalRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * One entry per (user, day). If an active entry already exists for the date -> 409
   * (edit it via PATCH). If a soft-deleted entry exists for the date -> revive it
   * (clear deletedAt + overwrite content/mood), like the HabitLog pattern.
   */
  async create(userId: string, dto: CreateJournalDto): Promise<JournalResponseDto> {
    const date = parseDate(dto.date);
    const mood = dto.mood ?? null;
    const existing = await this.repo.findByDateAny(userId, date);

    let journal;
    let action = 'journal.create';
    if (existing) {
      if (existing.deletedAt === null) {
        throw new ConflictException('A journal entry already exists for this date');
      }
      journal = await this.repo.revive(existing.id, dto.content, mood);
      action = 'journal.revive';
    } else {
      journal = await this.repo.create({ userId, date, content: dto.content, mood });
    }

    await this.audit.record({
      userId,
      action,
      entityType: 'Journal',
      entityId: journal.id,
    });
    return JournalResponseDto.from(journal);
  }

  async list(
    userId: string,
    query: QueryJournalDto,
  ): Promise<Paginated<JournalResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(
      userId,
      query.page,
      query.pageSize,
      query.sortOrder,
      query.dateFrom ? parseDate(query.dateFrom) : undefined,
      query.dateTo ? parseDate(query.dateTo) : undefined,
    );
    return new Paginated(
      items.map(JournalResponseDto.from),
      pageMeta(query.page, query.pageSize, total),
    );
  }

  async get(userId: string, id: string): Promise<JournalResponseDto> {
    return JournalResponseDto.from(await this.assertExists(id, userId));
  }

  async getByDate(userId: string, date: string): Promise<JournalResponseDto> {
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const journal = await this.repo.findByDateScoped(userId, parseDate(date));
    if (!journal) {
      throw new NotFoundException('No journal entry for this date');
    }
    return JournalResponseDto.from(journal);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateJournalDto,
  ): Promise<JournalResponseDto> {
    await this.assertExists(id, userId);
    const data: Prisma.JournalUncheckedUpdateInput = {};
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.mood !== undefined) data.mood = dto.mood;

    const journal = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'journal.update',
      entityType: 'Journal',
      entityId: id,
    });
    return JournalResponseDto.from(journal);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'journal.delete',
      entityType: 'Journal',
      entityId: id,
    });
    return { id, deleted: true };
  }

  private async assertExists(id: string, userId: string) {
    const journal = await this.repo.findByIdScoped(id, userId);
    if (!journal) {
      throw new NotFoundException('Journal not found');
    }
    return journal;
  }
}
