'use client'

import { useEffect } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { useUIStore } from '@/stores/ui-store'
import { ProjectCard } from '@/components/projects/project-card'
import { StatCard } from '@/components/projects/stat-card'

export default function ProjectsPage() {
  const { projects, totalCount, activeCount, planningCount, doneCount, activeProject } =
    useProjects()
  const { setTopbarTitle, openNewProjectModal } = useUIStore()

  useEffect(() => {
    setTopbarTitle('Projects')
  }, [setTopbarTitle])

  return (
    <div className="px-7 py-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Projects</h2>
          <p className="text-[12px] mt-[2px]" style={{ color: 'var(--text-3)' }}>
            {totalCount} total · {activeCount} active
          </p>
        </div>
        <button
          type="button"
          onClick={openNewProjectModal}
          className="flex items-center gap-[5px] px-3 py-[7px] rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            width="13"
            height="13"
          >
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          New Project
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-[10px] mb-6 max-w-[340px]">
        <StatCard
          label="Total Projects"
          value={totalCount}
          sub={`Active ${activeCount} · Planning ${planningCount} · Done ${doneCount}`}
        />
        <StatCard
          label="Active"
          value={activeCount}
          sub={activeProject?.name ?? '없음'}
          highlight
        />
      </div>

      {/* Project list */}
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-[9px]"
        style={{ color: 'var(--text-3)' }}
      >
        All Projects
      </div>
      <div className="grid grid-cols-3 gap-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
