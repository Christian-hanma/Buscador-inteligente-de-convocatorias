import * as cheerio from 'cheerio';
import { sourcesRepository } from '../db/repositories/sources.js';
import { offersRepository } from '../db/repositories/offers.js';
import { HttpError } from '../utils/httpError.js';

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9',
};

function clean(text) {
  return (text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .trim();
}

function parseSoles(text) {
  const m = String(text ?? '').match(/\d[\d.,]{1,14}/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) return null;
  return res.text();
}

async function upsertOffer(source, externalId, fields) {
  const existing = await offersRepository.findDuplicate(source.id, String(externalId).slice(0, 200));
  try {
    const result = await offersRepository.upsert({
      source_id: source.id,
      external_id: String(externalId).slice(0, 200),
      titulo: fields.title,
      entidad: fields.company || null,
      sueldo: fields.salary ?? null,
      ubicacion: fields.location || null,
      modalidad: fields.modality || null,
      tipo_contrato: fields.contract_type || null,
      duracion: null,
      penalizacion: false,
      fuente: source.name,
      source_url: fields.source_url || null,
      fecha_publicacion: null,
      fecha_cierre: fields.closing_date || null,
      texto_completo: fields.description || null,
      status: 'active',
    });
    return { created: !result.updated };
  } catch (err) {
    return { created: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Computrabajo
// ---------------------------------------------------------------------------

export function parseComputrabajo(html) {
  const $ = cheerio.load(html);
  const offers = [];
  $('article[data-offers-grid-offer-item-container]').each((_, el) => {
    const $a = $(el).find('h2 a.js-o-link').first();
    const href = $a.attr('href') || '';
    const url = href.startsWith('http') ? href : `https://pe.computrabajo.com${href}`;
    if (!url.includes('/ofertas-de-trabajo/')) return;
    const $company = $(el).find('a[offer-grid-article-company-url]').first();
    const articleText = $(el).text();
    let location = clean($(el).find('p.fs16 span.mr10').first().text())
      || clean($(el).find('span.mr10').first().text());
    if (!location) {
      const m = articleText.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+,\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/);
      location = m ? m[1] : '';
    }
    const salaryText = clean($(el).find('span.icon.i_salary').parents('div').first().text())
      || (articleText.match(/S\/\.\s*[^)]{0,40}/)?.[0] ?? '');
    const snippet = clean(
      $(el).find('p.fs13').filter((_, p) => $(p).text().trim().length > 60).first().text()
    ) || null;
    offers.push({
      external_id: $(el).attr('data-id') || url.slice(-32),
      title: clean($a.text()) || clean($(el).find('h2').first().text()),
      company: clean($company.text()),
      location,
      salary: parseSoles(salaryText),
      contract_type: null,
      source_url: url,
      description: snippet || null,
    });
  });
  return offers;
}

// ---------------------------------------------------------------------------
// Ya Empleo
// ---------------------------------------------------------------------------

const YAEMPLEO_BASE = 'https://www.yaempleo.net';

export function parseYaempleoList(html) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const hrefs = [];
  $('a[href*="/posts/"], a[href*="/puestos/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.includes('.html') || href.includes('pagina')) return;
    const url = href.startsWith('http') ? href : `${YAEMPLEO_BASE}${href}`;
    if (!seen.has(url)) {
      seen.add(url);
      hrefs.push(url);
    }
  });
  return hrefs.slice(0, 30);
}

export function parseYaempleoDetail(html, url) {
  const $ = cheerio.load(html);
  const title = clean($('h1').first().text());
  if (!title) return null;
  const main = $('article').first().has('p').length ? $('article').first() : $('main').first();
  const text = clean(main.text()) || clean($('body').text());
  const slug = (url.split('/').filter(Boolean).pop() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(0, 200);
  const salaryText = text.match(/(?:S\/|S\/\.)\s*\d[\d.,]{1,14}/)?.[0] ?? '';
  const closing = text.match(/(?:Cierra|Finaliza)\s*:?\s*([^P]{3,60}?)(?:Publicado|Cierra|$)/i)?.[1] ?? null;
  const location = text.match(/(?:Ubicaci[óo]n|Lugar|Departamento)\s*:?\s*([^\n.,]{3,90})/i)?.[1]
    ?? (text.includes('Lima') ? 'Lima' : null);
  const company = text.match(/Entidad\s*:?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .#-]{2,60}?)(?=Contrato|CAS|Plazas|Regiones|Fecha|$)/i)?.[1]
    ?? text.match(/Convocatoria\s+([^-:]{2,80})/i)?.[1]
    ?? text.match(/(?:Organismo|Empresa)\s*([^\n.]{3,120})/i)?.[1]
    ?? null;
  const freetext = `${title} ${text.slice(0, 6000)}`;
  const contract_type = /\bCAS\b/i.test(freetext) ? 'CAS' : (/\b728\b/i.test(freetext) ? 'DL 728' : null);
  const description = text.slice(0, 30000);
  return {
    external_id: `yaempleo-${slug}`,
    title,
    company,
    location,
    salary: parseSoles(salaryText),
    contract_type,
    source_url: url,
    closing_date: closing,
    description,
  };
}

// ---------------------------------------------------------------------------
// Driver por fuente
// ---------------------------------------------------------------------------

const PARSERS = {
  computrabajo: {
    label: 'Computrabajo',
    parse: parseComputrabajo,
    fetchesDetails: false,
  },
  yaempleo: {
    label: 'Ya Empleo',
    parseList: parseYaempleoList,
    parseDetail: parseYaempleoDetail,
    fetchesDetails: true,
  },
};

export async function ingestHtml(payload) {
  const sourceKey = String(payload?.source ?? '').toLowerCase().trim();
  const parser = PARSERS[sourceKey];
  if (!parser) {
    throw new HttpError(422, `Fuente HTML no soportada: "${sourceKey}". Soportadas: ${Object.keys(PARSERS).join(', ')}`);
  }

  const source = await sourcesRepository.findByKey(sourceKey);
  if (!source) {
    throw new HttpError(422, `Fuente desconocida: "${sourceKey}". Debe estar registrada en job_sources.`);
  }

  const html = payload?.html;
  if (!html || typeof html !== 'string' || html.length < 100) {
    throw new HttpError(422, 'Falta el HTML a procesar (campo "html").');
  }

  const stats = { source: sourceKey, created: 0, deduplicated: 0, errors: 0, total: 0 };

  if (!parser.fetchesDetails) {
    const offers = parser.parse(html);
    stats.total = offers.length;
    for (const offer of offers) {
      const r = await upsertOffer(source, offer.external_id, offer);
      if (r.error) { stats.errors += 1; continue; }
      if (r.created) stats.created += 1;
      else stats.deduplicated += 1;
    }
    return stats;
  }

  // Ya Empleo: extrae hrefs del listado y parsea cada detalle.
  const hrefs = parser.parseList(html);
  stats.total = hrefs.length;
  for (const url of hrefs) {
    try {
      const detailHtml = await fetchHtml(url);
      if (!detailHtml) { stats.errors += 1; continue; }
      const offer = parser.parseDetail(detailHtml, url);
      if (!offer) { stats.errors += 1; continue; }
      const r = await upsertOffer(source, offer.external_id, offer);
      if (r.error) { stats.errors += 1; continue; }
      if (r.created) stats.created += 1;
      else stats.deduplicated += 1;
    } catch {
      stats.errors += 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return stats;
}