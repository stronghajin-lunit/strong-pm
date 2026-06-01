import { create } from 'zustand'
import type { Project, ProjectStatus } from '@/types/project'
import { MOCK_PROJECTS } from '@/mocks/projects'

function deriveStatus(step: number): ProjectStatus {
  if (step <= 1) return 'not_started'
  if (step <= 3) return 'planning'
  return 'active'
}

interface ProjectState {
  projects: Project[]
  selectedProjectId: string | null
  addProject: (project: Project) => void
  setSelectedProject: (id: string | null) => void
  advanceWorkflowStep: (id: string) => void
  updateProjectStatus: (id: string, status: ProjectStatus) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: MOCK_PROJECTS,
  selectedProjectId: null,
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  advanceWorkflowStep: (id) =>
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== id) return p
        const currentStep = p.workflowStep ?? 1
        const newStep = Math.min(currentStep + 1, 5)
        return { ...p, workflowStep: newStep, status: deriveStatus(newStep) }
      }),
    })),
  updateProjectStatus: (id, status) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, status } : p)),
    })),
}))
