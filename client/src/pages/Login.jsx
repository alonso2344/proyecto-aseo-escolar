import { useState } from 'react';
import api from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@escuela.local');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await onLogin(data.token);
    } catch {
      setErr('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-lg font-bold text-white">
            AE
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AseoEscolar Pro</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión integral de aseo escolar</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Correo</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Contraseña</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-700 py-2.5 font-semibold text-white shadow hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Demo: admin@escuela.local / admin123 · aseo@escuela.local / limpio123
        </p>
      </div>
    </div>
  );
}
