# Slack Q&A Sync

Scan Slack for messages with `:strong_pm:` reactions and import new Q&A items into strong-pm.

## What this does

1. Calls the backend to get the last synced message timestamp
2. Searches all channels and DMs for messages with `:strong_pm:` reaction after that timestamp
3. For each new message: collects the raw thread (or ±2 days context for DMs) and sends to the backend
4. Backend summarizes using Haiku and stores the result

## How to run

```
/project:slack-sync
```

---

## Execution Steps

### Step 1 — Get last synced timestamp

Call `GET http://localhost:8000/api/v1/slack-qa/last-synced` to find out where to start scanning.
If `last_message_ts` is null, scan the last 30 days.

Convert the timestamp to `YYYY-MM-DD` format for the Slack search `after:` filter.

### Step 2 — Get project list

Call `GET http://localhost:8000/api/v1/projects` to get the current project list.
Collect `name` for each project — these will be passed to the backend for AI matching.

### Step 3 — Scan #private-onco-squad

Use `slack_read_channel` with channel_id `C08SHL6TE74`.
Set `oldest` to `last_message_ts` if available (use the `response_format: detailed` option to see reactions inline).
For each message:
- If `:strong_pm:` reaction exists: note the message_ts, sender, and read the full thread with `slack_read_thread`
- Collect all thread messages as raw text (format: `"[sender] message_text"`)

### Step 4 — Search DMs for reacted messages

Use `slack_search_public_and_private` with query:
```
has::strong_pm: after:YYYY-MM-DD
```

Filter results to DM channels only (channel_id starts with `D`).

For each DM result:
- Note the message_ts, sender, channel_id
- Read surrounding messages for context: `oldest = message_ts - 172800`, `latest = message_ts + 172800`
- If the message has a thread, read it with `slack_read_thread`
- Combine thread + surrounding messages (deduplicate by ts)
- Collect all as raw text (format: `"[sender] message_text"`)

### Step 5 — POST to backend for AI summarization

For each new item, call `POST http://localhost:8000/api/v1/slack-qa/from-thread` with:

```json
{
  "slack_channel_id": "<channel_id>",
  "slack_channel_name": "<channel name or 'DM: sender_name'>",
  "slack_message_ts": "<message_ts of the reacted message>",
  "slack_message_url": "<slack permalink>",
  "sender_name": "<display name of the message sender>",
  "answer_date": "<YYYY-MM-DD of the reacted message>",
  "raw_messages": ["[sender] message text", ...],
  "project_names": ["Project A", "Project B", ...]
}
```

The backend will use Haiku to extract Q&A and match the project automatically.

Skip items that return 409 (already imported).

### Step 6 — Report

Print a summary:
- How many new items imported
- How many skipped (already existed)
- Any errors
