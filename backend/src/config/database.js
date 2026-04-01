const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./env');

const pool = new Pool({ connectionString: config.DATABASE_URL });

async function runMigrations() {
  console.log('[DB] Executando migrations...');
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`[DB] Migration ${file} executada`);
    } catch (err) {
      console.error(`[DB] Erro na migration ${file}:`, err.message);
    }
  }
  console.log('[DB] Migrations concluídas');
}

module.exports = { pool, runMigrations };
