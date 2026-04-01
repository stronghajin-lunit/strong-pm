import { create } from 'zustand'
import type { Project } from '@/types/project'
import { MOCK_PROJECTS } from '@/mocks/projects'

interface ProjectState {
  projects: Project[]
  selectedProjectId: string | null
  setSelectedProject: (id: string | null) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: MOCK_PROJECTS,
  selectedProjectId: null,
  setSelectedProject: (id) => set({ selectedProjectId: id }),
}))
