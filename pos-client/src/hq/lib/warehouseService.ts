export type DeliveryStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'RECEIVED' | 'DISPATCHED';
export type DeliveryDirection = 'IN' | 'OUT';

export interface DeliveryRow {
  id: string;
  reference: string;
  party: string;
  date: string;
  items: number;
  status: DeliveryStatus;
  direction: DeliveryDirection;
  notes?: string;
  _local?: boolean;
}

export interface StockRow {
  id: string;
  name: string;
  unit: string;
  onHand: number;
  parLevel: number;
  reorderPoint: number;
  location: string;
  _local?: boolean;
}

export interface CreateDeliveryInput {
  brandId: string;
  direction: DeliveryDirection;
  party: string;
  date: string;
  items: number;
  status: DeliveryStatus;
  notes: string;
}

export interface CreateStockProductInput {
  brandId: string;
  name: string;
  unit: string;
  onHand: number;
  parLevel: number;
  reorderPoint: number;
  location: string;
}

function deliveriesKey(brandId: string) {
  return `coftea-warehouse-deliveries:${brandId}`;
}

function stockKey(brandId: string) {
  return `coftea-warehouse-stock:${brandId}`;
}

function createLocalId() {
  try {
    return `local-${crypto.randomUUID()}`;
  } catch {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* storage full or blocked */
  }
}

function buildReference(direction: DeliveryDirection, date: string) {
  const compact = date.replace(/-/g, '').slice(2);
  const prefix = direction === 'IN' ? 'DR' : 'TO';
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${compact}-${suffix}`;
}

export function ensureSampleDeliveries(
  brandId: string,
  samples: DeliveryRow[]
): DeliveryRow[] {
  const existing = readJson<DeliveryRow>(deliveriesKey(brandId));
  if (existing.length > 0) return existing;
  writeJson(deliveriesKey(brandId), samples);
  return samples;
}

export function ensureSampleStock(brandId: string, samples: StockRow[]): StockRow[] {
  const existing = readJson<StockRow>(stockKey(brandId));
  if (existing.length > 0) return existing;
  writeJson(stockKey(brandId), samples);
  return samples;
}

export function loadDeliveries(brandId: string): DeliveryRow[] {
  return readJson<DeliveryRow>(deliveriesKey(brandId));
}

export function loadStock(brandId: string): StockRow[] {
  return readJson<StockRow>(stockKey(brandId));
}

export function createDelivery(input: CreateDeliveryInput): DeliveryRow {
  const row: DeliveryRow = {
    id: createLocalId(),
    reference: buildReference(input.direction, input.date),
    party: input.party.trim(),
    date: input.date,
    items: Math.max(1, input.items),
    status: input.status,
    direction: input.direction,
    notes: input.notes.trim() || undefined,
    _local: true,
  };

  const existing = readJson<DeliveryRow>(deliveriesKey(input.brandId));
  writeJson(deliveriesKey(input.brandId), [row, ...existing]);
  return row;
}

export function createStockProduct(input: CreateStockProductInput): StockRow {
  const row: StockRow = {
    id: createLocalId(),
    name: input.name.trim(),
    unit: input.unit.trim() || 'pc',
    onHand: Math.max(0, input.onHand),
    parLevel: Math.max(1, input.parLevel),
    reorderPoint: Math.max(0, input.reorderPoint),
    location: input.location.trim() || 'Main Warehouse',
    _local: true,
  };

  const existing = readJson<StockRow>(stockKey(input.brandId));
  writeJson(stockKey(input.brandId), [row, ...existing]);
  return row;
}
