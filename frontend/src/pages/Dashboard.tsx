import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { ConfigFiltro, EvaluateSummary, JobOffer, MatchResult } from '../services/types';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, Spinner } from '../components/ui';
import { formatCurrency, percentTone } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [config, setConfig] = useState<ConfigFiltro | null>(null);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const [m, c, o] = await Promise.all([
      api.get<MatchResult[]>('/matches'),
      api.get<ConfigFiltro>('/config'),
      api.get<JobOffer[]>('/offers'),
    ]);
    setMatches(m);
    setConfig(c);
    setOffers(o);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function evaluateAll() {
    setEvaluating(true);
    setMessage('');
    try {
      const summary = await api.post<EvaluateSummary>('/matches/evaluate');
      const newCount = summary.evaluated?.length ?? 0;
      setMessage(
        summary.skipped > 0
          ? `Evaluación: ${newCount} nuevas, ${summary.skipped} ya evaluadas (sin gasto de IA).`
          : `Evaluación completada (${newCount} ofertas).`
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al evaluar');
    } finally {
      setEvaluating(false);
    }
  }

  const compatible = matches.filter((m) => m.filtro_resultado === 'PASS' && m.porcentaje_compatibilidad > 0);
  const rejected = matches.filter((m) => m.filtro_resultado === 'REJECT');
  const notEvaluated = offers.length - matches.length;
  const pending = matches.filter((m) => m.porcentaje_compatibilidad >= (config?.umbral_notificacion ?? 70) && !m.notificado);

  const top = [...compatible].sort((a, b) => b.porcentaje_compatibilidad - a.porcentaje_compatibilidad).slice(0, 5);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.email?.split('@')[0] ?? 'candidato'}`}
        description="Estas son tus convocatorias evaluadas con IA."
        actions={
          <Button onClick={() => void evaluateAll()} loading={evaluating}>
            Evaluar ofertas ahora
          </Button>
        }
      />

      {message && (
        <div className="mb-4">
          <Badge tone={message.toLowerCase().includes('error') ? 'red' : 'green'}>{message}</Badge>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Compatibles" value={compatible.length} tone="green" />
        <Stat label="Descartadas" value={rejected.length} tone="red" />
        <Stat label="Por evaluar" value={notEvaluated} tone="amber" />
        <Stat label="Pendientes de notificación" value={pending.length} tone="indigo" />
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Mejores coincidencias</h2>
          {(config?.sueldo_minimo || config?.sueldo_maximo) && (
            <p className="text-xs text-slate-500">
              Umbral de notificación: {config?.umbral_notificacion ?? 70}%
            </p>
          )}
        </div>

        {top.length === 0 && (
          <EmptyState
            icon="▦"
            title="Aún no hay matches"
            description="Pulsa 'Evaluar ofertas ahora' para que el sistema filtre las ofertas con tus condiciones y analice las restantes con IA."
          />
        )}

        <div className="space-y-3">
          {top.map((m) => (
            <Link key={m.id} to={`/ofertas/${m.offer_id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg font-bold text-indigo-700">
                    {m.porcentaje_compatibilidad}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{m.titulo}</p>
                      {m.source_name && <Badge tone="slate">{m.source_name}</Badge>}
                      {m.penalizacion && <Badge tone="amber">Penalización</Badge>}
                    </div>
                    <p className="truncate text-sm text-slate-500">
                      {m.entidad} · {m.ubicacion ?? 'Sin ubicación'} · {formatCurrency(m.sueldo)}
                    </p>
                    <div className="mt-2">
                      <ProgressBar value={m.porcentaje_compatibilidad} tone={percentTone(m.porcentaje_compatibilidad)} />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {rejected.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Descartadas por tus filtros</h2>
          <div className="space-y-2">
            {rejected.slice(0, 5).map((m) => (
              <Link key={m.id} to={`/ofertas/${m.offer_id}`}>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm transition-shadow hover:shadow-sm">
                  <span className="truncate text-slate-700">
                    {m.titulo} <span className="text-slate-400">· {m.entidad}</span>
                  </span>
                  <Badge tone="red">Rechazada sin IA</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'amber' | 'indigo' }) {
  const colors = {
    green: 'text-emerald-600',
    red: 'text-rose-600',
    amber: 'text-amber-600',
    indigo: 'text-indigo-600',
  };
  return (
    <Card className="p-4">
      <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </Card>
  );
}