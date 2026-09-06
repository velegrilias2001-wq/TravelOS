import type { PackingItem } from '@/domain/entities/packing-item';

export interface PackingProgress {
  total: number;
  packed: number;
  /**
   * Integer 0–100 from packed/total.
   * 0 when the list is empty — never invents items.
   */
  percentPacked: number;
}

export function packingProgress(
  items: readonly PackingItem[],
): PackingProgress {
  const total = items.length;
  const packed = items.filter((item) => item.packed).length;

  return {
    total,
    packed,
    percentPacked:
      total === 0
        ? 0
        : Math.round((packed / total) * 100),
  };
}
