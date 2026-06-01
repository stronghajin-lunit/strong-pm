export type TicketStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done'
export type FilterPeriod = '15d' | '1m' | '2m' | '3m'

export interface JiraTicket {
  id: string
  summary: string
  epicId: string | null
  epicName: string | null
  status: TicketStatus
  currentVersion: string | null
}

export interface JiraVersion {
  id: string
  name: string
  releaseDate: string
}

export interface EpicGroup {
  epicId: string | null
  epicName: string | null
  tickets: JiraTicket[]
}
