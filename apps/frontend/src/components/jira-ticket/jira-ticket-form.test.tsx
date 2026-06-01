import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as jiraTicketsApi from '@/api/jira-tickets'
import { JiraTicketForm } from './jira-ticket-form'
import type { JiraSprintOption } from '@/api/jira-tickets'
import type { JiraTicketRunRecord } from '@/types/jira-ticket'

const MOCK_SPRINTS: JiraSprintOption[] = [
  { sprintId: 101, label: 'Onco Sprint 79', state: 'active' },
  { sprintId: 100, label: 'Onco Sprint 78', state: 'future' },
]

const MOCK_RECORD: JiraTicketRunRecord = {
  id: 'jt-1',
  summary: 'ODM > Add license field to block registration form',
  product: 'ODM',
  sprint: 'Onco Sprint 79',
  type: 'Task',
  requestedAt: '2026-06-01 10:00',
  status: 'done',
  jiraUrl: 'https://lunit.atlassian.net/browse/RAD-9999',
}

vi.mock('@/api/jira-tickets', () => ({
  fetchJiraSprints: vi.fn(),
  runJiraTicket: vi.fn(),
  fetchJiraTicketRuns: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(jiraTicketsApi.fetchJiraSprints).mockResolvedValue(MOCK_SPRINTS)
  vi.mocked(jiraTicketsApi.runJiraTicket).mockResolvedValue(MOCK_RECORD)
})

describe('JiraTicketForm', () => {
  describe('기본 렌더링', () => {
    it('Configuration 섹션과 Run 버튼이 표시된다', () => {
      render(<JiraTicketForm />)
      expect(screen.getByText('Configuration')).toBeInTheDocument()
      expect(screen.getByTestId('run-btn')).toBeInTheDocument()
    })

    it('Product, Sprint, Type 필드가 표시된다', () => {
      render(<JiraTicketForm />)
      expect(screen.getByTestId('product-select')).toBeInTheDocument()
      expect(screen.getByTestId('sprint-select')).toBeInTheDocument()
      expect(screen.getByTestId('type-btn-task')).toBeInTheDocument()
      expect(screen.getByTestId('type-btn-bug')).toBeInTheDocument()
    })

    it('Feature Description, DoD 텍스트에어리어가 표시된다', () => {
      render(<JiraTicketForm />)
      expect(screen.getByTestId('feature-input')).toBeInTheDocument()
      expect(screen.getByTestId('dod-input')).toBeInTheDocument()
    })
  })

  describe('Product 선택에 따른 Sprint 드롭다운', () => {
    it('Product 미선택 시 Sprint 드롭다운이 비활성화된다', () => {
      render(<JiraTicketForm />)
      expect(screen.getByTestId('sprint-select')).toBeDisabled()
    })

    it('ODM 선택 시 API를 호출하고 스프린트 목록이 표시된다', async () => {
      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      await waitFor(() => {
        expect(screen.getByTestId('sprint-select')).not.toBeDisabled()
        expect(screen.getByText('Onco Sprint 79')).toBeInTheDocument()
      })
    })

    it('Product 변경 시 Sprint 선택이 초기화된다', async () => {
      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      await waitFor(() => screen.getByText('Onco Sprint 79'))
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })

      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'Annotation Admin' } })
      expect((screen.getByTestId('sprint-select') as HTMLSelectElement).value).toBe('')
    })
  })

  describe('Run 버튼 활성화 조건', () => {
    it('모든 필드가 비어 있으면 Run 버튼이 비활성화된다', () => {
      render(<JiraTicketForm />)
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })

    it('모든 필수 필드를 채우면 Run 버튼이 활성화된다', async () => {
      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      await waitFor(() => screen.getByText('Onco Sprint 79'))
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })
      await userEvent.type(screen.getByTestId('feature-input'), '블록 등록 폼에 라이선스 필드를 추가합니다.')
      await userEvent.type(screen.getByTestId('dod-input'), 'The license field is added.')
      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })

    it('Sprint 미선택 시 Run 버튼이 비활성화된다', async () => {
      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      await waitFor(() => screen.getByText('Onco Sprint 79'))
      await userEvent.type(screen.getByTestId('feature-input'), 'Feature text')
      await userEvent.type(screen.getByTestId('dod-input'), 'Done text')
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })
  })

  describe('Run 실행', () => {
    it('Run 클릭 시 Running... 상태가 된다', async () => {
      vi.mocked(jiraTicketsApi.runJiraTicket).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(MOCK_RECORD), 100)),
      )

      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      await waitFor(() => screen.getByText('Onco Sprint 79'))
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })
      fireEvent.change(screen.getByTestId('feature-input'), { target: { value: '기능 설명' } })
      fireEvent.change(screen.getByTestId('dod-input'), { target: { value: '완료 조건' } })

      fireEvent.click(screen.getByTestId('run-btn'))
      expect(screen.getByTestId('run-btn')).toHaveTextContent('Running...')
    })

    it('Run 성공 시 onRunComplete가 record와 함께 호출된다', async () => {
      const onRunComplete = vi.fn()
      render(<JiraTicketForm onRunComplete={onRunComplete} />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      await waitFor(() => screen.getByText('Onco Sprint 79'))
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })
      fireEvent.change(screen.getByTestId('feature-input'), { target: { value: '기능 설명' } })
      fireEvent.change(screen.getByTestId('dod-input'), { target: { value: '완료 조건' } })

      fireEvent.click(screen.getByTestId('run-btn'))
      await waitFor(() => expect(onRunComplete).toHaveBeenCalledWith(MOCK_RECORD))
    })

    it('Run 실패 시 에러 메시지가 표시된다', async () => {
      vi.mocked(jiraTicketsApi.runJiraTicket).mockRejectedValue(new Error('INVALID_PRODUCT'))

      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      await waitFor(() => screen.getByText('Onco Sprint 79'))
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '101' } })
      fireEvent.change(screen.getByTestId('feature-input'), { target: { value: '기능 설명' } })
      fireEvent.change(screen.getByTestId('dod-input'), { target: { value: '완료 조건' } })

      fireEvent.click(screen.getByTestId('run-btn'))
      await waitFor(() => expect(screen.getByTestId('run-error')).toBeInTheDocument())
    })
  })
})
