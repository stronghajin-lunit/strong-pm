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

    it('Run 클릭 시 onRun이 running temp 레코드와 함께 즉시 호출된다', () => {
      const onRun = vi.fn()
      render(
        <ReleaseNoteForm confluenceFolders={MOCK_CONFLUENCE_FOLDERS} onRun={onRun} />,
      )

      fireEvent.change(screen.getByTestId('jira-version-input'), {
        target: { value: 'AICP Monthly 26-04-01' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))

      expect(onRun).toHaveBeenCalledTimes(1)
      const [temp, promise] = onRun.mock.calls[0] as [{ jiraVersion: string; status: string }, Promise<unknown>]
      expect(temp).toMatchObject({ jiraVersion: 'AICP Monthly 26-04-01', status: 'running' })
      expect(promise).toBeInstanceOf(Promise)
    })

    it('onRun의 promise는 2.5초 후에 Done 레코드로 resolve된다', async () => {
      vi.useFakeTimers()
      const onRun = vi.fn()
      render(
        <ReleaseNoteForm confluenceFolders={MOCK_CONFLUENCE_FOLDERS} onRun={onRun} />,
      )

      fireEvent.change(screen.getByTestId('jira-version-input'), {
        target: { value: 'AICP Monthly 26-04-01' },
      })
      fireEvent.click(screen.getByTestId('run-btn'))

      const [, promise] = onRun.mock.calls[0] as [unknown, Promise<{ status: string; confluenceUrl: string }>]

      act(() => { vi.advanceTimersByTime(2500) })
      const record = await promise
      expect(record).toMatchObject({ jiraVersion: 'AICP Monthly 26-04-01', status: 'done', confluenceUrl: '#' })
    })
  })
})
