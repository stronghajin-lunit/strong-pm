import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectCard } from './project-card'
import type { Project } from '@/types/project'

// next/navigation mock
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const activeProject: Project = {
  id: '1',
  name: 'Payment Module Refactor',
  description: 'PG 연동 전체 리팩토링. PRD 완료, TP 트래킹 진행 중.',
  status: 'active',
  epicLink: '',
  confluenceLink: '',
  relatedProducts: ['ODM'],
  updatedAt: '2h ago',
}

const planningProject: Project = {
  id: '2',
  name: 'Auth System Redesign',
  description: 'OAuth2 인증 시스템 재설계.',
  status: 'planning',
  epicLink: '',
  confluenceLink: '',
  relatedProducts: ['ODM'],
  updatedAt: '1d ago',
}

const doneProject: Project = {
  id: '3',
  name: 'Dashboard v2',
  description: '대시보드 v2 출시 완료.',
  status: 'done',
  epicLink: '',
  confluenceLink: '',
  relatedProducts: ['ODM'],
  updatedAt: '3w ago',
}

describe('ProjectCard', () => {
  describe('기본 렌더링', () => {
    it('프로젝트 이름과 설명을 렌더링한다', () => {
      // Given / When
      render(<ProjectCard project={activeProject} />)

      // Then
      expect(screen.getByText('Payment Module Refactor')).toBeInTheDocument()
      expect(screen.getByText('PG 연동 전체 리팩토링. PRD 완료, TP 트래킹 진행 중.')).toBeInTheDocument()
    })

    it('최종 수정 시간을 렌더링한다', () => {
      render(<ProjectCard project={activeProject} />)

      expect(screen.getByText('2h ago')).toBeInTheDocument()
    })

    it('이모지를 렌더링하지 않는다', () => {
      render(<ProjectCard project={activeProject} />)

      expect(screen.queryByText('💳')).not.toBeInTheDocument()
    })

    it('진행률 바를 렌더링하지 않는다', () => {
      render(<ProjectCard project={activeProject} />)

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })

  describe('상태별 뱃지', () => {
    it('active 프로젝트에 Active 뱃지를 표시한다', () => {
      render(<ProjectCard project={activeProject} />)
      expect(screen.getByTestId('badge')).toHaveAttribute('data-status', 'active')
    })

    it('planning 프로젝트에 Planning 뱃지를 표시한다', () => {
      render(<ProjectCard project={planningProject} />)
      expect(screen.getByTestId('badge')).toHaveAttribute('data-status', 'planning')
    })

    it('done 프로젝트에 Done 뱃지를 표시한다', () => {
      render(<ProjectCard project={doneProject} />)
      expect(screen.getByTestId('badge')).toHaveAttribute('data-status', 'done')
    })
  })

  describe('클릭 인터랙션', () => {
    it('카드 클릭 시 해당 프로젝트 워크스페이스로 이동한다', async () => {
      // Given
      render(<ProjectCard project={activeProject} />)
      const card = screen.getByRole('button', { name: '프로젝트: Payment Module Refactor' })

      // When
      await userEvent.click(card)

      // Then
      expect(mockPush).toHaveBeenCalledWith('/projects/1')
    })

    it('Enter 키 입력 시 해당 프로젝트 워크스페이스로 이동한다', async () => {
      // Given
      mockPush.mockClear()
      render(<ProjectCard project={activeProject} />)
      const card = screen.getByRole('button', { name: '프로젝트: Payment Module Refactor' })

      // When
      card.focus()
      await userEvent.keyboard('{Enter}')

      // Then
      expect(mockPush).toHaveBeenCalledWith('/projects/1')
    })
  })
})
