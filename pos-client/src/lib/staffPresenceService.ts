import { supabase, isSupabaseConfigured } from './supabase';
import { getCurrentBranch } from './branchContext';
import { getTerminalId } from './terminalContext';

export type PresenceStatus = 'online' | 'idle' | 'offline';

const IDLE_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 30_000;

let lastInteractionAt = Date.now();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let idleTimer: ReturnType<typeof setInterval> | null = null;

function currentPresenceStatus(): PresenceStatus {
  if (Date.now() - lastInteractionAt >= IDLE_MS) return 'idle';
  return 'online';
}

function bindInteractionTracking() {
  const bump = () => {
    lastInteractionAt = Date.now();
  };
  window.addEventListener('pointerdown', bump);
  window.addEventListener('keydown', bump);
  window.addEventListener('touchstart', bump);
  return () => {
    window.removeEventListener('pointerdown', bump);
    window.removeEventListener('keydown', bump);
    window.removeEventListener('touchstart', bump);
  };
}

async function upsertPresence(input: {
  userId?: string;
  staffName: string;
  branchId: string;
  role?: string;
  status: PresenceStatus;
}) {
  if (!isSupabaseConfigured() || !input.branchId) return;

  await supabase.from('staff_presence').upsert(
    {
      user_id: input.userId ?? input.staffName,
      staff_name: input.staffName,
      branch_id: input.branchId,
      role: input.role ?? null,
      status: input.status,
      terminal_id: getTerminalId(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,branch_id' }
  );
}

export async function markStaffOffline(input: {
  userId?: string;
  staffName: string;
  branchId: string;
  role?: string;
}) {
  await upsertPresence({ ...input, status: 'offline' });
}

export function startStaffPresenceHeartbeat(input: {
  userId?: string;
  staffName: string;
  role?: string;
}) {
  stopStaffPresenceHeartbeat();
  const unbind = bindInteractionTracking();
  const branch = getCurrentBranch();

  const tick = () => {
    void upsertPresence({
      userId: input.userId,
      staffName: input.staffName,
      branchId: branch.id,
      role: input.role,
      status: currentPresenceStatus(),
    });
  };

  tick();
  heartbeatTimer = setInterval(tick, HEARTBEAT_MS);
  idleTimer = setInterval(tick, 15_000);

  return () => {
    unbind();
    stopStaffPresenceHeartbeat();
    void markStaffOffline({
      userId: input.userId,
      staffName: input.staffName,
      branchId: branch.id,
      role: input.role,
    });
  };
}

export function stopStaffPresenceHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (idleTimer) clearInterval(idleTimer);
  heartbeatTimer = null;
  idleTimer = null;
}

export async function fetchBranchPresence(branchId: string) {
  if (!isSupabaseConfigured() || !branchId) return [];

  const { data, error } = await supabase
    .from('staff_presence')
    .select('staff_name, role, status, last_seen_at, terminal_id, branch_id')
    .eq('branch_id', branchId)
    .order('last_seen_at', { ascending: false });

  if (error || !data) return [];
  return data as Array<{
    staff_name: string;
    role: string | null;
    status: PresenceStatus;
    last_seen_at: string;
    terminal_id: string | null;
    branch_id: string;
  }>;
}

export async function fetchBrandPresence(brandId: string) {
  if (!isSupabaseConfigured() || !brandId) return [];

  const { data: branches, error: branchError } = await supabase
    .from('branch')
    .select('id, name')
    .eq('brand_id', brandId);

  if (branchError || !branches?.length) return [];

  const branchIds = branches.map((b) => (b as { id: string }).id);
  const branchNameById = new Map(
    branches.map((b) => [(b as { id: string }).id, (b as { name: string }).name])
  );

  const { data, error } = await supabase
    .from('staff_presence')
    .select('staff_name, role, status, last_seen_at, terminal_id, branch_id, user_id')
    .in('branch_id', branchIds)
    .order('last_seen_at', { ascending: false });

  if (error || !data) return [];

  return (data as Array<{
    staff_name: string;
    role: string | null;
    status: PresenceStatus;
    last_seen_at: string;
    terminal_id: string | null;
    branch_id: string;
    user_id: string | null;
  }>).map((row) => ({
    ...row,
    branchName: branchNameById.get(row.branch_id) ?? 'Branch',
  }));
}

export function presenceLabel(status: PresenceStatus): string {
  if (status === 'online') return 'Online';
  if (status === 'idle') return 'Idle';
  return 'Offline';
}
