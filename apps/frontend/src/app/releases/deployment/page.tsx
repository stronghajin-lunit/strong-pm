'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { DeploymentForm } from '@/components/releases/deployment-form'
import { MOCK_DT_VERSIONS, MOCK_DT_DATA } from '@/mocks/releases'

export default function DeploymentPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)

  useEffect(() => {
    setTopbarTitle('Deployment Tracker')
  }, [setTopbarTitle])

  return (
    <div className="px-7 py-6">
      <div className="mb-5">
        <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Deployment Tracker</h2>
        <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
          Cross-reference Jira tickets with GitHub PRs to verify deployment status.
        </p>
      </div>

      <div className="max-w-[960px]">
        <DeploymentForm versionOptions={MOCK_DT_VERSIONS} deploymentData={MOCK_DT_DATA} />
      </div>
    </div>
  )
}
