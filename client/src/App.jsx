import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Areas from './pages/Areas.jsx';
import Tasks from './pages/Tasks.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import Users from './pages/Users.jsx';
import Inventory from './pages/Inventory.jsx';
import Reports from './pages/Reports.jsx';
import Calendar from './pages/Calendar.jsx';
import api, { setToken } from './api.js';

function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setReady(true);
      return;
    }
    api
      .get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = (token) => {
    setToken(token);
    return api.get('/auth/me').then((r) => setUser(r.data));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return { user, ready, login, logout };
}

export default function App() {
  const { user, ready, login, logout } = useAuth();

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator)) return;
    const pub = import.meta.env.VITE_VAPID_PUBLIC || '';
    if (!pub) return;

    async function subscribePush() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pub)
        });
        await api.post('/notifications/push/subscribe', { subscription: sub.toJSON() });
      } catch {
        // permiso denegado o SW no listo
      }
    }

    if (Notification.permission === 'granted') subscribePush();
  }, [user]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login onLogin={login} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <Layout user={user} onLogout={logout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/areas" element={<Areas user={user} />} />
            <Route path="/tareas" element={<Tasks user={user} />} />
            <Route path="/tareas/:id" element={<TaskDetail user={user} />} />
            <Route path="/personal" element={<Users user={user} />} />
            <Route path="/inventario" element={<Inventory user={user} />} />
            <Route path="/reportes" element={<Reports user={user} />} />
            <Route path="/calendario" element={<Calendar user={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </BrowserRouter>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
