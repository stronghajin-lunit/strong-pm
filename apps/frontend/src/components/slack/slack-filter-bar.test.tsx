import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlackFilterBar } from './slack-filter-bar'
import type { SlackFilter } from '@/types/slack'

describe('SlackFilterBar', () => {
  describe('기본 렌더링', () => {
    it('All / Unlinked / Linked 버튼을 렌더링한다', () => {
      render(<SlackFilterBar activeFilter="all" count={4} onFilter={vi.fn()} />)

      expect(screen.getByTestId('filter-btn-all')).toBeInTheDocument()
      expect(screen.getByTestId('filter-btn-unlinked')).toBeInTheDocument()
      expect(screen.getByTestId('filter-btn-linked')).toBeInTheDocument()
    })

    it('count를 "N messages" 형식으로 표시한다', () => {
      render(<SlackFilterBar activeFilter="all" count={4} onFilter={vi.fn()} />)
      expect(screen.getByTestId('filter-count')).toHaveTextContent('4 messages')
    })

    it('count가 1일 때 단수형 "1 message"로 표시한다', () => {
      render(<SlackFilterBar activeFilter="all" count={1} onFilter={vi.fn()} />)
      expect(screen.getByTestId('filter-count')).toHaveTextContent('1 message')
    })
  })

  describe('활성 필터 표시', () => {
    it('activeFilter에 해당하는 버튼의 aria-pressed가 true다', () => {
      render(<SlackFilterBar activeFilter="unlinked" count={2} onFilter={vi.fn()} />)

      expect(screen.getByTestId('filter-btn-unlinked')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('filter-btn-all')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByTestId('filter-btn-linked')).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('필터 클릭', () => {
    it.each<SlackFilter>(['all', 'unlinked', 'linked'])(
      '%s 버튼 클릭 시 onFilter(%s)를 호출한다',
      async (filterValue) => {
        // Given
        const onFilter = vi.fn()
        render(<SlackFilterBar activeFilter="all" count={4} onFilter={onFilter} />)

        // When
        await userEvent.click(screen.getByTestId(`filter-btn-${filterValue}`))

        // Then
        expect(onFilter).toHaveBeenCalledWith(filterValue)
        expect(onFilter).toHaveBeenCalledTimes(1)
      },
    )
  })
})
