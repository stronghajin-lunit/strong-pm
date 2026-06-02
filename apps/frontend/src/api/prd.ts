import type { PrdRunRecord } from '@/types/prd'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body?.detail?.code ?? res.statusText), { status: res.status })
  }
  return res.json() as Promise<T>
}

export interface PrdTeamOption {
  key: string
  label: string
  description: string
}

interface ApiPrdRun {
  id: string
  project_id: string | null
  project_name: string
  target_teams: string[]
  kickoff_url: string
  prd_page_url: string
  requested_at: string
  completed_at: string | null
  status: 'running' | 'done' | 'error'
  confluence_url: string | null
}

function toRecord(r: ApiPrdRun): PrdRunRecord {
  return {
    id: r.id,
    projectId: r.project_id ?? '',
    projectName: r.project_name,
    targetTeams: r.target_teams,
    kickoffUrl: r.kickoff_url,
    prdPageUrl: r.prd_page_url,
    requestedAt: r.requested_at,
    completedAt: r.completed_at ?? undefined,
    status: r.status,
    confluenceUrl: r.confluence_url,
  }
}

export async function fetchPrdTeams(): Promise<PrdTeamOption[]> {
  const data = await apiFetch<{ teams: PrdTeamOption[] }>('/api/v1/prd/teams')
  return data.teams
}

export interface RunPrdPayload {
  project_id: string
  target_teams: string[]
  kickoff_url: string
  prd_page_url: string
}

export async function runPrd(payload: RunPrdPayload): Promise<PrdRunRecord> {
  const data = await apiFetch<ApiPrdRun>('/api/v1/prd/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return toRecord(data)
}

export async function fetchPrdRuns(): Promise<PrdRunRecord[]> {
  const data = await apiFetch<{ runs: ApiPrdRun[] }>('/api/v1/prd')
  return data.runs.map(toRecord)
}
