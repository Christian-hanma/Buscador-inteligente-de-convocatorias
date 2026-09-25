import { resetDatabase } from './reset.js';
import { registerUser } from '../services/auth.service.js';
import { upsertProfile } from '../services/profile.service.js';
import { upsertConfig } from '../services/config.service.js';
import { sourcesRepository } from './repositories/sources.js';
import { userSourcesRepository } from './repositories/userSources.js';
import { offersRepository } from './repositories/offers.js';
import { evaluateOffersForUser } from '../services/matching.service.js';

const DEMO_PASSWORD = 'Demo1234!';

const DEMO_SOURCES = [
  {
    key: 'servir-ofertas', name: 'SERVIR · Ofertas de Empleo Público', type: 'public',
    description: 'Buscador oficial de convocatorias del Estado peruano (SERVIR).',
    base_url: 'https://app.servir.gob.pe/DifusionOfertasExterno/faces/consultas/ofertas_laborales.xhtml',
    is_active: true, is_default: true, ingestion_method: 'N8N', status: 'placeholder',
  },
  {
    key: 'empleos-peru', name: 'Empleos Perú / MTPE', type: 'public',
    description: 'Bolsa oficial de empleos del Ministerio de Trabajo y Promoción del Empleo.',
    base_url: 'https://www.empleosperu.gob.pe', is_active: true, is_default: true,
    ingestion_method: 'N8N', status: 'placeholder',
  },
  {
    key: 'poder-judicial', name: 'Empleos Públicos del Poder Judicial', type: 'public',
    description: 'Convocatorias de procesos de selección del Poder Judicial.',
    base_url: 'https://www.pj.gob.pe', is_active: true, is_default: true,
    ingestion_method: 'N8N', status: 'placeholder',
  },
  {
    key: 'computrabajo', name: 'Computrabajo', type: 'private',
    description: 'Bolsa de trabajo privada (no integrada todavía; placeholder).',
    base_url: 'https://www.computrabajo.com.pe', is_active: true, is_default: false,
    ingestion_method: 'SCRAPING', status: 'placeholder',
  },
  {
    key: 'indeed', name: 'Indeed', type: 'private',
    description: 'Bolsa de trabajo internacional (no integrada todavía; placeholder).',
    base_url: 'https://pe.indeed.com', is_active: true, is_default: false,
    ingestion_method: 'SCRAPING', status: 'placeholder',
  },
  {
    key: 'linkedin', name: 'LinkedIn', type: 'private',
    description: 'Bolsa de trabajo profesional (no integrada todavía; placeholder).',
    base_url: 'https://www.linkedin.com/jobs', is_active: true, is_default: false,
    ingestion_method: 'SCRAPING', status: 'placeholder',
  },
  {
    key: 'yaempleo', name: 'Ya Empleo', type: 'private',
    description: 'Portal peruano de empleo y convocatorias (no integrado todavía; placeholder).',
    base_url: 'https://www.yaempleo.net', is_active: true, is_default: false,
    ingestion_method: 'SCRAPING', status: 'placeholder',
  },
];

