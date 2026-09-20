export interface AuthResponse {
  user: { id: number; email: string; createdAt: string };
  token: string;
}

export interface User {
  id: number;
  email: string;
  createdAt?: string;
}

export interface Profile {
  id?: number;
  user_id?: number;
  nombre_completo?: string;
  carrera?: string;
  nivel_estudios?: string;
  cv_texto?: string;
  experiencia?: string;
  ubicacion_actual?: string;
  telefono?: string;
  email_cv?: string;
  linkedin?: string;
  informacion_adicional?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConfigFiltro {
  id?: number;
  user_id?: number;
  sueldo_minimo?: number | null;
  sueldo_maximo?: number | null;
  radio_zona?: number | null;
  ubicaciones_preferidas?: string[];
  duracion_min_meses?: number | null;
  duracion_max_meses?: number | null;
  excluir_penalizaciones?: boolean;
  modalidad?: string;
  tipo_contrato?: string;
  umbral_notificacion?: number;
}

export interface JobSource {
  id: number;
  key: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  base_url?: string;
  is_active: number;
  is_default: number;
  ingestion_method: string;
  status: 'implemented' | 'placeholder';
  selected?: boolean;
}

export interface JobOffer {
  id: number;
  source_id?: number;
  external_id?: string;
  titulo: string;
  entidad?: string;
  sueldo?: number | null;
  ubicacion?: string | null;
  modalidad?: string | null;
  tipo_contrato?: string | null;
  duracion?: number | null;
  penalizacion?: boolean;
  fuente?: string | null;
  source_url?: string | null;
  fecha_publicacion?: string | null;
  fecha_cierre?: string | null;
  texto_completo?: string | null;
  status?: string;
  es_demo?: boolean;
  created_at?: string;
  source_name?: string;
  source_type?: string;
  source_status?: string;
  match?: MatchResult | null;
}

export interface CriteriosEvaluados {
  weights?: Record<string, number>;
  subscores?: Record<string, number>;
  provider?: string;
  model?: string;
  filtros_duros?: string[];
  [key: string]: unknown;
}

export interface MatchResult {
  id: number;
  user_id?: number;
  offer_id?: number;
  porcentaje_compatibilidad: number;
  via_ia: boolean;
  filtro_resultado: 'PASS' | 'REJECT';
  justificacion_ia?: string;
  brechas?: string[];
  fortalezas?: string[];
  criterios_evaluados?: CriteriosEvaluados;
  notificado: boolean;
  created_at?: string;
  updated_at?: string;
  titulo?: string;
  entidad?: string;
  sueldo?: number | null;
  ubicacion?: string | null;
  modalidad?: string | null;
  tipo_contrato?: string | null;
  duracion?: number | null;
  penalizacion?: boolean;
  source_url?: string | null;
  texto_completo?: string | null;
  source_name?: string;
  source_status?: string;
  oferta?: JobOffer;
}

export interface GeneratedCV {
  id: number;
  user_id?: number;
  offer_id?: number;
  base_profile_id?: number;
  content: string;
  version: number;
  status?: string;
  created_at?: string;
  titulo?: string;
  entidad?: string;
  source_name?: string;
  provider?: string;
}

export interface NotificationInfo {
  shouldNotify: boolean;
  notified: boolean;
  threshold: number;
}

export interface EvaluateSummary {
  total: number;
  evaluated: { match: MatchResult; notification: NotificationInfo | null; offer: JobOffer }[];
  rejected: { match: MatchResult; notification: NotificationInfo | null; offer: JobOffer }[];
  notified: MatchResult[];
  skipped: number;
}

export interface IngestResult {
  offer: JobOffer;
  created: boolean;
  deduplicated: boolean;
}