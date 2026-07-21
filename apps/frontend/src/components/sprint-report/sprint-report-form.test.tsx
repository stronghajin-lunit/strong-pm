import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as sprintReportsApi from '@/api/sprint-reports'
import { SprintReportForm } from './sprint-report-form'
import type { SprintOption, SprintRunRecord } from '@/types/sprint'

const MOCK_SPRINT_OPTIONS: SprintOption[] = [
  { sprintId: 101, sprintNumber: 79, label: 'Onco Sprint 79', status: 'active' },
  { sprintId: 100, sprintNumber: 78, label: 'Onco Sprint 78', status: 'closed' },
]

const MOCK_RECORD: SprintRunRecord = {
  id: 'sr-1',
  sprintLabel: 'Onco Sprint 79',
  requestedAt: '2026-06-01 10:00',
  completedAt: '2026-06-01 10:03',
  status: 'done',
  confluenceUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/99999',
}

vi.mock('@/api/sprint-reports', () => ({
  fetchSprintOptions: vi.fn(),
  fetchSprintReports: vi.fn(),
  runSprintReport: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(sprintReportsApi.runSprintReport).mockResolvedValue(MOCK_RECORD)
})

describe('SprintReportForm', () => {
  describe('기본 렌더링', () => {
    it('Sprint 셀렉트, Confluence URL 입력, Run 버튼을 렌더링한다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)
      expect(screen.getByTestId('sprint-select')).toBeInTheDocument()
      expect(screen.getByTestId('confluence-url-input')).toBeInTheDocument()
      expect(screen.getByTestId('run-btn')).toBeInTheDocument()
    })

    it('셀렉트에 스프린트 목록을 렌더링한다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)
      expect(screen.getByText(/Onco Sprint 79/)).toBeInTheDocument()
      expect(screen.getByText(/Onco Sprint 78/)).toBeInTheDocument()
    })
  })

  describe('Run 버튼 활성화 조건', () => {
    it('sprint와 URL 모두 비어 있으면 Run 버튼이 비활성화된다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })

    it('sprint만 선택하면 Run 버튼이 비활성화된다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })

    it('sprint + URL 모두 입력하면 Run 버튼이 활성화된다', async () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })
      await userEvent.type(
        screen.getByTestId('confluence-url-input'),
        'https://lunit.atlassian.net/wiki/spaces/AIP/pages/99999',
      )
      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })
  })

  describe('Run 실행', () => {
    it('Run 클릭 시 Running... 상태가 된다', async () => {
      vi.mocked(sprintReportsApi.runSprintReport).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(MOCK_RECORD), 100)),
      )
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })
      fireEvent.change(screen.getByTestId('confluence-url-input'), {
        target: { value: 'https://lunit.atlassian.net/wiki/pages/99999' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))
      expect(screen.getByTestId('run-btn')).toHaveTextContent('Running...')
    })

    it('Run 클릭 시 onRun이 running temp record와 함께 즉시 호출된다', () => {
      const onRun = vi.fn()
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} onRun={onRun} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })
      fireEvent.change(screen.getByTestId('confluence-url-input'), {
        target: { value: 'https://lunit.atlassian.net/wiki/pages/99999' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))
      expect(onRun).toHaveBeenCalledTimes(1)
      const [temp, promise] = onRun.mock.calls[0] as [{ status: string; sprintLabel: string }, Promise<unknown>]
      expect(temp).toMatchObject({ status: 'running', sprintLabel: expect.any(String) })
      expect(promise).toBeInstanceOf(Promise)
    })

    it('Run 실패 시 onRun의 promise가 reject된다', async () => {
      vi.mocked(sprintReportsApi.runSprintReport).mockRejectedValue(new Error('JIRA_UPSTREAM_ERROR'))
      const onRun = vi.fn()
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} onRun={onRun} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })
      fireEvent.change(screen.getByTestId('confluence-url-input'), {
        target: { value: 'https://lunit.atlassian.net/wiki/pages/99999' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))
      expect(onRun).toHaveBeenCalledTimes(1)
      const [, promise] = onRun.mock.calls[0] as [unknown, Promise<unknown>]
      await expect(promise).rejects.toThrow('JIRA_UPSTREAM_ERROR')
    })
  })
})
