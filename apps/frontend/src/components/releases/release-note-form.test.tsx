import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReleaseNoteForm } from './release-note-form'
import type { ConfluenceFolderOption } from '@/types/release'

const MOCK_CONFLUENCE_FOLDERS: ConfluenceFolderOption[] = [
  { id: 'default',   label: 'Default (Release Notes root)' },
  { id: 'aicp-2026', label: 'AIP / AICP Release Notes / 2026' },
]

afterEach(() => {
  vi.useRealTimers()
})

describe('ReleaseNoteForm', () => {
  describe('기본 렌더링', () => {
    it('Jira Version 입력 필드와 Run 버튼을 렌더링한다', () => {
      render(
        <ReleaseNoteForm confluenceFolders={MOCK_CONFLUENCE_FOLDERS} />,
      )

      expect(screen.getByTestId('jira-version-input')).toBeInTheDocument()
      expect(screen.getByTestId('confluence-folder-select')).toBeInTheDocument()
      expect(screen.getByTestId('run-btn')).toBeInTheDocument()
    })
  })

  describe('Run 버튼 활성화/비활성화', () => {
    it('Jira Version이 비어있으면 Run 버튼이 비활성화된다', () => {
      render(
        <ReleaseNoteForm confluenceFolders={MOCK_CONFLUENCE_FOLDERS} />,
      )

      expect(screen.getByTestId('run-btn')).toBeDisabled()
    })

    it('Jira Version을 입력하면 Run 버튼이 활성화된다', async () => {
      render(
        <ReleaseNoteForm confluenceFolders={MOCK_CONFLUENCE_FOLDERS} />,
      )

      await userEvent.type(screen.getByTestId('jira-version-input'), 'AICP Monthly 26-04-01')

      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })
  })

  describe('Run 실행', () => {
    it('Run 클릭 시 버튼이 비활성화되고 Running... 텍스트를 표시한다', () => {
      vi.useFakeTimers()
      render(
        <ReleaseNoteForm confluenceFolders={MOCK_CONFLUENCE_FOLDERS} />,
      )

      fireEvent.change(screen.getByTestId('jira-version-input'), {
        target: { value: 'ODM Monthly 26-04-01' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))

      expect(screen.getByTestId('run-btn')).toBeDisabled()
      expect(screen.getByTestId('run-btn')).toHaveTextContent('Running...')
    })

    it('2.5초 후 onRunComplete가 Done 레코드와 함께 호출된다', () => {
      vi.useFakeTimers()
      const onRunComplete = vi.fn()
      render(
        <ReleaseNoteForm confluenceFolders={MOCK_CONFLUENCE_FOLDERS} onRunComplete={onRunComplete} />,
      )

      fireEvent.change(screen.getByTestId('jira-version-input'), {
        target: { value: 'AICP Monthly 26-04-01' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))

      expect(onRunComplete).not.toHaveBeenCalled()

      act(() => { vi.advanceTimersByTime(2500) })

      expect(onRunComplete).toHaveBeenCalledTimes(1)
      expect(onRunComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          jiraVersion: 'AICP Monthly 26-04-01',
          status: 'done',
          confluenceUrl: '#',
        }),
      )
    })

    it('Run 후 1초에는 onRunComplete가 아직 호출되지 않는다', () => {
      vi.useFakeTimers()
      const onRunComplete = vi.fn()
      render(
        <ReleaseNoteForm confluenceFolders={MOCK_CONFLUENCE_FOLDERS} onRunComplete={onRunComplete} />,
      )

      fireEvent.change(screen.getByTestId('jira-version-input'), {
        target: { value: 'AICP Monthly 26-04-01' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))

      act(() => { vi.advanceTimersByTime(1000) })

      expect(onRunComplete).not.toHaveBeenCalled()
    })
  })
})