const DEMO_OFFERS = [
  {
    external_id: 'TP-2026-0001', title: 'Analista de Tesorería y Contabilidad',
    company: 'Municipalidad Provincial de Lima', salary: 3500, location: 'Lima',
    modality: 'Presencial', contract_type: 'CAS', duration: 12, penalization: false,
    source_url: 'https://www.servir.gob.pe/convocatorias/tp-2026-0001',
    publication_date: '2026-09-01', closing_date: '2026-09-30',
    description: 'Bachiller en Contabilidad. Conocimientos en tesorería, manejo de SIAF, sistemas contables y Excel avanzado. Funciones: gestión de pagos, conciliaciones bancarias, registro contable y elaboración de reportes financieros. Condiciones: remuneración S/ 3,500, contrato CAS por 12 meses, jornada presencial en Lima.',
  },
  {
    external_id: 'EP-2026-0452', title: 'Asistente Administrativo',
    company: 'Municipalidad Distrital de La Molina', salary: 3000, location: 'Lima',
    modality: 'Presencial', contract_type: 'CAS', duration: 12, penalization: false,
    source_url: 'https://www.empleosperu.gob.pe/ofertas/ep-2026-0452',
    publication_date: '2026-09-05', closing_date: '2026-09-25',
    description: 'Formación técnica o universitaria. Experiencia en labores administrativas. Funciones: apoyo administrativo, archivo de documentos, atención al usuario, manejo de herramientas ofimáticas (Word, Excel). Remuneración S/ 3,000. Convocatoria CAS por 12 meses en Lima.',
  },
  {
    external_id: 'CT-2026-8810', title: 'Auxiliar Contable',
    company: 'Empresa Inversiones Andinas SAC', salary: 2000, location: 'Lima',
    modality: 'Presencial', contract_type: 'Planilla', duration: 6, penalization: false,
    source_url: 'https://www.computrabajo.com.pe/empleos-auxiliar-contable',
    publication_date: '2026-08-20', closing_date: '2026-09-15',
    description: 'Auxiliar contable con conocimientos de registro de operaciones. Funciones: registro de comprobantes, archivo contable, apoyo en declaraciones. Remuneración S/ 2,000 bajo planilla.',
  },
  {
    external_id: 'TP-2026-0117', title: 'Coordinador Administrativo y Logístico',
    company: 'Gobierno Regional de Lima', salary: 3500, location: 'Lima',
    modality: 'Híbrido', contract_type: 'CAS', duration: 24, penalization: true,
    source_url: 'https://www.servir.gob.pe/convocatorias/tp-2026-0117',
    publication_date: '2026-09-08', closing_date: '2026-09-28',
    description: 'Coordinación administrativa y logística. Contrato CAS por 24 meses con penalidad contractual por retiro anticipado. Remuneración S/ 3,500. Ubicación: Lima.',
  },
  {
    external_id: 'EP-2026-0488', title: 'Analista Contable de Tesorería Regional',
    company: 'Gobierno Regional del Cusco', salary: 3500, location: 'Cusco',
    modality: 'Presencial', contract_type: 'CAS', duration: 12, penalization: false,
    source_url: 'https://www.empleosperu.gob.pe/ofertas/ep-2026-0488',
    publication_date: '2026-09-10', closing_date: '2026-10-05',
    description: 'Contador o bachiller en contabilidad. Funciones: tesorería regional, conciliaciones, reportes. Contrato CAS por 12 meses. Remuneración S/ 3,500. Ubicación: Cusco (zona fuera de Lima).',
  },
  {
    external_id: 'TP-2026-0152', title: 'Especialista en Tesorería Municipal',
    company: 'Municipalidad de San Borja', salary: 3800, location: 'Lima',
    modality: 'Presencial', contract_type: 'CAS', duration: 12, penalization: false,
    source_url: 'https://www.servir.gob.pe/convocatorias/tp-2026-0152',
    publication_date: '2026-09-12', closing_date: '2026-10-02',
    description: 'Se requiere colegiatura profesional habilitada y mínimo 3 años de experiencia en el sector público. Conocimientos en tesorería municipal, SIAF, presupuesto y manejo de sistemas contables. Funciones: gestión de caja, conciliaciones, reportes a dirección. Remuneración S/ 3,800. Contrato CAS por 12 meses.',
  },
  {
    external_id: 'YE-2026-1034', title: 'Asistente Contable (Práctica/Tiempo parcial)',
    company: 'Contadores & Consultores EIRL', salary: 1800, location: 'Lima',
    modality: 'Presencial', contract_type: 'Planilla', duration: 6, penalization: false,
    source_url: 'https://www.yaempleo.net/', publication_date: '2026-09-18',
    closing_date: '2026-09-30',
    description: 'Apoyo en registro de comprobantes, conciliaciones sencillas y archivo contable. Remuneración S/ 1,800 en planilla. Estudiantes de los últimos ciclos de Contabilidad con disponibilidad de medio tiempo. Ubicación: Lima (La Victoria).',
  },
];

const OFFER_SOURCE = {
  'TP-2026-0001': 'servir-ofertas',
  'EP-2026-0452': 'empleos-peru',
  'CT-2026-8810': 'computrabajo',
  'TP-2026-0117': 'servir-ofertas',
  'EP-2026-0488': 'empleos-peru',
  'TP-2026-0152': 'servir-ofertas',
  'YE-2026-1034': 'yaempleo',
};

async function seedSources() {
  for (const source of DEMO_SOURCES) {
    await sourcesRepository.create(source);
  }
  console.log(`[seed] ${DEMO_SOURCES.length} fuentes creadas`);
}

async function sourceId(sourceKey) {
  const row = await sourcesRepository.findByKey(sourceKey);
  if (!row) throw new Error(`Fuente ${sourceKey} no encontrada`);
  return row.id;
}

async function seedOffers() {
  for (const o of DEMO_OFFERS) {
    await offersRepository.upsert({
      source_id: await sourceId(OFFER_SOURCE[o.external_id]),
      external_id: o.external_id,
      titulo: o.title,
      entidad: o.company,
      sueldo: o.salary,
      ubicacion: o.location,
      modalidad: o.modality,
      tipo_contrato: o.contract_type,
      duracion: o.duration,
      penalizacion: o.penalization === true,
      fuente: OFFER_SOURCE[o.external_id],
      source_url: o.source_url,
      fecha_publicacion: o.publication_date,
      fecha_cierre: o.closing_date,
      texto_completo: o.description,
      status: 'active',
      es_demo: true,
    });
  }
  console.log(`[seed] ${DEMO_OFFERS.length} ofertas de prueba creadas (todas marcadas es_demo=true)`);
}

