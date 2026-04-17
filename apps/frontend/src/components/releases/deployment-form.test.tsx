import { describe, it, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeploymentForm } from './deployment-form'
import type { JiraVersionOption, DeploymentResult } from '@/types/release'

const MOCK_VERSIONS: JiraVersionOption[] = [
  { id: 'aicp-0401', label: 'AICP Monthly 26-04-01' },
  { id: 'odm-0401',  label: 'ODM Monthly 26-04-01'  },
]

const MOCK_DATA: Record<string, DeploymentResult> = {
  'aicp-0401': {
    title: 'AICP Monthly 26-04-01',
    stats: { total: 5, withPR: 3, noPR: 2, merged: 3, deployedThis: 2, deployedPrev: 1 },
    repos: ['scope-dp-console (v4.8.0)', 'scope-annotation-tool (v4.7.0)'],
    noPRTickets: ['RAD-001', 'RAD-002'],
    unregisteredPRs: {
      count: 2,
      tickets: ['RAD-003', 'RAD-004'],
      breakdown: { needed: 1, notNeeded: 0, noTicket: 1 },
    },
    ticketRows: [
      { id: 'RAD-001', title: 'No PR ticket 1', pr: null,    merged: null,  status: 'no-pr' },
      { id: 'RAD-002', title: 'No PR ticket 2', pr: null,    merged: null,  status: 'no-pr' },
      { id: 'RAD-003', title: 'Unregistered 1', pr: '#100',  merged: true,  status: 'unregistered' },
      { id: 'RAD-004', title: 'Unregistered 2', pr: '#101',  merged: true,  status: 'unregistered' },
      { id: 'RAD-010', title: 'Deployed this',  pr: '#090',  merged: true,  status: 'deployed-this' },
      { id: 'RAD-011', title: 'Deployed prev',  pr: '#080',  merged: true,  status: 'deployed-prev' },
    ],
  },
  'odm-0401': {
    title: 'ODM Monthly 26-04-01',
    stats: { total: 2, withPR: 2, noPR: 0, merged: 2, deployedThis: 1, deployedPrev: 1 },
    repos: ['aip-oncology (v1.8.2)'],
    noPRTickets: [],
    unregisteredPRs: { count: 0, tickets: [] },
    ticketRows: [
      { id: 'ODM-100', title: 'QC workflow', pr: '#200', merged: true, status: 'deployed-this' },
      { id: 'ODM-101', title: 'DB migration', pr: '#201', merged: true, status: 'deployed-prev' },
    ],
  },
}

