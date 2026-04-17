export interface SlackThread {
  user: string
  name: string
  time: string
  text: string
}

export interface SlackItem {
  id: string
  user: string
  name: string
  time: string
  text: string
  threads: SlackThread[]
  aiProjectId: string | null
  linkedProjectId: string | null
}

export type SlackFilter = 'all' | 'unlinked' | 'linked'
