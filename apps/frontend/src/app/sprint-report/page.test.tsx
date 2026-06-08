import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SprintReportPage from './page'
import type { SprintRunRecord } from '@/types/sprint'

vi.mock('@/stores/ui-store', () => ({
  useUIStore: (sel: (s: { setTopbarTitle: () => void }) => unknown) =>
    sel({ setTopbarTitle: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue(null) }),
}))

vi.mock('@/api/sprint-reports', () => ({
  fetchSprintOptions: vi.fn().mockResolvedValue([]),
  fetchSprintReports: vi.fn().mockResolvedValue([
    {
      id: 'sr-1',
      sprintLabel: 'Onco Sprint 79',
      requestedAt: '2026-05-20 10:00',
      completedAt: '2026-05-20 10:03',
      status: 'done',
      confluenceUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/99999',
    },
    {
      id: 'sr-2',
      sprintLabel: 'Onco Sprint 78',
      requestedAt: '2026-05-06 14:30',
      completedAt: undefined,
      status: 'error',
      confluenceUrl: null,
    },
  ] as SprintRunRecord[]),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SprintReportPage', () => {
  describe('테이블 헤더', () => {
    it('Completed 컬럼이 표시된다', () => {
      render(<SprintReportPage />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('반영 컬럼이 없다', () => {
      render(<SprintReportPage />)
      expect(screen.queryByRole('columnheader', { name: '반영' })).not.toBeInTheDocument()
    })
  })

  describe('이력 표시', () => {
    it('스프린트 레이블을 표시한다', async () => {
      render(<SprintReportPage />)
      await waitFor(() => screen.getByTestId('history-row-sr-1'))
      expect(screen.getByTestId('history-row-sr-1')).toHaveTextContent('Onco Sprint 79')
    })

    it('completedAt이 있는 레코드에 완료 시각을 표시한다', async () => {
      render(<SprintReportPage />)
      await waitFor(() => screen.getByTestId('completed-at-sr-1'))
      expect(screen.getByTestId('completed-at-sr-1')).toHaveTextContent('2026-05-20 10:03')
    })

    it('completedAt이 없는 레코드에 — 를 표시한다', async () => {
      render(<SprintReportPage />)
      await waitFor(() => screen.getByTestId('completed-at-sr-2'))
      expect(screen.getByTestId('completed-at-sr-2')).toHaveTextContent('—')
    })

    it('done 레코드에 Confluence 링크를 표시한다', async () => {
      render(<SprintReportPage />)
      await waitFor(() => screen.getByTestId('history-link-sr-1'))
      expect(screen.getByTestId('history-link-sr-1')).toHaveTextContent('Confluence ↗')
    })

    it('error 레코드에 — 를 표시한다', async () => {
      render(<SprintReportPage />)
      await waitFor(() => screen.getByTestId('history-status-sr-2'))
      expect(screen.getByTestId('history-status-sr-2')).toHaveTextContent('Error')
    })
  })
})
