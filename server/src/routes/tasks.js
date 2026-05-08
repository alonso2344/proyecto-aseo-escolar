import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { sqliteDb, getDriver } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const { status, area_id, assigned_to, date } = req.query;
  let sql = `
    SELECT t.*, a.name as area_name, u.name as assignee_name
    FROM tasks t
    JOIN areas a ON a.id = t.area_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE 1=1`;
  const params = [];
  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  if (area_id) {
    sql += ' AND t.area_id = ?';
    params.push(area_id);
  }
  if (assigned_to) {
    sql += ' AND t.assigned_to = ?';
    params.push(assigned_to);
  }
  if (date) {
    sql += ' AND date(t.due_date) = date(?)';
    params.push(date);
  }
  sql += ' ORDER BY t.due_date IS NULL, t.due_date, t.created_at DESC';
  const rows = sqliteDb().prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const sqlite = sqliteDb();
  const task = sqlite
    .prepare(
      `SELECT t.*, a.name as area_name FROM tasks t JOIN areas a ON a.id = t.area_id WHERE t.id = ?`
    )
    .get(req.params.id);
  if (!task) return res.status(404).json({ error: 'No encontrado' });
  const checklist = sqlite.prepare('SELECT * FROM task_checklist WHERE task_id = ? ORDER BY sort_order').all(req.params.id);
  const photos = sqlite.prepare('SELECT * FROM task_photos WHERE task_id = ? ORDER BY created_at').all(req.params.id);
  res.json({ ...task, checklist, photos });
});

router.post('/', requireRole('admin', 'teacher'), (req, res) => {
  const { area_id, title, description, due_date, assigned_to, checklist, frequency_snapshot } = req.body || {};
  if (!area_id || !title) return res.status(400).json({ error: 'area_id y title requeridos' });
  const id = uuid();
  const sqlite = sqliteDb();
  const area = sqlite.prepare('SELECT frequency FROM areas WHERE id = ?').get(area_id);
  sqlite
    .prepare(
      `INSERT INTO tasks (id, area_id, title, description, due_date, status, assigned_to, created_by, frequency_snapshot)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      area_id,
      title,
      description || null,
      due_date || null,
      'pending',
      assigned_to || null,
      req.user.id,
      frequency_snapshot || area?.frequency || null
    );
  if (Array.isArray(checklist)) {
    let order = 0;
    for (const label of checklist) {
      if (typeof label !== 'string') continue;
      sqlite
        .prepare(
          `INSERT INTO task_checklist (id, task_id, label, done, sort_order) VALUES (?,?,?,?,?)`
        )
        .run(uuid(), id, label, 0, order++);
    }
  }
  res.status(201).json(sqlite.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
});

router.patch('/:id', (req, res) => {
  const { status, title, description, due_date, assigned_to } = req.body || {};
  const sqlite = sqliteDb();
  const cur = sqlite.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'No encontrado' });

  if (req.user.role === 'student' && cur.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'No puede editar esta tarea' });
  }

  let completed_at = cur.completed_at;
  if (status === 'completed' && cur.status !== 'completed') {
    completed_at = new Date().toISOString();
  } else if (status && status !== 'completed') {
    completed_at = null;
  }

  sqlite
    .prepare(
      `UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description),
      due_date = COALESCE(?, due_date), status = COALESCE(?, status), assigned_to = COALESCE(?, assigned_to),
      completed_at = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(
      title ?? null,
      description ?? null,
      due_date ?? null,
      status ?? null,
      assigned_to ?? null,
      completed_at,
      req.params.id
    );
  res.json(sqlite.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

router.patch('/:id/checklist/:itemId', (req, res) => {
  const { done } = req.body || {};
  const sqlite = sqliteDb();
  const task = sqlite.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
  sqlite
    .prepare(`UPDATE task_checklist SET done = ? WHERE id = ? AND task_id = ?`)
    .run(done ? 1 : 0, req.params.itemId, req.params.id);
  res.json({ ok: true });
});

export default router;
