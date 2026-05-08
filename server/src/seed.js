import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { sqliteDb, getDriver } from './db.js';

export function seedIfEmpty() {
  if (getDriver() !== 'sqlite') return;
  const sqlite = sqliteDb();
  const n = sqlite.prepare('SELECT COUNT(*) as c FROM users').get();
  if (n.c > 0) return;

  const adminId = uuid();
  const cleanerId = uuid();
  const hashAdmin = bcrypt.hashSync('admin123', 10);
  const hashCleaner = bcrypt.hashSync('limpio123', 10);

  sqlite.prepare(
    `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`
  ).run(adminId, 'admin@escuela.local', hashAdmin, 'Administrador', 'admin');
  sqlite.prepare(
    `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`
  ).run(cleanerId, 'aseo@escuela.local', hashCleaner, 'Personal de aseo', 'cleaner');

  const areaSalon = uuid();
  const areaBano = uuid();
  sqlite.prepare(
    `INSERT INTO areas (id, name, type, frequency, description) VALUES (?,?,?,?,?)`
  ).run(areaSalon, 'Salón 101', 'salon', 'daily', 'Aula principal');
  sqlite.prepare(
    `INSERT INTO areas (id, name, type, frequency, description) VALUES (?,?,?,?,?)`
  ).run(areaBano, 'Baños planta baja', 'bano', 'daily', 'Zona de sanitarios');

  sqlite.prepare(
    `INSERT INTO inventory_items (id, name, unit, category, stock, min_stock) VALUES (?,?,?,?,?,?)`
  ).run(uuid(), 'Desinfectante', 'L', 'quimico', 12, 3);
  sqlite.prepare(
    `INSERT INTO inventory_items (id, name, unit, category, stock, min_stock) VALUES (?,?,?,?,?,?)`
  ).run(uuid(), 'Escobas', 'unidad', 'herramienta', 8, 2);
}
