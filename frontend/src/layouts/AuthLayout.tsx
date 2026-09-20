import type { ReactNode } from 'react';

export default function AuthLayout({ children, subtitle }: { children: ReactNode; subtitle: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Buscador de Convocatorias</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}