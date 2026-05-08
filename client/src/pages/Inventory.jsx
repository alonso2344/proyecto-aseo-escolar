import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Inventory({ user }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({
    name: '',
    unit: 'unidad',
    category: '',
    stock: '',
    min_stock: ''
  });

  const canEdit = ['admin', 'teacher', 'cleaner'].includes(user.role);

  async function load() {
    const { data: d } = await api.get('/inventory');
    setData(d);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    await api.post('/inventory', {
      name: form.name,
      unit: form.unit,
      category: form.category || null,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 0
    });
    setForm({ name: '', unit: 'unidad', category: '', stock: '', min_stock: '' });
    load();
  }

  async function patchItem(item, field, value) {
    await api.patch(`/inventory/${item.id}`, { [field]: value });
    load();
  }

  if (!data) return <p className="text-slate-500">Cargando inventario…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
        <p className="text-slate-600">Insumos y alertas de stock</p>
      </div>

      {data.lowStock.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">Alertas de bajo inventario</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {data.lowStock.map((i) => (
              <li key={i.id}>
                {i.name}: {i.stock} {i.unit} (mínimo {i.min_stock})
              </li>
            ))}
          </ul>
        </div>
      )}

      {canEdit && (user.role === 'admin' || user.role === 'teacher') && (
        <form
          onSubmit={create}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-5"
        >
          <input
            required
            placeholder="Nombre"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Unidad"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <input
            placeholder="Categoría"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            placeholder="Stock"
            type="number"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              placeholder="Mínimo"
              type="number"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              value={form.min_stock}
              onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
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
              <th className="px-4 py-3">Ítem</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Mínimo</th>
              <th className="px-4 py-3">Unidad</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.id} className="divide-y divide-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{i.name}</td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <input
                      type="number"
                      className="w-24 rounded border border-slate-300 px-2 py-1"
                      defaultValue={i.stock}
                      onBlur={(e) => patchItem(i, 'stock', Number(e.target.value))}
                    />
                  ) : (
                    i.stock
                  )}
                </td>
                <td className="px-4 py-3">{i.min_stock}</td>
                <td className="px-4 py-3">{i.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
