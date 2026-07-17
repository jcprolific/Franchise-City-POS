import { supabase } from '../../lib/supabase';
import { getManilaIsoDateKey } from '../../lib/timezone';
import { isCountablePaidSale } from '../../lib/saleEligibility';

export const HEALTH_WEIGHTS = {
  salesGrowth: 0.25,
  posUsage: 0.15,
  inventoryAccuracy: 0.15,
  orderingCompliance: 0.15,
  trainingCompletion: 0.1,
  marketingCompliance: 0.1,
  storeUpdates: 0.1,
} as const;

export const HEALTH_CATEGORY_LABELS: Record<keyof typeof HEALTH_WEIGHTS, string> = {
  salesGrowth: 'Sales Growth',
  posUsage: 'POS Usage',
  inventoryAccuracy: 'Inventory Accuracy',
  orderingCompliance: 'Ordering Compliance',
  trainingCompletion: 'Training Completion',
  marketingCompliance: 'Marketing Compliance',
  storeUpdates: 'Store Updates',
};

export interface BranchHealthScores {
  salesGrowth: number;
  posUsage: number;
  inventoryAccuracy: number;
  orderingCompliance: number;
  trainingCompletion: number;
  marketingCompliance: number;
  storeUpdates: number;
  composite: number;
}

export interface BranchHealthRow {
  branchId: string;
  branchName: string;
  franchiseeName: string | null;
  scores: BranchHealthScores;
  periodStart: string;
  periodEnd: string;
  computedAt: string;
  source: 'snapshot' | 'computed';
}

export interface HealthImprovementAction {
  category: keyof typeof HEALTH_WEIGHTS;
  label: string;
  detail: string;
  priority: number;
}

interface BranchRow {
  id: string;
  name: string;
  franchisee_name: string | null;
}

interface OrderRow {
  branch_id: string | null;
  total_amount: number | null;
  created_at: string | null;
  payment_status: string | null;
  status: string | null;
}

interface ShiftRow {
  branch_id: string;
  status: string;
  closed_at: string | null;
  opened_at: string;
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function getCalendarMonthRange(reference = new Date()): { start: string; end: string } {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: getManilaIsoDateKey(start),
    end: getManilaIsoDateKey(end),
  };
}

function getPriorPeriod(start: string, end: string): { start: string; end: string } {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(startDate);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  return {
    start: getManilaIsoDateKey(prevStart),
    end: getManilaIsoDateKey(prevEnd),
  };
}

function daysInRange(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
}

function orderInRange(iso: string, start: string, end: string): boolean {
  const key = getManilaIsoDateKey(new Date(iso));
  return key >= start && key <= end;
}

function computeComposite(scores: Omit<BranchHealthScores, 'composite'>): number {
  return (
    scores.salesGrowth * HEALTH_WEIGHTS.salesGrowth +
    scores.posUsage * HEALTH_WEIGHTS.posUsage +
    scores.inventoryAccuracy * HEALTH_WEIGHTS.inventoryAccuracy +
    scores.orderingCompliance * HEALTH_WEIGHTS.orderingCompliance +
    scores.trainingCompletion * HEALTH_WEIGHTS.trainingCompletion +
    scores.marketingCompliance * HEALTH_WEIGHTS.marketingCompliance +
    scores.storeUpdates * HEALTH_WEIGHTS.storeUpdates
  );
}

function revenueByBranch(orders: OrderRow[], start: string, end: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of orders) {
    if (!row.branch_id || !row.created_at) continue;
    if (!isCountablePaidSale(row.status, row.payment_status)) continue;
    if (!orderInRange(row.created_at, start, end)) continue;
    map.set(row.branch_id, (map.get(row.branch_id) ?? 0) + asNumber(row.total_amount));
  }
  return map;
}

