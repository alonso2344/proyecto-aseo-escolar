import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Reports({ user }) {
  const [areas, setAreas] = useState([]);
  const [users, setUsers] = useState([]);
  const [areaId, setAreaId] = useState('');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [personId, setPersonId] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/areas').then((r) => {
      setAreas(r.data);
      if (r.data[0]) setAreaId(r.data[0].id);
    });
    api.get('/users').then((r) => {
      setUsers(r.data);
      if (r.data[0]) setPersonId(r.data[0].id);
    });
  }, []);

  if (user.role !== 'admin' && user.role !== 'teacher') {
    return <p className="text-slate-600">Reportes disponibles solo para coordinación.</p>;
  }

  async function downloadPdfArea() {
    setMsg('');
    const res = await api.get('/reports/area-monthly', {
      params: { area_id: areaId, month },
      responseType: 'blob'
    });
    if (res.data.type.includes('json')) {
      const text = await res.data.text();
      setMsg(JSON.parse(text).note || 'PDF no generado (compile el addon nativo).');
      return;
    }
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `area-${month}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdfPerson() {
    setMsg('');
    const res = await api.get('/reports/person-compliance', {
      params: { user_id: personId },
      responseType: 'blob'
    });
    if (res.data.type.includes('json')) {
      const text = await res.data.text();
      try {
        const j = JSON.parse(text);
        setMsg(j.note || 'Listo (JSON sin PDF).');
      } catch {
        setMsg('Respuesta inesperada');
      }
      return;
    }
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `persona-${personId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadExcel() {
    const res = await api.get('/reports/excel/summary', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aseo-export.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-slate-600">PDF optimizado (addon C++), Excel y cumplimiento</p>
      </div>

      {msg && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {msg}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Mensual por área (PDF nativo)</h2>
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="month"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button
            type="button"
            onClick={downloadPdfArea}
            className="rounded-lg bg-brand-700 px-4 py-2 font-medium text-white hover:bg-brand-600"
          >
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Cumplimiento por persona (PDF nativo)</h2>
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={downloadPdfPerson}
            className="rounded-lg bg-brand-700 px-4 py-2 font-medium text-white hover:bg-brand-600"
          >
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Exportar Excel</h2>
        <p className="mt-1 text-sm text-slate-600">Tareas e inventario en .xlsx</p>
        <button
          type="button"
          onClick={downloadExcel}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
        >
          Descargar Excel
        </button>
      </div>
    </div>
  );
}
