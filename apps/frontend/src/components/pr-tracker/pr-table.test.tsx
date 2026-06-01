import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PRTable } from './pr-table'
import type { PullRequest } from '@/types/pr'
import type { Project } from '@/types/project'

const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'Payment Module Refactor', description: '', status: 'active', epicLink: '', confluenceLink: '', relatedProducts: ['ODM'], updatedAt: '2h ago' },
  { id: '2', name: 'Auth System Redesign', description: '', status: 'planning', epicLink: '', confluenceLink: '', relatedProducts: ['ODM'], updatedAt: '1d ago' },
]

const MOCK_PRS: PullRequest[] = [
  {
    id: 'pr-1',
    title: 'feat/payment-gateway: Add PG integration API',
    description: 'KG Inicis & TossPayments endpoints, webhook handler',
    repo: 'backend',
    date: 'Today 13:42',
    author: { login: 'stronghajin', avatarUrl: '' },
    linkedProjectId: '1',
  },
  {
    id: 'pr-2',
    title: 'fix/refund-flow: Fix partial refund amount calc',
    description: 'Decimal rounding bug, per-currency handling added',
    repo: 'backend',
    date: 'Today 11:18',
    author: { login: 'dev-john', avatarUrl: '' },
    linkedProjectId: null,
  },
  {
    id: 'pr-3',
    title: 'chore/deps: Upgrade Node 18 → 20',
    description: 'Runtime version upgrade, CI pipeline update',
    repo: 'frontend',
    date: 'Yesterday 14:33',
    author: { login: 'sarah-k', avatarUrl: '' },
    linkedProjectId: null,
  },
]

describe('PRTable', () => {
  describe('기본 렌더링', () => {
    it('모든 PR 행을 렌더링한다', () => {
      render(<PRTable prs={MOCK_PRS} projects={MOCK_PROJECTS} />)

      expect(screen.getByTestId('pr-row-pr-1')).toBeInTheDocument()
      expect(screen.getByTestId('pr-row-pr-2')).toBeInTheDocument()
      expect(screen.getByTestId('pr-row-pr-3')).toBeInTheDocument()
    })

    it('각 PR의 title, description, repo, date를 표시한다', () => {
      render(<PRTable prs={MOCK_PRS} projects={MOCK_PROJECTS} />)

      expect(screen.getByText('feat/payment-gateway: Add PG integration API')).toBeInTheDocument()
      expect(screen.getByText('KG Inicis & TossPayments endpoints, webhook handler')).toBeInTheDocument()
      expect(screen.getAllByText('backend')).toHaveLength(2)
      expect(screen.getByText('Today 13:42')).toBeInTheDocument()
    })

    it('테이블 헤더 컬럼을 렌더링한다', () => {
      render(<PRTable prs={MOCK_PRS} projects={MOCK_PROJECTS} />)

      expect(screen.getByText('PR Title / Summary')).toBeInTheDocument()
      expect(screen.getByText('Author')).toBeInTheDocument()
      expect(screen.getByText('Repo')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Linked Project')).toBeInTheDocument()
    })

    it('각 PR의 author login을 표시한다', () => {
      render(<PRTable prs={MOCK_PRS} projects={MOCK_PROJECTS} />)

      expect(screen.getByTestId('pr-author-pr-1')).toHaveTextContent('stronghajin')
      expect(screen.getByTestId('pr-author-pr-2')).toHaveTextContent('dev-john')
      expect(screen.getByTestId('pr-author-pr-3')).toHaveTextContent('sarah-k')
    })
  })

  describe('프로젝트 연결 셀렉트', () => {
    it('linkedProjectId가 있는 PR의 셀렉트는 초기에 해당 프로젝트가 선택되어 있다', () => {
      render(<PRTable prs={MOCK_PRS} projects={MOCK_PROJECTS} />)

      const select = screen.getByTestId('pr-project-select-pr-1')
      expect(select).toHaveValue('1')
    })

    it('linkedProjectId가 null인 PR의 셀렉트는 초기에 빈 값이다', () => {
      render(<PRTable prs={MOCK_PRS} projects={MOCK_PROJECTS} />)

      const select = screen.getByTestId('pr-project-select-pr-2')
      expect(select).toHaveValue('')
    })

    it('셀렉트에 모든 프로젝트 옵션이 표시된다', () => {
      render(<PRTable prs={MOCK_PRS} projects={MOCK_PROJECTS} />)

      const select = screen.getByTestId('pr-project-select-pr-2')
      const options = within(select).getAllByRole('option')

      expect(options).toHaveLength(3) // "— Select —" + 2 projects
      expect(within(select).getByText('Payment Module Refactor')).toBeInTheDocument()
      expect(within(select).getByText('Auth System Redesign')).toBeInTheDocument()
    })

    it('프로젝트를 선택하면 셀렉트 값이 변경된다', async () => {
      render(<PRTable prs={MOCK_PRS} projects={MOCK_PROJECTS} />)
      const select = screen.getByTestId('pr-project-select-pr-2')

      await userEvent.selectOptions(select, '2')

      expect(select).toHaveValue('2')
    })

    it('"— Select —" 선택 시 연결이 해제된다', async () => {
      render(<PRTable prs={MOCK_PRS} projects={MOCK_PROJECTS} />)
      const select = screen.getByTestId('pr-project-select-pr-1')

      await userEvent.selectOptions(select, '')

      expect(select).toHaveValue('')
    })
  })

  describe('빈 목록', () => {
    it('PR이 없을 때 빈 테이블을 렌더링한다', () => {
      render(<PRTable prs={[]} projects={MOCK_PROJECTS} />)

      expect(screen.queryByTestId(/^pr-row-/)).toBeNull()
      expect(screen.getByText('Author')).toBeInTheDocument()
    })
  })
})
