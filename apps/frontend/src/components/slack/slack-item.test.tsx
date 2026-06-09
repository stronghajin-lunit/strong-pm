import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlackItem } from './slack-item'
import type { SlackItem as SlackItemType } from '@/types/slack'
import type { Project } from '@/types/project'

const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'Payment Module Refactor', description: '', status: 'active', epicLink: '', confluenceLink: '', relatedProducts: ['ODM'], updatedAt: '2h ago' },
  { id: '2', name: 'Auth System Redesign', description: '', status: 'planning', epicLink: '', confluenceLink: '', relatedProducts: ['ODM'], updatedAt: '1d ago' },
]

const linkedItem: SlackItemType = {
  id: 1,
  slackChannelId: 'C08SHL6TE74',
  slackChannelName: 'private-onco-squad',
  slackMessageTs: '1713499800.000001',
  slackMessageUrl: 'https://lunit.slack.com/archives/C08SHL6TE74/p1713499800000001',
  senderName: 'Kang Minjun',
  question: 'TossPayments에서 KRW 부분환불 소수점 처리를 어떻게 해야 하나요?',
  answer: 'PG사별 반올림 정책을 PRD §4.2에 추가. Inicis는 절사, Toss는 반올림.',
  answerDate: '2026-06-01',
  aiProjectId: 1,
  linkedProjectId: 1,
  archived: false,
}

const unlinkedItem: SlackItemType = {
  id: 4,
  slackChannelId: 'C08SHL6TE74',
  slackChannelName: 'private-onco-squad',
  slackMessageTs: '1713400800.000004',
  slackMessageUrl: 'https://lunit.slack.com/archives/C08SHL6TE74/p1713400800000004',
  senderName: 'Choi Wonjun',
  question: '다음 스프린트에서 소셜 로그인 추가가 가능한가요?',
  answer: '현재 Auth 리디자인과 범위 겹침 확인 필요.',
  answerDate: '2026-05-30',
  aiProjectId: null,
  linkedProjectId: null,
  archived: false,
}

describe('SlackItem', () => {
  describe('기본 렌더링', () => {
    it('사용자 이름, 날짜, 아바타 이니셜을 렌더링한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} />,
      )

      expect(screen.getByText('Kang Minjun')).toBeInTheDocument()
      expect(screen.getByText('2026-06-01')).toBeInTheDocument()
      expect(screen.getByText('K')).toBeInTheDocument()
    })
  })

  describe('Slack 원본 링크', () => {
    it('"Slack에서 보기" 링크가 올바른 URL을 가진다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} />,
      )

      const link = screen.getByTestId('slack-item-link-1')
      expect(link).toHaveAttribute('href', linkedItem.slackMessageUrl)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveTextContent('Slack에서 보기')
    })
  })

  describe('AI 요약 (Summary)', () => {
    it('Q/A 요약을 표시한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} />,
      )

      const summary = screen.getByTestId('slack-item-summary-1')
      expect(summary).toHaveTextContent('TossPayments에서 KRW 부분환불 소수점 처리를 어떻게 해야 하나요?')
      expect(summary).toHaveTextContent('PG사별 반올림 정책을 PRD §4.2에 추가')
    })
  })

  describe('AI 프로젝트 추천 태그', () => {
    it('aiProjectId가 있을 때 AI 추천 프로젝트 이름을 표시한다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} />,
      )

      const tag = screen.getByTestId('slack-item-ai-tag-1')
      expect(tag).toHaveTextContent('AI suggests: Payment Module Refactor')
    })

    it('aiProjectId가 null일 때 "No clear project match"를 표시한다', () => {
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} />,
      )

      const tag = screen.getByTestId('slack-item-ai-tag-4')
      expect(tag).toHaveTextContent('No clear project match')
    })
  })

  describe('프로젝트 연결 셀렉트', () => {
    it('linkedProjectId가 있을 때 해당 프로젝트가 선택된 상태다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-select-1')).toHaveValue('1')
    })

    it('linkedProjectId가 null일 때 빈 값이 선택된다', () => {
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-select-4')).toHaveValue('')
    })

    it('프로젝트 선택 시 onLink를 호출한다', async () => {
      const onLink = vi.fn()
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} onLink={onLink} onPushToPrd={vi.fn()} />,
      )

      await userEvent.selectOptions(screen.getByTestId('slack-item-select-4'), '1')

      expect(onLink).toHaveBeenCalledWith(4, 1)
    })

    it('"— Select project —" 선택 시 onLink를 null로 호출한다', async () => {
      const onLink = vi.fn()
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} onLink={onLink} onPushToPrd={vi.fn()} />,
      )

      await userEvent.selectOptions(screen.getByTestId('slack-item-select-1'), '')

      expect(onLink).toHaveBeenCalledWith(1, null)
    })
  })

  describe('→ PRD Q&A 버튼', () => {
    it('linkedProjectId가 있을 때 버튼이 활성화된다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-archive-btn-1')).not.toBeDisabled()
    })

    it('linkedProjectId가 null일 때 버튼이 비활성화된다', () => {
      render(
        <SlackItem item={unlinkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} />,
      )

      expect(screen.getByTestId('slack-item-archive-btn-4')).toBeDisabled()
    })

    it('버튼 클릭 시 onPushToPrd를 호출한다', async () => {
      const onPushToPrd = vi.fn()
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={onPushToPrd} />,
      )

      await userEvent.click(screen.getByTestId('slack-item-archive-btn-1'))

      expect(onPushToPrd).toHaveBeenCalledWith(1)
    })

    it('isArchived=true일 때 버튼이 렌더링되지 않는다', () => {
      render(
        <SlackItem item={linkedItem} projects={MOCK_PROJECTS} onLink={vi.fn()} onPushToPrd={vi.fn()} isArchived />,
      )

      expect(screen.queryByTestId('slack-item-archive-btn-1')).not.toBeInTheDocument()
    })
  })
})
