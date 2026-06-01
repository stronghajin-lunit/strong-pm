import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SprintReportPage from './page'
import { useChatStore } from '@/stores/chat-store'

vi.mock('@/stores/ui-store', () => ({
  useUIStore: (sel: (s: { setTopbarTitle: () => void }) => unknown) =>
    sel({ setTopbarTitle: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue(null) }),
}))

// Reset chat store before each test
beforeEach(() => {
  useChatStore.setState({
    isOpen: false,
    context: null,
    messages: [],
    pendingText: '',
  })
})

describe('SprintReportPage — 반영 기능', () => {
  describe('테이블 헤더', () => {
    it('Completed 컬럼이 표시된다', () => {
      render(<SprintReportPage />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('반영 컬럼이 표시된다', () => {
      render(<SprintReportPage />)
      expect(screen.getByRole('columnheader', { name: '반영' })).toBeInTheDocument()
    })
  })

  describe('completedAt 표시', () => {
    it('completedAt이 있는 레코드에 완료 시각을 표시한다', () => {
      render(<SprintReportPage />)
      // run-1 has completedAt: '2026-03-24 11:23'
      expect(screen.getByTestId('completed-at-run-1')).toHaveTextContent('2026-03-24 11:23')
    })

    it('completedAt이 없는 레코드에 — 를 표시한다', () => {
      render(<SprintReportPage />)
      // run-2 has completedAt
      expect(screen.getByTestId('completed-at-run-2')).toHaveTextContent('2026-03-14 16:08')
    })
  })

  describe('반영 버튼 상태', () => {
    it('reflection이 있는 done 레코드는 반영완료 버튼(비활성)을 표시한다', () => {
      render(<SprintReportPage />)
      // run-1 has reflection in mock
      const btn = screen.getByTestId('reflect-btn-run-1')
      expect(btn).toBeDisabled()
      expect(btn).toHaveTextContent('반영완료')
    })

    it('reflection이 없는 done 레코드는 반영 버튼(활성)을 표시한다', () => {
      render(<SprintReportPage />)
      // run-2 is done but has no reflection
      const btn = screen.getByTestId('reflect-btn-run-2')
      expect(btn).not.toBeDisabled()
      expect(btn).toHaveTextContent('반영')
    })
  })

  describe('반영 버튼 클릭', () => {
    it('반영 버튼 클릭 시 chat panel이 열린다', () => {
      render(<SprintReportPage />)
      fireEvent.click(screen.getByTestId('reflect-btn-run-2'))
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
    })

    it('반영 버튼 클릭 시 올바른 context로 채팅이 시작된다', () => {
      render(<SprintReportPage />)
      fireEvent.click(screen.getByTestId('reflect-btn-run-2'))
      expect(useChatStore.getState().context?.recordId).toBe('run-2')
      expect(useChatStore.getState().context?.recordType).toBe('sprint')
    })
  })

  describe('아코디언', () => {
    it('reflection이 있는 레코드에 expand 버튼이 표시된다', () => {
      render(<SprintReportPage />)
      expect(screen.getByTestId('expand-btn-run-1')).toBeInTheDocument()
    })

    it('reflection이 없는 레코드에 expand 버튼이 없다', () => {
      render(<SprintReportPage />)
      expect(screen.queryByTestId('expand-btn-run-2')).not.toBeInTheDocument()
    })

    it('expand 버튼 클릭 시 반영 노트가 표시된다', () => {
      render(<SprintReportPage />)
      expect(screen.queryByTestId('reflection-row-run-1')).not.toBeInTheDocument()
      fireEvent.click(screen.getByTestId('expand-btn-run-1'))
      expect(screen.getByTestId('reflection-row-run-1')).toBeInTheDocument()
    })

    it('다시 클릭 시 반영 노트가 숨겨진다', () => {
      render(<SprintReportPage />)
      fireEvent.click(screen.getByTestId('expand-btn-run-1'))
      expect(screen.getByTestId('reflection-row-run-1')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('expand-btn-run-1'))
      expect(screen.queryByTestId('reflection-row-run-1')).not.toBeInTheDocument()
    })

    it('reflection 내용이 반영 노트에 표시된다', () => {
      render(<SprintReportPage />)
      fireEvent.click(screen.getByTestId('expand-btn-run-1'))
      expect(screen.getByTestId('reflection-row-run-1')).toHaveTextContent(
        '§3 결제 흐름에 엣지 케이스(부분 취소 후 재결제) 추가',
      )
    })
  })

  describe('반영 확정 후 상태 변화', () => {
    it('반영 확정 후 해당 레코드에 반영완료 버튼이 표시된다', () => {
      render(<SprintReportPage />)
      fireEvent.click(screen.getByTestId('reflect-btn-run-2'))
      fireEvent.click(screen.getByTestId('chat-confirm-btn'))
      expect(screen.getByTestId('reflect-btn-run-2')).toBeDisabled()
      expect(screen.getByTestId('reflect-btn-run-2')).toHaveTextContent('반영완료')
    })

    it('반영 확정 후 아코디언이 자동으로 열린다', () => {
      render(<SprintReportPage />)
      fireEvent.click(screen.getByTestId('reflect-btn-run-2'))
      fireEvent.click(screen.getByTestId('chat-confirm-btn'))
      expect(screen.getByTestId('reflection-row-run-2')).toBeInTheDocument()
    })

    it('반영 확정 후 chat panel이 닫힌다', () => {
      render(<SprintReportPage />)
      fireEvent.click(screen.getByTestId('reflect-btn-run-2'))
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('chat-confirm-btn'))
      expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument()
    })
  })
})
