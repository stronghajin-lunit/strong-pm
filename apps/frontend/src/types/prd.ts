export type PrdRunStatus = 'running' | 'done' | 'error'

export interface PrdRunRecord {
  id: string
  projectId: string
  projectName: string
  targetTeam: string
  kickoffUrl: string
  prdPageUrl: string
  requestedAt: string
  completedAt?: string
  status: PrdRunStatus
  confluenceUrl: string | null
}
