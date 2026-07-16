import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { CalendarEventResponseDto } from './dto/calendar-event-response.dto';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { QueryCalendarEventDto } from './dto/query-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { CalendarRepository } from './calendar.repository';

@Injectable()
export class CalendarService {
  constructor(
    private readonly repo: CalendarRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    dto: CreateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : null;
    this.assertValidRange(startTime, endTime);

    const event = await this.repo.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      startTime,
      endTime,
      location: dto.location ?? null,
      allDay: dto.allDay ?? false,
    });
    await this.audit.record({
      userId,
      action: 'calendar.create',
      entityType: 'CalendarEvent',
      entityId: event.id,
    });
    return CalendarEventResponseDto.from(event);
  }

  async list(
    userId: string,
    query: QueryCalendarEventDto,
  ): Promise<CalendarEventResponseDto[]> {
    const events = await this.repo.findManyScoped(userId, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return events.map(CalendarEventResponseDto.from);
  }

  async get(userId: string, id: string): Promise<CalendarEventResponseDto> {
    const event = await this.assertExists(id, userId);
    return CalendarEventResponseDto.from(event);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    const existing = await this.assertExists(id, userId);

    // Validate against the effective (post-update) start/end pair.
    const effectiveStart =
      dto.startTime !== undefined ? new Date(dto.startTime) : existing.startTime;
    const effectiveEnd =
      dto.endTime !== undefined
        ? dto.endTime
          ? new Date(dto.endTime)
          : null
        : existing.endTime;
    this.assertValidRange(effectiveStart, effectiveEnd);

    const data: Prisma.CalendarEventUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) {
      data.endTime = dto.endTime ? new Date(dto.endTime) : null;
    }
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.allDay !== undefined) data.allDay = dto.allDay;

    const event = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'calendar.update',
      entityType: 'CalendarEvent',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });
    return CalendarEventResponseDto.from(event);
  }

  async remove(
    userId: string,
    id: string,
  ): Promise<{ id: string; deleted: true }> {
    await this.assertExists(id, userId);
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'calendar.delete',
      entityType: 'CalendarEvent',
      entityId: id,
    });
    return { id, deleted: true };
  }

  /** endTime, when present, must be strictly after startTime. */
  private assertValidRange(start: Date, end: Date | null): void {
    if (end && end.getTime() <= start.getTime()) {
      throw new UnprocessableEntityException(
        'endTime must be after startTime',
      );
    }
  }

  private async assertExists(id: string, userId: string) {
    const event = await this.repo.findByIdScoped(id, userId);
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }
    return event;
  }
}
