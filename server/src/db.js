import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let pool = null;
let driver = 'sqlite';

/** @type {{ db: object, path: string } | null} */
let sqliteBundle = null;

function getDbUrl() {
  return process.env.DATABASE_URL || 'sqlite:./data/aseo.db';
}

function persistSqlJs() {
  if (!sqliteBundle) return;
  const data = sqliteBundle.db.export();
  fs.writeFileSync(sqliteBundle.path, Buffer.from(data));
}

function wrapSqlJsDatabase(sqlDb, dbFilePath) {
  sqliteBundle = { db: sqlDb, path: dbFilePath };

  return {
    exec(sql) {
      sqlDb.exec(sql);
      persistSqlJs();
    },
    prepare(sql) {
      return {
        get(...params) {
          const stmt = sqlDb.prepare(sql);
          try {
            if (params.length) stmt.bind(params);
            if (!stmt.step()) return undefined;
            return stmt.getAsObject();
          } finally {
            stmt.free();
          }
        },
        all(...params) {
          const stmt = sqlDb.prepare(sql);
          try {
            if (params.length) stmt.bind(params);
            const rows = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            return rows;
          } finally {
            stmt.free();
          }
        },
        run(...params) {
          const stmt = sqlDb.prepare(sql);
          try {
            if (params.length) stmt.bind(params);
            stmt.step();
            return { changes: sqlDb.getRowsModified() };
          } finally {
            stmt.free();
            persistSqlJs();
          }
        }
      };
    },
    transaction(fn) {
      return (...args) => {
        sqlDb.run('BEGIN');
        try {
          const r = fn(...args);
          sqlDb.run('COMMIT');
          persistSqlJs();
          return r;
        } catch (e) {
          try {
            sqlDb.run('ROLLBACK');
          } catch {
            // ignore
          }
          throw e;
        }
      };
    }
  };
}

/** @type {ReturnType<typeof wrapSqlJsDatabase> | null} */
let sqlite = null;

export async function initDb() {
  const url = getDbUrl();
  if (url.startsWith('postgres')) {
    driver = 'postgres';
    pool = new pg.Pool({ connectionString: url });
    await runPostgresMigrations();
    return;
  }
  driver = 'sqlite';
  const filePath = url.replace(/^sqlite:/, '');
  const abs = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const initSqlJs = (await import('sql.js')).default;
  const wasmBinary = fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'));
  const SQL = await initSqlJs({ wasmBinary });

  let sqlDb;
  if (fs.existsSync(abs)) {
    const buf = fs.readFileSync(abs);
    sqlDb = new SQL.Database(buf);
  } else {
    sqlDb = new SQL.Database();
  }

  sqlDb.run('PRAGMA foreign_keys = ON');
  sqlite = wrapSqlJsDatabase(sqlDb, abs);
  runSqliteMigrations();
}

export function getDriver() {
  return driver;
}

function runSqliteMigrations() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','teacher','student','cleaner')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly')),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending','in_progress','completed','cancelled')),
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT REFERENCES users(id),
      frequency_snapshot TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS task_checklist (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS task_photos (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('before','after')),
      path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      category TEXT,
      stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      at TEXT NOT NULL,
      task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, endpoint)
    );
  `;
  sqlite.exec(sql);
}

async function runPostgresMigrations() {
  const c = await pool.connect();
  try {
    await c.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','teacher','student','cleaner')),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS areas (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly')),
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY,
      area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATE,
      status TEXT NOT NULL CHECK(status IN ('pending','in_progress','completed','cancelled')),
      assigned_to UUID REFERENCES users(id),
      created_by UUID REFERENCES users(id),
      frequency_snapshot TEXT,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS task_checklist (
      id UUID PRIMARY KEY,
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INT NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS task_photos (
      id UUID PRIMARY KEY,
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('before','after')),
      path TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS inventory_items (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      category TEXT,
      stock DOUBLE PRECISION NOT NULL DEFAULT 0,
      min_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      at TIMESTAMPTZ NOT NULL,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      sent BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    `);
  } finally {
    c.release();
  }
}

export const db = {
  prepare(sql) {
    if (driver === 'sqlite') return sqlite.prepare(sql);
    throw new Error('Use db.query for PostgreSQL');
  },
  exec(sql) {
    if (driver === 'sqlite') return sqlite.exec(sql);
    throw new Error('Use async query for PostgreSQL');
  },
  async query(text, params = []) {
    if (driver === 'postgres') {
      const r = await pool.query(text, params);
      return r.rows;
    }
    throw new Error('SQLite usa prepare/synchronize');
  },
  transaction(fn) {
    if (driver === 'sqlite') return sqlite.transaction(fn);
    throw new Error('Transacciones Postgres: implementar según necesidad');
  }
};

export function sqliteDb() {
  if (driver !== 'sqlite' || !sqlite) throw new Error('SQLite no inicializado');
  return sqlite;
}
