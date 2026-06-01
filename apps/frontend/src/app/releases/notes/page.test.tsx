import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReleaseNotesPage from './page'
import { useChatStore } from '@/stores/chat-store'
import type { ReleaseNoteRunRecord } from '@/types/release'

vi.mock('@/stores/ui-store', () => ({
  useUIStore: (sel: (s: { setTopbarTitle: () => void }) => unknown) =>
    sel({ setTopbarTitle: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue(null) }),
}))

const MOCK_HISTORY: ReleaseNoteRunRecord[] = [
  {
    id: 'rn-1',
    jiraVersion: 'AICP Monthly 26-03-01',
    confluenceLocation: 'AIP / AICP Release Notes / 2026',
    requestedAt: '2026-03-21 14:02',
    completedAt: '2026-03-21 14:05',
    status: 'done',
    confluenceUrl: '#',
    reflection: '버그 픽스 항목 서술 방식 변경',
  },
  {
    id: 'rn-2',
    jiraVersion: 'ODM Monthly 26-03-01',
    confluenceLocation: 'AIP / ODM Release Notes / 2026',
    requestedAt: '2026-03-05 09:30',
    completedAt: '2026-03-05 09:33',
    status: 'done',
    confluenceUrl: '#',
  },
  {
    id: 'rn-3',
    jiraVersion: 'AICP Monthly 26-02-01',
    confluenceLocation: 'AIP / AICP Release Notes / 2026',
    requestedAt: '2026-02-28 16:30',
    status: 'error',
    confluenceUrl: null,
  },
]

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
      reflection: '버그 픽스 항목 서술 방식 변경',
    },
    {
      id: 'rn-2',
      jiraVersion: 'ODM Monthly 26-03-01',
      confluenceLocation: 'AIP / ODM Release Notes / 2026',
      requestedAt: '2026-03-05 09:30',
      completedAt: '2026-03-05 09:33',
      status: 'done',
      confluenceUrl: '#',
    },
    {
      id: 'rn-3',
      jiraVersion: 'AICP Monthly 26-02-01',
      confluenceLocation: 'AIP / AICP Release Notes / 2026',
      requestedAt: '2026-02-28 16:30',
      status: 'error',
      confluenceUrl: null,
    },
  ]),
  applyReflection: vi.fn().mockResolvedValue({ id: 'rn-2', reflection: 'test' }),
  runReleaseNote: vi.fn(),
}))

beforeEach(() => {
  useChatStore.setState({
    isOpen: false,
    context: null,
    messages: [],
    pendingText: '',
  })
})

describe('ReleaseNotesPage — 반영 기능', () => {
  describe('테이블 헤더', () => {
    it('Completed 컬럼이 표시된다', async () => {
      render(<ReleaseNotesPage />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('반영 컬럼이 표시된다', async () => {
      render(<ReleaseNotesPage />)
      expect(screen.getByRole('columnheader', { name: '반영' })).toBeInTheDocument()
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
      await waitFor(() => screen.getByTestId('completed-at-rn-3'))
      expect(screen.getByTestId('completed-at-rn-3')).toHaveTextContent('—')
    })
  })

  describe('반영 버튼 상태', () => {
    it('reflection이 있는 done 레코드는 반영완료 버튼(비활성)을 표시한다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('reflect-btn-rn-1'))
      const btn = screen.getByTestId('reflect-btn-rn-1')
      expect(btn).toBeDisabled()
      expect(btn).toHaveTextContent('반영완료')
    })

    it('reflection이 없는 done 레코드는 반영 버튼(활성)을 표시한다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('reflect-btn-rn-2'))
      const btn = screen.getByTestId('reflect-btn-rn-2')
      expect(btn).not.toBeDisabled()
      expect(btn).toHaveTextContent('반영')
    })

    it('error 레코드는 반영 버튼(비활성)을 표시한다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('reflect-btn-rn-3'))
      const btn = screen.getByTestId('reflect-btn-rn-3')
      expect(btn).toBeDisabled()
      expect(btn).toHaveTextContent('반영')
    })
  })

  describe('반영 버튼 클릭', () => {
    it('반영 버튼 클릭 시 chat panel이 열린다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('reflect-btn-rn-2'))
      fireEvent.click(screen.getByTestId('reflect-btn-rn-2'))
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
    })

    it('반영 버튼 클릭 시 release-note context로 채팅이 시작된다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('reflect-btn-rn-2'))
      fireEvent.click(screen.getByTestId('reflect-btn-rn-2'))
      expect(useChatStore.getState().context?.recordId).toBe('rn-2')
      expect(useChatStore.getState().context?.recordType).toBe('release-note')
    })
  })

  describe('아코디언', () => {
    it('reflection이 있는 레코드에 expand 버튼이 표시된다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('expand-btn-rn-1'))
      expect(screen.getByTestId('expand-btn-rn-1')).toBeInTheDocument()
    })

    it('reflection이 없는 레코드에 expand 버튼이 없다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('reflect-btn-rn-2'))
      expect(screen.queryByTestId('expand-btn-rn-2')).not.toBeInTheDocument()
    })

    it('expand 버튼 클릭 시 반영 노트가 표시된다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('expand-btn-rn-1'))
      expect(screen.queryByTestId('reflection-row-rn-1')).not.toBeInTheDocument()
      fireEvent.click(screen.getByTestId('expand-btn-rn-1'))
      expect(screen.getByTestId('reflection-row-rn-1')).toBeInTheDocument()
    })

    it('다시 클릭 시 반영 노트가 숨겨진다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('expand-btn-rn-1'))
      fireEvent.click(screen.getByTestId('expand-btn-rn-1'))
      fireEvent.click(screen.getByTestId('expand-btn-rn-1'))
      expect(screen.queryByTestId('reflection-row-rn-1')).not.toBeInTheDocument()
    })

    it('reflection 내용이 반영 노트에 표시된다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('expand-btn-rn-1'))
      fireEvent.click(screen.getByTestId('expand-btn-rn-1'))
      expect(screen.getByTestId('reflection-row-rn-1')).toHaveTextContent(
        '버그 픽스 항목 서술 방식 변경',
      )
    })
  })

  describe('반영 확정 후 상태 변화', () => {
    it('반영 확정 후 반영완료 버튼이 표시된다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('reflect-btn-rn-2'))
      fireEvent.click(screen.getByTestId('reflect-btn-rn-2'))
      fireEvent.click(screen.getByTestId('chat-confirm-btn'))
      await waitFor(() => {
        expect(screen.getByTestId('reflect-btn-rn-2')).toBeDisabled()
        expect(screen.getByTestId('reflect-btn-rn-2')).toHaveTextContent('반영완료')
      })
    })

    it('반영 확정 후 chat panel이 닫힌다', async () => {
      render(<ReleaseNotesPage />)
      await waitFor(() => screen.getByTestId('reflect-btn-rn-2'))
      fireEvent.click(screen.getByTestId('reflect-btn-rn-2'))
      fireEvent.click(screen.getByTestId('chat-confirm-btn'))
      await waitFor(() => {
        expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument()
      })
    })
  })
})
