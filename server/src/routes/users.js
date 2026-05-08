import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { sqliteDb, getDriver } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', requireRole('admin', 'teacher'), (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const rows = sqliteDb()
    .prepare('SELECT id, email, name, role, active, created_at FROM users ORDER BY name')
    .all();
  res.json(rows);
});

router.post('/', requireRole('admin'), (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password || !name || !role) return res.status(400).json({ error: 'Datos incompletos' });
  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  try {
    sqliteDb()
      .prepare(`INSERT INTO users (id, email, password_hash, name, role) VALUES (?,?,?,?,?)`)
      .run(id, email, hash, name, role);
  } catch {
    return res.status(409).json({ error: 'Email duplicado' });
  }
  res.status(201).json({ id, email, name, role });
});

router.patch('/:id', requireRole('admin'), (req, res) => {
  const { name, role, active, password } = req.body || {};
  const sqlite = sqliteDb();
  const cur = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'No encontrado' });
  let pwd = cur.password_hash;
  if (password) pwd = bcrypt.hashSync(password, 10);
  sqlite
    .prepare(
      `UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role),
      active = COALESCE(?, active), password_hash = ? WHERE id = ?`
    )
    .run(name ?? cur.name, role ?? cur.role, active != null ? (active ? 1 : 0) : cur.active, pwd, req.params.id);
  res.json(sqlite.prepare('SELECT id, email, name, role, active FROM users WHERE id = ?').get(req.params.id));
});

export default router;
