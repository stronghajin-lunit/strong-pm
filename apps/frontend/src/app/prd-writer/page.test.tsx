import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PrdWriterPage from './page'
import { useChatStore } from '@/stores/chat-store'

vi.mock('@/stores/ui-store', () => ({
  useUIStore: (sel: (s: { setTopbarTitle: () => void }) => unknown) =>
    sel({ setTopbarTitle: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue(null) }),
}))

beforeEach(() => {
  useChatStore.setState({
    isOpen: false,
    context: null,
    messages: [],
    pendingText: '',
  })
})

describe('PrdWriterPage — 반영 기능', () => {
  describe('테이블 헤더', () => {
    it('Completed 컬럼이 표시된다', () => {
      render(<PrdWriterPage />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('반영 컬럼이 표시된다', () => {
      render(<PrdWriterPage />)
      expect(screen.getByRole('columnheader', { name: '반영' })).toBeInTheDocument()
    })
  })

  describe('completedAt 표시', () => {
    it('completedAt이 있는 레코드에 완료 시각을 표시한다', () => {
      render(<PrdWriterPage />)
      // prd-1 has completedAt: '2026-04-10 11:24'
      expect(screen.getByTestId('completed-at-prd-1')).toHaveTextContent('2026-04-10 11:24')
    })
  })

  describe('반영 버튼 상태', () => {
    it('reflection이 있는 done 레코드는 반영완료 버튼(비활성)을 표시한다', () => {
      render(<PrdWriterPage />)
      // prd-1 has reflection in mock
      const btn = screen.getByTestId('reflect-btn-prd-1')
      expect(btn).toBeDisabled()
      expect(btn).toHaveTextContent('반영완료')
    })

    it('reflection이 없는 done 레코드는 반영 버튼(활성)을 표시한다', () => {
      render(<PrdWriterPage />)
      // prd-2 is done but no reflection
      const btn = screen.getByTestId('reflect-btn-prd-2')
      expect(btn).not.toBeDisabled()
      expect(btn).toHaveTextContent('반영')
    })
  })

  describe('반영 버튼 클릭', () => {
    it('반영 버튼 클릭 시 chat panel이 열린다', () => {
      render(<PrdWriterPage />)
      fireEvent.click(screen.getByTestId('reflect-btn-prd-2'))
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
    })

    it('반영 버튼 클릭 시 prd context로 채팅이 시작된다', () => {
      render(<PrdWriterPage />)
      fireEvent.click(screen.getByTestId('reflect-btn-prd-2'))
      expect(useChatStore.getState().context?.recordId).toBe('prd-2')
      expect(useChatStore.getState().context?.recordType).toBe('prd')
    })
  })

  describe('아코디언', () => {
    it('reflection이 있는 레코드에 expand 버튼이 표시된다', () => {
      render(<PrdWriterPage />)
      expect(screen.getByTestId('expand-btn-prd-1')).toBeInTheDocument()
    })

    it('expand 버튼 클릭 시 반영 노트가 표시된다', () => {
      render(<PrdWriterPage />)
      expect(screen.queryByTestId('reflection-row-prd-1')).not.toBeInTheDocument()
      fireEvent.click(screen.getByTestId('expand-btn-prd-1'))
      expect(screen.getByTestId('reflection-row-prd-1')).toBeInTheDocument()
    })

    it('reflection 내용이 반영 노트에 표시된다', () => {
      render(<PrdWriterPage />)
      fireEvent.click(screen.getByTestId('expand-btn-prd-1'))
      expect(screen.getByTestId('reflection-row-prd-1')).toHaveTextContent(
        '§4.2 환불 정책 소수점 처리 규칙 추가',
      )
    })
  })

  describe('반영 확정 후 상태 변화', () => {
    it('반영 확정 후 반영완료 버튼이 표시된다', () => {
      render(<PrdWriterPage />)
      fireEvent.click(screen.getByTestId('reflect-btn-prd-2'))
      fireEvent.click(screen.getByTestId('chat-confirm-btn'))
      expect(screen.getByTestId('reflect-btn-prd-2')).toBeDisabled()
      expect(screen.getByTestId('reflect-btn-prd-2')).toHaveTextContent('반영완료')
    })

    it('반영 확정 후 chat panel이 닫힌다', () => {
      render(<PrdWriterPage />)
      fireEvent.click(screen.getByTestId('reflect-btn-prd-2'))
      fireEvent.click(screen.getByTestId('chat-confirm-btn'))
      expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument()
    })
  })
})
