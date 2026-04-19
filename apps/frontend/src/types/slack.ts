export interface SlackThread {
  user: string
  name: string
  time: string
  text: string
}

export interface SlackSummary {
  question: string
  answer: string
}

export interface SlackItem {
  id: string
  sourceType: 'channel' | 'dm'
  user: string
  name: string
  time: string
  text: string
  threads: SlackThread[]
  summary: SlackSummary
  aiProjectId: string | null
  linkedProjectId: string | null
  archived: boolean
}

export type SlackFilter = 'all' | 'unlinked' | 'linked' | 'archived'