function computeSalesGrowthScores(
  branches: BranchRow[],
  orders: OrderRow[],
  periodStart: string,
  periodEnd: string
): Map<string, number> {
  const prior = getPriorPeriod(periodStart, periodEnd);
  const current = revenueByBranch(orders, periodStart, periodEnd);
  const previous = revenueByBranch(orders, prior.start, prior.end);

  const growthRates: number[] = [];
  const branchGrowth = new Map<string, number>();

  for (const branch of branches) {
    const cur = current.get(branch.id) ?? 0;
    const prev = previous.get(branch.id) ?? 0;
    const growth = prev > 0 ? (cur - prev) / prev : cur > 0 ? 1 : 0;
    branchGrowth.set(branch.id, growth);
    growthRates.push(growth);
  }

  const benchmark = median(growthRates);
  const scores = new Map<string, number>();
  for (const branch of branches) {
    const growth = branchGrowth.get(branch.id) ?? 0;
    scores.set(branch.id, clamp(50 + (growth - benchmark) * 100));
  }
  return scores;
}

function computePosUsageScores(
  branches: BranchRow[],
  orders: OrderRow[],
  shifts: ShiftRow[],
  periodStart: string,
  periodEnd: string
): Map<string, number> {
  const expectedDays = daysInRange(periodStart, periodEnd);
  const scores = new Map<string, number>();

  for (const branch of branches) {
    const activeDays = new Set<string>();
    for (const row of orders) {
      if (row.branch_id !== branch.id || !row.created_at) continue;
      if (!isCountablePaidSale(row.status, row.payment_status)) continue;
      if (!orderInRange(row.created_at, periodStart, periodEnd)) continue;
      activeDays.add(getManilaIsoDateKey(new Date(row.created_at)));
    }

    const shiftDays = new Set<string>();
    for (const shift of shifts) {
      if (shift.branch_id !== branch.id) continue;
      if (!orderInRange(shift.opened_at, periodStart, periodEnd)) continue;
      if (shift.status === 'closed' && shift.closed_at) {
        shiftDays.add(getManilaIsoDateKey(new Date(shift.opened_at)));
      }
    }

    const usageRate = activeDays.size / Math.max(expectedDays, 1);
    const shiftBonus =
      activeDays.size === 0 ? 1 : shiftDays.size / Math.max(activeDays.size, 1);
    scores.set(branch.id, clamp(usageRate * shiftBonus * 100));
  }
  return scores;
}

async function computeInventoryAccuracyScores(
  branchIds: string[],
  periodStart: string,
  periodEnd: string
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  for (const id of branchIds) scores.set(id, 75);

  const { data, error } = await supabase
    .from('inventory_cycle_count')
    .select('id,branch_id,count_date,inventory_cycle_count_line(system_qty,counted_qty)')
    .in('branch_id', branchIds)
    .gte('count_date', periodStart)
    .lte('count_date', periodEnd)
    .eq('status', 'submitted');

  if (error || !data) return scores;

  const varianceByBranch = new Map<string, number[]>();
  for (const row of data as Array<{
    branch_id: string;
    inventory_cycle_count_line: Array<{ system_qty: number; counted_qty: number }> | null;
  }>) {
    const lines = row.inventory_cycle_count_line ?? [];
    for (const line of lines) {
      const system = Math.max(asNumber(line.system_qty), 1);
      const variance = Math.abs(asNumber(line.counted_qty) - system) / system;
      const list = varianceByBranch.get(row.branch_id) ?? [];
      list.push(variance);
      varianceByBranch.set(row.branch_id, list);
    }
  }

  for (const [branchId, variances] of varianceByBranch) {
    const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
    scores.set(branchId, clamp(100 - avgVariance * 100));
  }
  return scores;
}

