import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlackItem } from './slack-item'
import type { SlackItem as SlackItemType } from '@/types/slack'
import type { Project } from '@/types/project'

const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'Payment Module Refactor', description: '', status: 'active', emoji: '💳', progress: 58, updatedAt: '2h ago' },
  { id: '2', name: 'Auth System Redesign',    description: '', status: 'planning', emoji: '🔐', progress: 12, updatedAt: '1d ago' },
]

const linkedItem: SlackItemType = {
  id: 'sq-1',
  user: 'KM',
  name: 'Kang Minjun',
  time: 'Today 10:14',
  text: 'How should TossPayments handle decimal rounding? @strong-pm :strong-pm:',
  threads: [
    { user: 'YJ', name: 'Yoon Jisoo', time: '10:31', text: 'I hit the same issue.' },
  ],
  aiProjectId: '1',
  linkedProjectId: '1',
}

const unlinkedItem: SlackItemType = {
  id: 'sq-4',
  user: 'CW',
  name: 'Choi Wonjun',
  time: 'Yesterday 11:20',
  text: 'Is it feasible to add social login? @strong-pm :strong-pm:',
  threads: [],
  aiProjectId: null,
  linkedProjectId: null,
}

describe('SlackItem', () => {
  describe('기본 렌더링', () => {
    it('사용자 이름, 시간, 아바타 이니셜을 렌더링한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} />,
      )

      expect(screen.getByText('Kang Minjun')).toBeInTheDocument()
      expect(screen.getByText('Today 10:14')).toBeInTheDocument()
      expect(screen.getByText('KM')).toBeInTheDocument()
    })

    it('@strong-pm 멘션을 강조 표시한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} />,
      )

      const body = screen.getByTestId('slack-item-body-sq-1')
      expect(within(body).getByText('@strong-pm')).toBeInTheDocument()
    })

    it('스레드 답글을 렌더링한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} />,
      )

      expect(screen.getByText('Yoon Jisoo')).toBeInTheDocument()
      expect(screen.getByText('I hit the same issue.')).toBeInTheDocument()
    })

    it('스레드가 없을 때 스레드 영역을 렌더링하지 않는다', () => {
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} linkedProjectId={null} onLink={vi.fn()} />,
      )

      expect(screen.queryByText('Yoon Jisoo')).not.toBeInTheDocument()
    })
  })

  describe('AI 프로젝트 추천 태그', () => {
    it('aiProjectId가 있을 때 AI 추천 프로젝트 이름을 표시한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} />,
      )

      const tag = screen.getByTestId('slack-item-ai-tag-sq-1')
      expect(tag).toHaveTextContent('AI suggests: Payment Module Refactor')
    })

    it('aiProjectId가 null일 때 "No clear project match"를 표시한다', () => {
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} linkedProjectId={null} onLink={vi.fn()} />,
      )

      const tag = screen.getByTestId('slack-item-ai-tag-sq-4')
      expect(tag).toHaveTextContent('No clear project match')
    })
  })

  describe('프로젝트 연결 셀렉트', () => {
    it('linkedProjectId가 있을 때 해당 프로젝트가 선택된 상태다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-select-sq-1')).toHaveValue('1')
    })

    it('linkedProjectId가 null일 때 빈 값이 선택된다', () => {
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} linkedProjectId={null} onLink={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-select-sq-4')).toHaveValue('')
    })

    it('프로젝트 선택 시 onLink를 호출한다', async () => {
      // Given
      const onLink = vi.fn()
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} linkedProjectId={null} onLink={onLink} />,
      )

      // When
      await userEvent.selectOptions(screen.getByTestId('slack-item-select-sq-4'), '1')

      // Then
      expect(onLink).toHaveBeenCalledWith('sq-4', '1')
    })

    it('"— Select project —" 선택 시 onLink를 null로 호출한다', async () => {
      // Given
      const onLink = vi.fn()
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={onLink} />,
      )

      // When
      await userEvent.selectOptions(screen.getByTestId('slack-item-select-sq-1'), '')

      // Then
      expect(onLink).toHaveBeenCalledWith('sq-1', null)
    })
  })
})
