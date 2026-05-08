import { Router } from 'express';
import ExcelJS from 'exceljs';
import { sqliteDb, getDriver } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { generatePdfNative, aggregateComplianceNative } from '../nativeBridge.js';

const router = Router();
router.use(authMiddleware);

router.get('/area-monthly', requireRole('admin', 'teacher'), (req, res) => {
  const { area_id, month } = req.query;
  if (!area_id || !month) return res.status(400).json({ error: 'area_id y month (YYYY-MM) requeridos' });
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const sqlite = sqliteDb();
  const area = sqlite.prepare('SELECT * FROM areas WHERE id = ?').get(area_id);
  if (!area) return res.status(404).json({ error: 'Área no encontrada' });
  const tasks = sqlite
    .prepare(
      `SELECT * FROM tasks WHERE area_id = ? AND strftime('%Y-%m', due_date) = ?
       ORDER BY due_date`
    )
    .all(area_id, month);
  const lines = [
    `Reporte mensual - ${month}`,
    `Área: ${area.name} (${area.type})`,
    `Frecuencia objetivo: ${area.frequency}`,
    '',
    `Total tareas en mes: ${tasks.length}`,
    `Completadas: ${tasks.filter((t) => t.status === 'completed').length}`,
    ''
  ];
  for (const t of tasks.slice(0, 80)) {
    lines.push(`- ${t.due_date || 'sin fecha'} | ${t.status} | ${t.title}`);
  }
  const pdf = generatePdfNative({ title: `Aseo ${area.name}`, lines });
  if (pdf) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="area-${month}.pdf"`);
    return res.send(pdf);
  }
  res.json({ area, tasks, note: 'Addon nativo no compilado; usar /reports/excel' });
});

router.get('/person-compliance', requireRole('admin', 'teacher'), (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const sqlite = sqliteDb();
  const user = sqlite.prepare('SELECT id, name, role FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const rows = sqlite
    .prepare(
      `SELECT status, COUNT(*) as c FROM tasks WHERE assigned_to = ? GROUP BY status`
    )
    .all(user_id);
  const totals = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
  for (const r of rows) totals[r.status] = r.c;
  const assigned = Object.values(totals).reduce((a, b) => a + b, 0);
  const rate = assigned ? totals.completed / assigned : 0;
  const weekly = [0, 0, 0, 0, 0, 0, 0];
  const completedByDay = sqlite
    .prepare(
      `SELECT strftime('%w', completed_at) as dow, COUNT(*) as c
       FROM tasks WHERE assigned_to = ? AND status = 'completed' AND completed_at IS NOT NULL
       GROUP BY dow`
    )
    .all(user_id);
  for (const row of completedByDay) {
    const i = Number(row.dow);
    weekly[i] = row.c;
  }
  const stats = aggregateComplianceNative(weekly);
  const lines = [
    `Cumplimiento por persona`,
    `${user.name} (${user.role})`,
    '',
    `Tasa completadas: ${(rate * 100).toFixed(1)}%`,
    ...Object.entries(totals).map(([k, v]) => `${k}: ${v}`),
    '',
    'Distribución semanal (nativo):',
    `suma: ${stats.sum}, promedio: ${stats.avg?.toFixed?.(2) ?? stats.avg}, pico día: ${stats.peakIndex}`
  ];
  const pdf = generatePdfNative({ title: `Cumplimiento ${user.name}`, lines });
  if (pdf) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="person-${user_id}.pdf"`);
    return res.send(pdf);
  }
  res.json({ user, totals, rate, weekly, stats });
});

router.get('/excel/summary', requireRole('admin', 'teacher'), async (req, res) => {
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const sqlite = sqliteDb();
  const wb = new ExcelJS.Workbook();
  const ttasks = wb.addWorksheet('Tareas');
  ttasks.columns = [
    { header: 'ID', key: 'id' },
    { header: 'Área', key: 'area_name' },
    { header: 'Título', key: 'title' },
    { header: 'Estado', key: 'status' },
    { header: 'Vence', key: 'due_date' }
  ];
  const taskRows = sqlite
    .prepare(
      `SELECT t.id, a.name as area_name, t.title, t.status, t.due_date FROM tasks t JOIN areas a ON a.id = t.area_id`
    )
    .all();
  ttasks.addRows(taskRows);

  const inv = wb.addWorksheet('Inventario');
  inv.columns = [
    { header: 'Nombre', key: 'name' },
    { header: 'Stock', key: 'stock' },
    { header: 'Mínimo', key: 'min_stock' }
  ];
  inv.addRows(sqlite.prepare('SELECT name, stock, min_stock FROM inventory_items').all());

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="aseo-export.xlsx"');
  await wb.xlsx.write(res);
});

export default router;
