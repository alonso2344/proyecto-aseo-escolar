import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import api from '../api.js';

const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setData(r.data));
  }, []);

  if (!data) {
    return <p className="text-slate-500">Cargando resumen…</p>;
  }

  const chartData = data.weeklyCompliance.map((v, i) => ({
    day: days[i],
    completadas: v
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Resumen operativo y cumplimiento semanal</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Pendientes" value={data.pending} tone="amber" />
        <Stat title="En progreso" value={data.inProgress} tone="sky" />
        <Stat title="Completadas (total)" value={data.completed} tone="emerald" />
        <Stat title="Hoy completadas" value={`${data.todayCompleted} / ${data.todayScheduled}`} tone="slate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Cumplimiento semanal</h2>
          <p className="text-sm text-slate-500">
            Suma: {data.weeklyStats.sum} · Prom: {data.weeklyStats.avg?.toFixed?.(1) ?? data.weeklyStats.avg}
            {data.weeklyStats.stdDev != null && ` · σ ${data.weeklyStats.stdDev.toFixed(2)}`}
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="completadas" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Inventario bajo mínimo</h2>
          {data.lowInventory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Todo en orden.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.lowInventory.map((item) => (
                <li key={item.id} className="flex justify-between py-2 text-sm">
                  <span>{item.name}</span>
                  <span className="text-amber-700">
                    {item.stock} {item.unit} (mín {item.min_stock})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value, tone }) {
  const ring = {
    amber: 'border-amber-200 bg-amber-50',
    sky: 'border-sky-200 bg-sky-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    slate: 'border-slate-200 bg-white'
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${ring}`}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
