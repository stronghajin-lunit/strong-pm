async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
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

type ContextPosition = 'beginning' | 'middle' | 'end'

interface ApiSourceConfig {
  position: ContextPosition
  char_limit: number
}

export interface ApiContextConfig {
  project_summary: ApiSourceConfig
  prd_pages: ApiSourceConfig
  reference_docs: ApiSourceConfig
}

export interface RunFeatureListPayload {
  project_id: string
  prd_page_url: string
  feature_list_page_url: string
  reference_urls?: string[]
  context_config?: ApiContextConfig
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

export interface ChangeDetail {
  action: 'update' | 'delete'
  featureId: string
  featureName: string
  changes: Record<string, string>
}

export interface ApplyCommentsResult {
  changesApplied: number
  commentsResolved: number
  confluenceUrl: string
  changeDetails: ChangeDetail[]
}

export interface ApplyLogEntry {
  id: number
  appliedAt: string
  changesApplied: number
  commentsResolved: number
  confluenceUrl: string
  changeDetails: ChangeDetail[]
}

function toChangeDetail(d: {
  action: string
  feature_id: string
  feature_name: string
  changes: Record<string, string>
}): ChangeDetail {
  return {
    action: d.action as 'update' | 'delete',
    featureId: d.feature_id,
    featureName: d.feature_name,
    changes: d.changes ?? {},
  }
}

export async function applyFeatureComments(featureListPageUrl: string): Promise<ApplyCommentsResult> {
  const data = await apiFetch<{
    changes_applied: number
    comments_resolved: number
    confluence_url: string
    change_details: { action: string; feature_id: string; feature_name: string; changes: Record<string, string> }[]
  }>('/api/v1/feature-list/apply-comments', {
    method: 'POST',
    body: JSON.stringify({ feature_list_page_url: featureListPageUrl }),
  })
  return {
    changesApplied: data.changes_applied,
    commentsResolved: data.comments_resolved,
    confluenceUrl: data.confluence_url,
    changeDetails: data.change_details.map(toChangeDetail),
  }
}

export async function fetchApplyLogs(featureListPageUrl: string): Promise<ApplyLogEntry[]> {
  const data = await apiFetch<{
    logs: {
      id: number
      applied_at: string
      changes_applied: number
      comments_resolved: number
      confluence_url: string
      change_details: { action: string; feature_id: string; feature_name: string; changes: Record<string, string> }[]
    }[]
  }>(`/api/v1/feature-list/apply-logs?feature_list_page_url=${encodeURIComponent(featureListPageUrl)}`)
  return data.logs.map((l) => ({
    id: l.id,
    appliedAt: l.applied_at,
    changesApplied: l.changes_applied,
    commentsResolved: l.comments_resolved,
    confluenceUrl: l.confluence_url,
    changeDetails: l.change_details.map(toChangeDetail),
  }))
}