async function computeOrderingComplianceScores(
  brandId: string,
  branchIds: string[],
  periodStart: string,
  periodEnd: string
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  for (const id of branchIds) scores.set(id, 80);

  const { data, error } = await supabase
    .from('supply_order')
    .select('branch_id,status,promised_delivery_date,created_at')
    .eq('brand_id', brandId)
    .in('branch_id', branchIds)
    .gte('created_at', `${periodStart}T00:00:00`)
    .lte('created_at', `${periodEnd}T23:59:59`);

  if (error || !data || data.length === 0) return scores;

  const byBranch = new Map<string, typeof data>();
  for (const row of data) {
    const list = byBranch.get(row.branch_id as string) ?? [];
    list.push(row);
    byBranch.set(row.branch_id as string, list);
  }

  for (const branchId of branchIds) {
    const orders = byBranch.get(branchId) ?? [];
    if (orders.length === 0) continue;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const onTime = orders.filter((o) => {
      if (o.status !== 'delivered' || !o.promised_delivery_date) return false;
      const created = getManilaIsoDateKey(new Date(o.created_at as string));
      return created <= String(o.promised_delivery_date);
    }).length;
    const deliveryScore = delivered / orders.length;
    const onTimeScore = delivered > 0 ? onTime / delivered : 1;
    scores.set(branchId, clamp((deliveryScore * 0.6 + onTimeScore * 0.4) * 100));
  }
  return scores;
}

