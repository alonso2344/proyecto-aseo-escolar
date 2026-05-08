import { Router } from 'express';
import { sqliteDb, getDriver } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { aggregateComplianceNative } from '../nativeBridge.js';

const router = Router();
router.use(authMiddleware);

router.get('/summary', (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const sqlite = sqliteDb();
  const today = new Date().toISOString().slice(0, 10);
  const pending = sqlite.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status = 'pending'`).get().c;
  const inProg = sqlite.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status = 'in_progress'`).get().c;
  const completed = sqlite.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status = 'completed'`).get().c;
  const todayTasks = sqlite
    .prepare(`SELECT COUNT(*) as c FROM tasks WHERE date(due_date) = date(?)`)
    .get(today).c;
  const todayDone = sqlite
    .prepare(
      `SELECT COUNT(*) as c FROM tasks WHERE date(due_date) = date(?) AND status = 'completed'`
    )
    .get(today).c;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekly = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const done = sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM tasks WHERE date(completed_at) = date(?) AND status = 'completed'`
      )
      .get(ds).c;
    weekly.push(done);
  }
  const agg = aggregateComplianceNative(weekly);

  res.json({
    pending,
    inProgress: inProg,
    completed,
    todayScheduled: todayTasks,
    todayCompleted: todayDone,
    weeklyCompliance: weekly,
    weeklyStats: agg,
    lowInventory: sqlite
      .prepare(`SELECT * FROM inventory_items WHERE stock <= min_stock ORDER BY name LIMIT 10`)
      .all()
  });
});

export default router;