describe('DeploymentForm', () => {
  describe('기본 렌더링', () => {
    it('버전 셀렉트와 Run 버튼을 렌더링한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      expect(screen.getByTestId('dt-version-select')).toBeInTheDocument()
      expect(screen.getByTestId('dt-run-btn')).toBeInTheDocument()
    })

    it('버전 옵션을 렌더링한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      const select = screen.getByTestId('dt-version-select')
      expect(within(select).getByText(/AICP Monthly/)).toBeInTheDocument()
      expect(within(select).getByText(/ODM Monthly/)).toBeInTheDocument()
    })

    it('초기 상태에서 빈 상태(Empty state)를 렌더링한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      expect(screen.getByTestId('dt-empty-state')).toBeInTheDocument()
    })

    it('버전 미선택 시 Run 버튼이 비활성화된다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      expect(screen.getByTestId('dt-run-btn')).toBeDisabled()
    })

    it('버전 선택 시 Run 버튼이 활성화된다', async () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      await userEvent.selectOptions(screen.getByTestId('dt-version-select'), 'aicp-0401')

      expect(screen.getByTestId('dt-run-btn')).not.toBeDisabled()
    })
  })

  describe('Run 실행 — 결과 표시', () => {
    it('Run 클릭 시 빈 상태가 사라지고 결과가 표시된다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))

      expect(screen.queryByTestId('dt-empty-state')).not.toBeInTheDocument()
      expect(screen.getByTestId('dt-results')).toBeInTheDocument()
    })

    it('통계 카드가 올바른 값을 표시한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))

      expect(screen.getByTestId('stat-total-jira-tickets')).toHaveTextContent('5')
      expect(screen.getByTestId('stat-tickets-with-pr')).toHaveTextContent('3')
      expect(screen.getByTestId('stat-tickets-without-pr')).toHaveTextContent('2')
    })

    it('레포지토리 목록을 렌더링한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))

      const reposContainer = screen.getByTestId('dt-repos')
      expect(within(reposContainer).getByText('scope-dp-console (v4.8.0)')).toBeInTheDocument()
      expect(within(reposContainer).getByText('scope-annotation-tool (v4.7.0)')).toBeInTheDocument()
    })

    it('No-PR 티켓 목록을 렌더링한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))

      const noPRContainer = screen.getByTestId('dt-no-pr-tickets')
      expect(within(noPRContainer).getByText('RAD-001')).toBeInTheDocument()
      expect(within(noPRContainer).getByText('RAD-002')).toBeInTheDocument()
    })

    it('No-PR 없는 버전에서 "All tickets have linked PRs" 메시지를 표시한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'odm-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))

      expect(screen.getByTestId('dt-all-linked')).toBeInTheDocument()
    })

    it('Unregistered PRs 섹션을 렌더링한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))

      expect(screen.getByTestId('dt-unregistered-prs')).toBeInTheDocument()
    })
  })

  describe('티켓 테이블', () => {
    it('전체 필터(All)에서 모든 티켓 행을 렌더링한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))

      const tbody = screen.getByTestId('dt-ticket-tbody')
      const rows = within(tbody).getAllByRole('row')
      expect(rows).toHaveLength(6)
    })

    it('티켓 행에 올바른 배포 상태 배지를 표시한다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))

      expect(screen.getByTestId('ticket-status-RAD-001')).toHaveTextContent('No PR')
      expect(screen.getByTestId('ticket-status-RAD-003')).toHaveTextContent('Unregistered')
      expect(screen.getByTestId('ticket-status-RAD-010')).toHaveTextContent('Deployed')
      expect(screen.getByTestId('ticket-status-RAD-011')).toHaveTextContent('Prev Release')
    })
  })

  describe('필터 기능', () => {
    it('No PR 필터를 누르면 no-pr 상태 티켓만 표시된다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))
      fireEvent.click(screen.getByTestId('dt-filter-no-pr'))

      const tbody = screen.getByTestId('dt-ticket-tbody')
      const rows = within(tbody).getAllByRole('row')
      expect(rows).toHaveLength(2)
      expect(screen.getByTestId('ticket-row-RAD-001')).toBeInTheDocument()
      expect(screen.getByTestId('ticket-row-RAD-002')).toBeInTheDocument()
    })

    it('Deployed This 필터를 누르면 deployed-this 상태 티켓만 표시된다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))
      fireEvent.click(screen.getByTestId('dt-filter-deployed-this'))

      const tbody = screen.getByTestId('dt-ticket-tbody')
      const rows = within(tbody).getAllByRole('row')
      expect(rows).toHaveLength(1)
      expect(screen.getByTestId('ticket-row-RAD-010')).toBeInTheDocument()
    })

    it('All 필터를 누르면 모든 티켓이 다시 표시된다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))
      fireEvent.click(screen.getByTestId('dt-filter-no-pr'))
      fireEvent.click(screen.getByTestId('dt-filter-all'))

      const tbody = screen.getByTestId('dt-ticket-tbody')
      const rows = within(tbody).getAllByRole('row')
      expect(rows).toHaveLength(6)
    })

    it('필터 버튼은 활성화 시 aria-pressed="true"를 가진다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))

      expect(screen.getByTestId('dt-filter-all')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('dt-filter-no-pr')).toHaveAttribute('aria-pressed', 'false')

      fireEvent.click(screen.getByTestId('dt-filter-no-pr'))

      expect(screen.getByTestId('dt-filter-all')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByTestId('dt-filter-no-pr')).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('버전 전환', () => {
    it('다른 버전을 선택하고 Run하면 새 결과로 교체된다', () => {
      render(<DeploymentForm versionOptions={MOCK_VERSIONS} deploymentData={MOCK_DATA} />)

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'aicp-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))
      expect(screen.getByTestId('stat-total-jira-tickets')).toHaveTextContent('5')

      fireEvent.change(screen.getByTestId('dt-version-select'), { target: { value: 'odm-0401' } })
      fireEvent.click(screen.getByTestId('dt-run-btn'))
      expect(screen.getByTestId('stat-total-jira-tickets')).toHaveTextContent('2')
    })
  })
})
