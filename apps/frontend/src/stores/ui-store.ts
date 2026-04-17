import { create } from 'zustand'

interface UIState {
  topbarTitle: string
  isNewProjectModalOpen: boolean
  setTopbarTitle: (title: string) => void
  openNewProjectModal: () => void
  closeNewProjectModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  topbarTitle: 'Projects',
  isNewProjectModalOpen: false,
  setTopbarTitle: (title) => set({ topbarTitle: title }),
  openNewProjectModal: () => set({ isNewProjectModalOpen: true }),
  closeNewProjectModal: () => set({ isNewProjectModalOpen: false }),
}))
