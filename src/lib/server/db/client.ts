import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

const connectionString = env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL_UNPOOLED ?? '';

let authPool: Pool | null = null;

function getPool() {
  if (!connectionString) {
    throw new Error('DATABASE_URL_UNPOOLED is not configured for auth/database setup');
  }

  authPool ??= new Pool({ connectionString });
  return authPool;
}

export const authDb = drizzle(getPool(), { schema });
export { schema };
