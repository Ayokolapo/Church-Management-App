import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;

let db: ReturnType<typeof neonDrizzle> | ReturnType<typeof pgDrizzle>;
let pool: NeonPool | PgPool;

if (process.env.DB_DRIVER === "pg") {
  // Standard PostgreSQL — Digital Ocean, Railway, etc.
  // ssl.rejectUnauthorized: false accepts DO's self-signed CA certificate.
  pool = new PgPool({ connectionString, ssl: { rejectUnauthorized: false } });
  db = pgDrizzle(pool as PgPool, { schema });
} else {
  // Neon serverless (default for local dev)
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString });
  db = neonDrizzle({ client: pool as NeonPool, schema });
}

export { pool, db };
