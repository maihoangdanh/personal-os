import { RecurrenceFrequency, RecurringTaskTemplate } from '@personal-os/database';

export class RecurringTaskTemplateResponseDto {
  id!: string;
  projectId!: string;
  title!: string;
  description!: string | null;
  impact!: number;
  urgency!: number;
  estimateMinute!: number | null;
  frequency!: RecurrenceFrequency;
  weekDays!: number[];
  timeOfDay!: string | null;
  active!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static from(t: RecurringTaskTemplate): RecurringTaskTemplateResponseDto {
    return {
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      impact: t.impact,
      urgency: t.urgency,
      estimateMinute: t.estimateMinute,
      frequency: t.frequency,
      weekDays: t.weekDays,
      timeOfDay: t.timeOfDay,
      active: t.active,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
