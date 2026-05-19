import { dev } from '$app/environment';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { SvelteKitAuth } from '@auth/sveltekit';
import Resend from '@auth/sveltekit/providers/resend';
import { env } from '$env/dynamic/private';

import {
  buildVerificationEmailHtml,
  buildVerificationEmailSubject,
  buildVerificationEmailText
} from '$lib/server/auth-email';
import { authDb, schema } from '$lib/server/db/client';

const configuredAuthSecret = env.AUTH_SECRET ?? process.env.AUTH_SECRET;
const authSecret = configuredAuthSecret || (dev ? 'phase-2-dev-secret-change-me' : null);
const authEmailFrom =
  env.AUTH_EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM ?? 'Shakedown Spins <auth@example.com>';
const resendApiKey = env.RESEND_API_KEY ?? process.env.RESEND_API_KEY ?? '';

if (!authSecret) {
  throw new Error('AUTH_SECRET must be configured in non-development environments.');
}

export const { handle, signIn, signOut } = SvelteKitAuth({
  secret: authSecret,
  trustHost: (env.AUTH_TRUST_HOST ?? process.env.AUTH_TRUST_HOST ?? '') === 'true',
  pages: {
    signIn: '/',
    error: '/',
    verifyRequest: '/verify-request'
  },
  adapter: DrizzleAdapter(authDb, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens
  }),
  session: {
    strategy: 'database',
    maxAge: 60 * 60 * 24 * 90,
    updateAge: 60 * 60 * 24
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    }
  },
  providers: resendApiKey
    ? [
        Resend({
          apiKey: resendApiKey,
          from: authEmailFrom,
          async sendVerificationRequest(params) {
            const { identifier: to, provider, url } = params;
            const { host } = new URL(url);

            const response = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${provider.apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: provider.from,
                to,
                subject: buildVerificationEmailSubject(),
                html: buildVerificationEmailHtml({ url, email: to, host }),
                text: buildVerificationEmailText({ url, email: to, host })
              })
            });

            if (!response.ok) {
              throw new Error(`Resend error: ${JSON.stringify(await response.json())}`);
            }
          }
        })
      ]
    : []
});
