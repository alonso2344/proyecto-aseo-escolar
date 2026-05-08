import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { sqliteDb, getDriver } from '../db.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  if (getDriver() !== 'sqlite') {
    return res.status(501).json({ error: 'Login Postgres: usar adaptación async' });
  }
  const sqlite = sqliteDb();
  const user = sqlite.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, name: user.name }
  });
});

router.get('/me', authMiddleware, (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const sqlite = sqliteDb();
  const user = sqlite.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

export default router;
