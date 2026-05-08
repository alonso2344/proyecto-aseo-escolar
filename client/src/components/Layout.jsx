import { Link, useLocation } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/areas', label: 'Áreas' },
  { to: '/tareas', label: 'Tareas' },
  { to: '/personal', label: 'Personal' },
  { to: '/inventario', label: 'Inventario' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/calendario', label: 'Calendario' }
];

export default function Layout({ user, onLogout, children }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white shadow-sm md:flex">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white">
            AE
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">AseoEscolar Pro</p>
            <p className="text-xs text-slate-500">Panel escolar</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = loc.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-4 text-xs text-slate-500">
          <p className="font-medium text-slate-800">{user.name}</p>
          <p className="capitalize">{user.role}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Salir
          </button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-brand-800">AseoEscolar Pro</p>
            <button
              type="button"
              onClick={onLogout}
              className="text-sm font-medium text-slate-600 underline"
            >
              Salir
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  loc.pathname === item.to
                    ? 'bg-brand-100 text-brand-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 pb-16 md:p-8">{children}</main>
      </div>
    </div>
  );
}
