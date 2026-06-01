import type {
  DeploymentResult,
  JiraVersionOption,
  ReleaseNoteRunRecord,
  TicketRow,
  UnregisteredBreakdown,
} from '@/types/release'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body?.detail?.code ?? res.statusText), { status: res.status, body })
  }
  return res.json() as Promise<T>
}

// ─── Jira Versions ────────────────────────────────────────────────────────────

interface JiraVersionsResponse {
  versions: { id: string; label: string }[]
}

export async function fetchJiraVersions(): Promise<JiraVersionOption[]> {
  const data = await apiFetch<JiraVersionsResponse>('/api/v1/jira-versions')
  return data.versions
}

// ─── Release Notes ────────────────────────────────────────────────────────────

interface ReleaseNoteApiItem {
  id: string
  jira_version: string
  confluence_location: string
  requested_at: string
  completed_at: string | null
  status: 'running' | 'done' | 'error'
  confluence_url: string | null
}

function toReleaseNoteRecord(item: ReleaseNoteApiItem): ReleaseNoteRunRecord {
  return {
    id: item.id,
    jiraVersion: item.jira_version,
    confluenceLocation: item.confluence_location,
    requestedAt: item.requested_at,
    completedAt: item.completed_at ?? undefined,
    status: item.status,
    confluenceUrl: item.confluence_url,
  }
}

export async function fetchReleaseNotes(): Promise<ReleaseNoteRunRecord[]> {
  const data = await apiFetch<{ notes: ReleaseNoteApiItem[] }>('/api/v1/release-notes')
  return data.notes.map(toReleaseNoteRecord)
}

export async function runReleaseNote(
  jiraVersionId: string,
  confluencePage: string,
): Promise<ReleaseNoteRunRecord> {
  const item = await apiFetch<ReleaseNoteApiItem>('/api/v1/release-notes/run', {
    method: 'POST',
    body: JSON.stringify({ jira_version_id: jiraVersionId, confluence_page: confluencePage }),
  })
  return toReleaseNoteRecord(item)
}

// ─── Deployment Tracker ───────────────────────────────────────────────────────

interface DeploymentApiStats {
  total: number
  with_pr: number
  no_pr: number
  merged: number
  deployed_this: number
  deployed_prev: number
  unregistered_prs: number
}

interface DeploymentApiBreakdown {
  needed: number
  not_needed: number
  no_ticket: number
}

interface DeploymentApiTicketRow {
  id: string
  title: string
  pr: string | null
  merged: boolean | null
  status: string
}

interface DeploymentDetailApiResponse {
  id: string
  version: string
  run_at: string
  stats: DeploymentApiStats
  repos: string[]
  no_pr_tickets: string[]
  unregistered_pr_tickets: string[]
  unregistered_pr_breakdown: DeploymentApiBreakdown | null
  ticket_rows: DeploymentApiTicketRow[]
}

interface DeploymentSummaryApiItem {
  id: string
  version: string
  run_at: string
  total: number
  deployed_this: number
  no_pr: number
  unregistered_prs: number
}

function toDeployStatus(status: string): TicketRow['status'] {
  const map: Record<string, TicketRow['status']> = {
    deployed_this: 'deployed-this',
    deployed_prev: 'deployed-prev',
    no_pr: 'no-pr',
    unregistered: 'unregistered',
  }
  return map[status] ?? 'unregistered'
}

function toDeploymentResult(data: DeploymentDetailApiResponse): DeploymentResult {
  const breakdown: UnregisteredBreakdown | undefined = data.unregistered_pr_breakdown
    ? {
        needed: data.unregistered_pr_breakdown.needed,
        notNeeded: data.unregistered_pr_breakdown.not_needed,
        noTicket: data.unregistered_pr_breakdown.no_ticket,
      }
    : undefined

  return {
    title: data.version,
    stats: {
      total: data.stats.total,
      withPR: data.stats.with_pr,
      noPR: data.stats.no_pr,
      merged: data.stats.merged,
      deployedThis: data.stats.deployed_this,
      deployedPrev: data.stats.deployed_prev,
    },
    repos: data.repos,
    noPRTickets: data.no_pr_tickets,
    unregisteredPRs: {
      count: data.stats.unregistered_prs,
      tickets: data.unregistered_pr_tickets,
      breakdown,
    },
    ticketRows: data.ticket_rows.map((r) => ({
      id: r.id,
      title: r.title,
      pr: r.pr,
      merged: r.merged,
      status: toDeployStatus(r.status),
    })),
  }
}

export interface DeploymentSummary {
  id: string
  version: string
  runAt: string
  total: number
  deployedThis: number
  noPR: number
  unregisteredPRs: number
}

export async function fetchDeployments(): Promise<DeploymentSummary[]> {
  const data = await apiFetch<{ deployments: DeploymentSummaryApiItem[] }>('/api/v1/deployments')
  return data.deployments.map((d) => ({
    id: d.id,
    version: d.version,
    runAt: d.run_at,
    total: d.total,
    deployedThis: d.deployed_this,
    noPR: d.no_pr,
    unregisteredPRs: d.unregistered_prs,
  }))
}

export async function runDeployment(jiraVersionId: string): Promise<{
  summary: DeploymentSummary
  result: DeploymentResult
}> {
  const data = await apiFetch<DeploymentDetailApiResponse>('/api/v1/deployments/run', {
    method: 'POST',
    body: JSON.stringify({ jira_version_id: jiraVersionId }),
  })
  return {
    summary: {
      id: data.id,
      version: data.version,
      runAt: data.run_at,
      total: data.stats.total,
      deployedThis: data.stats.deployed_this,
      noPR: data.stats.no_pr,
      unregisteredPRs: data.stats.unregistered_prs,
    },
    result: toDeploymentResult(data),
  }
}

export async function fetchDeploymentDetail(id: string): Promise<DeploymentResult> {
  const data = await apiFetch<DeploymentDetailApiResponse>(`/api/v1/deployments/${id}`)
  return toDeploymentResult(data)
}
