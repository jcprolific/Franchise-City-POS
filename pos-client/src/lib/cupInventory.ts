/** Cup count buckets aligned with EOD digital form sections. */
export type CupInventoryCounts = Record<string, number>;

export const DEFAULT_CUP_KEYS = [
  'small',
  'medium',
  'large',
  'extraLarge',
  'freeUpsize',
  'freeAddon',
  'freeDrink',
] as const;

export const CUP_FIELD_LABELS: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  extraLarge: 'Extra Large',
  freeUpsize: 'Free Upsize',
  freeAddon: 'Free Add-on',
  freeDrink: 'Free Drink',
};

export function emptyCupCounts(): CupInventoryCounts {
  return Object.fromEntries(DEFAULT_CUP_KEYS.map((key) => [key, 0]));
}

export function normalizeCupCounts(input: CupInventoryCounts | null | undefined): CupInventoryCounts {
  const base = emptyCupCounts();
  if (!input) return base;
  for (const key of DEFAULT_CUP_KEYS) {
    const value = input[key];
    base[key] = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  return base;
}

export function totalCupCount(counts: CupInventoryCounts): number {
  return DEFAULT_CUP_KEYS.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
}
