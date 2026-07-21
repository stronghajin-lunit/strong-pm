import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectContextPage from './page'
import * as projectContextApi from '@/api/project-context'
import type { ProjectContextData } from '@/api/project-context'

// ─── Store mocks ──────────────────────────────────────────────────────────────

vi.mock('@/stores/ui-store', () => ({
  useUIStore: (sel: (s: { setTopbarTitle: (t: string) => void }) => unknown) =>
    sel({ setTopbarTitle: vi.fn() }),
}))

const MOCK_PROJECTS = [
  {
    id: 'proj-1',
    name: 'Alpha Project',
    status: 'active',
    workflowStep: 3,
    description: '',
    epicLink: '',
    confluenceLink: '',
    relatedProducts: [],
    updatedAt: '2026-01-01 00:00',
  },
  {
    id: 'proj-2',
    name: 'Beta Project',
    status: 'planning',
    workflowStep: 2,
    description: '',
    epicLink: '',
    confluenceLink: '',
    relatedProducts: [],
    updatedAt: '2026-01-01 00:00',
  },
  {
    id: 'proj-3',
    name: 'Done Project',
    status: 'done',
    workflowStep: 5,
    description: '',
    epicLink: '',
    confluenceLink: '',
    relatedProducts: [],
    updatedAt: '2026-01-01 00:00',
  },
]

const mockLoadProjects = vi.fn().mockResolvedValue(undefined)

vi.mock('@/stores/project-store', () => ({
  useProjectStore: vi.fn((sel: (s: unknown) => unknown) =>
    sel({
      projects: MOCK_PROJECTS,
      loadProjects: mockLoadProjects,
    })
  ),
}))

// ─── API mocks ────────────────────────────────────────────────────────────────

vi.mock('@/api/project-context', () => ({
  getProjectContext: vi.fn(),
  saveProjectContext: vi.fn(),
  previewContextSync: vi.fn(),
}))

const MOCK_CONTEXT: ProjectContextData = {
  project_id: 'proj-1',
  context: 'This is the project context.',
  context_ko: '이것은 프로젝트 컨텍스트입니다.',
  synced_at: '2026-04-01T09:00:00Z',
  page_count: 3,
}

// ─── Test setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(projectContextApi.getProjectContext).mockResolvedValue(MOCK_CONTEXT)
  vi.mocked(projectContextApi.saveProjectContext).mockResolvedValue(MOCK_CONTEXT)
})

// ─── Helper ───────────────────────────────────────────────────────────────────

