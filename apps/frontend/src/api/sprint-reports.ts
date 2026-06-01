import type { SprintOption, SprintRunRecord } from '@/types/sprint'

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

interface ApiSprintOption {
  sprint_id: number
  sprint_number: number
  label: string
  status: string
}

interface ApiSprintReport {
  id: string
  sprint_label: string
  requested_at: string
  completed_at: string | null
  status: 'running' | 'done' | 'error'
  confluence_url: string | null
}

// ─── Converters ───────────────────────────────────────────────────────────────

function toSprintOption(item: ApiSprintOption): SprintOption {
  return {
    sprintId: item.sprint_id,
    sprintNumber: item.sprint_number,
    label: item.label,
    status: item.status === 'active' ? 'active' : 'closed',
  }
}

function toSprintRunRecord(item: ApiSprintReport): SprintRunRecord {
  return {
    id: item.id,
    sprintLabel: item.sprint_label,
    requestedAt: item.requested_at,
    completedAt: item.completed_at ?? undefined,
    status: item.status,
    confluenceUrl: item.confluence_url,
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function fetchSprintOptions(): Promise<SprintOption[]> {
  const data = await apiFetch<{ sprints: ApiSprintOption[] }>('/api/v1/sprint-reports/sprints')
  return data.sprints.map(toSprintOption)
}

export interface RunSprintReportPayload {
  sprint_id: number
  sprint_number: number
  sprint_label: string
  confluence_page_url: string
}

export async function runSprintReport(payload: RunSprintReportPayload): Promise<SprintRunRecord> {
  const item = await apiFetch<ApiSprintReport>('/api/v1/sprint-reports/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return toSprintRunRecord(item)
}

export async function fetchSprintReports(): Promise<SprintRunRecord[]> {
  const data = await apiFetch<{ reports: ApiSprintReport[] }>('/api/v1/sprint-reports')
  return data.reports.map(toSprintRunRecord)
}
