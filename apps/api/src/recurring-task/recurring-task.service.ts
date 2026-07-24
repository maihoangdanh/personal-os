import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RecurrenceFrequency, RecurringTaskTemplate } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { TaskRepository } from '../task/task.repository';
import { CreateRecurringTaskDto } from './dto/create-recurring-task.dto';
import { RecurringTaskTemplateResponseDto } from './dto/recurring-task-response.dto';
import { RecurringTaskRepository } from './recurring-task.repository';
import { vnTodayAsUtcDateOnly, vnTodayAt, vnTodayIsoWeekday } from './vn-time';

const DEFAULT_DEADLINE_HOUR = 23;
const DEFAULT_DEADLINE_MINUTE = 59;

function isSameDate(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

@Injectable()
export class RecurringTaskService {
  constructor(
    private readonly repo: RecurringTaskRepository,
    private readonly taskRepo: TaskRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    dto: CreateRecurringTaskDto,
  ): Promise<RecurringTaskTemplateResponseDto> {
    if (dto.frequency === RecurrenceFrequency.WEEKLY && (!dto.weekDays || dto.weekDays.length === 0)) {
      throw new UnprocessableEntityException('weekDays is required when frequency is WEEKLY');
    }
    const project = await this.repo.findOwnedProjectId(dto.projectId, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const template = await this.repo.create({
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      impact: dto.impact,
      urgency: dto.urgency,
      estimateMinute: dto.estimateMinute ?? null,
      frequency: dto.frequency,
      weekDays: dto.frequency === RecurrenceFrequency.WEEKLY ? dto.weekDays! : [],
      timeOfDay: dto.timeOfDay ?? null,
    });

    // Sinh luôn instance đầu tiên nếu hôm nay khớp lịch — không đợi cron ngày mai.
    const generated = await this.maybeGenerateToday(template);

    await this.audit.record({
      userId,
      action: 'recurring-task.create',
      entityType: 'RecurringTaskTemplate',
      entityId: template.id,
    });

    return RecurringTaskTemplateResponseDto.from(generated ?? template);
  }

  async stop(userId: string, id: string): Promise<RecurringTaskTemplateResponseDto> {
    const template = await this.repo.findByIdScoped(id, userId);
    if (!template) {
      throw new NotFoundException('Recurring task not found');
    }
    const updated = await this.repo.update(id, { active: false });
    await this.audit.record({
      userId,
      action: 'recurring-task.stop',
      entityType: 'RecurringTaskTemplate',
      entityId: id,
    });
    return RecurringTaskTemplateResponseDto.from(updated);
  }

  /**
   * Sinh 1 Task instance cho hôm nay nếu lịch khớp VÀ chưa sinh trong ngày hôm nay.
   * Dùng chung cho create() (sinh ngay) và scheduler (chạy mỗi sáng). Trả về
   * template đã cập nhật lastGeneratedDate nếu có sinh, ngược lại trả nguyên
   * template gốc.
   */
  async maybeGenerateToday(
    template: RecurringTaskTemplate,
  ): Promise<RecurringTaskTemplate | null> {
    const today = vnTodayAsUtcDateOnly();
    if (template.lastGeneratedDate && isSameDate(template.lastGeneratedDate, today)) {
      return null; // đã sinh hôm nay rồi
    }
    if (!this.matchesToday(template)) {
      return null;
    }

    const deadline = this.computeDeadline(template);
    await this.taskRepo.create({
      projectId: template.projectId,
      title: template.title,
      description: template.description,
      impact: template.impact,
      urgency: template.urgency,
      priorityScore: template.impact * template.urgency,
      estimateMinute: template.estimateMinute,
      status: 'TODO',
      deadline,
      recurringTemplateId: template.id,
    });

    return this.repo.update(template.id, { lastGeneratedDate: today });
  }

  private matchesToday(template: RecurringTaskTemplate): boolean {
    if (template.frequency === RecurrenceFrequency.DAILY) return true;
    return template.weekDays.includes(vnTodayIsoWeekday());
  }

  /** Deadline tính theo giờ VN (xem vn-time.ts) — timeOfDay là "HH:mm" giờ VN người dùng nhập. */
  private computeDeadline(template: RecurringTaskTemplate): Date {
    if (template.timeOfDay) {
      const [h, m] = template.timeOfDay.split(':').map(Number);
      return vnTodayAt(h, m);
    }
    return vnTodayAt(DEFAULT_DEADLINE_HOUR, DEFAULT_DEADLINE_MINUTE);
  }
}
