import { create } from 'zustand'
import type { Project, ProjectStatus } from '@/types/project'
import { fetchProjects, createProject, updateProject } from '@/api/projects'
import type { CreateProjectPayload } from '@/api/projects'

interface ProjectState {
  projects: Project[]
  isLoading: boolean
  loadProjects: () => Promise<void>
  addProject: (payload: CreateProjectPayload) => Promise<Project>
  advanceWorkflowStep: (id: string) => Promise<void>
  updateProjectStatus: (id: string, status: ProjectStatus) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true })
    try {
      const projects = await fetchProjects()
      set({ projects })
    } catch {
      // keep existing projects on error
    } finally {
      set({ isLoading: false })
    }
  },

  addProject: async (payload: CreateProjectPayload) => {
    const project = await createProject(payload)
    set((state) => ({ projects: [project, ...state.projects] }))
    return project
  },

  advanceWorkflowStep: async (id: string) => {
    const project = get().projects.find((p) => p.id === id)
    if (!project) return
    const newStep = Math.min((project.workflowStep ?? 1) + 1, 5)
    const updated = await updateProject(id, { workflow_step: newStep })
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
    }))
  },

  updateProjectStatus: async (id: string, status: ProjectStatus) => {
    const updated = await updateProject(id, { status })
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
    }))
  },
}))
