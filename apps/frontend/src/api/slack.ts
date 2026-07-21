import type { SlackItem, SlackItemListResponse, SlackLastSyncedResponse } from '@/types/slack'

const BASE = '/api/v1/slack-qa'

function toCamel(item: Record<string, unknown>): SlackItem {
  return {
    id: item.id as number,
    slackChannelId: item.slack_channel_id as string,
    slackChannelName: item.slack_channel_name as string,
    slackMessageTs: item.slack_message_ts as string,
    slackMessageUrl: item.slack_message_url as string,
    senderName: item.sender_name as string,
    question: item.question as string,
    answer: item.answer as string,
    answerDate: item.answer_date as string,
    aiProjectId: item.ai_project_id as number | null,
    linkedProjectId: item.linked_project_id as number | null,
    archived: item.archived as boolean,
  }
}

export async function fetchSlackQaItems(): Promise<SlackItem[]> {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error('Failed to fetch Slack Q&A items')
  const data: SlackItemListResponse = await res.json()
  return (data.items as unknown as Record<string, unknown>[]).map(toCamel)
}

export async function fetchLastSynced(): Promise<string | null> {
  const res = await fetch(`${BASE}/last-synced`)
  if (!res.ok) throw new Error('Failed to fetch last synced timestamp')
  const data: SlackLastSyncedResponse = await res.json()
  return data.last_message_ts
}

export async function linkSlackQaItem(itemId: number, projectId: number | null): Promise<SlackItem> {
  const res = await fetch(`${BASE}/${itemId}/link`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId }),
  })
  if (!res.ok) throw new Error('Failed to link project')
  return toCamel(await res.json())
}

export async function deleteSlackQaItem(itemId: number): Promise<void> {
  const res = await fetch(`${BASE}/${itemId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete item')
}

export async function pushToPrd(itemId: number): Promise<SlackItem> {
  const res = await fetch(`${BASE}/${itemId}/push-to-prd`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to push to PRD' }))
    throw new Error(err.detail ?? 'Failed to push to PRD')
  }
  return toCamel(await res.json())
}
