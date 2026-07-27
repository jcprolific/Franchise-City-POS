import { supabase, isSupabaseConfigured } from './supabase';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface SupportTicket {
  id: string;
  branchId: string | null;
  topic: string;
  subject: string;
  message: string;
  status: TicketStatus;
  createdBy: string;
  hqNotes: string;
  createdAt: string;
  updatedAt: string;
  source: 'live' | 'fallback';
}

const LOCAL_KEY = 'coftea.portal.localTickets';

function mapRow(row: Record<string, unknown>): SupportTicket {
  return {
    id: String(row.id),
    branchId: row.branch_id ? String(row.branch_id) : null,
    topic: String(row.topic),
    subject: String(row.subject),
    message: String(row.message),
    status: String(row.status) as TicketStatus,
    createdBy: String(row.created_by ?? ''),
    hqNotes: String(row.hq_notes ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    source: 'live',
  };
}

function readLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SupportTicket[];
  } catch {
    return [];
  }
}

function writeLocalTickets(tickets: SupportTicket[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(tickets));
}

export async function fetchSupportTickets(
  brandId: string,
  branchId?: string
): Promise<SupportTicket[]> {
  const filterForBranch = (tickets: SupportTicket[]) => {
    if (!branchId) return tickets;
    // Strict: franchisee portal only sees tickets for their branch (no null/other).
    return tickets.filter((t) => t.branchId === branchId);
  };

  if (!isSupabaseConfigured()) {
    return filterForBranch(readLocalTickets());
  }

  let query = supabase
    .from('support_ticket')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (branchId) query = query.eq('branch_id', branchId);

  const { data, error } = await query;
  if (error) {
    return filterForBranch(readLocalTickets());
  }
  if (!data?.length) {
    // Empty live result — do not leak sample/fallback tickets across branches.
    return filterForBranch(readLocalTickets());
  }
  return (data as Record<string, unknown>[]).map(mapRow);
}

export async function createSupportTicket(input: {
  brandId: string;
  branchId: string;
  topic: string;
  subject: string;
  message: string;
  createdBy: string;
}): Promise<{ id: string | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    const ticket: SupportTicket = {
      id: `LOCAL-${Date.now()}`,
      branchId: input.branchId,
      topic: input.topic,
      subject: input.subject,
      message: input.message,
      status: 'open',
      createdBy: input.createdBy,
      hqNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'fallback',
    };
    writeLocalTickets([ticket, ...readLocalTickets()]);
    return { id: ticket.id, error: null };
  }

  const { data, error } = await supabase
    .from('support_ticket')
    .insert({
      brand_id: input.brandId,
      branch_id: input.branchId,
      topic: input.topic,
      subject: input.subject,
      message: input.message,
      created_by: input.createdBy,
      status: 'open',
    })
    .select('id')
    .single();

  if (error || !data) return { id: null, error: error?.message ?? 'insert-failed' };
  return { id: String((data as { id: string }).id), error: null };
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  hqNotes?: string
): Promise<{ error: string | null }> {
  if (ticketId.startsWith('LOCAL-') || ticketId.startsWith('TKT-')) {
    return { error: null };
  }

  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (hqNotes !== undefined) payload.hq_notes = hqNotes;

  const { error } = await supabase.from('support_ticket').update(payload).eq('id', ticketId);
  return { error: error?.message ?? null };
}

export async function fetchAllTicketsForHq(brandId: string): Promise<SupportTicket[]> {
  return fetchSupportTickets(brandId);
}
