import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import type { ConfigFiltro } from '../services/types';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner } from '../components/ui';
import { DEPARTAMENTOS } from '../utils/locations';

export default function Configuracion() {
  const [config, setConfig] = useState<ConfigFiltro | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<ConfigFiltro>('/config')
      .then((c) => setConfig(c))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const result = await api.put<ConfigFiltro>('/config', config ?? {});
      setConfig(result);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Configuración de búsqueda"
        description="Estos filtros duros descartan ofertas ANTES de gastar una llamada de IA."
      />
      {saved && (
        <div className="mb-4">
          <Alert tone="success">Configuración guardada.</Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Remuneración y ubicación</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Sueldo mínimo (S/)">
              <Input type="number" min={0} value={config.sueldo_minimo ?? ''} onChange={(e) => setNum(e, 'sueldo_minimo')} />
            </Field>
            <Field label="Sueldo máximo (S/)">
              <Input type="number" min={0} value={config.sueldo_maximo ?? ''} onChange={(e) => setNum(e, 'sueldo_maximo')} />
            </Field>
            <Field label="Radio (km)">
              <Input type="number" min={0} value={config.radio_zona ?? ''} onChange={(e) => setNum(e, 'radio_zona')} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Zonas preferidas" hint="Mantén presionado Ctrl (o Cmd) para elegir varias.">
              <Select
                multiple
                value={config.ubicaciones_preferidas ?? []}
                onChange={(e) =>
                  setConfig({ ...config, ubicaciones_preferidas: Array.from(e.target.selectedOptions).map((o) => o.value) })
                }
              >
                {DEPARTAMENTOS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Duración y condiciones</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Duración mínima (meses)">
              <Input type="number" min={0} value={config.duracion_min_meses ?? ''} onChange={(e) => setNum(e, 'duracion_min_meses')} />
            </Field>
            <Field label="Duración máxima (meses)">
              <Input type="number" min={0} value={config.duracion_max_meses ?? ''} onChange={(e) => setNum(e, 'duracion_max_meses')} />
            </Field>
            <Field label="Modalidad">
              <Select value={config.modalidad ?? 'any'} onChange={(e) => setConfig({ ...config, modalidad: e.target.value })}>
                <option value="any">Cualquiera</option>
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="híbrido">Híbrido</option>
              </Select>
            </Field>
            <Field label="Tipo de contrato">
              <Select value={config.tipo_contrato ?? 'any'} onChange={(e) => setConfig({ ...config, tipo_contrato: e.target.value })}>
                <option value="any">Cualquiera</option>
                <option value="cas">CAS</option>
                <option value="728">D.L. 728</option>
                <option value="276">D.L. 276</option>
                <option value="planilla">Planilla</option>
                <option value="independiente">Independiente</option>
              </Select>
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(config.excluir_penalizaciones)}
              onChange={(e) => setConfig({ ...config, excluir_penalizaciones: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Excluir ofertas con penalización contractual
          </label>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Umbral de compatibilidad</h3>
          <p className="text-sm text-slate-500">
            Cuando una oferta supere este porcentaje, se marcará como notificada.
          </p>
          <div className="mt-3">
            <span className="text-3xl font-bold text-indigo-600">{config.umbral_notificacion ?? 70}%</span>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={config.umbral_notificacion ?? 70}
              onChange={(e) => setConfig({ ...config, umbral_notificacion: Number(e.target.value) })}
              className="mt-3 w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Guardar configuración
          </Button>
        </div>
      </form>
    </>
  );

  function setNum(e: React.ChangeEvent<HTMLInputElement>, key: keyof ConfigFiltro) {
    const value = e.target.value;
    setConfig((prev) => (prev ? { ...prev, [key]: value === '' ? null : Number(value) } : prev));
  }
}