async function computeTrainingScores(
  brandId: string,
  branchIds: string[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  for (const id of branchIds) scores.set(id, 100);

  const { data: assignments, error: assignErr } = await supabase
    .from('training_assignment')
    .select('id,branch_id,required')
    .eq('brand_id', brandId)
    .eq('required', true);

  if (assignErr || !assignments || assignments.length === 0) return scores;

  const { data: completions } = await supabase
    .from('training_completion')
    .select('branch_id,assignment_id')
    .eq('brand_id', brandId)
    .in('branch_id', branchIds);

  const completedSet = new Set(
    (completions ?? []).map((c) => `${c.branch_id}:${c.assignment_id}`)
  );

  for (const branchId of branchIds) {
    const required = assignments.filter(
      (a) => !a.branch_id || a.branch_id === branchId
    );
    if (required.length === 0) continue;
    const done = required.filter((a) => completedSet.has(`${branchId}:${a.id}`)).length;
    scores.set(branchId, clamp((done / required.length) * 100));
  }
  return scores;
}

async function computeMarketingScores(
  brandId: string,
  branchIds: string[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  for (const id of branchIds) scores.set(id, 100);

  const { data: campaigns, error } = await supabase
    .from('portal_announcement')
    .select('id,requires_ack,tag')
    .eq('brand_id', brandId)
    .eq('requires_ack', true)
    .in('tag', ['campaign', 'promo']);

  if (error || !campaigns || campaigns.length === 0) return scores;

  const { data: acks } = await supabase
    .from('branch_compliance_ack')
    .select('branch_id,ref_id')
    .eq('brand_id', brandId)
    .eq('ref_type', 'announcement')
    .in('branch_id', branchIds);

  const ackSet = new Set((acks ?? []).map((a) => `${a.branch_id}:${a.ref_id}`));

  for (const branchId of branchIds) {
    const done = campaigns.filter((c) => ackSet.has(`${branchId}:${c.id}`)).length;
    scores.set(branchId, clamp((done / campaigns.length) * 100));
  }
  return scores;
}

async function computeStoreUpdateScores(
  brandId: string,
  branchIds: string[],
  periodStart: string,
  periodEnd: string
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  const expectedDays = daysInRange(periodStart, periodEnd);

  for (const id of branchIds) scores.set(id, 75);

  const { data: requiredAnnouncements } = await supabase
    .from('portal_announcement')
    .select('id,requires_ack')
    .eq('brand_id', brandId)
    .eq('requires_ack', true)
    .in('tag', ['update', 'reminder', 'policy']);

  const { data: acks } = await supabase
    .from('branch_compliance_ack')
    .select('branch_id,ref_id')
    .eq('brand_id', brandId)
    .eq('ref_type', 'announcement');

  const ackSet = new Set((acks ?? []).map((a) => `${a.branch_id}:${a.ref_id}`));

  const { data: eodReports } = await supabase
    .from('branch_daily_report')
    .select('branch_id,report_date,status')
    .eq('brand_id', brandId)
    .eq('status', 'submitted')
    .gte('report_date', periodStart)
    .lte('report_date', periodEnd);

  const eodByBranch = new Map<string, number>();
  for (const row of eodReports ?? []) {
    eodByBranch.set(row.branch_id as string, (eodByBranch.get(row.branch_id as string) ?? 0) + 1);
  }

  const requiredCount = requiredAnnouncements?.length ?? 0;

  for (const branchId of branchIds) {
    const announceScore =
      requiredCount === 0
        ? 100
        : ((requiredAnnouncements ?? []).filter((a) => ackSet.has(`${branchId}:${a.id}`)).length /
            requiredCount) *
          100;
    const eodScore = ((eodByBranch.get(branchId) ?? 0) / Math.max(expectedDays, 1)) * 100;
    scores.set(branchId, clamp(announceScore * 0.5 + eodScore * 0.5));
  }
  return scores;
}

export async function computeBranchHealthScores(
  brandId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<BranchHealthRow[]> {
  const range = periodStart && periodEnd
    ? { start: periodStart, end: periodEnd }
    : getCalendarMonthRange();

  const { data: branches, error: branchErr } = await supabase
    .from('branch')
    .select('id,name,franchisee_name')
    .eq('brand_id', brandId);

  if (branchErr || !branches?.length) return [];

  const branchRows = branches as BranchRow[];
  const branchIds = branchRows.map((b) => b.id);

  const prior = getPriorPeriod(range.start, range.end);
  const earliest = prior.start;

  const { data: orders } = await supabase
    .from('pos_order')
    .select('branch_id,total_amount,created_at,payment_status,status')
    .eq('brand_id', brandId)
    .gte('created_at', `${earliest}T00:00:00`)
    .lte('created_at', `${range.end}T23:59:59`);

  const { data: shifts } = await supabase
    .from('pos_shift')
    .select('branch_id,status,closed_at,opened_at')
    .in('branch_id', branchIds)
    .gte('opened_at', `${range.start}T00:00:00`)
    .lte('opened_at', `${range.end}T23:59:59`);

  const salesGrowth = computeSalesGrowthScores(
    branchRows,
    (orders as OrderRow[] | null) ?? [],
    range.start,
    range.end
  );
  const posUsage = computePosUsageScores(
    branchRows,
    (orders as OrderRow[] | null) ?? [],
    (shifts as ShiftRow[] | null) ?? [],
    range.start,
    range.end
  );

  const [
    inventoryAccuracy,
    orderingCompliance,
    trainingCompletion,
    marketingCompliance,
    storeUpdates,
  ] = await Promise.all([
    computeInventoryAccuracyScores(branchIds, range.start, range.end),
    computeOrderingComplianceScores(brandId, branchIds, range.start, range.end),
    computeTrainingScores(brandId, branchIds),
    computeMarketingScores(brandId, branchIds),
    computeStoreUpdateScores(brandId, branchIds, range.start, range.end),
  ]);

  const computedAt = new Date().toISOString();
  const rows: BranchHealthRow[] = [];

  for (const branch of branchRows) {
    const categoryScores = {
      salesGrowth: salesGrowth.get(branch.id) ?? 50,
      posUsage: posUsage.get(branch.id) ?? 50,
      inventoryAccuracy: inventoryAccuracy.get(branch.id) ?? 75,
      orderingCompliance: orderingCompliance.get(branch.id) ?? 80,
      trainingCompletion: trainingCompletion.get(branch.id) ?? 100,
      marketingCompliance: marketingCompliance.get(branch.id) ?? 100,
      storeUpdates: storeUpdates.get(branch.id) ?? 75,
    };
    const composite = computeComposite(categoryScores);
    rows.push({
      branchId: branch.id,
      branchName: branch.name,
      franchiseeName: branch.franchisee_name,
      scores: { ...categoryScores, composite },
      periodStart: range.start,
      periodEnd: range.end,
      computedAt,
      source: 'computed',
    });
  }

  return rows.sort((a, b) => b.scores.composite - a.scores.composite);
}

export async function fetchBranchHealthScores(
  brandId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<BranchHealthRow[]> {
  const range = periodStart && periodEnd
    ? { start: periodStart, end: periodEnd }
    : getCalendarMonthRange();

  const { data: snapshots, error } = await supabase
    .from('branch_health_snapshot')
    .select(
      'branch_id,period_start,period_end,sales_growth_score,pos_usage_score,inventory_accuracy_score,ordering_compliance_score,training_completion_score,marketing_compliance_score,store_updates_score,composite_score,computed_at,branch(name,franchisee_name)'
    )
    .eq('brand_id', brandId)
    .eq('period_start', range.start)
    .eq('period_end', range.end)
    .order('composite_score', { ascending: false });

  if (!error && snapshots && snapshots.length > 0) {
    return snapshots.map((row) => {
      const branch = Array.isArray(row.branch) ? row.branch[0] : row.branch;
      return {
        branchId: row.branch_id as string,
        branchName: (branch as { name?: string })?.name ?? 'Branch',
        franchiseeName: (branch as { franchisee_name?: string | null })?.franchisee_name ?? null,
        scores: {
          salesGrowth: asNumber(row.sales_growth_score),
          posUsage: asNumber(row.pos_usage_score),
          inventoryAccuracy: asNumber(row.inventory_accuracy_score),
          orderingCompliance: asNumber(row.ordering_compliance_score),
          trainingCompletion: asNumber(row.training_completion_score),
          marketingCompliance: asNumber(row.marketing_compliance_score),
          storeUpdates: asNumber(row.store_updates_score),
          composite: asNumber(row.composite_score),
        },
        periodStart: String(row.period_start),
        periodEnd: String(row.period_end),
        computedAt: String(row.computed_at),
        source: 'snapshot' as const,
      };
    });
  }

  return computeBranchHealthScores(brandId, range.start, range.end);
}

export async function persistBranchHealthSnapshots(rows: BranchHealthRow[], brandId: string) {
  if (rows.length === 0) return;

  const payload = rows.map((row) => ({
    branch_id: row.branchId,
    brand_id: brandId,
    period_start: row.periodStart,
    period_end: row.periodEnd,
    sales_growth_score: row.scores.salesGrowth,
    pos_usage_score: row.scores.posUsage,
    inventory_accuracy_score: row.scores.inventoryAccuracy,
    ordering_compliance_score: row.scores.orderingCompliance,
    training_completion_score: row.scores.trainingCompletion,
    marketing_compliance_score: row.scores.marketingCompliance,
    store_updates_score: row.scores.storeUpdates,
    composite_score: row.scores.composite,
    computed_at: row.computedAt,
  }));

  await supabase
    .from('branch_health_snapshot')
    .upsert(payload, { onConflict: 'branch_id,period_start,period_end' });
}

export function getImprovementActions(scores: BranchHealthScores): HealthImprovementAction[] {
  const entries = (Object.keys(HEALTH_WEIGHTS) as Array<keyof typeof HEALTH_WEIGHTS>).map(
    (category) => ({
      category,
      score: scores[category],
      weight: HEALTH_WEIGHTS[category],
      gap: (100 - scores[category]) * HEALTH_WEIGHTS[category],
    })
  );

  entries.sort((a, b) => b.gap - a.gap);

  const tips: Record<keyof typeof HEALTH_WEIGHTS, string> = {
    salesGrowth: 'Focus on promos and peak-hour staffing to lift revenue vs last period.',
    posUsage: 'Ring sales daily on POS and close shifts properly each operating day.',
    inventoryAccuracy: 'Complete a monthly cycle count and reconcile variances with HQ.',
    orderingCompliance: 'Reorder low-stock items within 3 days and track supply deliveries.',
    trainingCompletion: 'Finish required training modules in the Franchise Portal.',
    marketingCompliance: 'Acknowledge active promo campaigns from HQ announcements.',
    storeUpdates: 'Submit end-of-day reports and acknowledge required HQ updates.',
  };

  return entries
    .filter((e) => e.score < 85)
    .slice(0, 3)
    .map((e, idx) => ({
      category: e.category,
      label: HEALTH_CATEGORY_LABELS[e.category],
      detail: tips[e.category],
      priority: idx + 1,
    }));
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'var(--hq-success)';
  if (score >= 60) return 'var(--hq-warn)';
  return 'var(--hq-danger)';
}

export function scoreGrade(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Needs Attention';
  return 'Critical';
}
