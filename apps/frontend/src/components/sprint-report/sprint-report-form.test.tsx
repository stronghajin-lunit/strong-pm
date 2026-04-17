import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintReportForm } from './sprint-report-form'
import type { SprintOption, SprintRunRecord } from '@/types/sprint'

const MOCK_SPRINT_OPTIONS: SprintOption[] = [
  { id: 'sp-14', label: 'Sprint 14', projectName: 'Payment Module Refactor', status: 'active' },
  { id: 'sp-13', label: 'Sprint 13', projectName: 'Payment Module Refactor', status: 'done' },
]

const MOCK_HISTORY: SprintRunRecord[] = [
  {
    id: 'run-1',
    sprintLabel: 'Sprint 13',
    projectName: 'Payment Module Refactor',
    requestedAt: '2026-03-24 11:20',
    status: 'done',
    confluenceUrl: '#',
  },
]

// fake timer가 필요한 테스트는 userEvent 대신 fireEvent를 사용한다.
// userEvent는 내부적으로 Promise 기반 타이밍을 사용해 vi.useFakeTimers()와 충돌한다.

afterEach(() => {
  vi.useRealTimers()
})

describe('SprintReportForm', () => {
  describe('기본 렌더링', () => {
    it('Sprint 셀렉트와 Run 버튼을 렌더링한다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} initialHistory={[]} />)

      expect(screen.getByTestId('sprint-select')).toBeInTheDocument()
      expect(screen.getByTestId('run-btn')).toBeInTheDocument()
    })

    it('셀렉트에 모든 스프린트 옵션을 렌더링한다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} initialHistory={[]} />)

      const select = screen.getByTestId('sprint-select')
      expect(within(select).getByText(/Sprint 14/)).toBeInTheDocument()
      expect(within(select).getByText(/Sprint 13/)).toBeInTheDocument()
    })

    it('초기 히스토리를 렌더링한다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} initialHistory={MOCK_HISTORY} />)

      expect(screen.getByTestId('history-row-run-1')).toBeInTheDocument()
      expect(screen.getByText('Sprint 13')).toBeInTheDocument()
    })

    it('Done 상태의 히스토리 항목에 Confluence 링크가 있다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} initialHistory={MOCK_HISTORY} />)

      expect(screen.getByTestId('history-link-run-1')).toHaveTextContent('Confluence ↗')
    })
  })

  describe('Run 버튼', () => {
    it('스프린트가 선택되지 않은 경우 Run 버튼이 비활성화된다', () => {
      // Given
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} initialHistory={[]} />)

      // Then
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })

    it('스프린트를 선택하면 Run 버튼이 활성화된다', async () => {
      // Given
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} initialHistory={[]} />)

      // When
      await userEvent.selectOptions(screen.getByTestId('sprint-select'), 'sp-14')

      // Then
      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })
  })

  describe('Run 실행', () => {
    it('Run 클릭 시 Running 상태의 새 히스토리 항목이 맨 위에 추가된다', () => {
      // Given
      vi.useFakeTimers()
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} initialHistory={MOCK_HISTORY} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'sp-14' } })

      // When
      fireEvent.click(screen.getByTestId('run-btn'))

      // Then: 새 항목이 맨 위
      const rows = screen.getAllByTestId(/^history-row-/)
      expect(rows).toHaveLength(2)

      const newRow = rows[0]
      expect(within(newRow).getByText('Sprint 14')).toBeInTheDocument()
      expect(within(newRow).getByTestId(/history-status/)).toHaveTextContent('Running')
    })

    it('2.5초 후 Running → Done으로 상태가 변경되고 Confluence 링크가 생긴다', () => {
      // Given
      vi.useFakeTimers()
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} initialHistory={[]} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'sp-14' } })
      fireEvent.click(screen.getByTestId('run-btn'))

      // When: 2.5초 경과
      act(() => { vi.advanceTimersByTime(2500) })

      // Then
      expect(screen.getByTestId(/history-status/)).toHaveTextContent('Done')
      expect(screen.getByTestId(/history-link/)).toHaveTextContent('Confluence ↗')
    })

    it('Run 후 1초에는 아직 Running 상태다', () => {
      // Given
      vi.useFakeTimers()
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} initialHistory={[]} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'sp-14' } })
      fireEvent.click(screen.getByTestId('run-btn'))

      // When: 1초만 경과
      act(() => { vi.advanceTimersByTime(1000) })

      // Then
      expect(screen.getByTestId(/history-status/)).toHaveTextContent('Running')
    })
  })
})
