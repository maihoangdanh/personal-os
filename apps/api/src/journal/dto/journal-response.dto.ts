import { Journal } from '@personal-os/database';

/** Exact shape returned for a Journal entry. */
export class JournalResponseDto {
  id!: string;
  userId!: string;
  date!: string; // YYYY-MM-DD
  content!: string;
  mood!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static from(j: Journal): JournalResponseDto {
    return {
      id: j.id,
      userId: j.userId,
      date: j.date.toISOString().slice(0, 10),
      content: j.content,
      mood: j.mood,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    };
  }
}
