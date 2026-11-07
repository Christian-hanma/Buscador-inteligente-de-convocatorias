function todayInLima() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDateOnly(value) {
  if (!value) return null;
  const text = String(value).trim();
  let match = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (match) return validDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = text.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
  if (match) return validDate(Number(match[3]), Number(match[2]), Number(match[1]));

  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  match = normalized.match(/\b(\d{1,2})\s*(?:de\s*)?(diciembre|noviembre|nov|octubre|oct|setiembre|septiembre|sep|set|agosto|ago|julio|jul|junio|jun|mayo|may|abril|abr|marzo|mar|febrero|feb|enero|ene)\.?\s*(?:de\s*)?(20\d{2})?(?=\s|$|[,;])/);
  if (!match) return null;

  const monthNames = {
    ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3,
    abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, junio: 6,
    jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, set: 9,
    septiembre: 9, setiembre: 9, oct: 10, octubre: 10,
    nov: 11, noviembre: 11, dic: 12, diciembre: 12,
  };
  const month = monthNames[match[2]];
  const year = Number(match[3] || todayInLima().slice(0, 4));
  return validDate(year, month, Number(match[1]));
}

export function isOfferExpired(offer, today = todayInLima()) {
  if (['expired', 'closed', 'cerrada', 'cerrado'].includes(String(offer?.status || '').toLowerCase())) return true;
  const closingDate = parseDateOnly(offer?.fecha_cierre);
  return Boolean(closingDate && closingDate < today);
}

export function activeOfferStatus(offer) {
  const currentStatus = String(offer?.status || 'active').toLowerCase();
  if (['closed', 'cerrada', 'cerrado'].includes(currentStatus)) return 'closed';
  return isOfferExpired(offer) ? 'expired' : currentStatus;
}
