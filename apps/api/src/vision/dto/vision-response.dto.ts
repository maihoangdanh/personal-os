import { Vision } from '@personal-os/database';

/** Exact shape returned for a Vision. */
export class VisionResponseDto {
  id!: string;
  userId!: string;
  title!: string;
  targetYear!: number | null;
  createdAt!: string;
  updatedAt!: string;

  static from(v: Vision): VisionResponseDto {
    return {
      id: v.id,
      userId: v.userId,
      title: v.title,
      targetYear: v.targetYear,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }
}
