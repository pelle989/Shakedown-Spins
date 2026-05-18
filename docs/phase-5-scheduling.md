# Phase 5 Scheduling

Phase 5 cleanup is now exposed through:

- SQL function: `select * from run_phase5_cleanup();`
- HTTP endpoint: `POST /api/admin/phase5-cleanup`

## Recommended cadence

Run cleanup once per day.

That is frequent enough for:

- expired `sessions`
- expired `verification_tokens`
- old `rate_limit_log`
- `member_messages` older than 30 days

## HTTP scheduling

Set this in your runtime environment:

```env
PHASE5_CLEANUP_TOKEN=replace-with-a-long-random-token
```

Then schedule a daily `POST` request to:

```text
https://your-domain/api/admin/phase5-cleanup
```

Send one of these:

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
