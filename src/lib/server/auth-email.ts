type VerificationEmailArgs = {
  url: string;
  email: string;
  host: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildVerificationEmailSubject() {
  return 'Your Shakedown Spins magic link';
}

export function buildVerificationEmailText(args: VerificationEmailArgs) {
  return [
    'Shakedown Spins',
    '',
    `Select the Open Shakedown Spins button to automatically Sign-in as ${args.email} and head back into My Stash.`,
    '',
    'Open this magic link to enter My Stash:',
    args.url,
    '',
    `If you did not request this, you can ignore this email. Sent from ${args.host}.`
  ].join('\n');
}

export function buildVerificationEmailHtml(args: VerificationEmailArgs) {
  const safeUrl = escapeHtml(args.url);
  const safeEmail = escapeHtml(args.email);
  const safeHost = escapeHtml(args.host);

  return `
    <div style="margin:0;padding:32px 16px;background:#5b2415;background:linear-gradient(180deg,#7b311b 0%,#4a1d12 72%,#38160e 100%);font-family:Georgia,serif;color:#f7ead0;">
      <div style="max-width:560px;margin:0 auto;padding:28px 24px;border-radius:24px;background:linear-gradient(180deg,#3a2013 0%,#21120c 100%);border:1px solid rgba(255,225,176,.16);box-shadow:0 24px 54px rgba(0,0,0,.22);">
        <div style="font-family:Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif;letter-spacing:.18em;font-size:14px;color:rgba(252,137,95,.9);text-transform:uppercase;margin-bottom:10px;">Shakedown Spins</div>
        <h1 style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:32px;line-height:1.05;color:#fff1d2;">Your magic link is ready.</h1>
        <p style="margin:0 0 18px;font-size:17px;line-height:1.55;color:#ffffff;">Select the Open Shakedown Spins button to automatically Sign-in as <strong style="color:#ffffff;">${safeEmail}</strong> and head back into My Stash.</p>
        <a href="${safeUrl}" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='inset 0 1px 0 rgba(255,255,255,.34),0 14px 24px rgba(38,15,7,.22)';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='inset 0 1px 0 rgba(255,255,255,.34),0 10px 20px rgba(38,15,7,.16)';" style="display:inline-flex;align-items:center;justify-content:center;min-width:210px;padding:14px 22px;border-radius:999px;background:linear-gradient(180deg,#f3dfab 0%,#e7c882 100%);border:2px solid rgb(253 137 95);color:#ffffff;font-family:Arial,sans-serif;font-size:14.4px;font-weight:700;letter-spacing:.06em;text-decoration:none;text-transform:uppercase;box-shadow:inset 0 1px 0 rgba(255,255,255,.34),0 10px 20px rgba(38,15,7,.16);transition:transform .18s ease,box-shadow .18s ease;">Open Shakedown Spins</a>
        <p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#c8b08a;">If the button doesn’t work, paste this link into your browser:</p>
        <p style="margin:10px 0 0;word-break:break-word;font-size:13px;line-height:1.5;color:#fff1d2;">${safeUrl}</p>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#b89a74;">If you didn’t request this, you can ignore it. Sent from ${safeHost}.</p>
      </div>
    </div>
  `.trim();
}
