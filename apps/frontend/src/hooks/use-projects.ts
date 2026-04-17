import { useProjectStore } from '@/stores/project-store'
import type { ProjectStatus } from '@/types/project'

export function useProjects() {
  const projects = useProjectStore((s) => s.projects)

  const totalCount = projects.length
  const activeCount = projects.filter((p) => p.status === 'active').length
  const planningCount = projects.filter((p) => p.status === 'planning').length
  const doneCount = projects.filter((p) => p.status === 'done').length
  const activeProject = projects.find((p) => p.status === 'active')

  const countByStatus = (status: ProjectStatus) =>
    projects.filter((p) => p.status === status).length

  return {
    projects,
    totalCount,
    activeCount,
    planningCount,
    doneCount,
    activeProject,
    countByStatus,
  }
}