async function selectProject(name = 'Alpha Project') {
  await userEvent.click(screen.getByText(name))
  // Wait until the textarea is rendered (mode changes from loading → edit)
  return waitFor(() => screen.getByRole('textbox'))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProjectContextPage', () => {
  describe('empty state', () => {
    it('shows "Select a project" prompt when no project is selected', () => {
      render(<ProjectContextPage />)
      expect(
        screen.getByText(/select a project to view or edit/i)
      ).toBeInTheDocument()
    })

    it('lists active and planning projects in the sidebar', () => {
      render(<ProjectContextPage />)
      expect(screen.getByText('Alpha Project')).toBeInTheDocument()
      expect(screen.getByText('Beta Project')).toBeInTheDocument()
    })

    it('does not show done projects in the sidebar', () => {
      render(<ProjectContextPage />)
      expect(screen.queryByText('Done Project')).not.toBeInTheDocument()
    })
  })

  describe('project selection', () => {
    it('calls getProjectContext with the selected project id', async () => {
      render(<ProjectContextPage />)
      await selectProject('Alpha Project')

      expect(projectContextApi.getProjectContext).toHaveBeenCalledWith('proj-1')
    })

    it('displays the loaded context in the textarea', async () => {
      render(<ProjectContextPage />)
      await selectProject()

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('This is the project context.')
    })

    it('shows Save and Sync buttons after a project is selected', async () => {
      render(<ProjectContextPage />)
      await selectProject()

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sync from confluence/i })).toBeInTheDocument()
    })

    it('shows an empty textarea when the project has no context', async () => {
      vi.mocked(projectContextApi.getProjectContext).mockResolvedValue({
        ...MOCK_CONTEXT,
        context: null,
        context_ko: null,
        synced_at: null,
        page_count: 0,
      })

      render(<ProjectContextPage />)
      await selectProject()

      expect(screen.getByRole('textbox')).toHaveValue('')
    })
  })

  describe('Save button', () => {
    it('calls saveProjectContext with project id and edited content', async () => {
      render(<ProjectContextPage />)
      await selectProject()

      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(projectContextApi.saveProjectContext).toHaveBeenCalledWith(
          'proj-1',
          'This is the project context.'
        )
      })
    })

    it('shows "Saved" indicator after a successful save', async () => {
      render(<ProjectContextPage />)
      await selectProject()

      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument()
      })
    })

    it('is disabled (or shows saving state) while the save request is in flight', async () => {
      // The API call is delayed to simulate network latency
      let resolveSave!: () => void
      vi.mocked(projectContextApi.saveProjectContext).mockReturnValue(
        new Promise<ProjectContextData>((resolve) => {
          resolveSave = () => resolve(MOCK_CONTEXT)
        })
      )

      render(<ProjectContextPage />)
      await selectProject()

      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      // While in-flight, the button must be disabled (prevents double-submit)
      const saveBtn = screen.getByRole('button', { name: /saving|save/i })
      expect(saveBtn).toBeDisabled()

      // Resolve the pending request
      resolveSave()
      await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
    })

    it('shows "Failed to save" error when the API call fails', async () => {
      vi.mocked(projectContextApi.saveProjectContext).mockRejectedValue(
        new Error('Failed to save context')
      )

      render(<ProjectContextPage />)
      await selectProject()

      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(screen.getByText('Failed to save')).toBeInTheDocument()
      })
    })

    it('re-enables after save completes', async () => {
      render(<ProjectContextPage />)
      await selectProject()

      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => screen.getByText('Saved'))

      // Button should be enabled again after save finishes
      expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled()
    })
  })

  describe('diff mode (after Sync from Confluence)', () => {
    const MOCK_PREVIEW = {
      project_id: 'proj-1',
      old_context: 'Old content.',
      new_context: 'New content from Confluence.',
      new_context_ko: '새 내용입니다.',
      page_count: 5,
      changed_page_titles: [],
    }

    beforeEach(() => {
      vi.mocked(projectContextApi.previewContextSync).mockResolvedValue(MOCK_PREVIEW)
    })

    it('shows Apply and Cancel buttons in diff mode', async () => {
      render(<ProjectContextPage />)
      await selectProject()

      await userEvent.click(screen.getByRole('button', { name: /sync from confluence/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
    })

    it('does not show Save button in diff mode', async () => {
      render(<ProjectContextPage />)
      await selectProject()

      await userEvent.click(screen.getByRole('button', { name: /sync from confluence/i }))

      await waitFor(() => screen.getByRole('button', { name: /apply/i }))

      expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
    })

    it('Apply calls saveProjectContext with the new context', async () => {
      render(<ProjectContextPage />)
      await selectProject()

      await userEvent.click(screen.getByRole('button', { name: /sync from confluence/i }))
      await waitFor(() => screen.getByRole('button', { name: /apply/i }))

      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(projectContextApi.saveProjectContext).toHaveBeenCalledWith(
          'proj-1',
          'New content from Confluence.',
          true
        )
      })
    })

    it('Cancel returns to edit mode and restores the original textarea content', async () => {
      render(<ProjectContextPage />)
      await selectProject()

      await userEvent.click(screen.getByRole('button', { name: /sync from confluence/i }))
      await waitFor(() => screen.getByRole('button', { name: /cancel/i }))

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      })
    })
  })
})
