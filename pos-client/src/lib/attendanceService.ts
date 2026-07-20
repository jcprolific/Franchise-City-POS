import { supabase, isSupabaseConfigured } from './supabase';
import { getCurrentBranch } from './branchContext';
import { getActiveShiftLocal } from './shiftService';
import { getTerminalId } from './terminalContext';
import type { AttendanceStatus } from './attendanceStore';

export async function syncAttendanceEvent(input: {
  staffName: string;
  role: string;
  status: AttendanceStatus;
  userId?: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const branch = getCurrentBranch();
  const shift = getActiveShiftLocal();

  await supabase.from('staff_attendance_event').insert({
    staff_name: input.staffName,
    user_id: input.userId ?? null,
    branch_id: branch.id || null,
    shift_id: shift?.id ?? null,
    role: input.role,
    status: input.status,
    terminal_id: getTerminalId(),
    recorded_at: new Date().toISOString(),
  });
}
