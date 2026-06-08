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

export interface FeatureListRun {
  id: string
  projectId: string | null
  projectName: string
  prdPageUrl: string
  featureListPageUrl: string
  requestedAt: string
  completedAt?: string
  status: 'running' | 'done' | 'error'
  confluenceUrl: string | null
  featureCount: number | null
}

interface ApiRun {
  id: string
  project_id: string | null
  project_name: string
  prd_page_url: string
  feature_list_page_url: string
  requested_at: string
  completed_at: string | null
  status: 'running' | 'done' | 'error'
  confluence_url: string | null
  feature_count: number | null
}

function toRun(r: ApiRun): FeatureListRun {
  return {
    id: r.id,
    projectId: r.project_id,
    projectName: r.project_name,
    prdPageUrl: r.prd_page_url,
    featureListPageUrl: r.feature_list_page_url,
    requestedAt: r.requested_at,
    completedAt: r.completed_at ?? undefined,
    status: r.status,
    confluenceUrl: r.confluence_url,
    featureCount: r.feature_count,
  }
}

export interface RunFeatureListPayload {
  project_id: string
  prd_page_url: string
  feature_list_page_url: string
}

export async function runFeatureList(payload: RunFeatureListPayload): Promise<FeatureListRun> {
  const data = await apiFetch<ApiRun>('/api/v1/feature-list/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return toRun(data)
}

export async function fetchFeatureListRuns(): Promise<FeatureListRun[]> {
  const data = await apiFetch<{ runs: ApiRun[] }>('/api/v1/feature-list')
  return data.runs.map(toRun)
}
