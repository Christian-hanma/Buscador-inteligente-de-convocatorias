export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'No especificado';
  return `S/ ${value.toLocaleString('es-PE')}`;
}

export function percentTone(value: number): 'green' | 'blue' | 'amber' | 'red' {
  if (value >= 85) return 'green';
  if (value >= 70) return 'blue';
  if (value >= 50) return 'amber';
  return 'red';
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function durationLabel(months: number | null | undefined): string {
  if (months === null || months === undefined) return '—';
  return `${months} mes${months === 1 ? '' : 'es'}`;
}

export function modalityLabel(value?: string | null): string {
  if (!value) return '—';
  const map: Record<string, string> = {
    presencial: 'Presencial',
    remoto: 'Remoto',
    híbrido: 'Híbrido',
    hibrido: 'Híbrido',
    any: 'Cualquiera',
    cualquiera: 'Cualquiera',
  };
  return map[value.toLowerCase()] ?? value;
}

export function contractLabel(value?: string | null): string {
  if (!value) return '—';
  const map: Record<string, string> = {
    cas: 'CAS',
    '728': 'D.L. 728',
    '276': 'D.L. 276',
    planilla: 'Planilla',
    independiente: 'Independiente',
    any: 'Cualquiera',
    cualquiera: 'Cualquiera',
  };
  return map[value.toLowerCase()] ?? value;
}

export function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}