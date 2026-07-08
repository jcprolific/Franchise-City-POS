import { supabase, isSupabaseConfigured } from './supabase';
import { getCurrentBranch } from './branchContext';
import { getTerminalId } from './terminalContext';

export type AuditAction =
  | 'order_created'
  | 'order_synced'
  | 'order_status_changed'
  | 'order_voided'
  | 'order_refunded'
  | 'stock_adjusted'
  | 'shift_opened'
  | 'shift_closed';

export interface AuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  brandId?: string;
  branchId?: string;
  userId?: string;
  userName?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const branch = getCurrentBranch();
  const terminalId = getTerminalId();

  const row = {
    brand_id: input.brandId ?? null,
    branch_id: input.branchId ?? branch.id,
    terminal_id: terminalId,
    user_id: input.userId ?? null,
    user_name: input.userName ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    metadata: input.metadata ?? {},
  };

  const { error } = await supabase.from('audit_log').insert(row);
  if (error) {
    console.warn('audit_log insert failed:', error.message);
  }
}
