'use client'

import { useEffect } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { useUIStore } from '@/stores/ui-store'
import { StatCard } from '@/components/projects/stat-card'
import { NewProjectModal } from '@/components/projects/new-project-modal'

export default function ProjectsPage() {
  const { notStartedCount, planningCount, activeCount, doneCount } = useProjects()
  const { setTopbarTitle, openNewProjectModal, closeNewProjectModal, isNewProjectModalOpen } = useUIStore()

  useEffect(() => {
    setTopbarTitle('Projects')
  }, [setTopbarTitle])

  return (
    <div className="px-7 py-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Projects</h2>
        </div>
        <button
          type="button"
          onClick={openNewProjectModal}
          className="flex items-center gap-[5px] px-3 py-[7px] rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" width="13" height="13">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          New Project
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-[10px] mb-5" style={{ maxWidth: 640 }}>
        <StatCard label="Not Started" value={notStartedCount} />
        <StatCard label="Planning" value={planningCount} />
        <StatCard label="Active" value={activeCount} highlight />
        <StatCard label="Done" value={doneCount} />
      </div>

      {isNewProjectModalOpen && (
        <NewProjectModal onClose={closeNewProjectModal} />
      )}
    </div>
  )
}
