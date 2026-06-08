import type { JiraProduct, JiraTicketRunRecord, JiraTicketType } from '@/types/jira-ticket'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body?.detail?.code ?? res.statusText), {
      status: res.status,
      body,
    })
  }
  return res.json() as Promise<T>
}

// ─── Types matching backend responses ────────────────────────────────────────

interface ApiTicketRun {
  id: string
  summary: string
  product: JiraProduct
  sprint: string
  type: JiraTicketType
  requested_at: string
  status: 'running' | 'done' | 'error'
  jira_url: string | null
}

interface ApiSprintItem {
  sprint_id: number
  label: string
  state: string
}

export interface JiraSprintOption {
  sprintId: number
  label: string
  state: string
}

// ─── Converters ───────────────────────────────────────────────────────────────

function toRunRecord(item: ApiTicketRun): JiraTicketRunRecord {
  return {
    id: item.id,
    summary: item.summary,
    product: item.product,
    sprint: item.sprint,
    type: item.type,
    requestedAt: item.requested_at,
    status: item.status,
    jiraUrl: item.jira_url,
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function fetchJiraSprints(product: JiraProduct): Promise<JiraSprintOption[]> {
  const data = await apiFetch<{ sprints: ApiSprintItem[] }>(
    `/api/v1/jira-tickets/sprints?product=${encodeURIComponent(product)}`,
  )
  return data.sprints.map((s) => ({ sprintId: s.sprint_id, label: s.label, state: s.state }))
}

export interface RunJiraTicketPayload {
  product: JiraProduct
  sprint_id: number
  sprint: string
  type: JiraTicketType
  feature_description: string
  definition_of_done: string
  project_id?: string
}

export async function runJiraTicket(payload: RunJiraTicketPayload): Promise<JiraTicketRunRecord> {
  const item = await apiFetch<ApiTicketRun>('/api/v1/jira-tickets/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return toRunRecord(item)
}

export async function fetchJiraTicketRuns(): Promise<JiraTicketRunRecord[]> {
  const data = await apiFetch<{ tickets: ApiTicketRun[] }>('/api/v1/jira-tickets')
  return data.tickets.map(toRunRecord)
}
