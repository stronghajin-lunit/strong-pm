import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlackItem } from './slack-item'
import type { SlackItem as SlackItemType } from '@/types/slack'
import type { Project } from '@/types/project'

const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'Payment Module Refactor', description: '', status: 'active', epicLink: '', confluenceLink: '', relatedProducts: ['ODM'], updatedAt: '2h ago' },
  { id: '2', name: 'Auth System Redesign',    description: '', status: 'planning', epicLink: '', confluenceLink: '', relatedProducts: ['ODM'], updatedAt: '1d ago' },
]

const linkedItem: SlackItemType = {
  id: 'sq-1',
  user: 'KM',
  name: 'Kang Minjun',
  time: 'Today 10:14',
  text: 'How should TossPayments handle decimal rounding? @strong-pm :strong-pm:',
  messageUrl: 'https://app.slack.com/archives/C04PRIVATE/p1713499800000001',
  threads: [
    { user: 'YJ', name: 'Yoon Jisoo', time: '10:31', text: 'I hit the same issue.' },
  ],
  summary: {
    question: 'TossPayments에서 KRW 부분환불 소수점 처리를 어떻게 해야 하나요?',
    answer: 'PG사별 반올림 정책을 PRD §4.2에 추가. Inicis는 절사, Toss는 반올림.',
  },
  aiProjectId: '1',
  linkedProjectId: '1',
  archived: false,
}

const unlinkedItem: SlackItemType = {
  id: 'sq-4',
  user: 'CW',
  name: 'Choi Wonjun',
  time: 'Yesterday 11:20',
  text: 'Is it feasible to add social login? @strong-pm :strong-pm:',
  messageUrl: 'https://app.slack.com/archives/C04PRIVATE/p1713400800000004',
  threads: [],
  summary: {
    question: '다음 스프린트에서 소셜 로그인 추가가 가능한가요?',
    answer: '현재 Auth 리디자인과 범위 겹침 확인 필요.',
  },
  aiProjectId: null,
  linkedProjectId: null,
  archived: false,
}

describe('SlackItem', () => {
  describe('기본 렌더링', () => {
    it('사용자 이름, 시간, 아바타 이니셜을 렌더링한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} onArchive={vi.fn()} />,
      )

      expect(screen.getByText('Kang Minjun')).toBeInTheDocument()
      expect(screen.getByText('Today 10:14')).toBeInTheDocument()
      expect(screen.getByText('KM')).toBeInTheDocument()
    })

  })

  describe('Slack 원본 링크', () => {
    it('"Slack에서 보기" 링크가 올바른 URL을 가진다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} onArchive={vi.fn()} />,
      )

      const link = screen.getByTestId('slack-item-link-sq-1')
      expect(link).toHaveAttribute('href', linkedItem.messageUrl)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveTextContent('Slack에서 보기')
    })
  })

  describe('AI 요약 (Summary)', () => {
    it('Q/A 요약을 표시한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} onArchive={vi.fn()} />,
      )

      const summary = screen.getByTestId('slack-item-summary-sq-1')
      expect(summary).toHaveTextContent('TossPayments에서 KRW 부분환불 소수점 처리를 어떻게 해야 하나요?')
      expect(summary).toHaveTextContent('PG사별 반올림 정책을 PRD §4.2에 추가')
    })
  })

  describe('AI 프로젝트 추천 태그', () => {
    it('aiProjectId가 있을 때 AI 추천 프로젝트 이름을 표시한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} onArchive={vi.fn()} />,
      )

      const tag = screen.getByTestId('slack-item-ai-tag-sq-1')
      expect(tag).toHaveTextContent('AI suggests: Payment Module Refactor')
    })

    it('aiProjectId가 null일 때 "No clear project match"를 표시한다', () => {
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} linkedProjectId={null} onLink={vi.fn()} onArchive={vi.fn()} />,
      )

      const tag = screen.getByTestId('slack-item-ai-tag-sq-4')
      expect(tag).toHaveTextContent('No clear project match')
    })
  })

  describe('프로젝트 연결 셀렉트', () => {
    it('linkedProjectId가 있을 때 해당 프로젝트가 선택된 상태다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} onArchive={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-select-sq-1')).toHaveValue('1')
    })

    it('linkedProjectId가 null일 때 빈 값이 선택된다', () => {
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} linkedProjectId={null} onLink={vi.fn()} onArchive={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-select-sq-4')).toHaveValue('')
    })

    it('프로젝트 선택 시 onLink를 호출한다', async () => {
      const onLink = vi.fn()
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} linkedProjectId={null} onLink={onLink} onArchive={vi.fn()} />,
      )

      await userEvent.selectOptions(screen.getByTestId('slack-item-select-sq-4'), '1')

      expect(onLink).toHaveBeenCalledWith('sq-4', '1')
    })

    it('"— Select project —" 선택 시 onLink를 null로 호출한다', async () => {
      const onLink = vi.fn()
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={onLink} onArchive={vi.fn()} />,
      )

      await userEvent.selectOptions(screen.getByTestId('slack-item-select-sq-1'), '')

      expect(onLink).toHaveBeenCalledWith('sq-1', null)
    })
  })

  describe('→ PRD Q&A 버튼', () => {
    it('linkedProjectId가 있을 때 버튼이 활성화된다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} onArchive={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-archive-btn-sq-1')).not.toBeDisabled()
    })

    it('linkedProjectId가 null일 때 버튼이 비활성화된다', () => {
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} linkedProjectId={null} onLink={vi.fn()} onArchive={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-archive-btn-sq-4')).toBeDisabled()
    })

    it('버튼 클릭 시 onArchive를 호출한다', async () => {
      const onArchive = vi.fn()
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} onArchive={onArchive} />,
      )

      await userEvent.click(screen.getByTestId('slack-item-archive-btn-sq-1'))

      expect(onArchive).toHaveBeenCalledWith('sq-1')
    })

    it('isArchived=true일 때 버튼이 렌더링되지 않는다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} linkedProjectId="1" onLink={vi.fn()} onArchive={vi.fn()} isArchived />,
      )

      expect(screen.queryByTestId('slack-item-archive-btn-sq-1')).not.toBeInTheDocument()
    })
  })
})
