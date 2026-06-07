export type AttendanceStatus = 'IN' | 'OUT';

export interface AttendanceEntry {
  id: string;
  staffName: string;
  role: string;
  status: AttendanceStatus;
  timestamp: string;
}

const ATTENDANCE_STORAGE_KEY = 'coftea.attendance.log.v1';
const ATTENDANCE_EVENT_NAME = 'coftea:attendance-updated';

function safeWindow() {
  return typeof window === 'undefined' ? null : window;
}

export function getAttendanceEntries(): AttendanceEntry[] {
  const w = safeWindow();
  if (!w) return [];
  const raw = w.localStorage.getItem(ATTENDANCE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AttendanceEntry =>
        item &&
        typeof item.id === 'string' &&
        typeof item.staffName === 'string' &&
        typeof item.role === 'string' &&
        (item.status === 'IN' || item.status === 'OUT') &&
        typeof item.timestamp === 'string'
    );
  } catch {
    return [];
  }
}

function saveAttendanceEntries(entries: AttendanceEntry[]) {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(entries));
  w.dispatchEvent(new CustomEvent(ATTENDANCE_EVENT_NAME));
}

export function addAttendanceEntry(payload: Omit<AttendanceEntry, 'id' | 'timestamp'>) {
  const entries = getAttendanceEntries();
  const next: AttendanceEntry = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  saveAttendanceEntries([...entries, next]);
  return next;
}

export function subscribeAttendance(callback: () => void) {
  const w = safeWindow();
  if (!w) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === ATTENDANCE_STORAGE_KEY) callback();
  };
  const onCustom = () => callback();
  w.addEventListener('storage', onStorage);
  w.addEventListener(ATTENDANCE_EVENT_NAME, onCustom);
  return () => {
    w.removeEventListener('storage', onStorage);
    w.removeEventListener(ATTENDANCE_EVENT_NAME, onCustom);
  };
}

export function getLatestAttendanceStatus(staffName: string): AttendanceStatus | null {
  const latest = [...getAttendanceEntries()]
    .reverse()
    .find((entry) => entry.staffName.toLowerCase() === staffName.toLowerCase());
  return latest?.status ?? null;
}

export function getTotalHoursToday(staffName: string) {
  const entries = getAttendanceEntries()
    .filter((entry) => entry.staffName.toLowerCase() === staffName.toLowerCase())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const todayKey = new Date().toDateString();
  const todayEntries = entries.filter((entry) => new Date(entry.timestamp).toDateString() === todayKey);
  if (todayEntries.length === 0) return 0;

  let totalMs = 0;
  let openInTimestamp: string | null = null;

  for (const entry of todayEntries) {
    if (entry.status === 'IN') {
      openInTimestamp = entry.timestamp;
      continue;
    }
    if (entry.status === 'OUT' && openInTimestamp) {
      totalMs += new Date(entry.timestamp).getTime() - new Date(openInTimestamp).getTime();
      openInTimestamp = null;
    }
  }

  if (openInTimestamp) {
    totalMs += Date.now() - new Date(openInTimestamp).getTime();
  }

  return Math.max(0, totalMs / (1000 * 60 * 60));
}
