# Slack Q&A Sync

Scan Slack for messages with `:strong_pm:` reactions and import new Q&A items into strong-pm.

## What this does

1. Calls the backend to get the last synced message timestamp
2. Reads `#private-onco-squad` and DMs for messages with `:strong_pm:` reaction added after that timestamp
3. For each new message: reads the full thread, uses AI to extract Q&A summary
4. POSTs each new item to the backend API

## How to run

```
/project:slack-sync
```

---

## Execution Steps

### Step 1 — Get last synced timestamp

Call `GET http://localhost:8000/api/v1/slack-qa/last-synced` to find out where to start scanning.
If `last_message_ts` is null, scan the last 30 days.

### Step 2 — Get project list for AI suggestion

Call `GET http://localhost:8000/api/v1/projects` to get the current project list.

### Step 3 — Scan #private-onco-squad

Use `slack_read_channel` with channel_id `C08SHL6TE74`.
Set `oldest` to `last_message_ts` if available.
For each message:
- Use `slack_get_reactions` to check if `:strong_pm:` reaction exists
- If yes: note the message_ts, sender, and read the full thread with `slack_read_thread`

### Step 4 — Scan DMs

Use `slack_search_channels` with `channel_types: im` to find active DM channels.
For each DM channel, use `slack_read_channel` with `oldest` set to `last_message_ts`.
Apply the same `:strong_pm:` reaction check.

### Step 5 — Summarize each thread with AI

For each thread found, produce:
- `question`: bullet points if multiple questions, single line if one (Korean or English as-is)
- `answer`: summary of answers from the thread
- `answer_date`: date of the message that received the `:strong_pm:` reaction (format: YYYY-MM-DD)
- `ai_project_id`: best matching project ID from the project list, or null if unclear

### Step 6 — POST to backend

For each new item, call `POST http://localhost:8000/api/v1/slack-qa` with:

```json
{
  "slack_channel_id": "<channel_id>",
  "slack_channel_name": "<channel name or 'DM: sender_name'>",
  "slack_message_ts": "<message_ts>",
  "slack_message_url": "<slack permalink>",
  "sender_name": "<display name>",
  "question": "<AI extracted question>",
  "answer": "<AI extracted answer>",
  "answer_date": "<YYYY-MM-DD>",
  "ai_project_id": <project_id or null>
}
```

Skip items that return 409 (already imported).

### Step 7 — Report

Print a summary:
- How many new items imported
- How many skipped (already existed)
- Any errors
