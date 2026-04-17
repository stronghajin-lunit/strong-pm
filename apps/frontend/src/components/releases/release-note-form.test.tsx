import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReleaseNoteForm } from './release-note-form'
import type { ConfluenceFolderOption, ReleaseNoteRunRecord } from '@/types/release'

const MOCK_CONFLUENCE_FOLDERS: ConfluenceFolderOption[] = [
  { id: 'default',   label: 'Default (Release Notes root)' },
  { id: 'aicp-2026', label: 'AIP / AICP Release Notes / 2026' },
]

const MOCK_HISTORY: ReleaseNoteRunRecord[] = [
  {
    id: 'rn-1',
    jiraVersion: 'AICP Monthly 26-03-01',
    confluenceLocation: 'AIP / AICP Release Notes / 2026',
    requestedAt: '2026-03-21 14:02',
    status: 'done',
    confluenceUrl: '#',
  },
]

afterEach(() => {
  vi.useRealTimers()
})

describe('ReleaseNoteForm', () => {
  describe('기본 렌더링', () => {
    it('Jira Version 입력 필드와 Run 버튼을 렌더링한다', () => {
      render(
        <ReleaseNoteForm
          confluenceFolders={MOCK_CONFLUENCE_FOLDERS}
          initialHistory={[]}
        />,
      )

      expect(screen.getByTestId('jira-version-input')).toBeInTheDocument()
      expect(screen.getByTestId('confluence-folder-select')).toBeInTheDocument()
      expect(screen.getByTestId('run-btn')).toBeInTheDocument()
    })

    it('초기 히스토리를 렌더링한다', () => {
      render(
        <ReleaseNoteForm
          confluenceFolders={MOCK_CONFLUENCE_FOLDERS}
          initialHistory={MOCK_HISTORY}
        />,
      )

      expect(screen.getByTestId('history-row-rn-1')).toBeInTheDocument()
      expect(screen.getByText('AICP Monthly 26-03-01')).toBeInTheDocument()
    })

    it('Done 상태의 히스토리 항목에 Confluence 링크가 있다', () => {
      render(
        <ReleaseNoteForm
          confluenceFolders={MOCK_CONFLUENCE_FOLDERS}
          initialHistory={MOCK_HISTORY}
        />,
      )

      expect(screen.getByTestId('history-link-rn-1')).toHaveTextContent('Confluence ↗')
    })
  })

  describe('Run 버튼 활성화/비활성화', () => {
    it('Jira Version이 비어있으면 Run 버튼이 비활성화된다', () => {
      render(
        <ReleaseNoteForm
          confluenceFolders={MOCK_CONFLUENCE_FOLDERS}
          initialHistory={[]}
        />,
      )

      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })

    it('Jira Version을 입력하면 Run 버튼이 활성화된다', async () => {
      render(
        <ReleaseNoteForm
          confluenceFolders={MOCK_CONFLUENCE_FOLDERS}
          initialHistory={[]}
        />,
      )

      await userEvent.type(screen.getByTestId('jira-version-input'), 'AICP Monthly 26-04-01')

      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })
  })

  describe('Run 실행', () => {
    it('Run 클릭 시 Running 상태의 새 히스토리 항목이 맨 위에 추가된다', () => {
      vi.useFakeTimers()
      render(
        <ReleaseNoteForm
          confluenceFolders={MOCK_CONFLUENCE_FOLDERS}
          initialHistory={MOCK_HISTORY}
        />,
      )

      fireEvent.change(screen.getByTestId('jira-version-input'), {
        target: { value: 'ODM Monthly 26-04-01' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))

      const rows = screen.getAllByTestId(/^history-row-/)
      expect(rows).toHaveLength(2)
      expect(rows[0].querySelector('[data-testid]')).toHaveTextContent('Running')
    })

    it('2.5초 후 Running → Done으로 상태가 변경되고 Confluence 링크가 생긴다', () => {
      vi.useFakeTimers()
      render(
        <ReleaseNoteForm
          confluenceFolders={MOCK_CONFLUENCE_FOLDERS}
          initialHistory={[]}
        />,
      )

      fireEvent.change(screen.getByTestId('jira-version-input'), {
        target: { value: 'AICP Monthly 26-04-01' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))

      act(() => { vi.advanceTimersByTime(2500) })

      expect(screen.getByTestId(/history-status/)).toHaveTextContent('Done')
      expect(screen.getByTestId(/history-link/)).toHaveTextContent('Confluence ↗')
    })

    it('Run 후 1초에는 아직 Running 상태다', () => {
      vi.useFakeTimers()
      render(
        <ReleaseNoteForm
          confluenceFolders={MOCK_CONFLUENCE_FOLDERS}
          initialHistory={[]}
        />,
      )

      fireEvent.change(screen.getByTestId('jira-version-input'), {
        target: { value: 'AICP Monthly 26-04-01' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))

      act(() => { vi.advanceTimersByTime(1000) })

      expect(screen.getByTestId(/history-status/)).toHaveTextContent('Running')
    })
  })
})
