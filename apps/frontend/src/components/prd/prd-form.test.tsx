import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as prdApi from '@/api/prd'
import { PrdForm } from './prd-form'
import type { Project } from '@/types/project'
import type { PrdTeamOption } from '@/api/prd'
import type { PrdRunRecord } from '@/types/prd'

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

const MOCK_TEAMS: PrdTeamOption[] = [
  { key: 'odm', label: 'ODM Team', description: 'ODM product team' },
  { key: 'anno', label: 'Annotation Team', description: 'Annotation product team' },
]

const MOCK_RECORD: PrdRunRecord = {
  id: 'prd-1',
  projectId: '1',
  projectName: 'Payment Module Refactor',
  targetTeams: ['ODM Team'],
  kickoffUrl: 'https://confluence.example.com/kickoff',
  prdPageUrl: 'https://confluence.example.com/prd',
  requestedAt: '2026-06-01 10:00',
  status: 'done',
  confluenceUrl: 'https://confluence.example.com/prd-result',
}

vi.mock('@/stores/project-store', () => ({
  useProjectStore: (selector: (s: { projects: Project[] }) => unknown) =>
    selector({ projects: MOCK_PROJECTS }),
}))

vi.mock('@/api/prd', () => ({
  fetchPrdTeams: vi.fn(),
  runPrd: vi.fn(),
  fetchPrdRuns: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prdApi.fetchPrdTeams).mockResolvedValue(MOCK_TEAMS)
  vi.mocked(prdApi.runPrd).mockResolvedValue(MOCK_RECORD)
})

afterEach(() => {
  vi.useRealTimers()
})

async function openTeamDropdownAndSelect(teamLabel: string) {
  fireEvent.click(screen.getByTestId('target-team-btn'))
  await waitFor(() => screen.getByText(teamLabel))
  fireEvent.click(screen.getByText(teamLabel))
}

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
      expect(screen.getByTestId('target-team-btn')).toBeInTheDocument()
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
      await openTeamDropdownAndSelect('ODM Team')
      fireEvent.change(screen.getByTestId('kickoff-url-input'), { target: { value: 'https://confluence.example.com/kickoff' } })
      fireEvent.change(screen.getByTestId('prd-page-url-input'), { target: { value: 'https://confluence.example.com/prd' } })
      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })

    it('project 미선택 시 나머지 필드를 채워도 Run 버튼이 비활성화된다', async () => {
      render(<PrdForm />)
      await openTeamDropdownAndSelect('ODM Team')
      fireEvent.change(screen.getByTestId('kickoff-url-input'), { target: { value: 'https://confluence.example.com/kickoff' } })
      fireEvent.change(screen.getByTestId('prd-page-url-input'), { target: { value: 'https://confluence.example.com/prd' } })
      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })
  })

  describe('Run 실행 — 결과 표시', () => {
    it('Run 클릭 시 버튼이 Running... 상태가 된다', async () => {
      render(<PrdForm />)
      fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })
      await openTeamDropdownAndSelect('ODM Team')
      fireEvent.change(screen.getByTestId('kickoff-url-input'), { target: { value: 'https://confluence.example.com/kickoff' } })
      fireEvent.change(screen.getByTestId('prd-page-url-input'), { target: { value: 'https://confluence.example.com/prd' } })

      fireEvent.click(screen.getByTestId('run-btn'))
      expect(screen.getByTestId('run-btn')).toHaveTextContent('Running...')
    })

    it('Run 클릭 시 onRun이 running temp PrdRunRecord와 함께 즉시 호출된다', async () => {
      const onRun = vi.fn()
      render(<PrdForm onRun={onRun} />)
      fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })
      await openTeamDropdownAndSelect('ODM Team')
      fireEvent.change(screen.getByTestId('kickoff-url-input'), { target: { value: 'https://confluence.example.com/kickoff' } })
      fireEvent.change(screen.getByTestId('prd-page-url-input'), { target: { value: 'https://confluence.example.com/prd' } })

      fireEvent.click(screen.getByTestId('run-btn'))

      expect(onRun).toHaveBeenCalledTimes(1)
      const [temp, promise] = onRun.mock.calls[0] as [{ projectId: string; projectName: string; status: string }, Promise<unknown>]
      expect(temp.projectId).toBe('1')
      expect(temp.projectName).toBe('Payment Module Refactor')
      expect(temp.status).toBe('running')
      expect(promise).toBeInstanceOf(Promise)
    })
  })
})
