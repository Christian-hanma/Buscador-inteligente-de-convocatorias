import { isOfferExpired } from '../utils/dates.js';

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isAny(value, plurals = []) {
  return ['', 'any', 'cualquiera', 'todas', 'todos', ...plurals].includes(normalize(value));
}

function canonicalModality(value) {
  const normalized = normalize(value);
  if (/\b(remoto|remota|teletrabajo|distancia)\b/.test(normalized)) return 'remoto';
  if (/\b(hibrido|hibrida|mixto|mixta)\b/.test(normalized)) return 'hibrido';
  if (/\b(presencial|presencialidad)\b/.test(normalized)) return 'presencial';
  return normalized;
}

function canonicalContract(value) {
  const normalized = normalize(value);
  if (/\bcas\b|contrato administrativo de servicios/.test(normalized)) return 'cas';
  if (/\b728\b/.test(normalized)) return '728';
  if (/\b276\b/.test(normalized)) return '276';
  if (/planilla|indefinido|plazo fijo/.test(normalized)) return 'planilla';
  if (/independiente|locacion de servicios|honorarios/.test(normalized)) return 'independiente';
  return normalized;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Aplica las preferencias declaradas usando valores normalizados y fechas de cierre reales. */
export function evaluateHardFilters({ config, offer }) {
  const reasons = [];
  if (!config) return { result: 'PASS', reasons };

  if (isOfferExpired(offer)) {
    reasons.push(`Convocatoria vencida${offer.fecha_cierre ? ` el ${offer.fecha_cierre}` : ''}`);
  }

  const sueldoMin = Number(config.sueldo_minimo);
  const sueldoMax = Number(config.sueldo_maximo);
  const hasSalaryRange = (Number.isFinite(sueldoMin) && sueldoMin > 0) || (Number.isFinite(sueldoMax) && sueldoMax > 0);
  if (hasSalaryRange && (offer.sueldo === null || offer.sueldo === undefined)) {
    reasons.push('La oferta no indica sueldo y no se puede comprobar el rango configurado');
  } else if (offer.sueldo !== null && offer.sueldo !== undefined) {
    if (Number.isFinite(sueldoMin) && sueldoMin > 0 && offer.sueldo < sueldoMin) {
      reasons.push(`Sueldo (S/ ${offer.sueldo}) por debajo del mínimo configurado (S/ ${sueldoMin})`);
    }
    if (Number.isFinite(sueldoMax) && sueldoMax > 0 && offer.sueldo > sueldoMax) {
      reasons.push(`Sueldo (S/ ${offer.sueldo}) supera el máximo configurado (S/ ${sueldoMax})`);
    }
  }

  if (config.excluir_penalizaciones === true && offer.penalizacion === true) {
    reasons.push('Oferta con penalización contractual (excluida por tu configuración)');
  }

  const minDur = Number(config.duracion_min_meses);
  const maxDur = Number(config.duracion_max_meses);
  const hasDurationRange = (Number.isFinite(minDur) && minDur > 0) || (Number.isFinite(maxDur) && maxDur > 0);
  if (hasDurationRange && (offer.duracion === null || offer.duracion === undefined)) {
    reasons.push('La oferta no especifica duración y no se puede comprobar el rango configurado');
  } else if (offer.duracion !== null && offer.duracion !== undefined) {
    if (Number.isFinite(minDur) && minDur > 0 && offer.duracion < minDur) {
      reasons.push(`Duración (${offer.duracion} meses) menor al mínimo configurado (${minDur})`);
    }
    if (Number.isFinite(maxDur) && maxDur > 0 && offer.duracion > maxDur) {
      reasons.push(`Duración (${offer.duracion} meses) supera el máximo configurado (${maxDur})`);
    }
  }

  const preferredLocations = asArray(config.ubicaciones_preferidas).map(normalize).filter(Boolean);
  if (preferredLocations.length) {
    const offerLocation = normalize(offer.ubicacion);
    const matchesLocation = preferredLocations.some((location) => offerLocation.includes(location));
    if (!offerLocation) reasons.push('La oferta no indica ubicación y no se puede comprobar tu zona preferida');
    else if (!matchesLocation) reasons.push(`Ubicación (${offer.ubicacion}) fuera de tus zonas preferidas`);
  }

  if (!isAny(config.modalidad)) {
    const wanted = canonicalModality(config.modalidad);
    if (!offer.modalidad) reasons.push('La oferta no especifica modalidad y no se puede comprobar tu preferencia');
    else if (canonicalModality(offer.modalidad) !== wanted) {
      reasons.push(`Modalidad (${offer.modalidad}) distinta a la configurada (${config.modalidad})`);
    }
  }

  if (!isAny(config.tipo_contrato)) {
    const wanted = canonicalContract(config.tipo_contrato);
    if (!offer.tipo_contrato) reasons.push('La oferta no especifica contrato y no se puede comprobar tu preferencia');
    else if (canonicalContract(offer.tipo_contrato) !== wanted) {
      reasons.push(`Tipo de contrato (${offer.tipo_contrato}) distinto al configurado (${config.tipo_contrato})`);
    }
  }

  return { result: reasons.length ? 'REJECT' : 'PASS', reasons };
}
