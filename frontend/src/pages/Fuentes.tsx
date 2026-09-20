import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { JobSource } from '../services/types';
import { Alert, Badge, Button, PageHeader, Spinner } from '../components/ui';

export default function Fuentes() {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<JobSource[]>('/sources')
      .then(setSources)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las fuentes'))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const ids = sources.filter((s) => s.selected).map((s) => s.id);
      const result = await api.put<{ source_id: number; enabled: number }[]>('/sources/user', { source_ids: ids });
      setSources(sources.map((s) => ({ ...s, selected: result.some((r) => r.source_id === s.id && r.enabled === 1) })));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

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
        title="Fuentes laborales"
        description="Selecciona qué fuentes consultará tu buscador. Las marcadas como placeholder aún no están integradas."
      />
      {saved && (
        <div className="mb-4">
          <Alert tone="success">Fuentes actualizadas.</Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="space-y-3">
        {sources.map((s) => (
          <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
              checked={Boolean(s.selected)}
              onChange={() => setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, selected: !x.selected } : x)))}
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">{s.name}</p>
                <Badge tone={s.type === 'public' ? 'blue' : 'slate'}>{s.type === 'public' ? 'Pública' : 'Privada'}</Badge>
                {s.status === 'placeholder' ? (
                  <Badge tone="amber">placeholder</Badge>
                ) : (
                  <Badge tone="green">integrada</Badge>
                )}
                <Badge tone="slate">{s.ingestion_method}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{s.description}</p>
              {s.base_url && (
                <a href={s.base_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-indigo-600 hover:underline">
                  {s.base_url}
                </a>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => void save()} loading={saving}>
          Guardar fuentes
        </Button>
      </div>
    </>
  );
}