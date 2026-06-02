import type { Project, ProjectStatus } from '@/types/project'

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
    })
  }
  return res.json() as Promise<T>
}

interface ApiProject {
  id: string
  name: string
  description: string | null
  status: string
  epic_link: string | null
  epic_key: string | null
  confluence_link: string | null
  workflow_step: number
  background: string | null
  hlr: string | null
  product_names: string[]
  updated_at: string
}

function toProject(p: ApiProject): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    status: p.status as ProjectStatus,
    epicLink: p.epic_link ?? '',
    confluenceLink: p.confluence_link ?? '',
    relatedProducts: p.product_names as Project['relatedProducts'],
    background: p.background ?? undefined,
    hlr: p.hlr ?? undefined,
    updatedAt: p.updated_at,
    workflowStep: p.workflow_step,
  }
}

export async function fetchProjects(): Promise<Project[]> {
  const data = await apiFetch<{ projects: ApiProject[] }>('/api/v1/projects')
  return data.projects.map(toProject)
}

export async function fetchProject(id: string): Promise<Project> {
  const data = await apiFetch<ApiProject>(`/api/v1/projects/${id}`)
  return toProject(data)
}

export interface CreateProjectPayload {
  name: string
  epic_link?: string
  confluence_link?: string
  product_ids: number[]
  background?: string
  hlr?: string
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const data = await apiFetch<ApiProject>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return toProject(data)
}

export async function updateProject(
  id: string,
  payload: { status?: string; workflow_step?: number },
): Promise<Project> {
  const data = await apiFetch<ApiProject>(`/api/v1/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return toProject(data)
}

export async function syncProjectContext(id: string): Promise<void> {
  await apiFetch(`/api/v1/projects/${id}/sync`, { method: 'POST' })
}

export interface ProjectContext {
  projectId: string
  context: string | null
  syncedAt: string | null
  pageCount: number
}

export async function fetchProjectContext(id: string): Promise<ProjectContext> {
  const data = await apiFetch<{
    project_id: string
    context: string | null
    synced_at: string | null
    page_count: number
  }>(`/api/v1/projects/${id}/context`)
  return {
    projectId: data.project_id,
    context: data.context,
    syncedAt: data.synced_at,
    pageCount: data.page_count,
  }
}
