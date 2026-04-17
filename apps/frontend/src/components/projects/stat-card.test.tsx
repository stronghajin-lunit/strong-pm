import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './stat-card'

describe('StatCard', () => {
  describe('기본 렌더링', () => {
    it('label, value, sub 텍스트를 렌더링한다', () => {
      // Given
      render(<StatCard label="Total Projects" value={3} sub="Active 1 · Planning 1 · Done 1" />)

      // Then
      expect(screen.getByText('Total Projects')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('Active 1 · Planning 1 · Done 1')).toBeInTheDocument()
    })

    it('string 타입 value를 렌더링한다', () => {
      render(<StatCard label="Active" value="1" sub="Payment Module Refactor" />)
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('highlight 옵션', () => {
    it('highlight=false(기본값)일 때 teal 색상 클래스가 적용되지 않는다', () => {
      render(<StatCard label="Total" value={3} sub="sub text" />)
      const valueEl = screen.getByText('3')
      expect(valueEl).not.toHaveStyle({ color: 'var(--teal)' })
    })

    it('highlight=true일 때 value에 teal 색상이 적용된다', () => {
      render(<StatCard label="Active" value={1} sub="Payment Module Refactor" highlight />)
      const valueEl = screen.getByText('1')
      expect(valueEl).toHaveStyle({ color: 'var(--teal)' })
    })
  })
})
