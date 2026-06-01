import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintReportForm } from './sprint-report-form'
import type { SprintOption } from '@/types/sprint'

const MOCK_SPRINT_OPTIONS: SprintOption[] = [
  { id: 'sp-14', label: 'Sprint 14', projectName: 'Payment Module Refactor', status: 'active' },
  { id: 'sp-13', label: 'Sprint 13', projectName: 'Payment Module Refactor', status: 'done' },
]

// fake timer가 필요한 테스트는 userEvent 대신 fireEvent를 사용한다.
// userEvent는 내부적으로 Promise 기반 타이밍을 사용해 vi.useFakeTimers()와 충돌한다.

afterEach(() => {
  vi.useRealTimers()
})

describe('SprintReportForm', () => {
  describe('기본 렌더링', () => {
    it('Sprint 셀렉트와 Run 버튼을 렌더링한다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)

      expect(screen.getByTestId('sprint-select')).toBeInTheDocument()
      expect(screen.getByTestId('run-btn')).toBeInTheDocument()
    })

    it('셀렉트에 모든 스프린트 옵션을 렌더링한다', () => {
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)

      const select = screen.getByTestId('sprint-select')
      expect(within(select).getByText(/Sprint 14/)).toBeInTheDocument()
      expect(within(select).getByText(/Sprint 13/)).toBeInTheDocument()
    })
  })

  describe('Run 버튼', () => {
    it('스프린트가 선택되지 않은 경우 Run 버튼이 비활성화된다', () => {
      // Given
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)

      // Then
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })

    it('스프린트를 선택하면 Run 버튼이 활성화된다', async () => {
      // Given
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)

      // When
      await userEvent.selectOptions(screen.getByTestId('sprint-select'), 'sp-14')

      // Then
      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })
  })

  describe('Run 실행', () => {
    it('Run 클릭 시 버튼이 비활성화되고 Running... 텍스트를 표시한다', () => {
      // Given
      vi.useFakeTimers()
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'sp-14' } })

      // When
      fireEvent.click(screen.getByTestId('run-btn'))

      // Then
      expect(screen.getByTestId('run-btn')).toBeDisabled()
      expect(screen.getByTestId('run-btn')).toHaveTextContent('Running...')
    })

    it('2.5초 후 onRunComplete가 Done 레코드와 함께 호출된다', () => {
      // Given
      vi.useFakeTimers()
      const onRunComplete = vi.fn()
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} onRunComplete={onRunComplete} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'sp-14' } })
      fireEvent.click(screen.getByTestId('run-btn'))

      expect(onRunComplete).not.toHaveBeenCalled()

      // When: 2.5초 경과
      act(() => { vi.advanceTimersByTime(2500) })

      // Then
      expect(onRunComplete).toHaveBeenCalledTimes(1)
      expect(onRunComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          sprintLabel: 'Sprint 14',
          projectName: 'Payment Module Refactor',
          status: 'done',
          confluenceUrl: '#',
        }),
      )
    })

    it('Run 후 1초에는 onRunComplete가 아직 호출되지 않는다', () => {
      // Given
      vi.useFakeTimers()
      const onRunComplete = vi.fn()
      render(<SprintReportForm sprintOptions={MOCK_SPRINT_OPTIONS} onRunComplete={onRunComplete} />)
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'sp-14' } })
      fireEvent.click(screen.getByTestId('run-btn'))

      // When: 1초만 경과
      act(() => { vi.advanceTimersByTime(1000) })

      // Then
      expect(onRunComplete).not.toHaveBeenCalled()
    })
  })
})
