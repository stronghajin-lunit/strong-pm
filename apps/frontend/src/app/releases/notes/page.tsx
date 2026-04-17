'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { ReleaseNoteForm } from '@/components/releases/release-note-form'
import {
  MOCK_CONFLUENCE_FOLDERS,
  MOCK_RELEASE_NOTE_HISTORY,
} from '@/mocks/releases'

export default function ReleaseNotesPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)

  useEffect(() => {
    setTopbarTitle('Release Note Creator')
  }, [setTopbarTitle])

  return (
    <div className="px-7 py-6">
      <div className="mb-5">
        <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Release Note Creator</h2>
        <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
          Jira Fix Version을 기반으로 릴리즈 노트를 자동으로 생성하고 Confluence에 업로드합니다.
        </p>
      </div>

      <div className="max-w-[860px]">
        <ReleaseNoteForm
          confluenceFolders={MOCK_CONFLUENCE_FOLDERS}
          initialHistory={MOCK_RELEASE_NOTE_HISTORY}
        />
      </div>
    </div>
  )
}
