import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, getDriver } from './db.js';
import { seedIfEmpty } from './seed.js';
import authRoutes from './routes/auth.js';
import areasRoutes from './routes/areas.js';
import tasksRoutes from './routes/tasks.js';
import usersRoutes from './routes/users.js';
import inventoryRoutes from './routes/inventory.js';
import dashboardRoutes from './routes/dashboard.js';
import uploadsRoutes from './routes/uploads.js';
import reportsRoutes from './routes/reports.js';
import notificationsRoutes from './routes/notifications.js';
import { startReminderWorker } from './remindersWorker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: getDriver() });
});

async function main() {
  await initDb();
  seedIfEmpty();
  startReminderWorker();
  app.listen(PORT, () => {
    console.log(`AseoEscolar API http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
