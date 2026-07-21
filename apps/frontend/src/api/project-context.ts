export interface ProjectContextData {
  project_id: string
  context: string | null
  context_ko: string | null
  synced_at: string | null
  page_count: number
}

export interface ContextPreviewData {
  project_id: string
  old_context: string | null
  new_context: string
  new_context_ko: string
  page_count: number
  changed_page_titles: string[]
}

const base = (projectId: string) => `/api/v1/projects/${projectId}`

export async function getProjectContext(projectId: string): Promise<ProjectContextData> {
  const res = await fetch(`${base(projectId)}/context`)
  if (!res.ok) throw new Error('Failed to fetch context')
  return res.json()
}

export async function previewContextSync(projectId: string): Promise<ContextPreviewData> {
  const res = await fetch(`${base(projectId)}/context/preview`, { method: 'POST' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail?.message ?? 'Sync failed')
  }
  return res.json()
}

export async function saveProjectContext(
  projectId: string,
  context: string,
  isSyncApply = false,
): Promise<ProjectContextData> {
  const res = await fetch(`${base(projectId)}/context`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, is_sync_apply: isSyncApply }),
  })
  if (!res.ok) throw new Error('Failed to save context')
  return res.json()
}
