import { redirect } from '@sveltejs/kit';
import { signIn } from '../../auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  throw redirect(303, '/');
};

export const actions: Actions = {
  default: signIn
};
