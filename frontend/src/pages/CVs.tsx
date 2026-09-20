import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { GeneratedCV } from '../services/types';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '../components/ui';
import { formatDate } from '../utils/format';

export default function CVs() {
  const [cvs, setCvs] = useState<GeneratedCV[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<GeneratedCV[]>('/cv-adaptations')
      .then(setCvs)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Mis CVs generados" description="Historial de CVs adaptados a ofertas concretas." />

      {cvs.length === 0 && (
        <EmptyState
          title="Todavía no has generado CVs"
          description="Abre una oferta compatible y pulsa 'Generar CV adaptado' para crear tu primer CV."
        />
      )}

      <div className="space-y-3">
        {cvs.map((cv) => (
          <Link key={cv.id} to={`/cvs/${cv.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg">▤</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{cv.titulo ?? 'Oferta'}</p>
                    <Badge tone="slate">v{cv.version}</Badge>
                    {cv.source_name && <Badge tone="blue">{cv.source_name}</Badge>}
                  </div>
                  <p className="text-sm text-slate-500">
                    {cv.entidad} · Generado el {formatDate(cv.created_at)}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}