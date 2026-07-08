import { supabase, isSupabaseConfigured } from './supabase';
import {
  portalAnnouncements,
  portalDownloadForms,
  portalManualSections,
  portalTrainingVideos,
} from '../data/portalContent';

export type AnnouncementTag = 'policy' | 'promo' | 'launch' | 'campaign' | 'update' | 'reminder';
export type PortalDocType = 'manual' | 'form' | 'training' | 'resource';

export interface PortalAnnouncement {
  id: string;
  title: string;
  body: string;
  tag: AnnouncementTag;
  pinned: boolean;
  publishedAt: string;
  source: 'live' | 'fallback';
}

export interface PortalDocument {
  id: string;
  docType: PortalDocType;
  title: string;
  description: string;
  fileUrl: string | null;
  format: string;
  section: string | null;
  sortOrder: number;
  updatedAt: string | null;
  source: 'live' | 'fallback';
}

export interface SystemNotice {
  id: string;
  title: string;
  body: string;
  noticeType: 'update' | 'maintenance' | 'security';
  activeFrom: string;
  activeTo: string | null;
}

function mapAnnouncement(row: Record<string, unknown>): PortalAnnouncement {
  return {
    id: String(row.id),
    title: String(row.title),
    body: String(row.body),
    tag: String(row.tag) as AnnouncementTag,
    pinned: Boolean(row.pinned),
    publishedAt: String(row.published_at),
    source: 'live',
  };
}

function mapDocument(row: Record<string, unknown>): PortalDocument {
  return {
    id: String(row.id),
    docType: String(row.doc_type) as PortalDocType,
    title: String(row.title),
    description: String(row.description ?? ''),
    fileUrl: row.file_url ? String(row.file_url) : null,
    format: String(row.format ?? 'PDF'),
    section: row.section ? String(row.section) : null,
    sortOrder: Number(row.sort_order ?? 0),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    source: 'live',
  };
}

function fallbackAnnouncements(): PortalAnnouncement[] {
  return portalAnnouncements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    tag: a.tag.toLowerCase() as AnnouncementTag,
    pinned: Boolean(a.pinned),
    publishedAt: `${a.date}T00:00:00Z`,
    source: 'fallback' as const,
  }));
}

function fallbackDocuments(type: PortalDocType): PortalDocument[] {
  if (type === 'manual') {
    return portalManualSections.flatMap((sec) =>
      sec.items.map((item, idx) => ({
        id: item.id,
        docType: 'manual' as const,
        title: item.title,
        description: `${sec.title} · ${item.pages}`,
        fileUrl: null,
        format: 'PDF',
        section: sec.title,
        sortOrder: idx,
        updatedAt: null,
        source: 'fallback' as const,
      }))
    );
  }
  if (type === 'form') {
    return portalDownloadForms.map((f, idx) => ({
      id: f.id,
      docType: 'form' as const,
      title: f.title,
      description: f.description,
      fileUrl: null,
      format: f.format,
      section: null,
      sortOrder: idx,
      updatedAt: f.updated,
      source: 'fallback' as const,
    }));
  }
  if (type === 'training') {
    return portalTrainingVideos.map((v, idx) => ({
      id: v.id,
      docType: 'training' as const,
      title: v.title,
      description: `${v.category} · ${v.duration}${v.status === 'coming_soon' ? ' · Coming soon' : ''}`,
      fileUrl: null,
      format: 'Video',
      section: v.category,
      sortOrder: idx,
      updatedAt: null,
      source: 'fallback' as const,
    }));
  }
  return [];
}

export async function fetchAnnouncements(
  brandId: string,
  tag?: AnnouncementTag
): Promise<PortalAnnouncement[]> {
  if (!isSupabaseConfigured()) return filterByTag(fallbackAnnouncements(), tag);

  let query = supabase
    .from('portal_announcement')
    .select('*')
    .eq('brand_id', brandId)
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false });

  if (tag) query = query.eq('tag', tag);

  const { data, error } = await query;
  if (error || !data?.length) return filterByTag(fallbackAnnouncements(), tag);
  return filterByTag((data as Record<string, unknown>[]).map(mapAnnouncement), tag);
}

function filterByTag(items: PortalAnnouncement[], tag?: AnnouncementTag) {
  if (!tag) return items;
  return items.filter((a) => a.tag === tag);
}

export async function fetchDocuments(
  brandId: string,
  docType: PortalDocType
): Promise<PortalDocument[]> {
  if (!isSupabaseConfigured()) return fallbackDocuments(docType);

  const { data, error } = await supabase
    .from('portal_document')
    .select('*')
    .eq('brand_id', brandId)
    .eq('doc_type', docType)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return fallbackDocuments(docType);
  return (data as Record<string, unknown>[]).map(mapDocument);
}

export async function fetchActiveSystemNotices(brandId: string): Promise<SystemNotice[]> {
  if (!isSupabaseConfigured()) return [];

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('system_notice')
    .select('*')
    .eq('brand_id', brandId)
    .lte('active_from', now)
    .order('active_from', { ascending: false });

  if (error || !data) return [];

  return (data as Record<string, unknown>[])
    .filter((row) => {
      const end = row.active_to ? String(row.active_to) : null;
      return !end || end >= now;
    })
    .map((row) => ({
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
      noticeType: row.notice_type as SystemNotice['noticeType'],
      activeFrom: String(row.active_from),
      activeTo: row.active_to ? String(row.active_to) : null,
    }));
}

// HQ CRUD
export async function createAnnouncement(input: {
  brandId: string;
  title: string;
  body: string;
  tag: AnnouncementTag;
  pinned?: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('portal_announcement').insert({
    brand_id: input.brandId,
    title: input.title,
    body: input.body,
    tag: input.tag,
    pinned: input.pinned ?? false,
  });
  return { error: error?.message ?? null };
}

export async function deleteAnnouncement(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('portal_announcement').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function createDocument(input: {
  brandId: string;
  docType: PortalDocType;
  title: string;
  description: string;
  fileUrl?: string;
  format?: string;
  section?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('portal_document').insert({
    brand_id: input.brandId,
    doc_type: input.docType,
    title: input.title,
    description: input.description,
    file_url: input.fileUrl ?? null,
    format: input.format ?? 'PDF',
    section: input.section ?? null,
    updated_at: new Date().toISOString().slice(0, 10),
  });
  return { error: error?.message ?? null };
}

export async function deleteDocument(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('portal_document').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function createSystemNotice(input: {
  brandId: string;
  title: string;
  body: string;
  noticeType: SystemNotice['noticeType'];
  activeTo?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('system_notice').insert({
    brand_id: input.brandId,
    title: input.title,
    body: input.body,
    notice_type: input.noticeType,
    active_to: input.activeTo ?? null,
  });
  return { error: error?.message ?? null };
}

export async function fetchAllSystemNotices(brandId: string): Promise<SystemNotice[]> {
  const { data, error } = await supabase
    .from('system_notice')
    .select('*')
    .eq('brand_id', brandId)
    .order('active_from', { ascending: false });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    body: String(row.body),
    noticeType: row.notice_type as SystemNotice['noticeType'],
    activeFrom: String(row.active_from),
    activeTo: row.active_to ? String(row.active_to) : null,
  }));
}
