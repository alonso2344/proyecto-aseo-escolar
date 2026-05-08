import { useEffect, useState } from 'react';
import api from '../api.js';

const roles = [
  { value: 'student', label: 'Estudiante' },
  { value: 'teacher', label: 'Docente' },
  { value: 'cleaner', label: 'Personal de aseo' },
  { value: 'admin', label: 'Administrador' }
];

export default function Users({ user }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'cleaner'
  });

  const isAdmin = user.role === 'admin';

  async function load() {
    const { data } = await api.get('/users');
    setUsers(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    await api.post('/users', form);
    setForm({ email: '', password: '', name: '', role: 'cleaner' });
    load();
  }

  if (!isAdmin && user.role !== 'teacher') {
    return <p className="text-slate-600">No tiene permiso para ver esta sección.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Personal</h1>
        <p className="text-slate-600">Estudiantes, docentes y equipo de aseo</p>
      </div>

      {isAdmin && (
        <form
          onSubmit={create}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 lg:grid-cols-5"
        >
          <input
            required
            placeholder="Nombre"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="email"
            placeholder="Correo"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            placeholder="Contraseña temporal"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-brand-700 py-2 font-medium text-white hover:bg-brand-600"
          >
            Crear usuario
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 capitalize">{roles.find((r) => r.value === u.role)?.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
