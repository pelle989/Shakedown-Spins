import { listStashes } from '$lib/db';

export async function load() {
  return listStashes();
}
