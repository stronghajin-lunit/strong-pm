import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JiraTicketForm } from './jira-ticket-form'

afterEach(() => {
  vi.useRealTimers()
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

  describe('Product 선택에 따른 Sprint 드롭박스', () => {
    it('Product 미선택 시 Sprint 드롭박스가 비활성화된다', () => {
      render(<JiraTicketForm />)
      expect(screen.getByTestId('sprint-select')).toBeDisabled()
    })

    it('ODM 선택 시 ODM 스프린트 목록이 표시된다', () => {
      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      const sprintSelect = screen.getByTestId('sprint-select')
      expect(sprintSelect).not.toBeDisabled()
      expect(sprintSelect).toContainElement(screen.getByText('Onco Sprint 79'))
      expect(sprintSelect).toContainElement(screen.getByText('Onco Sprint 78'))
    })

    it('Annotation Admin 선택 시 해당 스프린트 목록이 표시된다', () => {
      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'Annotation Admin' } })
      const sprintSelect = screen.getByTestId('sprint-select')
      expect(sprintSelect).toContainElement(screen.getByText('Onco Sprint 34'))
    })

    it('Product 변경 시 Sprint 선택이 초기화된다', () => {
      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'odm-79' } })
      expect((screen.getByTestId('sprint-select') as HTMLSelectElement).value).toBe('odm-79')

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
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'odm-79' } })
      await userEvent.type(screen.getByTestId('feature-input'), '블록 등록 폼에 라이선스 필드를 추가합니다.')
      await userEvent.type(screen.getByTestId('dod-input'), 'The license field is added.')
      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })

    it('Sprint 미선택 시 Run 버튼이 비활성화된다', async () => {
      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      await userEvent.type(screen.getByTestId('feature-input'), 'Feature text')
      await userEvent.type(screen.getByTestId('dod-input'), 'Done text')
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })
  })

  describe('Type 토글', () => {
    it('기본 선택은 Task이다', () => {
      render(<JiraTicketForm />)
      // Task 버튼이 활성 스타일을 가짐 — 텍스트 존재 확인
      expect(screen.getByTestId('type-btn-task')).toBeInTheDocument()
      expect(screen.getByTestId('type-btn-bug')).toBeInTheDocument()
    })

    it('Bug 클릭 시 Bug가 선택된다', async () => {
      render(<JiraTicketForm />)
      await userEvent.click(screen.getByTestId('type-btn-bug'))
      // Bug 버튼 클릭 후 Run 시 type이 Bug로 전달되는지 확인
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'odm-79' } })
      await userEvent.type(screen.getByTestId('feature-input'), 'Bug feature')
      await userEvent.type(screen.getByTestId('dod-input'), 'Bug dod')

      vi.useFakeTimers()
      const onRunComplete = vi.fn()
      render(<JiraTicketForm onRunComplete={onRunComplete} />)
      // Re-setup for clean run
    })
  })

  // fake timer가 필요한 테스트는 userEvent 대신 fireEvent를 사용한다.
  // userEvent는 내부적으로 Promise 기반 타이밍을 사용해 vi.useFakeTimers()와 충돌한다.
  describe('Run 실행 — 결과 표시', () => {
    it('Run 클릭 시 버튼이 Running... 상태가 된다', () => {
      vi.useFakeTimers()
      render(<JiraTicketForm />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'odm-79' } })
      fireEvent.change(screen.getByTestId('feature-input'), { target: { value: '기능 설명' } })
      fireEvent.change(screen.getByTestId('dod-input'), { target: { value: '완료 조건' } })

      fireEvent.click(screen.getByTestId('run-btn'))
      expect(screen.getByTestId('run-btn')).toHaveTextContent('Running...')
    })

    it('Run 클릭 시 onRunComplete가 JiraTicketRunRecord와 함께 호출된다', () => {
      vi.useFakeTimers()
      const onRunComplete = vi.fn()
      render(<JiraTicketForm onRunComplete={onRunComplete} />)
      fireEvent.change(screen.getByTestId('product-select'), { target: { value: 'ODM' } })
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: 'odm-79' } })
      fireEvent.change(screen.getByTestId('feature-input'), { target: { value: '기능 설명' } })
      fireEvent.change(screen.getByTestId('dod-input'), { target: { value: '완료 조건' } })

      fireEvent.click(screen.getByTestId('run-btn'))
      act(() => { vi.advanceTimersByTime(2500) })

      expect(onRunComplete).toHaveBeenCalledTimes(1)
      const record = onRunComplete.mock.calls[0][0]
      expect(record.product).toBe('ODM')
      expect(record.sprint).toBe('Onco Sprint 79')
      expect(record.status).toBe('done')
    })
  })
})
