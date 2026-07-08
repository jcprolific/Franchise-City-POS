export type AnnouncementTag = 'Policy' | 'Promo' | 'Reminder' | 'Update';

export interface Announcement {
  id: string;
  title: string;
  date: string;
  tag: AnnouncementTag;
  pinned?: boolean;
  body: string;
}

export interface ManualSection {
  id: string;
  title: string;
  items: { id: string; title: string; pages: string }[];
}

export interface TrainingVideo {
  id: string;
  title: string;
  duration: string;
  category: string;
  status: 'available' | 'coming_soon';
}

export interface DownloadForm {
  id: string;
  title: string;
  description: string;
  format: string;
  updated: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'resolved';
  created: string;
  lastUpdate: string;
}

export interface ReportSnapshot {
  label: string;
  value: string;
  note: string;
}

export const portalAnnouncements: Announcement[] = [
  {
    id: 'ann-price-july',
    title: 'July 2026 Supply Price Update',
    date: '2026-07-01',
    tag: 'Update',
    pinned: true,
    body: 'Fruit series syrups adjust by ₱5–8 per pack starting July 7. Use the updated PO form when placing your next supply order.',
  },
  {
    id: 'ann-summer-promo',
    title: 'Summer Duo Promo — July 8–31',
    date: '2026-07-05',
    tag: 'Promo',
    body: 'Buy any 22oz drink + sinker add-on and get ₱20 off. POS promo code: SUMMERDUO. Poster assets are in Download Forms.',
  },
  {
    id: 'ann-daily-report',
    title: 'Daily Sales Report Reminder',
    date: '2026-06-28',
    tag: 'Reminder',
    body: 'Submit your end-of-day sales summary by 10:00 PM. Use the Daily Sales Report form if your branch POS sync is offline.',
  },
  {
    id: 'ann-uniform',
    title: 'Uniform Policy — New Staff',
    date: '2026-06-15',
    tag: 'Policy',
    body: 'All new hires must wear the approved Coftea apron and name tag during opening week. Request replacements via Support Tickets.',
  },
];

export const portalManualSections: ManualSection[] = [
  {
    id: 'opening',
    title: 'Opening & Closing',
    items: [
      { id: 'm-open-checklist', title: 'Store Opening Checklist', pages: '4 pages' },
      { id: 'm-close-checklist', title: 'End-of-Day Closing', pages: '3 pages' },
      { id: 'm-cash-count', title: 'Cash Drawer Count', pages: '2 pages' },
    ],
  },
  {
    id: 'beverages',
    title: 'Beverage Preparation',
    items: [
      { id: 'm-milk-tea', title: 'Classic Milk Tea Standards', pages: '6 pages' },
      { id: 'm-fruit-tea', title: 'Fruit Tea & Sinkers', pages: '5 pages' },
      { id: 'm-espresso', title: 'Coffee & Espresso Drinks', pages: '4 pages' },
    ],
  },
  {
    id: 'service',
    title: 'Customer Service',
    items: [
      { id: 'm-greeting', title: 'Greeting & Order Taking', pages: '2 pages' },
      { id: 'm-complaints', title: 'Handling Complaints', pages: '3 pages' },
    ],
  },
];

export const portalTrainingVideos: TrainingVideo[] = [
  { id: 'tv-1', title: 'Welcome to Coftea — Brand Standards', duration: '8 min', category: 'Orientation', status: 'available' },
  { id: 'tv-2', title: 'POS Basics: Ring Up & Payment', duration: '12 min', category: 'Operations', status: 'available' },
  { id: 'tv-3', title: 'Milk Tea Preparation', duration: '15 min', category: 'Bar Training', status: 'available' },
  { id: 'tv-4', title: 'Inventory Count & Receiving', duration: '10 min', category: 'Operations', status: 'available' },
  { id: 'tv-5', title: 'Upselling Add-ons & Combos', duration: '7 min', category: 'Sales', status: 'coming_soon' },
  { id: 'tv-6', title: 'Food Safety & Hygiene', duration: '11 min', category: 'Compliance', status: 'coming_soon' },
];

export const portalDownloadForms: DownloadForm[] = [
  {
    id: 'f-po',
    title: 'Purchase Order Form 2026',
    description: 'Official supply order sheet for HQ commissary.',
    format: 'XLSX',
    updated: '2026-06-01',
  },
  {
    id: 'f-daily-sales',
    title: 'Daily Sales Report',
    description: 'Manual EOD summary when POS sync is unavailable.',
    format: 'PDF',
    updated: '2026-05-10',
  },
  {
    id: 'f-incident',
    title: 'Incident Report',
    description: 'Document spills, equipment issues, or customer incidents.',
    format: 'PDF',
    updated: '2026-04-22',
  },
  {
    id: 'f-leave',
    title: 'Staff Leave Request',
    description: 'Shift coverage and leave approval form.',
    format: 'PDF',
    updated: '2026-03-15',
  },
  {
    id: 'f-promo-poster',
    title: 'Summer Duo Promo Poster',
    description: 'Print-ready counter poster for July promo.',
    format: 'PDF',
    updated: '2026-07-05',
  },
];

export const portalSampleTickets: SupportTicket[] = [
  {
    id: 'TKT-1042',
    subject: 'Receipt printer not connecting',
    status: 'resolved',
    created: '2026-07-02',
    lastUpdate: '2026-07-03',
  },
  {
    id: 'TKT-1048',
    subject: 'Request: extra aprons (size M)',
    status: 'open',
    created: '2026-07-07',
    lastUpdate: '2026-07-07',
  },
];

export const portalReportSnapshots: ReportSnapshot[] = [
  { label: 'Today\'s Sales', value: '₱18,420', note: 'As of 10:30 AM · sample data' },
  { label: 'Orders Today', value: '124', note: '+8% vs yesterday · sample data' },
  { label: 'Avg. Order', value: '₱148', note: 'Last 7 days · sample data' },
  { label: 'Top Seller', value: 'Brown Sugar Milk Tea', note: '42 cups today · sample data' },
];

export const portalWeeklySales = [
  { day: 'Mon', amount: 16200 },
  { day: 'Tue', amount: 14800 },
  { day: 'Wed', amount: 17100 },
  { day: 'Thu', amount: 18420 },
  { day: 'Fri', amount: 0 },
  { day: 'Sat', amount: 0 },
  { day: 'Sun', amount: 0 },
];

export const portalLowStockItems = [
  { name: 'Wintermelon Syrup', qty: '1 pack', threshold: '2 packs' },
  { name: '16oz Cups', qty: '85 pcs', threshold: '150 pcs' },
  { name: 'Black Pearls', qty: '1.2 kg', threshold: '2 kg' },
];
