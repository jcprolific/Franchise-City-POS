const MANILA_TIMEZONE = 'Asia/Manila';

function getDatePartsInTimezone(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
}

export function getManilaIsoDateKey(date: Date = new Date()) {
  const { year, month, day } = getDatePartsInTimezone(date, MANILA_TIMEZONE);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function isSameManilaDate(dateInput: string | Date, manilaDateKey: string) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return false;
  }
  return getManilaIsoDateKey(d) === manilaDateKey;
}

export function toManilaTimeLabel(dateInput: string | Date) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return '--';
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

