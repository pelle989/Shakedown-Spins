import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const authEnabled = Boolean(
    (env.RESEND_API_KEY ?? process.env.RESEND_API_KEY ?? '') &&
      (env.AUTH_EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM ?? '')
  );

  return {
    session: authEnabled ? await event.locals.auth() : null,
    authEnabled
  };
};
