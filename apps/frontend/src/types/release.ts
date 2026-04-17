// ─── 공통 ────────────────────────────────────────────────────────────────────

export type ReleaseRunStatus = 'running' | 'done' | 'error'

export interface JiraVersionOption {
  id: string
  label: string
}

export interface ConfluenceFolderOption {
  id: string
  label: string
}

// ─── Release Note Creator ─────────────────────────────────────────────────────

export interface ReleaseNoteRunRecord {
  id: string
  jiraVersion: string
  confluenceLocation: string
  requestedAt: string
  status: ReleaseRunStatus
  confluenceUrl: string | null
}

// ─── Deployment Tracker ───────────────────────────────────────────────────────

export type DeployStatus = 'deployed-this' | 'deployed-prev' | 'no-pr' | 'unregistered'
export type DeploymentFilter = 'all' | 'deployed-this' | 'deployed-prev' | 'no-pr' | 'unregistered'

export interface TicketRow {
  id: string
  title: string
  pr: string | null
  merged: boolean | null
  status: DeployStatus
}

export interface UnregisteredBreakdown {
  needed: number
  notNeeded: number
  noTicket: number
}

export interface DeploymentResult {
  title: string
  stats: {
    total: number
    withPR: number
    noPR: number
    merged: number
    deployedThis: number
    deployedPrev: number
  }
  repos: string[]
  noPRTickets: string[]
  unregisteredPRs: {
    count: number
    tickets: string[]
    breakdown?: UnregisteredBreakdown
  }
  ticketRows: TicketRow[]
}
