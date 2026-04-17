'use client'

import { useEffect } from 'react'
import { SprintReportForm } from '@/components/sprint-report/sprint-report-form'
import { useUIStore } from '@/stores/ui-store'
import { MOCK_SPRINT_OPTIONS, MOCK_SPRINT_RUN_HISTORY } from '@/mocks/sprints'

export default function SprintReportPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)

  useEffect(() => {
    setTopbarTitle('Sprint Report Creator')
  }, [setTopbarTitle])

  return (
    <div className="px-7 py-6">
      <div className="mb-5">
        <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Sprint Report Creator</h2>
        <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
          Auto-generate sprint reports from Jira sprint data.
        </p>
      </div>

      <SprintReportForm
        sprintOptions={MOCK_SPRINT_OPTIONS}
        initialHistory={MOCK_SPRINT_RUN_HISTORY}
      />
    </div>
  )
}
