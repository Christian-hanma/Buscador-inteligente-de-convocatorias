import { parseJson, clampInt } from '../../utils/index.js';

const STOPWORDS = new Set([
  'para', 'con', 'una', 'que', 'los', 'las', 'sus', 'der', 'del', 'al', 'por', 'se', 'su',
  'como', 'más', 'mas', 'entre', 'ser', 'esta', 'este', 'sobre', 'tener', 'cuenta',
  'deberá', 'deberan', 'será', 'seran', 'han', 'tener', 'realizar', 'funciones', 'perfil',
  'proceso', 'convocatoria', 'ofertas', 'puesto', 'cargo', 'solicita', 'requisitos',
  'requeridos', 'contar', 'postular', 'inscripción', 'inscripcion', 'registro', 'documentos',
  'acreditar', 'presentar', 'acorde', 'señalado', 'señalados', 'siguientes', 'informacion',
  'información', 'sistema', 'general', 'modalidad', 'contrato', 'convocatoria', 'cas', 'plazo',
]);

/** Señales críticas que, si están en la oferta pero no en el CV/perfil, marcan brecha. */
const CRITICAL_SIGNALS = [
  { text: 'colegiatura', label: 'Colegiatura profesional' },
  { text: 'colegiado', label: 'Colegiado' },
  { text: 'título profesional', label: 'Título profesional' },
  { text: 'titulo profesional', label: 'Título profesional' },
  { text: 'licenciatura', label: 'Licenciatura' },
  { text: 'sector público', label: 'Experiencia en el sector público' },
  { text: 'sector publico', label: 'Experiencia en el sector público' },
  { text: 'entidad pública', label: 'Experiencia en entidades públicas' },
  { text: 'entidad publica', label: 'Experiencia en entidades públicas' },
  { text: 'mínima de 3 años', label: 'Mínimo 3 años de experiencia' },
  { text: 'minima de 3 años', label: 'Mínimo 3 años de experiencia' },
  { text: '3 años', label: '3 años de experiencia' },
  { text: 'certificación', label: 'Certificación' },
  { text: 'certificacion', label: 'Certificación' },
  { text: 'nivel de inglés', label: 'Nivel de inglés' },
  { text: 'ingles', label: 'Nivel de inglés' },
];

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(text) {
  return new Set(
    normalize(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  );
}

function clampScore(value) {
  return clampInt(value, 0, 100, 0);
}

function overlapScore(src, offerTokens, base) {
  if (!src.size || !offerTokens.size) return clampScore(base);
  let hits = 0;
  for (const token of src) {
    if (offerTokens.has(token)) hits += 1;
  }
  const coverage = hits / Math.min(src.size, offerTokens.size);
  return clampScore(Math.min(95, base + coverage * 110));
}

function detectSignals(text) {
  const norm = normalize(text);
  return CRITICAL_SIGNALS.filter((s) => norm.includes(s.text));
}

function sharedTokens(profileTokens, offerTokens, limit = 5) {
  const shared = [];
  for (const token of offerTokens) {
    if (profileTokens.has(token)) shared.push(token);
  }
  return shared.slice(0, limit);
}

export function mockEvaluateForOffer({ profile, config, offer }) {
  const offerText = `${offer.titulo} ${offer.texto_completo || ''}`;
  const offerTokens = tokenize(offerText);

  const careerTokens = tokenize(`${profile.carrera || ''} ${profile.nivel_estudios || ''}`);
  const experienceTokens = tokenize(`${profile.experiencia || ''} ${profile.informacion_adicional || ''}`);
  const cvTokens = tokenize(`${profile.cv_texto || ''} ${profile.experiencia || ''} ${profile.informacion_adicional || ''}`);

  const education_score = overlapScore(careerTokens, offerTokens, 45);
  const experience_score = overlapScore(experienceTokens, offerTokens, 40);
  const skills_score = overlapScore(cvTokens, offerTokens, 40);

  const preferidas = parseJson(config.ubicaciones_preferidas || '[]', []);
  let location_score = 90;
  if (offer.ubicacion) {
    const normOffer = normalize(offer.ubicacion);
    if (preferidas.some((u) => normalize(u) === normOffer)) location_score = 100;
    else if (profile.ubicacion_actual && normalize(profile.ubicacion_actual) === normOffer) location_score = 100;
    else if (preferidas.length) location_score = 15;
    else location_score = 75;
  }

  let remuneration_score = 80;
  const min = Number(config.sueldo_minimo);
  const max = Number(config.sueldo_maximo);
  if (offer.sueldo !== null && offer.sueldo !== undefined) {
    if (Number.isFinite(min) && offer.sueldo < min) remuneration_score = 20;
    else if (Number.isFinite(max) && offer.sueldo > max) remuneration_score = 55;
    else remuneration_score = 100;
  }

  let contract_score = 100;
  if (offer.penalizacion === 1 && config.excluir_penalizaciones !== 1) contract_score -= 30;
  if (offer.duracion && Number(config.duracion_max_meses) > 0 && offer.duracion > Number(config.duracion_max_meses)) contract_score -= 25;
  if (config.modalidad && config.modalidad !== 'any' && offer.modalidad && normalize(config.modalidad) !== normalize(offer.modalidad)) contract_score -= 12;
  if (config.tipo_contrato && config.tipo_contrato !== 'any' && offer.tipo_contrato && normalize(config.tipo_contrato) !== normalize(offer.tipo_contrato)) contract_score -= 12;

  const profileText = `${profile.cv_texto || ''} ${profile.experiencia || ''} ${profile.carrera || ''}`;
  const gaps = [];
  const strengths = [];

  const signalsInOffer = detectSignals(offerText);
  for (const signal of signalsInOffer) {
    if (!normalize(profileText).includes(signal.text)) {
      gaps.push(`La oferta solicita "${signal.label}" y no aparece en tu perfil/CV`);
    } else {
      strengths.push(`Cumples con "${signal.label}" declarado`); 
    }
  }

  const matchedSignals = strengths.length;
  const shared = sharedTokens(cvTokens, offerTokens, 4);
  if (shared.length >= 2) {
    strengths.push(`Tu perfil cubre temas clave de la oferta: ${shared.join(', ')}`);
  } else if (shared.length === 1) {
    strengths.push(`Tu perfil menciona "${shared[0]}", relacionado con la oferta`);
  }

  if (education_score >= 80) strengths.push('Tu formación se alinea con el área de la oferta');
  else if (education_score < 60) gaps.push('Tu formación declarada se aleja del área solicitada');

  if (experience_score < 55) gaps.push('Tu experiencia declarada cubre pocas funciones de la oferta');

  if (offer.ubicacion && location_score < 60) {
    gaps.push(`La oferta es en "${offer.ubicacion}" y tus zonas preferidas/ubicación actual no la incluyen`);
  }
  if (contract_score < 80) {
    gaps.push('Las condiciones contractuales difieren de tus preferencias');
  }
  if (remuneration_score < 100) {
    gaps.push('La remuneración publicada está por debajo del rango esperado');
  }

  strengths.push('La respuesta se basa exclusivamente en información real declarada');

  const adaptedNivel =
    profile.carrera && profile.carrera.toLowerCase().includes('contab')
      ? 'área contable'
      : profile.carrera ? 'tu área de formación' : 'tu formación';

  const overall = `Análisis simulado (modo mock, sin llamada a OpenAI): alineación alta en ${adaptedNivel} (${education_score}/100), experiencia de ${experience_score}/100 y habilidades de ${skills_score}/100, ubicación de ${location_score}/100, remuneración de ${remuneration_score}/100 y condiciones contractuales de ${contract_score}/100. ${gaps.length ? `Brechas detectadas: ${gaps.join('. ')}` : 'Sin brechas importantes.'} El porcentaje final se calcula en el servidor con pesos configurables.`;

  return {
    education_score: clampScore(education_score),
    experience_score: clampScore(experience_score),
    skills_score: clampScore(skills_score),
    location_score: clampScore(location_score),
    remuneration_score: clampScore(remuneration_score),
    contract_score: clampScore(contract_score),
    overall_analysis: overall,
    strengths: strengths.slice(0, 6),
    gaps: Array.from(new Set(gaps)).slice(0, 6),
  };
}

export function mockAdaptCv({ profile, offer }) {
  const offerTokens = tokenize(`${offer.titulo} ${offer.texto_completo || ''}`);
  const cvTokens = tokenize(`${profile.cv_texto || ''} ${profile.experiencia || ''}`);
  const relevantSkills = sharedTokens(cvTokens, offerTokens, 8);

  const profileText = `${profile.cv_texto || ''} ${profile.experiencia || ''}`;
  const gaps = detectSignals(`${offer.titulo} ${offer.texto_completo || ''}`)
    .filter((s) => !normalize(profileText).includes(s.text))
    .map((s) => s.label);

  const resumen = profile.cv_texto
    ? extraerResumen(profile.cv_texto)
    : `${profile.nombre_completo}, ${profile.nivel_estudios || 'profesional'} en ${profile.carrera || 'formación afín'}, con experiencia mapeada hacia las funciones del puesto.`;

  const sections = [];
  sections.push(`# ${profile.nombre_completo || 'Candidato'}`);
  sections.push('');
  sections.push(
    `${profile.carrera || ''}${profile.nivel_estudios ? ` · ${profile.nivel_estudios}` : ''}${profile.ubicacion_actual ? ` · ${profile.ubicacion_actual}` : ''}`
  );
  sections.push('');
  sections.push(`**Puesto objetivo:** ${offer.titulo}`);
  sections.push('');
  sections.push('## PERFIL PROFESIONAL');
  sections.push(resumen);
  sections.push('');
  sections.push('## EXPERIENCIA RELEVANTE');
  sections.push(profile.experiencia || profile.cv_texto || 'Sin experiencia declarada todavía.');
  sections.push('');
  sections.push('## FORMACIÓN');
  sections.push(`${profile.nivel_estudios || 'Formación declarada'} en ${profile.carrera || 'carrera declarada en el perfil'}.`);
  sections.push('');
  sections.push('## HABILIDADES CLAVE PARA LA OFERTA');
  sections.push(relevantSkills.length ? relevantSkills.map((s) => `- ${s}`).join('\n') : '- Las habilidades se listan tal cual figuran en el CV base.');
  sections.push('');
  if (gaps.length) {
    sections.push('## INFORMACIÓN SUGERIDA (NO DECLARADA)');
    sections.push(`No se ha inventado ninguna experiencia. Para fortalecer la postulación, conviene añadir o acreditar: ${gaps.join(', ')}.`);
    sections.push('');
  }
  sections.push('---');
  sections.push('_Documento adaptado únicamente con información real declarada por el candidato. Modo mock (sin llamada a OpenAI)._');

  return sections.join('\n');
}

function extraerResumen(cv) {
  const lines = String(cv).split('\n').map((l) => l.trim()).filter(Boolean);
  const hooks = lines.filter((l) => /(perfil|resumen|objetivo)/i.test(l));
  if (hooks.length) return hooks[0].replace(/^(perfil|resumen|objetivo)\s*:?\s*/i, '');
  return lines.slice(0, 3).join(' ');
}