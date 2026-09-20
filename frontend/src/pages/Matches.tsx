import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { MatchResult } from '../services/types';
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, Select, Spinner } from '../components/ui';
import { formatCurrency, percentTone } from '../utils/format';

export default function Matches() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'pass' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<MatchResult[]>('/matches')
      .then(setMatches)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const filtered = matches.filter((m) =>
    filter === 'pass'
      ? m.filtro_resultado === 'PASS' && m.porcentaje_compatibilidad > 0
      : filter === 'rejected'
        ? m.filtro_resultado === 'REJECT'
        : true
  );

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
        title="Matches"
        description="Resultados del motor de matching para tu perfil."
        actions={
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="w-40"
          >
            <option value="all">Todos</option>
            <option value="pass">Compatibles</option>
            <option value="rejected">Descartadas</option>
          </Select>
        }
      />

      {filtered.length === 0 && (
        <EmptyState
          title="Sin resultados"
          description="Pulsa 'Evaluar ofertas' en el dashboard para calcular compatibilidad."
          action={
            <Link to="/dashboard">
              <Button variant="secondary">Ir al dashboard</Button>
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {filtered.map((m) => (
          <Link key={m.id} to={`/ofertas/${m.offer_id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                    m.filtro_resultado === 'REJECT' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {m.porcentaje_compatibilidad}%
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{m.titulo}</p>
                    {m.source_name && <Badge tone="slate">{m.source_name}</Badge>}
                    {m.filtro_resultado === 'REJECT' ? (
                      <Badge tone="red">Descartada · sin IA</Badge>
                    ) : m.notificado ? (
                      <Badge tone="green">Notificada</Badge>
                    ) : (
                      <Badge tone="amber">No notificada</Badge>
                    )}
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
    </>
  );
}