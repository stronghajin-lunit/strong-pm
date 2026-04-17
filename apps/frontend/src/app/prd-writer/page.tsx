'use client'

import { useEffect } from 'react'
import { PrdForm } from '@/components/prd/prd-form'
import { useUIStore } from '@/stores/ui-store'
import { MOCK_PRD_HISTORY } from '@/mocks/prd'

export default function PrdWriterPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)

  useEffect(() => {
    setTopbarTitle('PRD Writer')
  }, [setTopbarTitle])

  return (
    <div className="px-7 py-6">
      <div className="mb-5">
        <h2 className="text-[20px] font-semibold tracking-[-0.4px]">PRD Writer</h2>
        <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
          Kickoff 문서를 파싱해 PRD를 자동으로 생성하고 Confluence 페이지에 업데이트합니다.
        </p>
      </div>

      <PrdForm initialHistory={MOCK_PRD_HISTORY} />
    </div>
  )
}
