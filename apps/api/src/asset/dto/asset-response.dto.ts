import { Asset } from '@personal-os/database';

/** Exact shape returned for an Asset. */
export class AssetResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  type!: string | null;
  value!: number; // counts toward Net Worth
  createdAt!: string;
  updatedAt!: string;

  static from(a: Asset): AssetResponseDto {
    return {
      id: a.id,
      userId: a.userId,
      name: a.name,
      type: a.type,
      value: a.value.toNumber(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}
