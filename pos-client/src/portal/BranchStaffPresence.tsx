import { useEffect, useState } from 'react';
import { fetchBranchPresence, type PresenceStatus } from '../lib/staffPresenceService';
import './BranchStaffPresence.css';

const STATUS_LABEL: Record<PresenceStatus, string> = {
  online: 'Online',
  idle: 'Idle',
  offline: 'Offline',
};

export default function BranchStaffPresence({ branchId }: { branchId: string | null }) {
  const [rows, setRows] = useState<
    Array<{ staff_name: string; role: string | null; status: PresenceStatus; last_seen_at: string }>
  >([]);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    const load = () => {
      void fetchBranchPresence(branchId).then((data) => {
        if (!cancelled) setRows(data);
      });
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [branchId]);

  if (!branchId || rows.length === 0) return null;

  return (
    <section className="branch-staff-presence">
      <h3>Staff activity</h3>
      <ul>
        {rows.slice(0, 8).map((row) => (
          <li key={`${row.staff_name}-${row.last_seen_at}`}>
            <span>{row.staff_name}</span>
            <span className={`presence-dot presence-dot--${row.status}`}>
              {STATUS_LABEL[row.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
