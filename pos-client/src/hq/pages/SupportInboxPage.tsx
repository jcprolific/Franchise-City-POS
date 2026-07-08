import { useCallback, useEffect, useState } from 'react';
import { useBrand } from '../../context/BrandContext';
import {
  fetchAllTicketsForHq,
  updateTicketStatus,
  type SupportTicket,
  type TicketStatus,
} from '../../lib/supportTicketService';

export default function SupportInboxPage() {
  const { brand } = useBrand();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setTickets(await fetchAllTicketsForHq(brand.dbBrandId));
  }, [brand.dbBrandId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setStatus = async (id: string, status: TicketStatus) => {
    await updateTicketStatus(id, status, notes[id]);
    await reload();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Support Inbox</h1>
          <p>Remote technical support requests from franchisees.</p>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr><th>Subject</th><th>Topic</th><th>Status</th><th>Branch</th><th>HQ notes</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.subject}<br /><small>{t.message.slice(0, 80)}</small></td>
                <td>{t.topic}</td>
                <td>{t.status}</td>
                <td>{t.branchId?.slice(0, 8) ?? '—'}</td>
                <td>
                  <input
                    value={notes[t.id] ?? t.hqNotes}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="Reply notes"
                  />
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => void setStatus(t.id, 'in_progress')}>In progress</button>
                  <button type="button" onClick={() => void setStatus(t.id, 'resolved')}>Resolve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
