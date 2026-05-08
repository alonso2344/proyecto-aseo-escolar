import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { sqliteDb, getDriver } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const rows = sqliteDb().prepare('SELECT * FROM areas ORDER BY name').all();
  res.json(rows);
});

router.post('/', requireRole('admin', 'teacher'), (req, res) => {
  const { name, type, frequency, description } = req.body || {};
  if (!name || !type || !frequency) return res.status(400).json({ error: 'Datos incompletos' });
  const id = uuid();
  sqliteDb()
    .prepare(
      `INSERT INTO areas (id, name, type, frequency, description) VALUES (?,?,?,?,?)`
    )
    .run(id, name, type, frequency, description || null);
  res.status(201).json({ id, name, type, frequency, description });
});

router.patch('/:id', requireRole('admin', 'teacher'), (req, res) => {
  const { name, type, frequency, description } = req.body || {};
  const sqlite = sqliteDb();
  const cur = sqlite.prepare('SELECT * FROM areas WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'No encontrado' });
  sqlite
    .prepare(
      `UPDATE areas SET name = COALESCE(?, name), type = COALESCE(?, type),
      frequency = COALESCE(?, frequency), description = COALESCE(?, description) WHERE id = ?`
    )
    .run(name ?? cur.name, type ?? cur.type, frequency ?? cur.frequency, description ?? cur.description, req.params.id);
  res.json(sqlite.prepare('SELECT * FROM areas WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  sqliteDb().prepare('DELETE FROM areas WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
