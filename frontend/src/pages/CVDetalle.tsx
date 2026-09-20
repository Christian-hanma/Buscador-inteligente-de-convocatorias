import { Fragment, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { GeneratedCV } from '../services/types';
import { Button, Card, EmptyState, PageHeader, Spinner } from '../components/ui';
import { formatDate } from '../utils/format';

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return (
        <Fragment key={i}>
          <h1 className="text-xl font-bold text-slate-900">{trimmed.slice(2)}</h1>
        </Fragment>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <Fragment key={i}>
          <h2 className="mt-5 border-b border-slate-200 pb-1 text-base font-bold text-slate-900">{trimmed.slice(3)}</h2>
        </Fragment>
      );
    }
    if (trimmed.startsWith('- ')) {
      return (
        <p key={i} className="pl-4 text-sm text-slate-700">
          • {trimmed.slice(2)}
        </p>
      );
    }
    if (trimmed === '---' || trimmed === '') {
      return <div key={i} className="h-2" />;
    }
    const bold = trimmed.match(/\*\*(.+?)\*\*(.*)/);
    if (bold) {
      return (
        <p key={i} className="text-sm text-slate-700">
          <strong>{bold[1]}</strong>
          {bold[2]}
        </p>
      );
    }
    const italic = trimmed.match(/_(.+?)_\s*$/);
    if (italic) {
      return (
        <p key={i} className="text-xs italic text-slate-400">
          {italic[1]}
        </p>
      );
    }
    return (
      <p key={i} className="text-sm text-slate-700">
        {trimmed}
      </p>
    );
  });
}

export default function CVDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cv, setCv] = useState<GeneratedCV | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<GeneratedCV>(`/cv-adaptations/${id}`)
      .then(setCv)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (!cv) {
    return <EmptyState title="CV no encontrado" action={<Button variant="secondary" onClick={() => navigate('/cvs')}>Volver</Button>} />;
  }

  return (
    <>
      <PageHeader
        title="CV adaptado"
        description={`Versión ${cv.version} · generado el ${formatDate(cv.created_at)}`}
        actions={
          <Link to="/cvs">
            <Button variant="secondary">Mis CVs</Button>
          </Link>
        }
      />

      {cv.offer_id && (
        <div className="mb-4">
          <p className="text-sm text-slate-500">
            Adaptado para:{' '}
            <Link to={`/ofertas/${cv.offer_id}`} className="font-medium text-indigo-600 hover:underline">
              {cv.titulo} — {cv.entidad}
            </Link>
          </p>
        </div>
      )}

      <Card className="markdown-body max-w-3xl">{renderMarkdown(cv.content)}</Card>

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(cv.content).catch(() => undefined);
          }}
        >
          Copiar contenido
        </Button>
      </div>
    </>
  );
}