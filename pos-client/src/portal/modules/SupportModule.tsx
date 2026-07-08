import { useEffect, useState } from 'react';
import { Ticket } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { getCurrentBranch } from '../../lib/branchContext';
import { fetchActiveSystemNotices, type SystemNotice } from '../../lib/portalService';
import {
  createSupportTicket,
  fetchSupportTickets,
  type SupportTicket,
} from '../../lib/supportTicketService';
import PortalLayout, { PortalCard, PortalPlaceholderNote, PortalTag } from '../PortalLayout';
import { useOutletContext } from 'react-router-dom';
import type { PosOutletContext } from '../../App';

const TOPICS = ['Equipment / POS', 'Inventory & Supplies', 'Staff & Training', 'Billing / Payments', 'Other'];

export default function SupportModule() {
  const { brand } = useBrand();
  const branch = getCurrentBranch();
  const { userName } = useOutletContext<PosOutletContext>();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const reload = async () => {
    const [t, n] = await Promise.all([
      fetchSupportTickets(brand.dbBrandId, branch.id),
      fetchActiveSystemNotices(brand.dbBrandId),
    ]);
    setTickets(t);
    setNotices(n);
  };

  useEffect(() => {
    void reload();
  }, [brand.dbBrandId, branch.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    await createSupportTicket({
      brandId: brand.dbBrandId,
      branchId: branch.id,
      topic,
      subject: subject.trim(),
      message: message.trim(),
      createdBy: userName || 'Franchisee',
    });
    setSubmitted(true);
    setSubject('');
    setMessage('');
    setTopic(TOPICS[0]);
    await reload();
  };

  return (
    <PortalLayout icon={Ticket} title="Technical Support" subtitle="Remote support, updates, and troubleshooting">
      {notices.length > 0 && (
        <PortalCard>
          <h2 className="portal-announcement-title">System Notices</h2>
          {notices.map((n) => (
            <div key={n.id} className="portal-notice-row">
              <PortalTag variant={n.noticeType === 'security' ? 'pinned' : 'default'}>{n.noticeType}</PortalTag>
              <strong>{n.title}</strong>
              <p className="portal-announcement-body">{n.body}</p>
            </div>
          ))}
        </PortalCard>
      )}

      <PortalPlaceholderNote>
        Submit a ticket for remote troubleshooting. HQ responds via the Support Inbox.
      </PortalPlaceholderNote>

      <PortalCard>
        <h2 className="portal-announcement-title">Your Tickets</h2>
        <div className="portal-ticket-list">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="portal-ticket-row">
              <span className="portal-ticket-id">{ticket.id.slice(0, 12)}</span>
              <PortalTag variant={ticket.status === 'resolved' ? 'resolved' : 'open'}>
                {ticket.status.replace('_', ' ')}
              </PortalTag>
              <span className="portal-ticket-subject">{ticket.subject}</span>
              <span className="portal-ticket-dates">{new Date(ticket.createdAt).toLocaleDateString('en-PH')}</span>
              {ticket.hqNotes ? <p className="portal-announcement-body">HQ: {ticket.hqNotes}</p> : null}
            </div>
          ))}
        </div>
      </PortalCard>

      <PortalCard>
        <h2 className="portal-announcement-title">New Request</h2>
        {submitted ? (
          <p className="portal-success-msg" role="status">Ticket submitted. HQ typically responds within 1 business day.</p>
        ) : null}
        <form className="portal-support-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="portal-field">
            <label htmlFor="support-topic">Topic</label>
            <select id="support-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="portal-field">
            <label htmlFor="support-subject">Subject</label>
            <input id="support-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="portal-field">
            <label htmlFor="support-message">Details</label>
            <textarea id="support-message" value={message} onChange={(e) => setMessage(e.target.value)} required />
          </div>
          <button type="submit" className="portal-btn-primary">Submit Ticket</button>
        </form>
      </PortalCard>
    </PortalLayout>
  );
}
