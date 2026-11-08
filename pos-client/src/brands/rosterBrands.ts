/** HQ roster network brands (includes sister brands beyond POS login brands). */

export type RosterBrandSlug =
  | 'coftea'
  | 'potato-corner'
  | 'la-lemon'
  | 'keki'
  | 'meow-meow'
  | 'pizza-pocholo';

export interface RosterBrandMeta {
  slug: RosterBrandSlug;
  dbBrandId: string;
  name: string;
  shortName: string;
}

export const ROSTER_BRANDS: RosterBrandMeta[] = [
  {
    slug: 'coftea',
    dbBrandId: 'a1000000-0000-4000-8000-000000000002',
    name: 'Coftea',
    shortName: 'Coftea',
  },
  {
    slug: 'la-lemon',
    dbBrandId: 'a1000000-0000-4000-8000-000000000003',
    name: 'La Lemon',
    shortName: 'La Lemon',
  },
  {
    slug: 'keki',
    dbBrandId: 'a1000000-0000-4000-8000-000000000004',
    name: 'Keki',
    shortName: 'Keki',
  },
  {
    slug: 'meow-meow',
    dbBrandId: 'a1000000-0000-4000-8000-000000000005',
    name: 'Meow Meow',
    shortName: 'Meow',
  },
  {
    slug: 'pizza-pocholo',
    dbBrandId: 'a1000000-0000-4000-8000-000000000006',
    name: 'Pizza Pocholo',
    shortName: 'Pizza Pocholo',
  },
  {
    slug: 'potato-corner',
    dbBrandId: 'a1000000-0000-4000-8000-000000000001',
    name: 'Potato Corner',
    shortName: 'Potato Corner',
  },
];

export const ROSTER_BRAND_BY_ID = Object.fromEntries(
  ROSTER_BRANDS.map((b) => [b.dbBrandId, b])
) as Record<string, RosterBrandMeta>;

export function rosterBrandName(brandId: string): string {
  return ROSTER_BRAND_BY_ID[brandId]?.name ?? 'Unknown';
}
