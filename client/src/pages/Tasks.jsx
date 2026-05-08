import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [areas, setAreas] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    area_id: '',
    title: '',
    due_date: '',
    assigned_to: '',
    checklistText: 'Barrer\nDesinfectar superficies\nLimpiar vidrios'
  });

  const canCreate = user.role === 'admin' || user.role === 'teacher';

  async function load() {
    const [t, a] = await Promise.all([api.get('/tasks'), api.get('/areas')]);
    setTasks(t.data);
    setAreas(a.data);
    if (user.role === 'admin' || user.role === 'teacher') {
      const u = await api.get('/users');
      setUsers(u.data);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    const checklist = form.checklistText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    await api.post('/tasks', {
      area_id: form.area_id,
      title: form.title,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      checklist
    });
    setForm({
      area_id: '',
      title: '',
      due_date: '',
      assigned_to: '',
      checklistText: form.checklistText
    });
    load();
  }

  const statusLabel = {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completada',
    cancelled: 'Cancelada'
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tareas</h1>
        <p className="text-slate-600">Crear, asignar y dar seguimiento</p>
      </div>

      {canCreate && (
        <form
          onSubmit={create}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <select
              required
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={form.area_id}
              onChange={(e) => setForm({ ...form, area_id: e.target.value })}
            >
              <option value="">Área…</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Título"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              type="date"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
            >
              <option value="">Sin asignar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            rows={4}
            value={form.checklistText}
            onChange={(e) => setForm({ ...form, checklistText: e.target.value })}
            placeholder="Ítems de checklist, uno por línea"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-5 py-2 font-medium text-white hover:bg-brand-600"
          >
            Crear tarea
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tarea</th>
              <th className="px-4 py-3">Área</th>
              <th className="px-4 py-3">Vence</th>
              <th className="px-4 py-3">Asignado</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{t.title}</td>
                <td className="px-4 py-3">{t.area_name}</td>
                <td className="px-4 py-3">{t.due_date || '—'}</td>
                <td className="px-4 py-3">{t.assignee_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize">
                    {statusLabel[t.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/tareas/${t.id}`} className="font-medium text-brand-700 hover:underline">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
