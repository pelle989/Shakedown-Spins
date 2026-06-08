# Phase 5 Scheduling

Phase 5 cleanup is now exposed through:

- SQL function: `select * from run_phase5_cleanup();`
- HTTP endpoint: `GET` or `POST /api/admin/phase5-cleanup`

## Recommended cadence

Run cleanup once per day.

That is frequent enough for:

- expired `sessions`
- expired `verification_tokens`
- old `rate_limit_log`
- non-stash `member_messages` older than 30 days

## Vercel scheduling

For Vercel, set:

```env
CRON_SECRET=replace-with-a-long-random-token
```

Vercel Cron will send `Authorization: Bearer <CRON_SECRET>` automatically when it calls the route configured in `vercel.json`.

The current project schedule runs once per day at `06:00 UTC`:

```text
/api/admin/phase5-cleanup
```

## Manual or external scheduling

If you want to call the endpoint yourself from a script, cron service, or local check, set:

```env
PHASE5_CLEANUP_TOKEN=replace-with-a-long-random-token
```

Then send one of these:

```text
Authorization: Bearer YOUR_TOKEN
```

or

```text
x-phase5-cleanup-token: YOUR_TOKEN
```

## Expected response

```json
{
  "results": [
    { "target": "sessions", "deleted_count": 0 },
    { "target": "verification_tokens", "deleted_count": 0 },
    { "target": "rate_limit_log", "deleted_count": 0 },
    { "target": "member_messages", "deleted_count": 0 }
  ]
}
```

## Notes

- Keep accepted `shared_source_access` rows intact unless the product policy changes.
- This endpoint is intended for scheduler use only; do not expose the token client-side.
- Vercel cron jobs issue `GET` requests, so the endpoint accepts both `GET` and `POST`.
