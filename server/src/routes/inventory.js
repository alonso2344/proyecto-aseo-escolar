import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { sqliteDb, getDriver } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const rows = sqliteDb().prepare('SELECT * FROM inventory_items ORDER BY name').all();
  const low = rows.filter((r) => r.stock <= r.min_stock);
  res.json({ items: rows, lowStock: low });
});

router.post('/', requireRole('admin', 'teacher'), (req, res) => {
  const { name, unit, category, stock, min_stock } = req.body || {};
  if (!name || !unit) return res.status(400).json({ error: 'Nombre y unidad requeridos' });
  const id = uuid();
  sqliteDb()
    .prepare(
      `INSERT INTO inventory_items (id, name, unit, category, stock, min_stock) VALUES (?,?,?,?,?,?)`
    )
    .run(id, name, unit, category || null, Number(stock) || 0, Number(min_stock) || 0);
  res.status(201).json(sqliteDb().prepare('SELECT * FROM inventory_items WHERE id = ?').get(id));
});

router.patch('/:id', requireRole('admin', 'teacher', 'cleaner'), (req, res) => {
  const { name, unit, category, stock, min_stock } = req.body || {};
  const sqlite = sqliteDb();
  const cur = sqlite.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'No encontrado' });
  sqlite
    .prepare(
      `UPDATE inventory_items SET name = COALESCE(?, name), unit = COALESCE(?, unit),
      category = COALESCE(?, category), stock = COALESCE(?, stock), min_stock = COALESCE(?, min_stock),
      updated_at = datetime('now') WHERE id = ?`
    )
    .run(
      name ?? cur.name,
      unit ?? cur.unit,
      category ?? cur.category,
      stock != null ? Number(stock) : cur.stock,
      min_stock != null ? Number(min_stock) : cur.min_stock,
      req.params.id
    );
  res.json(sqlite.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id));
});

export default router;
