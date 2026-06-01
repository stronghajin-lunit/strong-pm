import { useProjectStore } from '@/stores/project-store'
import type { ProjectStatus } from '@/types/project'

export function useProjects() {
  const projects = useProjectStore((s) => s.projects)

  const totalCount = projects.length
  const notStartedCount = projects.filter((p) => p.status === 'not_started').length
  const planningCount = projects.filter((p) => p.status === 'planning').length
  const activeCount = projects.filter((p) => p.status === 'active').length
  const doneCount = projects.filter((p) => p.status === 'done').length
  const activeProject = projects.find((p) => p.status === 'active')

  const countByStatus = (status: ProjectStatus) =>
    projects.filter((p) => p.status === status).length

  return {
    projects,
    totalCount,
    notStartedCount,
    planningCount,
    activeCount,
    doneCount,
    activeProject,
    countByStatus,
  }
}