async function seedDemoUser() {
  const { user } = await registerUser({ email: 'prueba@demo.com', password: DEMO_PASSWORD });
  console.log(`[seed] usuario demo creado (${user.email})`);

  await upsertProfile(user.id, {
    nombre_completo: 'María Fernanda Quispe Ramos',
    carrera: 'Contabilidad',
    nivel_estudios: 'Bachiller en Contabilidad',
    ubicacion_actual: 'Lima (San Isidro)',
    telefono: '+51 987 654 321',
    email_cv: 'maria.quispe@example.com',
    linkedin: 'https://linkedin.com/in/mariaquispe',
    experiencia:
      'Asistente de Tesorería en Importadora del Sur SAC (Lima, 2 años): gestión de pagos y transferencias, conciliación bancaria mensual de 3 cuentas, elaboración de reportes de flujo de caja en Excel, registro de operaciones en el sistema contable. ' +
      'Practicante Contable en Consultora Tributaria R&C (Lima, 1 año): registro de facturas y comprobantes, apoyo en conciliaciones, archivado y digitalización de documentos, apoyo puntual en el llenado de información para el SIAF de una entidad municipal durante la etapa de prácticas.',
    informacion_adicional:
      'Manejo de Excel intermedio-avanzado, Windows e Internet. Conocimientos de SIAF a nivel básico por prácticas. Disponibilidad presencial en Lima.',
  });

  await upsertProfile(user.id, {
    cv_texto: [
      'MARÍA FERNANDA QUISPE RAMOS',
      'Bachiller en Contabilidad | Lima | +51 987 654 321 | maria.quispe@example.com',
      'PERFIL: Bachiller en Contabilidad con experiencia en tesorería y apoyo contable. Orientada al orden, la conciliación de información y el trabajo con planillas en Excel.',
      'FORMACIÓN: Bachiller en Contabilidad, Universidad Nacional Mayor de San Marcos (2022).',
      'EXPERIENCIA:',
      '- Asistente de Tesorería, Importadora del Sur SAC (2024–2026): pagos, conciliaciones bancarias, reportes de caja en Excel.',
      '- Practicante Contable, Consultora Tributaria R&C (2023–2024): registro de comprobantes, conciliaciones, apoyo en SIAF.',
      'HABILIDADES: Excel, Word, Internet, sistemas de registro contable, trabajo en equipo, orden y confidencialidad.',
    ].join('\n'),
  });

  await upsertConfig(user.id, {
    sueldo_minimo: 3000,
    sueldo_maximo: 6000,
    radio_zona: 40,
    ubicaciones_preferidas: ['Lima'],
    duracion_min_meses: 1,
    duracion_max_meses: 12,
    excluir_penalizaciones: true,
    modalidad: 'any',
    tipo_contrato: 'any',
    umbral_notificacion: 70,
  });

  // Para el demo se habilitan todas las fuentes (el registro solo activa las
  // oficiales por defecto), así se ejercitan todos los escenarios del motor.
  const allSources = await sourcesRepository.listAll();
  await userSourcesRepository.setEnabled(user.id, allSources.map((s) => s.id));

  return user.id;
}

async function seedMatches(userId) {
  const summary = await evaluateOffersForUser(userId);
  const { evaluated = [], rejected = [], notified = [] } = summary;
  console.log(
    `[seed] matching: ${summary.total} ofertas, ${evaluated.length} evaluadas, ` +
      `${rejected.length} descartadas por filtro duro, ${notified.length} notificadas (simuladas)`
  );
  for (const { match, offer } of evaluated) {
    console.log(
      `  ${match.filtro_resultado === 'REJECT' ? '-' : '+'} ${String(match.porcentaje_compatibilidad).padStart(3)}% ` +
        `"${offer?.titulo}" ${match.filtro_resultado === 'REJECT' ? `(${match.brechas[0]})` : ''}`
    );
  }
}

export async function runSeed() {
  await resetDatabase();
  await seedSources();
  await seedOffers();
  const userId = await seedDemoUser();
  await seedMatches(userId);

  const enabled = await userSourcesRepository.enabledSourceIds(userId);
  console.log(`[seed] fuentes habilitadas para el usuario: ${enabled.join(', ')}`);
  console.log('[seed] listo');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  runSeed().catch((err) => {
    console.error('[seed] error:', err);
    process.exit(1);
  });
}