import OpenAI from 'openai';
import { env } from '../config/env.js';
import { clampScore } from '../config/score.js';
import { mockEvaluateForOffer, mockAdaptCv } from './ai/mock.provider.js';
import { parseJson } from '../utils/index.js';

/** Proveedor mock/humano determinístico: documenta el modo en el resultado. */
export const AI_MODE = env.OPENAI_USE_MOCK || !env.OPENAI_API_KEY ? 'mock' : 'openai';

const AI_PROVIDER = env.OPENAI_BASE_URL ? 'openai-compatible' : 'openai';

let client = null;

function getClient() {
  if (!env.OPENAI_API_KEY || env.OPENAI_USE_MOCK) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL || undefined,
      timeout: 25000,
    });
  }
  return client;
}

const MATCHING_SYSTEM_PROMPT = `Eres un evaluador objetivo de compatibilidad entre un perfil profesional
y una oferta laboral. Tu tarea es devolver un JSON EXACTO con esta forma (sin texto adicional):

{
  "education_score": 0-100,
  "experience_score": 0-100,
  "skills_score": 0-100,
  "location_score": 0-100,
  "remuneration_score": 0-100,
  "contract_score": 0-100,
  "overall_analysis": "párrafo en español explicando la compatibilidad",
  "strengths": ["frase en español"],
  "gaps": ["frase en español"]
}

REGLAS ESTRICTAS:
- Nunca inventes experiencia, empleos, estudios, certificaciones, herramientas ni idiomas que el
  candidato no haya declarado.
- Basa cada puntaje SOLO en la información declarada del perfil y del CV.
- Los scores deben ser consistentes: si falta una habilidad, baja el puntaje correspondiente y
  menciónala en gaps.
- Redacta strengths y gaps en español, concretos y accionables.
- Si el candidato no declara una habilidad que la oferta pide, es una brecha, no una fortaleza.
- No menciones información personal sensible (DNI, dirección) en el análisis.`;

const CV_SYSTEM_PROMPT = `Eres un experto en redacción de CV. Debes ADAPTAR un CV base a una oferta laboral
sin inventar absolutamente NADA.

PERMITIDO:
- Reorganizar secciones y reordenar experiencias según relevancia para la oferta.
- Mejorar redacción de lo que YA está declarado.
- Adaptar el resumen profesional, seleccionando habilidades reales relevantes para la oferta.
- Mencionar explícitamente qué falta (brechas) si el CV no cubre un requisito.

PROHIBIDO (NUNCA inventar):
- Empleos, empresas, cargos, estudios, certificaciones, conocimientos, años de experiencia,
  funciones, logros, idiomas, herramientas o habilidades que el usuario NO haya declarado.

Devuelve un JSON EXACTO con la forma: { "cv": "contenido del CV en Markdown" }
El CV debe tener estructura: encabezado, perfil profesional, experiencia, formación, habilidades,
y una sección final "Información potencialmente faltante" SOLO si detectas brechas reales.`;

function extractJsonContent(content) {
  const trimmed = String(content || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : trimmed;
}

async function chatJSON({ system, user, maxTokens = 2600 }) {
  const clientInstance = getClient();
  if (!clientInstance) {
    const error = new Error('Proveedor IA no configurado (OPENAI_API_KEY ausente o modo mock activo)');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }
  const response = await clientInstance.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Respuesta vacía del proveedor IA');
  }
  try {
    return JSON.parse(extractJsonContent(content));
  } catch (err) {
    throw new Error(`JSON inválido del proveedor IA: ${err.message}`);
  }
}

