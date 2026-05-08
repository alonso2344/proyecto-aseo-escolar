import { useEffect, useState } from 'react';
import api from '../api.js';

const frequencies = [
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' }
];

export default function Areas({ user }) {
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    name: '',
    type: 'salon',
    frequency: 'daily',
    description: ''
  });

  const canEdit = user.role === 'admin' || user.role === 'teacher';

  async function load() {
    const { data } = await api.get('/areas');
    setAreas(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    await api.post('/areas', form);
    setForm({ name: '', type: 'salon', frequency: 'daily', description: '' });
    load();
  }

  async function remove(id) {
    if (!confirm('¿Eliminar área?')) return;
    await api.delete(`/areas/${id}`);
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Áreas</h1>
        <p className="text-slate-600">Salones, baños, patios, laboratorios y más</p>
      </div>

      {canEdit && (
        <form
          onSubmit={create}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 lg:grid-cols-4"
        >
          <input
            required
            placeholder="Nombre"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Tipo (salón, patio…)"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            {frequencies.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              placeholder="Descripción"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-700 px-4 py-2 font-medium text-white hover:bg-brand-600"
            >
              Añadir
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Frecuencia</th>
              <th className="px-4 py-3">Descripción</th>
              {user.role === 'admin' && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {areas.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                <td className="px-4 py-3 capitalize">{a.type}</td>
                <td className="px-4 py-3">{frequencies.find((f) => f.value === a.frequency)?.label}</td>
                <td className="px-4 py-3 text-slate-600">{a.description || '—'}</td>
                {user.role === 'admin' && (
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-red-600 hover:underline" onClick={() => remove(a.id)}>
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
