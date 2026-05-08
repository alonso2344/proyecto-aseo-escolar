import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import webpush from 'web-push';
import { sqliteDb, getDriver } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function setupVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || 'mailto:admin@local';
  if (pub && priv) webpush.setVapidDetails(sub, pub, priv);
}

router.get('/calendar', (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const { from, to } = req.query;
  const sqlite = sqliteDb();
  let sql = `SELECT id, title, due_date, status, area_id FROM tasks WHERE due_date IS NOT NULL`;
  const params = [];
  if (from) {
    sql += ` AND date(due_date) >= date(?)`;
    params.push(from);
  }
  if (to) {
    sql += ` AND date(due_date) <= date(?)`;
    params.push(to);
  }
  sql += ' ORDER BY due_date';
  res.json(sqlite.prepare(sql).all(...params));
});

router.get('/reminders', (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const rows = sqliteDb()
    .prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY at')
    .all(req.user.id);
  res.json(rows);
});

router.post('/reminders', (req, res) => {
  const { title, at, task_id } = req.body || {};
  if (!title || !at) return res.status(400).json({ error: 'title y at (ISO) requeridos' });
  const id = uuid();
  sqliteDb()
    .prepare(`INSERT INTO reminders (id, user_id, title, at, task_id) VALUES (?,?,?,?,?)`)
    .run(id, req.user.id, title, at, task_id || null);
  res.status(201).json(sqliteDb().prepare('SELECT * FROM reminders WHERE id = ?').get(id));
});

router.post('/push/subscribe', (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  setupVapid();
  const { subscription } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: 'subscription inválida' });
  const sqlite = sqliteDb();
  const p256dh = subscription.keys?.p256dh || '';
  const auth = subscription.keys?.auth || '';
  const ex = sqlite
    .prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
    .get(req.user.id, subscription.endpoint);
  if (ex) {
    sqlite.prepare('UPDATE push_subscriptions SET p256dh = ?, auth = ? WHERE id = ?').run(p256dh, auth, ex.id);
  } else {
    const id = uuid();
    sqlite
      .prepare(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES (?,?,?,?,?)`
      )
      .run(id, req.user.id, subscription.endpoint, p256dh, auth);
  }
  res.json({ ok: true });
});

router.post('/push/test', requireRole('admin'), async (req, res) => {
  setupVapid();
  const pub = process.env.VAPID_PUBLIC_KEY;
  if (!pub) return res.status(503).json({ error: 'Configure VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY' });
  const subs = sqliteDb()
    .prepare('SELECT * FROM push_subscriptions WHERE user_id = ?')
    .all(req.user.id);
  const payload = JSON.stringify({ title: 'AseoEscolar Pro', body: 'Notificación de prueba' });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch {
      // subscription may be invalid
    }
  }
  res.json({ sent, total: subs.length });
});

export default router;
