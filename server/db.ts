/**
 * Database Configuration
 * 
 * Supports both development and production environments:
 * - Development (Replit): Uses Neon serverless driver with WebSocket
 * - Production: Uses standard pg driver for any PostgreSQL
 * 
 * The driver is automatically selected based on NODE_ENV
 */
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log(`[DB] Environment: ${NODE_ENV}`);
console.log(`[DB] Using ${isProduction ? 'standard pg' : 'Neon serverless'} driver`);

// Create the appropriate pool and drizzle instance based on environment
let pool: NeonPool | pg.Pool;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

if (isProduction) {
  // Production: Use standard pg driver (works with any PostgreSQL)
  pool = new pg.Pool({ 
    connectionString: DATABASE_URL,
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  db = drizzlePg(pool, { schema });
} else {
  // Development: Use Neon serverless driver (for Replit)
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: DATABASE_URL });
  db = drizzleNeon(pool, { schema });
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('[DB] Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[DB] Closing database pool...');
  await pool.end();
  process.exit(0);
});

export { pool, db };
