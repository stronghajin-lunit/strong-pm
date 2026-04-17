'use client'

import { useEffect } from 'react'
import { JiraTicketForm } from '@/components/jira-ticket/jira-ticket-form'
import { useUIStore } from '@/stores/ui-store'
import { MOCK_JIRA_TICKET_HISTORY } from '@/mocks/jira-ticket'

export default function JiraTicketWriterPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)

  useEffect(() => {
    setTopbarTitle('Jira Ticket Writer')
  }, [setTopbarTitle])

  return (
    <div className="px-7 py-6">
      <div className="mb-5">
        <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Jira Ticket Writer</h2>
        <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
          기능 설명과 DoD를 입력하면 Jira 티켓을 자동으로 생성합니다.
        </p>
      </div>

      <JiraTicketForm initialHistory={MOCK_JIRA_TICKET_HISTORY} />
    </div>
  )
}
