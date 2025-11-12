/**
 * Database Configuration
 * 
 * Supports both development and production environments via DATABASE_URL:
 * - Development: Uses Replit's PostgreSQL database (automatically configured)
 * - Production: Uses any PostgreSQL provider (configure DATABASE_URL in env vars)
 * 
 * Compatible with: Neon, Supabase, AWS RDS, Azure, Google Cloud SQL, etc.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log(`[DB] Connecting to ${NODE_ENV} database...`);

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });
