import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '$lib/server/env';
import * as schema from './schema';

const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export type DB = typeof db;
export { schema };
