import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api';
import path from 'path';

const dbPath = path.resolve(__dirname, '../fiduciary.duckdb');

let instance: DuckDBInstance | null = null;
let connection: DuckDBConnection | null = null;

export async function getConnection(): Promise<DuckDBConnection> {
  if (!connection) {
    instance = await DuckDBInstance.create(dbPath);
    connection = await instance.connect();
  }
  return connection;
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  const conn = await getConnection();

  // Substitute parameters (basic implementation)
  let finalSql = sql;
  for (let i = 0; i < params.length; i++) {
    finalSql = finalSql.replace('?', `'${String(params[i]).replace(/'/g, "''")}'`);
  }

  const reader = await conn.runAndReadAll(finalSql);
  const rows = reader.getRowObjects();

  // Convert BigInt to Number for JSON serialization
  return rows.map((row: any) => {
    const converted: any = {};
    for (const [key, value] of Object.entries(row)) {
      converted[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    return converted;
  });
}


export async function execute(sql: string): Promise<void> {
  const conn = await getConnection();
  await conn.run(sql);
}

export async function initDb() {
  await execute(`
    CREATE TABLE IF NOT EXISTS databases (
      name VARCHAR PRIMARY KEY,
      created_at TIMESTAMP DEFAULT current_timestamp
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS documents (
      db VARCHAR NOT NULL,
      id VARCHAR NOT NULL,
      rev VARCHAR NOT NULL,
      data JSON,
      deleted BOOLEAN DEFAULT false,
      updated_at TIMESTAMP DEFAULT current_timestamp,
      PRIMARY KEY (db, id)
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY,
      email VARCHAR UNIQUE NOT NULL,
      password_hash VARCHAR NOT NULL,
      two_factor_secret VARCHAR,
      two_factor_enabled BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT current_timestamp
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      amount DECIMAL(18, 2) NOT NULL,
      description VARCHAR,
      status VARCHAR DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT current_timestamp,
      cleared_at TIMESTAMP
    );
  `);

  console.log('DuckDB schema initialized');
}
