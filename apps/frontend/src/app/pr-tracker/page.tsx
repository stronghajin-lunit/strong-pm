'use client'

import { useEffect } from 'react'
import { PRTable } from '@/components/pr-tracker/pr-table'
import { useUIStore } from '@/stores/ui-store'
import { useProjectStore } from '@/stores/project-store'
import { MOCK_PRS } from '@/mocks/prs'

export default function PRTrackerPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const projects = useProjectStore((s) => s.projects)

  useEffect(() => {
    setTopbarTitle('PR Tracker')
  }, [setTopbarTitle])

  return (
    <div className="px-7 py-6">
      <div className="mb-5">
        <h2 className="text-[20px] font-semibold tracking-[-0.4px]">PR Tracker</h2>
        <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
          Recent Pull Requests automatically collected from GitHub.
        </p>
      </div>

      <PRTable prs={MOCK_PRS} projects={projects} />
    </div>
  )
}
