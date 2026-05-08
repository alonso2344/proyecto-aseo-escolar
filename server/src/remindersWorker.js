import webpush from 'web-push';
import { sqliteDb, getDriver } from './db.js';

let timer = null;

function setupVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || 'mailto:admin@local';
  if (pub && priv) webpush.setVapidDetails(sub, pub, priv);
}

async function tick() {
  if (getDriver() !== 'sqlite') return;
  setupVapid();
  const sqlite = sqliteDb();
  const now = new Date().toISOString();
  const due = sqlite
    .prepare(`SELECT * FROM reminders WHERE sent = 0 AND datetime(at) <= datetime(?) LIMIT 20`)
    .all(now);
  for (const r of due) {
    const subs = sqlite.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(r.user_id);
    const payload = JSON.stringify({
      title: 'Recordatorio AseoEscolar',
      body: r.title
    });
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
      } catch {
        // ignore invalid subscription
      }
    }
    sqlite.prepare(`UPDATE reminders SET sent = 1 WHERE id = ?`).run(r.id);
  }
}

export function startReminderWorker() {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch(() => {});
  }, 60_000);
  tick().catch(() => {});
}
