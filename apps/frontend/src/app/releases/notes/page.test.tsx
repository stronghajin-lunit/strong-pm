import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ReleaseNotesPage from './page'
import type { ReleaseNoteRunRecord } from '@/types/release'

vi.mock('@/stores/ui-store', () => ({
  useUIStore: (sel: (s: { setTopbarTitle: () => void }) => unknown) =>
    sel({ setTopbarTitle: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue(null) }),
}))

vi.mock('@/api/releases', () => ({
  fetchJiraVersions: vi.fn().mockResolvedValue([]),
  fetchReleaseNotes: vi.fn().mockResolvedValue([
    {
      id: 'rn-1',
      jiraVersion: 'AICP Monthly 26-03-01',
      confluenceLocation: 'AIP / AICP Release Notes / 2026',
      requestedAt: '2026-03-21 14:02',
      completedAt: '2026-03-21 14:05',
      status: 'done',
      confluenceUrl: '#',
    },
    {
      id: 'rn-2',
      jiraVersion: 'ODM Monthly 26-03-01',
      confluenceLocation: 'AIP / ODM Release Notes / 2026',
      requestedAt: '2026-03-05 09:30',
      completedAt: undefined,
      status: 'error',
      confluenceUrl: null,
    },
  ] as ReleaseNoteRunRecord[]),
  runReleaseNote: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReleaseNotesPage', () => {
  describe('테이블 헤더', () => {
    it('Completed 컬럼이 표시된다', async () => {
      render(<ReleaseNotesPage />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('반영 컬럼이 없다', () => {
      render(<ReleaseNotesPage />)
      expect(screen.queryByRole('columnheader', { name: '반영' })).not.toBeInTheDocument()
    })
  })

  describe('completedAt 표시', () => {
    it('completedAt이 있는 레코드에 완료 시각을 표시한다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('completed-at-rn-1'))
      expect(screen.getByTestId('completed-at-rn-1')).toHaveTextContent('2026-03-21 14:05')
    })

    it('completedAt이 없는 레코드에 — 를 표시한다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('completed-at-rn-2'))
      expect(screen.getByTestId('completed-at-rn-2')).toHaveTextContent('—')
    })
  })

  describe('상태 배지', () => {
    it('done 레코드에 Done 배지를 표시한다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('history-status-rn-1'))
      expect(screen.getByTestId('history-status-rn-1')).toHaveTextContent('Done')
    })

    it('error 레코드에 Error 배지를 표시한다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('history-status-rn-2'))
      expect(screen.getByTestId('history-status-rn-2')).toHaveTextContent('Error')
    })
  })
})
