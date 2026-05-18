import { sql } from 'drizzle-orm';

import { authDb } from '$lib/server/db/client';

export type Phase5CleanupResult = {
  target: string;
  deleted_count: number;
};

export async function runPhase5Cleanup(): Promise<Phase5CleanupResult[]> {
  const result = await authDb.execute(sql`select * from run_phase5_cleanup()`);
  return (result.rows ?? []) as Phase5CleanupResult[];
}
