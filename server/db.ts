import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// For demo purposes, use a mock database connection if DATABASE_URL is not set
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("DATABASE_URL not set. Using mock database connection for demo.");
  // Use a mock connection string for demo/development
  databaseUrl = "postgresql://demo:demo@localhost:5432/hr_attendance_demo";
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });