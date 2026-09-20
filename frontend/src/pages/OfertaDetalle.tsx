import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { GeneratedCV, JobOffer, MatchResult } from '../services/types';
import { Alert, Badge, Button, Card, EmptyState, ProgressBar, Spinner } from '../components/ui';
import { contractLabel, durationLabel, formatCurrency, formatDate, modalityLabel, percentTone } from '../utils/format';

export default function OfertaDetalle() {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<JobOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const o = await api.get<JobOffer>(`/offers/${id}`);
      setOffer(o);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la oferta');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function evaluate() {
    setEvaluating(true);
    setError('');
    try {
      await api.post<{ match: MatchResult; offer: JobOffer }>('/matches/evaluate', { offer_id: Number(id) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al evaluar');
    } finally {
      setEvaluating(false);
    }
  }

  async function generateCv() {
    setGenerating(true);
    setError('');
    try {
      const result = await api.post<{ cv: GeneratedCV }>('/cv-adaptations/generate', { offer_id: Number(id) });
      setGenerated(result.cv.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el CV');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (!offer) {
    return <EmptyState title="Oferta no encontrada" action={<Button variant="secondary" onClick={() => history.back()}>Volver</Button>} />;
  }

  const match = offer.match;

  return (
    <>
      <div className="mb-6">
        <Link to="/ofertas" className="text-sm text-indigo-600 hover:underline">
          â† Ofertas
        </Link>
        <div className="mt-3 flex flex-wrap items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{offer.titulo}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {offer.entidad} {offer.source_name && <Badge tone="slate">{offer.source_name}</Badge>}{' '}
              {offer.es_demo && <Badge tone="red">Oferta demo</Badge>}{' '}
              {offer.source_status === 'placeholder' && <Badge tone="amber">placeholder</Badge>}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {match && (
            <Card>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-indigo-50">
                  <span className="text-2xl font-bold text-indigo-700">{match.porcentaje_compatibilidad}%</span>
                  <span className="text-[10px] uppercase tracking-wide text-indigo-400">compat.</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">Compatibilidad calculada</p>
                    {match.via_ia ? <Badge tone="indigo">IA</Badge> : <Badge tone="slate">modo mock</Badge>}
                    {match.notificado ? (
                      <Badge tone="green">Notificada</Badge>
                    ) : match.filtro_resultado === 'PASS' ? (
                      <Badge tone="amber">No notificada</Badge>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={match.porcentaje_compatibilidad} tone={percentTone(match.porcentaje_compatibilidad)} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Provider: {match.criterios_evaluados?.provider ?? 'â€”'} Â· Modelo: {match.criterios_evaluados?.model ?? 'â€”'}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">Fortalezas</h3>
                  {match.fortalezas?.length ? (
                    <ul className="space-y-1.5">
                      {match.fortalezas.map((f, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700">
                          <span className="text-emerald-500">âœ“</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">Sin fortalezas registradas.</p>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">Brechas</h3>
                  {match.brechas?.length ? (
                    <ul className="space-y-1.5">
                      {match.brechas.map((b, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700">
                          <span className="text-amber-500">!</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">Sin brechas detectadas.</p>
                  )}
                </div>
              </div>

              {match.justificacion_ia && (
                <div className="mt-5 rounded-lg bg-slate-50 p-4">
                  <h3 className="mb-1 text-sm font-semibold text-slate-900">JustificaciÃ³n</h3>
                  <p className="text-sm text-slate-600">{match.justificacion_ia}</p>
                </div>
              )}
            </Card>
          )}

          {!match && (
            <Card>
              <p className="text-sm text-slate-600">Esta oferta aÃºn no ha sido evaluada con tu perfil.</p>
              <div className="mt-4">
                <Button onClick={() => void evaluate()} loading={evaluating}>
                  Evaluar compatibilidad (filtro + IA)
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Condiciones</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Cond label="Sueldo" value={formatCurrency(offer.sueldo)} />
              <Cond label="UbicaciÃ³n" value={offer.ubicacion ?? 'â€”'} />
              <Cond label="Modalidad" value={modalityLabel(offer.modalidad)} />
              <Cond label="Tipo de contrato" value={contractLabel(offer.tipo_contrato)} />
              <Cond label="DuraciÃ³n" value={durationLabel(offer.duracion)} />
              <Cond label="PenalizaciÃ³n" value={offer.penalizacion ? 'SÃ­' : 'No'} />
              <Cond label="PublicaciÃ³n" value={formatDate(offer.fecha_publicacion)} />
              <Cond label="Cierre" value={formatDate(offer.fecha_cierre)} />
            </dl>
          </Card>

          {offer.texto_completo && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">DescripciÃ³n</h3>
              <p className="whitespace-pre-line text-sm text-slate-600">{offer.texto_completo}</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {offer.es_demo ? (
            <Card>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Oferta de demostraciÃ³n</h3>
              <p className="text-xs text-slate-500">
                Esta oferta es de prueba y no existe en el portal original. Cuando la ingesta real
                (n8n) estÃ© conectada a las fuentes oficiales, el enlace te llevarÃ¡ a la convocatoria real.
              </p>
            </Card>
          ) : (
            offer.source_url && (
              <a
                href={offer.source_url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl bg-white p-5 text-center text-sm font-medium text-indigo-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-indigo-50"
              >
                Ver oferta original â†—
              </a>
            )
          )}

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">CV adaptado</h3>
            <p className="text-xs text-slate-500">
              Genera un CV a partir de tu CV base enfocado a esta oferta, sin inventar informaciÃ³n.
            </p>
            {generated && (
              <div className="mt-3">
                <Alert tone="success">
                  CV generado.{' '}
                  <Link to={`/cvs/${generated}`} className="font-medium underline">
                    Ver CV
                  </Link>
                </Alert>
              </div>
            )}
            <div className="mt-3">
              <Button variant="success" onClick={() => void generateCv()} loading={generating}>
                Generar CV adaptado
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Cond({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  );
}
