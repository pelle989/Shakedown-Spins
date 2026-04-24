import { createHash } from 'node:crypto';

export function getIpHash(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  const fallback = headers.get('x-real-ip') ?? '';
  const ip = (forwardedFor?.split(',')[0] ?? fallback).trim();
  return createHash('sha256').update(ip).digest('hex');
}
