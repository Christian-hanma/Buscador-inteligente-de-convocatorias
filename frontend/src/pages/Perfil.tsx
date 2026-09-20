import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import type { Profile } from '../services/types';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner, Textarea } from '../components/ui';
import { DEPARTAMENTOS } from '../utils/locations';

export default function Perfil() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Profile>('/profile')
      .then((p) => setProfile(p ?? {}))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil'))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const result = await api.put<Profile>('/profile', profile ?? {});
      setProfile(result);
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

  const p = profile ?? {};

  return (
    <>
      <PageHeader title="Perfil profesional" description="Esta información alimenta al motor de matching y a tus CVs adaptados." />
      {saved && (
        <div className="mb-4">
          <Alert tone="success">Perfil guardado correctamente.</Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Datos personales</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre completo">
              <Input value={p.nombre_completo ?? ''} onChange={(e) => setProfile({ ...p, nombre_completo: e.target.value })} />
            </Field>
            <Field label="Teléfono">
              <Input value={p.telefono ?? ''} onChange={(e) => setProfile({ ...p, telefono: e.target.value })} />
            </Field>
            <Field label="Ciudad actual">
              <Select value={p.ubicacion_actual ?? ''} onChange={(e) => setProfile({ ...p, ubicacion_actual: e.target.value })}>
                <option value="">Selecciona</option>
                {DEPARTAMENTOS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Email en el CV">
              <Input type="email" value={p.email_cv ?? ''} onChange={(e) => setProfile({ ...p, email_cv: e.target.value })} />
            </Field>
            <Field label="LinkedIn">
              <Input value={p.linkedin ?? ''} onChange={(e) => setProfile({ ...p, linkedin: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Formación</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Carrera profesional">
              <Input value={p.carrera ?? ''} onChange={(e) => setProfile({ ...p, carrera: e.target.value })} />
            </Field>
            <Field label="Nivel de estudios">
              <Select value={p.nivel_estudios ?? ''} onChange={(e) => setProfile({ ...p, nivel_estudios: e.target.value })}>
                <option value="">Selecciona</option>
                <option>Secundaria completa</option>
                <option>Técnico</option>
                <option>Bachiller</option>
                <option>Universitario</option>
                <option>Titulado</option>
                <option>Maestría</option>
                <option>Doctorado</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Experiencia e información adicional</h3>
          <div className="space-y-4">
            <Field label="Experiencia">
              <Textarea rows={6} value={p.experiencia ?? ''} onChange={(e) => setProfile({ ...p, experiencia: e.target.value })} />
            </Field>
            <Field label="Información adicional">
              <Textarea rows={3} value={p.informacion_adicional ?? ''} onChange={(e) => setProfile({ ...p, informacion_adicional: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">CV base</h3>
          <div className="space-y-4">
            <Field label="Texto del CV" hint="Base para el CV adaptado: el sistema reordena y resalta lo real, nunca inventa.">
              <Textarea rows={10} value={p.cv_texto ?? ''} onChange={(e) => setProfile({ ...p, cv_texto: e.target.value })} />
            </Field>
            <Button type="button" variant="secondary" onClick={() => readTxt(setProfile, p)}>
              Subir .txt
            </Button>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Guardar perfil
          </Button>
        </div>
      </form>
    </>
  );
}

function readTxt(setter: React.Dispatch<React.SetStateAction<Profile | null>>, p: Profile) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.md';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter({ ...p, cv_texto: String(reader.result ?? '') });
    reader.readAsText(file);
  };
  input.click();
}