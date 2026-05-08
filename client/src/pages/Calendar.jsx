import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Calendar({ user }) {
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [title, setTitle] = useState('Revisar aseo');
  const [at, setAt] = useState('');

  async function load() {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();
    to.setDate(to.getDate() + 30);
    const [ev, rem] = await Promise.all([
      api.get('/notifications/calendar', {
        params: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
      }),
      api.get('/notifications/reminders')
    ]);
    setEvents(ev.data);
    setReminders(rem.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addReminder(e) {
    e.preventDefault();
    if (!at) return;
    await api.post('/notifications/reminders', { title, at: new Date(at).toISOString() });
    setAt('');
    load();
  }

  async function requestNotify() {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    if (p === 'granted') load();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendario y recordatorios</h1>
          <p className="text-slate-600">Tareas programadas y avisos próximos</p>
        </div>
        <button
          type="button"
          onClick={requestNotify}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Activar notificaciones del navegador
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Próximas tareas (fecha límite)</h2>
          <ul className="mt-4 max-h-80 space-y-2 overflow-auto text-sm">
            {events.map((t) => (
              <li key={t.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-900">{t.title}</span>
                <span className="text-slate-500">{t.due_date}</span>
              </li>
            ))}
            {events.length === 0 && <li className="text-slate-500">Sin fechas en el rango.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mis recordatorios</h2>
          <form onSubmit={addReminder} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="datetime-local"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-700 px-4 py-2 font-medium text-white hover:bg-brand-600"
            >
              Guardar
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {reminders.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <span className="font-medium">{r.title}</span>
                <span className="ml-2 text-slate-500">{new Date(r.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
