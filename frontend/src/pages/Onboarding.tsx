import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { ConfigFiltro, JobSource, Profile } from '../services/types';
import { Alert, Button, Card, Field, Input, Select, Textarea } from '../components/ui';
import { DEPARTAMENTOS } from '../utils/locations';

const STEPS = [
  'InformaciÃ³n personal',
  'FormaciÃ³n',
  'Experiencia',
  'CV base',
  'Preferencias de bÃºsqueda',
  'Fuentes laborales',
  'Umbral de compatibilidad',
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<number[]>([]);
  const [sourceList, setSourceList] = useState<JobSource[]>([]);

  const [profile, setProfile] = useState<Profile>({});
  const [config, setConfig] = useState<ConfigFiltro>({
    sueldo_minimo: 3000,
    sueldo_maximo: 6000,
    radio_zona: 40,
    ubicaciones_preferidas: ['Lima'],
    duracion_min_meses: 1,
    duracion_max_meses: 12,
    excluir_penalizaciones: true,
    modalidad: 'any',
    tipo_contrato: 'any',
    umbral_notificacion: 70,
  });

  useEffect(() => {
    api
      .get<JobSource[]>('/sources')
      .then((list) => {
        setSourceList(list);
        setSources(list.filter((s) => s.selected).map((s) => s.id));
      })
      .catch(() => undefined);
  }, []);

  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  async function saveProfile() {
    await api.post<Profile>('/profile', { ...profile });
  }
  async function saveConfig() {
    await api.post<ConfigFiltro>('/config', config);
  }
  async function saveSources() {
    await api.put('/sources/user', { source_ids: sources });
  }

  async function finish(save: boolean) {
    setSaving(true);
    setError('');
    try {
      if (save) {
        await saveProfile();
        await saveConfig();
        await saveSources();
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los datos');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Completa tu perfil</h1>
        <p className="mt-1 text-sm text-slate-500">
          Paso {step + 1} de {STEPS.length}: <span className="font-medium text-slate-700">{STEPS[step]}</span>
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Nombre completo">
              <Input value={profile.nombre_completo ?? ''} onChange={(e) => setProfile({ ...profile, nombre_completo: e.target.value })} placeholder="Ej. MarÃ­a Quispe" />
            </Field>
            <Field label="TelÃ©fono">
              <Input value={profile.telefono ?? ''} onChange={(e) => setProfile({ ...profile, telefono: e.target.value })} placeholder="+51 999 999 999" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Ciudad actual">
                <Select value={profile.ubicacion_actual ?? ''} onChange={(e) => setProfile({ ...profile, ubicacion_actual: e.target.value })}>
                  <option value="">Selecciona</option>
                  {DEPARTAMENTOS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Email del CV">
                <Input type="email" value={profile.email_cv ?? ''} onChange={(e) => setProfile({ ...profile, email_cv: e.target.value })} placeholder="email del CV" />
              </Field>
            </div>
            <Field label="LinkedIn">
              <Input value={profile.linkedin ?? ''} onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Carrera profesional">
              <Input value={profile.carrera ?? ''} onChange={(e) => setProfile({ ...profile, carrera: e.target.value })} placeholder="Ej. Contabilidad, AdministraciÃ³n, Derecho..." />
            </Field>
            <Field label="Nivel de estudios">
              <Select value={profile.nivel_estudios ?? ''} onChange={(e) => setProfile({ ...profile, nivel_estudios: e.target.value })}>
                <option value="">Selecciona</option>
                <option>Secundaria completa</option>
                <option>TÃ©cnico</option>
                <option>Bachiller</option>
                <option>Universitario</option>
                <option>Titulado</option>
                <option>MaestrÃ­a</option>
                <option>Doctorado</option>
              </Select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Experiencia profesional" hint="Describe cargos, empresas, aÃ±os, funciones y logros reales.">
              <Textarea rows={8} value={profile.experiencia ?? ''} onChange={(e) => setProfile({ ...profile, experiencia: e.target.value })} placeholder="Ej. Asistente de TesorerÃ­a en ... (2 aÃ±os): gestiÃ³n de pagos, conciliaciones..." />
            </Field>
            <Field label="InformaciÃ³n adicional">
              <Textarea rows={3} value={profile.informacion_adicional ?? ''} onChange={(e) => setProfile({ ...profile, informacion_adicional: e.target.value })} placeholder="Herramientas, idiomas, disponibilidad..." />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Field label="CV base (texto)" hint="Pega tu CV o sÃºbelo como .txt. Se usa para adaptarlo a cada oferta sin inventar informaciÃ³n.">
              <Textarea rows={10} value={profile.cv_texto ?? ''} onChange={(e) => setProfile({ ...profile, cv_texto: e.target.value })} placeholder="Pega aquÃ­ el contenido de tu CV..." />
            </Field>
            <Button type="button" variant="secondary" onClick={() => readTxtFile(setProfile, profile)}>
              Subir archivo .txt
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Sueldo mÃ­nimo (S/)">
                <Input type="number" min={0} value={config.sueldo_minimo ?? ''} onChange={(e) => settersNum(setConfig, 'sueldo_minimo', e)} />
              </Field>
              <Field label="Sueldo mÃ¡ximo (S/)">
                <Input type="number" min={0} value={config.sueldo_maximo ?? ''} onChange={(e) => settersNum(setConfig, 'sueldo_maximo', e)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="DuraciÃ³n mÃ­nima (meses)">
                <Input type="number" min={0} value={config.duracion_min_meses ?? ''} onChange={(e) => settersNum(setConfig, 'duracion_min_meses', e)} />
              </Field>
              <Field label="DuraciÃ³n mÃ¡xima (meses)">
                <Input type="number" min={0} value={config.duracion_max_meses ?? ''} onChange={(e) => settersNum(setConfig, 'duracion_max_meses', e)} />
              </Field>
            </div>
            <Field label="Zonas preferidas" hint="MantÃ©n presionado Ctrl (o Cmd) para elegir varias.">
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
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={config.excluir_penalizaciones ?? false}
                onChange={(e) => setConfig({ ...config, excluir_penalizaciones: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Excluir ofertas con penalizaciÃ³n contractual
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Modalidad">
                <Select value={config.modalidad ?? 'any'} onChange={(e) => setConfig({ ...config, modalidad: e.target.value })}>
                  <option value="any">Cualquiera</option>
                  <option value="presencial">Presencial</option>
                  <option value="remoto">Remoto</option>
                  <option value="hÃ­brido">HÃ­brido</option>
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
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Marca las fuentes que deseas consultar:</p>
            {sourceList.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Cargando fuentes...</p>}
            {sourceList.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  checked={sources.includes(s.id)}
                  onChange={() => toggleSource(setSources, s.id)}
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {s.name}
                    {s.status === 'placeholder' && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">placeholder</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{s.description}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Compatibilidad mÃ­nima para marcarte una convocatoria como NOTIFICADA.</p>
            <div>
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
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            â† Anterior
          </Button>
          {step === STEPS.length - 1 ? (
            <Button type="button" loading={saving} onClick={() => void finish(true)}>
              Terminar
            </Button>
          ) : (
            <Button type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              Siguiente â†’
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4 text-center">
        <button onClick={() => void finish(false)} className="text-sm text-slate-400 hover:text-slate-600">
          Continuar sin completar (puedes hacerlo luego)
        </button>
      </div>
    </div>
  );
}

function toggleSource(setter: React.Dispatch<React.SetStateAction<number[]>>, id: number) {
  setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
}

function settersNum(setter: React.Dispatch<React.SetStateAction<ConfigFiltro>>, key: keyof ConfigFiltro, e: ChangeEvent<HTMLInputElement>) {
  const value = e.target.value;
  setter((prev) => ({ ...prev, [key]: value === '' ? null : Number(value) }));
}

function readTxtFile(setProfile: React.Dispatch<React.SetStateAction<Profile>>, profile: Profile) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.md';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile({ ...profile, cv_texto: String(reader.result ?? '') });
    reader.readAsText(file);
  };
  input.click();
}
