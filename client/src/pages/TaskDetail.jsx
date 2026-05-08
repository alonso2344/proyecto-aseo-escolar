import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api.js'

export default function TaskDetail({ user }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [task, setTask] = useState(null)

  async function load() {
    const { data } = await api.get(`/tasks/${id}`)
    setTask(data)
  }

  useEffect(() => {
    load()
  }, [id])

  async function setStatus(status) {
    await api.patch(`/tasks/${id}`, { status })
    load()
  }

  async function toggleCheck(itemId, done) {
    await api.patch(`/tasks/${id}/checklist/${itemId}`, { done })
    load()
  }

  async function uploadPhoto(kind, file) {
    if (!file) return
    const fd = new FormData()
    fd.append('photo', file)
    await api.post(`/uploads/${id}/${kind}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    load()
  }

  if (!task) return <p className="text-slate-500">Cargando…</p>

  const before = task.photos?.filter((p) => p.kind === 'before') || []
  const after = task.photos?.filter((p) => p.kind === 'after') || []

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" onClick={() => nav(-1)} className="text-sm text-brand-700 hover:underline">
            ← Volver
          </button>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{task.title}</h1>
          <p className="text-slate-600">
            {task.area_name} · Vence: {task.due_date || 'sin fecha'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(user.role === 'admin' || user.role === 'teacher' || user.role === 'cleaner') && (
            <>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                onClick={() => setStatus('pending')}
              >
                Pendiente
              </button>
              <button
                type="button"
                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-900"
                onClick={() => setStatus('in_progress')}
              >
                En progreso
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
                onClick={() => setStatus('completed')}
              >
                Completar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Checklist</h2>
          <ul className="mt-4 space-y-2">
            {task.checklist?.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!item.done}
                  disabled={user.role === 'student' && task.assigned_to !== user.id}
                  onChange={(e) => toggleCheck(item.id, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className={item.done ? 'text-slate-400 line-through' : ''}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Fotos antes</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {before.map((p) => (
                <img
                  key={p.id}
                  src={p.path}
                  alt="Antes"
                  className="h-28 w-40 rounded-lg object-cover ring-1 ring-slate-200"
                />
              ))}
            </div>
            <label className="mt-3 inline-block cursor-pointer text-sm font-medium text-brand-700">
              <input
                id={`before-${task.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadPhoto('before', e.target.files?.[0])}
              />
              Subir foto “antes”
            </label>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Fotos después</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {after.map((p) => (
                <img
                  key={p.id}
                  src={p.path}
                  alt="Después"
                  className="h-28 w-40 rounded-lg object-cover ring-1 ring-slate-200"
                />
              ))}
            </div>
            <label className="mt-3 inline-block cursor-pointer text-sm font-medium text-brand-700">
              <input
                id={`after-${task.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadPhoto('after', e.target.files?.[0])}
              />
              Subir foto “después”
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
