/**
 * Filtros duros determinísticos. Deciden PASS o REJECT SIN gastar una
 * llamada a OpenAI. La ubicación se evalúa como "soft" (sólo puntaje) a
 * propósito: el sistema debe poder mostrar ofertas "compatibles pero lejos".
 */
export function evaluateHardFilters({ config, offer }) {
  const reasons = [];

  if (!config) {
    return { result: 'PASS', reasons };
  }

  const sueldoMin = Number(config.sueldo_minimo);
  const sueldoMax = Number(config.sueldo_maximo);

  if (Number.isFinite(sueldoMin) && sueldoMin > 0) {
    if (offer.sueldo === null || offer.sueldo === undefined || offer.sueldo < sueldoMin) {
      const offered = offer.sueldo ?? 'no especificado';
      reasons.push(
        `Sueldo (${offered === 'no especificado' ? offered : `S/ ${offered}`}) por debajo del mínimo configurado (S/ ${sueldoMin})`
      );
    }
  }

  if (Number.isFinite(sueldoMax) && sueldoMax > 0 && offer.sueldo !== null && offer.sueldo > sueldoMax) {
    reasons.push(`Sueldo (S/ ${offer.sueldo}) supera el máximo configurado (S/ ${sueldoMax})`);
  }

  if (config.excluir_penalizaciones === 1 && offer.penalizacion === 1) {
    reasons.push('Oferta con penalización contractual (excluida por tu configuración)');
  }

  const minDur = Number(config.duracion_min_meses);
  const maxDur = Number(config.duracion_max_meses);

  if (Number.isFinite(minDur) && minDur > 0 && offer.duracion && offer.duracion < minDur) {
    reasons.push(`Duración (${offer.duracion} meses) menor al mínimo configurado (${minDur})`);
  }
  if (Number.isFinite(maxDur) && maxDur > 0 && offer.duracion && offer.duracion > maxDur) {
    reasons.push(`Duración (${offer.duracion} meses) supera el máximo configurado (${maxDur})`);
  }

  const modalidad = String(config.modalidad || '');
  const anyModalidad = ['', 'any', 'cualquiera', 'todas'].includes(modalidad.toLowerCase());
  if (!anyModalidad && offer.modalidad && offer.modalidad.toLowerCase() !== modalidad.toLowerCase()) {
    reasons.push(`Modalidad (${offer.modalidad}) distinta a la configurada (${modalidad})`);
  }

  const contrato = String(config.tipo_contrato || '');
  const anyContrato = ['', 'any', 'cualquiera', 'todos'].includes(contrato.toLowerCase());
  if (!anyContrato && offer.tipo_contrato && offer.tipo_contrato.toLowerCase() !== contrato.toLowerCase()) {
    reasons.push(`Tipo de contrato (${offer.tipo_contrato}) distinto al configurado (${contrato})`);
  }

  return { result: reasons.length ? 'REJECT' : 'PASS', reasons };
}