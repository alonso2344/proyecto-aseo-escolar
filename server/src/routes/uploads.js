import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';
import { sqliteDb, getDriver } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuid()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();
router.use(authMiddleware);

router.post('/:taskId/:kind', upload.single('photo'), (req, res) => {
  const { taskId, kind } = req.params;
  if (!['before', 'after'].includes(kind)) return res.status(400).json({ error: 'kind inválido' });
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
  if (getDriver() !== 'sqlite') return res.status(501).json({ error: 'No implementado' });
  const sqlite = sqliteDb();
  const task = sqlite.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }
  const id = uuid();
  const rel = `/uploads/${req.file.filename}`;
  sqlite.prepare(`INSERT INTO task_photos (id, task_id, kind, path) VALUES (?,?,?,?)`).run(id, taskId, kind, rel);
  res.status(201).json({ id, path: rel });
});

export default router;
