export type ProjectStatus = 'active' | 'planning' | 'done'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  emoji: string
  progress: number
  updatedAt: string
}
