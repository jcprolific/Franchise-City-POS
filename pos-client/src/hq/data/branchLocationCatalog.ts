import type { BrandSlug } from '../../brands';
import type { FranchiseeRow } from '../lib/franchiseeService';

export interface HqBranchLocationOption {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  region: string;
}

export const CUSTOM_BRANCH_LOCATION_ID = 'custom';

const COFTEA_LOCATIONS: HqBranchLocationOption[] = [
  {
    id: 'coftea-bgc',
    code: 'BGC-01',
    name: 'Coftea — BGC Central',
    address: 'Bonifacio Global City, 26th St corner 7th Ave',
    city: 'Taguig City',
    region: 'Metro Manila',
  },
  {
    id: 'coftea-makati',
    code: 'MKT-01',
    name: 'Coftea — Makati',
    address: 'Ayala Avenue, Makati CBD',
    city: 'Makati City',
    region: 'Metro Manila',
  },
  {
    id: 'coftea-ortigas',
    code: 'ORT-01',
    name: 'Coftea — Ortigas',
    address: 'Robinsons Galleria',
    city: 'Pasig City',
    region: 'Metro Manila',
  },
  {
    id: 'coftea-alabang',
    code: 'ALA-01',
    name: 'Coftea — Alabang',
    address: 'Alabang Town Center',
    city: 'Muntinlupa City',
    region: 'Metro Manila',
  },
  {
    id: 'coftea-qc',
    code: 'QC-01',
    name: 'Coftea — Quezon Ave',
    address: 'Quezon Avenue',
    city: 'Quezon City',
    region: 'Metro Manila',
  },
  {
    id: 'coftea-sm-north',
    code: 'SMN-01',
    name: 'Coftea — SM North',
    address: 'SM City North EDSA',
    city: 'Quezon City',
    region: 'Metro Manila',
  },
  {
    id: 'coftea-laspinas-caa',
    code: 'LPI-01',
    name: 'Coftea — CAA BF Intl.',
    address: '228 Malunggay St, CAA BF Intl',
    city: 'Las Piñas City',
    region: 'Metro Manila',
  },
  {
    id: 'coftea-laspinas-gatch',
    code: 'LPI-02',
    name: 'Coftea — Gatchalian',
    address: 'CJC Building, M. Arabejo St, Gatchalian Ave',
    city: 'Las Piñas City',
    region: 'Metro Manila',
  },
  {
    id: 'coftea-paranaque',
    code: 'PAR-01',
    name: 'Coftea — San Antonio Valley 1',
    address: 'San Antonio Valley 1',
    city: 'Parañaque City',
    region: 'Metro Manila',
  },
  {
    id: 'coftea-cebu',
    code: 'CEB-01',
    name: 'Coftea — Cebu IT Park',
    address: 'IT Park, Lahug',
    city: 'Cebu City',
    region: 'Visayas',
  },
  {
    id: 'coftea-davao',
    code: 'DAV-01',
    name: 'Coftea — Davao',
    address: 'Roxas Avenue',
    city: 'Davao City',
    region: 'Mindanao',
  },
];

const POTATO_CORNER_LOCATIONS: HqBranchLocationOption[] = [
  {
    id: 'pc-sm-cebu',
    code: 'SMC4-01',
    name: 'Potato Corner — SM Cebu',
    address: 'SM City Cebu',
    city: 'Cebu City',
    region: 'Visayas',
  },
  {
    id: 'pc-sm-baguio',
    code: 'SMB11-01',
    name: 'Potato Corner — SM Baguio',
    address: 'SM Baguio',
    city: 'Baguio City',
    region: 'Luzon',
  },
  {
    id: 'pc-ortigas',
    code: 'ORT-01',
    name: 'Potato Corner — Ortigas',
    address: 'Robinsons Galleria',
    city: 'Pasig City',
    region: 'Metro Manila',
  },
  {
    id: 'pc-eastwood',
    code: 'EWC-01',
    name: 'Potato Corner — Eastwood City',
    address: 'Eastwood Mall',
    city: 'Quezon City',
    region: 'Metro Manila',
  },
];

export function getBranchLocationCatalog(brandSlug: BrandSlug): HqBranchLocationOption[] {
  if (brandSlug === 'potato-corner') return POTATO_CORNER_LOCATIONS;
  return COFTEA_LOCATIONS;
}

export function findBranchLocationById(
  brandSlug: BrandSlug,
  locationId: string
): HqBranchLocationOption | null {
  return getBranchLocationCatalog(brandSlug).find((loc) => loc.id === locationId) ?? null;
}

/** Match a saved branch row back to a catalog entry (for edit form). */
export function matchBranchToLocationId(
  brandSlug: BrandSlug,
  row: Pick<FranchiseeRow, 'branch_code' | 'name' | 'city' | 'address'>
): string {
  const catalog = getBranchLocationCatalog(brandSlug);
  const code = (row.branch_code ?? '').trim().toLowerCase();
  const name = row.name.trim().toLowerCase();

  const byCode = catalog.find((loc) => loc.code.toLowerCase() === code);
  if (byCode) return byCode.id;

  const byName = catalog.find((loc) => loc.name.toLowerCase() === name);
  if (byName) return byName.id;

  const byCity = catalog.find(
    (loc) =>
      (row.city ?? '').trim().toLowerCase() === loc.city.toLowerCase() &&
      (row.address ?? '').trim().toLowerCase().includes(loc.address.toLowerCase().slice(0, 12))
  );
  if (byCity) return byCity.id;

  return CUSTOM_BRANCH_LOCATION_ID;
}

export function isLocationAssignedToOtherBranch(
  location: HqBranchLocationOption,
  branches: FranchiseeRow[],
  excludeBranchId?: string | null
): boolean {
  const code = location.code.toLowerCase();
  const name = location.name.toLowerCase();

  return branches.some((branch) => {
    if (excludeBranchId && branch.id === excludeBranchId) return false;
    const branchCode = (branch.branch_code ?? '').trim().toLowerCase();
    const branchName = branch.name.trim().toLowerCase();
    return branchCode === code || branchName === name;
  });
}

export function getAvailableBranchLocations(
  brandSlug: BrandSlug,
  branches: FranchiseeRow[],
  excludeBranchId?: string | null
): HqBranchLocationOption[] {
  return getBranchLocationCatalog(brandSlug).filter(
    (loc) => !isLocationAssignedToOtherBranch(loc, branches, excludeBranchId)
  );
}

export function locationToFranchiseeFields(location: HqBranchLocationOption) {
  return {
    branchCode: location.code,
    branchName: location.name,
    address: location.address,
    city: location.city,
  };
}

export function formatLocationLabel(location: HqBranchLocationOption): string {
  return `${location.name} — ${location.city}`;
}
