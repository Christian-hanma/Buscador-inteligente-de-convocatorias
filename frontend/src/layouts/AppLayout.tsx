import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/ofertas', label: 'Ofertas', icon: '◈' },
  { to: '/matches', label: 'Matches', icon: '◎' },
  { to: '/cvs', label: 'Mis CVs', icon: '▤' },
  { to: '/perfil', label: 'Perfil', icon: '☺' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙' },
  { to: '/fuentes', label: 'Fuentes', icon: '⇄' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-slate-900 text-slate-200">
        <div className="border-b border-slate-800 px-5 py-5">
          <p className="text-sm font-bold text-white">Convocatorias</p>
          <p className="text-[11px] text-slate-400">Buscador Inteligente</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-indigo-600 font-medium text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-5 py-4">
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <button onClick={logout} className="mt-2 text-xs font-medium text-slate-300 hover:text-white">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto bg-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}