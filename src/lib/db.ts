import knex from 'knex';
import path from 'path';
import fs from 'fs';

// Check if we are given an external database URL
const connectionString = process.env.DATABASE_URL;

// Ensure the data directory exists for SQLite
const sqliteDir = path.join(process.cwd(), 'data');
if (!connectionString) {
  fs.mkdirSync(sqliteDir, { recursive: true });
}

// Configure Knex to use either PostgreSQL (if DATABASE_URL is provided) or standard SQLite
const db = knex({
  client: connectionString ? 'pg' : 'sqlite3',
  connection: connectionString || {
    filename: process.env.SQLITE_FILENAME || path.join(sqliteDir, 'db.sqlite'),
  },
  useNullAsDefault: true, // Required for SQLite
});

// A promise that resolves once the schema has been created
let _dbReady: Promise<void> | null = null;

// Initialize the database table if it doesn't exist
export function getDbReady(): Promise<void> {
  if (!_dbReady) {
    _dbReady = (async () => {
      const tableExists = await db.schema.hasTable('expenses');
      if (!tableExists) {
        await db.schema.createTable('expenses', (table) => {
          table.increments('id').primary();
          table.decimal('amount', 10, 2).notNullable();
          table.date('date').notNullable();
          table.string('category').notNullable();
          table.string('tag').notNullable();
          table.string('receipt_path').nullable();
          table.timestamp('created_at').defaultTo(db.fn.now());
        });
        console.log('Created expenses table.');
      }
    })();
  }
  return _dbReady;
}

export default db;