function buildMatchingPrompt({ profile, config, offer }) {
  return [
    'PERFIL DEL CANDIDATO (información real declarada):',
    JSON.stringify({
      nombre: profile.nombre_completo,
      carrera: profile.carrera,
      nivel_estudios: profile.nivel_estudios,
      ubicacion_actual: profile.ubicacion_actual,
      experiencia: profile.experiencia,
      informacion_adicional: profile.informacion_adicional,
      cv: profile.cv_texto,
    }, null, 2),
    '',
    'CONFIGURACIÓN DE BÚSQUEDA DEL CANDIDATO:',
    JSON.stringify({
      sueldo_minimo: config.sueldo_minimo,
      sueldo_maximo: config.sueldo_maximo,
      ubicaciones_preferidas: parseJson(config.ubicaciones_preferidas, []),
      duracion_min_meses: config.duracion_min_meses,
      duracion_max_meses: config.duracion_max_meses,
      excluir_penalizaciones: config.excluir_penalizaciones,
      modalidad: config.modalidad,
      tipo_contrato: config.tipo_contrato,
    }, null, 2),
    '',
    'OFERTA LABORAL:',
    JSON.stringify({
      titulo: offer.titulo,
      entidad: offer.entidad,
      sueldo: offer.sueldo,
      ubicacion: offer.ubicacion,
      modalidad: offer.modalidad,
      tipo_contrato: offer.tipo_contrato,
      duracion_meses: offer.duracion,
      penalizacion: offer.penalizacion === true,
      texto_completo: offer.texto_completo,
    }, null, 2),
  ].join('\n');
}

function normalizeMatchingResult(raw) {
  return {
    education_score: clampScore(Number(raw.education_score)),
    experience_score: clampScore(Number(raw.experience_score)),
    skills_score: clampScore(Number(raw.skills_score)),
    location_score: clampScore(Number(raw.location_score)),
    remuneration_score: clampScore(Number(raw.remuneration_score)),
    contract_score: clampScore(Number(raw.contract_score)),
    overall_analysis: String(raw.overall_analysis || ''),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
    gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [],
  };
}

/** Devuelve { subscores, overall, strengths, gaps, provider, model }. */
export async function evaluateCompatibility(context) {
  if (AI_MODE === 'mock') {
    const mock = mockEvaluateForOffer(context);
    return { ...mock, provider: 'mock', model: 'determinista-local' };
  }
  try {
    const raw = await chatJSON({
      system: MATCHING_SYSTEM_PROMPT,
      user: buildMatchingPrompt(context),
    });
    return { ...normalizeMatchingResult(raw), provider: AI_PROVIDER, model: env.OPENAI_MODEL };
  } catch (err) {
    console.warn('[ai] fallback a mock:', err.message);
    const mock = mockEvaluateForOffer(context);
    return { ...mock, provider: 'mock', model: 'determinista-local', aiError: err.message };
  }
}

function buildCvPrompt({ profile, offer }) {
  return [
    'CV BASE (única fuente de verdad; NO inventes más datos):',
    JSON.stringify({ cv: profile.cv_texto, experiencia: profile.experiencia }, null, 2),
    '',
    'DATOS ADICIONALES DECLARADOS:',
    JSON.stringify({
      nombre_completo: profile.nombre_completo,
      carrera: profile.carrera,
      nivel_estudios: profile.nivel_estudios,
      ubicacion_actual: profile.ubicacion_actual,
      telefono: profile.telefono,
      email_cv: profile.email_cv,
      linkedin: profile.linkedin,
      informacion_adicional: profile.informacion_adicional,
    }, null, 2),
    '',
    'OFERTA A LA QUE SE ADAPTA EL CV:',
    JSON.stringify({
      titulo: offer.titulo,
      entidad: offer.entidad,
      texto_completo: offer.texto_completo,
    }, null, 2),
    '',
    'Genera el CV adaptado (resultado en JSON con la propiedad "cv").',
  ].join('\n');
}

/** Devuelve { content, provider, model }. */
export async function adaptCv(context) {
  if (AI_MODE === 'mock') {
    const content = mockAdaptCv(context);
    return { content, provider: 'mock', model: 'determinista-local' };
  }
  try {
    const raw = await chatJSON({
      system: CV_SYSTEM_PROMPT,
      user: buildCvPrompt(context),
      maxTokens: 3200,
    });
    const content = typeof raw === 'string' ? raw : String(raw.cv || '');
    if (!content.trim()) throw new Error('CV vacío del proveedor IA');
    return { content, provider: AI_PROVIDER, model: env.OPENAI_MODEL };
  } catch (err) {
    console.warn('[ai] fallback a mock (adaptación CV):', err.message);
    return { content: mockAdaptCv(context), provider: 'mock', model: 'determinista-local', aiError: err.message };
  }
}