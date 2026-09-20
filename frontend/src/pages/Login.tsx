import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import { Alert, Button, Field, Input } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout subtitle="Inicia sesión en tu cuenta">
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-lg">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Email">
          <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
        </Field>
        <Field label="Contraseña">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          Iniciar sesión
        </Button>
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Usuario de prueba</p>
          <p>
            Email: <code>prueba@demo.com</code> · Contraseña: <code>Demo1234!</code>
          </p>
        </div>
        <p className="text-center text-sm text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}