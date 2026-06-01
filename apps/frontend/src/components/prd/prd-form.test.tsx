import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrdForm } from './prd-form'
import type { Project } from '@/types/project'

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Payment Module Refactor',
    description: 'Full refactor of PG integration.',
    status: 'active',
    epicLink: 'https://jira.example.com/RAD-100',
    confluenceLink: 'https://confluence.example.com/payment',
    relatedProducts: ['ODM'],
    background: 'PG integration needs refactor.',
    updatedAt: '2h ago',
  },
  {
    id: '2',
    name: 'Auth System Redesign',
    description: 'OAuth2 redesign.',
    status: 'planning',
    epicLink: 'https://jira.example.com/RAD-200',
    confluenceLink: 'https://confluence.example.com/auth',
    relatedProducts: ['ODM', 'Annotation Admin'],
    updatedAt: '1d ago',
  },
]

vi.mock('@/stores/project-store', () => ({
  useProjectStore: (selector: (s: { projects: Project[] }) => unknown) =>
    selector({ projects: MOCK_PROJECTS }),
}))

afterEach(() => {
  vi.useRealTimers()
})

describe('PrdForm', () => {
  describe('기본 렌더링', () => {
    it('Configuration 섹션과 Run 버튼이 표시된다', () => {
      render(<PrdForm />)
      expect(screen.getByText('Configuration')).toBeInTheDocument()
      expect(screen.getByTestId('run-btn')).toBeInTheDocument()
    })

    it('필수 입력 필드가 모두 표시된다', () => {
      render(<PrdForm />)
      expect(screen.getByTestId('project-select')).toBeInTheDocument()
      expect(screen.getByTestId('target-team-input')).toBeInTheDocument()
      expect(screen.getByTestId('kickoff-url-input')).toBeInTheDocument()
      expect(screen.getByTestId('prd-page-url-input')).toBeInTheDocument()
    })

    it('프로젝트 목록이 드롭박스에 표시된다', () => {
      render(<PrdForm />)
      const select = screen.getByTestId('project-select')
      expect(select).toContainElement(screen.getByText('Payment Module Refactor'))
      expect(select).toContainElement(screen.getByText('Auth System Redesign'))
    })
  })

  describe('Run 버튼 활성화 조건', () => {
    it('모든 필드가 비어 있으면 Run 버튼이 비활성화된다', () => {
      render(<PrdForm />)
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })

    it('모든 필수 필드를 채우면 Run 버튼이 활성화된다', async () => {
      render(<PrdForm />)
      fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })
      await userEvent.type(screen.getByTestId('target-team-input'), 'ODM Team')
      await userEvent.type(screen.getByTestId('kickoff-url-input'), 'https://confluence.example.com/kickoff')
      await userEvent.type(screen.getByTestId('prd-page-url-input'), 'https://confluence.example.com/prd')
      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })

    it('project 미선택 시 나머지 필드를 채워도 Run 버튼이 비활성화된다', async () => {
      render(<PrdForm />)
      await userEvent.type(screen.getByTestId('target-team-input'), 'ODM Team')
      await userEvent.type(screen.getByTestId('kickoff-url-input'), 'https://confluence.example.com/kickoff')
      await userEvent.type(screen.getByTestId('prd-page-url-input'), 'https://confluence.example.com/prd')
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })
  })

  // fake timer가 필요한 테스트는 userEvent 대신 fireEvent를 사용한다.
  // userEvent는 내부적으로 Promise 기반 타이밍을 사용해 vi.useFakeTimers()와 충돌한다.
  describe('Run 실행 — 결과 표시', () => {
    it('Run 클릭 시 버튼이 Running... 상태가 된다', () => {
      vi.useFakeTimers()
      render(<PrdForm />)
      fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })
      fireEvent.change(screen.getByTestId('target-team-input'), { target: { value: 'ODM Team' } })
      fireEvent.change(screen.getByTestId('kickoff-url-input'), { target: { value: 'https://confluence.example.com/kickoff' } })
      fireEvent.change(screen.getByTestId('prd-page-url-input'), { target: { value: 'https://confluence.example.com/prd' } })

      fireEvent.click(screen.getByTestId('run-btn'))
      expect(screen.getByTestId('run-btn')).toHaveTextContent('Running...')
    })

    it('Run 클릭 시 onRunComplete가 PrdRunRecord와 함께 호출된다', () => {
      vi.useFakeTimers()
      const onRunComplete = vi.fn()
      render(<PrdForm onRunComplete={onRunComplete} />)
      fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })
      fireEvent.change(screen.getByTestId('target-team-input'), { target: { value: 'ODM Team' } })
      fireEvent.change(screen.getByTestId('kickoff-url-input'), { target: { value: 'https://confluence.example.com/kickoff' } })
      fireEvent.change(screen.getByTestId('prd-page-url-input'), { target: { value: 'https://confluence.example.com/prd' } })

      fireEvent.click(screen.getByTestId('run-btn'))
      act(() => { vi.advanceTimersByTime(2500) })

      expect(onRunComplete).toHaveBeenCalledTimes(1)
      const record = onRunComplete.mock.calls[0][0]
      expect(record.projectId).toBe('1')
      expect(record.projectName).toBe('Payment Module Refactor')
      expect(record.status).toBe('done')
    })
  })
})
