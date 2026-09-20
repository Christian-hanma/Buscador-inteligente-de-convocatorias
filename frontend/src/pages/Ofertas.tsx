import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { JobOffer } from '../services/types';
import { Badge, Card, EmptyState, PageHeader, ProgressBar, Select, Spinner } from '../components/ui';
import { formatCurrency, percentTone } from '../utils/format';

export default function Ofertas() {
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<JobOffer[]>('/offers')
      .then(setOffers)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const filtered = status === 'all' ? offers : offers.filter((o) => o.status === status);

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
        title="Ofertas"
        description="Todas las convocatorias disponibles en tus fuentes seleccionadas."
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="all">Todas</option>
            <option value="active">Activas</option>
            <option value="closed">Cerradas</option>
            <option value="expired">Expiradas</option>
          </Select>
        }
      />

      {filtered.length === 0 && (
        <EmptyState title="No hay ofertas" description="Prueba a habilitar mÃ¡s fuentes en la secciÃ³n 'Fuentes'." />
      )}

      <div className="space-y-3">
        {filtered.map((offer) => (
          <Link key={offer.id} to={`/ofertas/${offer.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{offer.titulo}</p>
                    {offer.es_demo && <Badge tone="red">Oferta demo</Badge>}
                    {offer.source_status === 'placeholder' && <Badge tone="amber">placeholder</Badge>}
                    {offer.penalizacion && <Badge tone="amber">PenalizaciÃ³n</Badge>}
                  </div>
                  <p className="text-sm text-slate-500">
                    {offer.entidad} Â· {offer.ubicacion ?? 'Sin ubicaciÃ³n'} Â· {formatCurrency(offer.sueldo)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {offer.source_name} Â· {offer.modalidad ?? 'Modalidad no indicada'} Â· {offer.tipo_contrato ?? 'Contrato no indicado'}
                  </p>
                </div>
                <div className="w-32 shrink-0">
                  {offer.match ? (
                    <>
                      <p className="mb-1 text-right text-sm font-bold text-slate-700">{offer.match.porcentaje_compatibilidad}%</p>
                      <ProgressBar value={offer.match.porcentaje_compatibilidad} tone={percentTone(offer.match.porcentaje_compatibilidad)} />
                    </>
                  ) : (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-400">Sin evaluar</p>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
