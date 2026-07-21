import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeatureListForm } from './feature-list-form'
import * as featureListApi from '@/api/feature-list'
import type { Project } from '@/types/project'
import type { FeatureListRun } from '@/api/feature-list'

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Payment Module Refactor',
    description: '',
    status: 'active',
    epicLink: '',
    confluenceLink: '',
    relatedProducts: [],
    updatedAt: '2h ago',
  },
]

const MOCK_RECORD: FeatureListRun = {
  id: 'fl-1',
  projectId: '1',
  projectName: 'Payment Module Refactor',
  prdPageUrl: 'https://confluence.example.com/prd',
  featureListPageUrl: 'https://confluence.example.com/feature-list',
  requestedAt: '2026-06-01 10:00',
  status: 'done',
  confluenceUrl: 'https://confluence.example.com/feature-list-result',
  featureCount: 5,
}

vi.mock('@/stores/project-store', () => ({
  useProjectStore: (selector: (s: { projects: Project[] }) => unknown) =>
    selector({ projects: MOCK_PROJECTS }),
}))

vi.mock('@/api/feature-list', () => ({
  runFeatureList: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(featureListApi.runFeatureList).mockResolvedValue(MOCK_RECORD)
})

async function fillRequiredFields() {
  fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })
  fireEvent.change(screen.getByTestId('prd-page-url-input'), {
    target: { value: 'https://confluence.example.com/prd' },
  })
  fireEvent.change(screen.getByTestId('feature-list-page-url-input'), {
    target: { value: 'https://confluence.example.com/feature-list' },
  })
}

describe('FeatureListForm', () => {
  describe('basic rendering', () => {
    it('shows the Configuration section and Run button', () => {
      render(<FeatureListForm />)
      expect(screen.getByText('Configuration')).toBeInTheDocument()
      expect(screen.getByTestId('run-btn')).toBeInTheDocument()
    })

    it('disables Run until Project, PRD URL, and Feature List URL are all filled', async () => {
      render(<FeatureListForm />)
      expect(screen.getByTestId('run-btn')).toBeDisabled()

      await fillRequiredFields()

      expect(screen.getByTestId('run-btn')).not.toBeDisabled()
    })

    it('hides the Advanced Options panel by default', () => {
      render(<FeatureListForm />)
      expect(screen.queryByText('Reference Documents')).not.toBeInTheDocument()
    })

    it('shows the Advanced Options panel after clicking its header', () => {
      render(<FeatureListForm />)
      fireEvent.click(screen.getByText('Advanced Options'))
      expect(screen.getByText('Reference Documents')).toBeInTheDocument()
      expect(screen.getByText('Context Configuration')).toBeInTheDocument()
    })
  })

  describe('reference documents', () => {
    beforeEach(() => {
      render(<FeatureListForm />)
      fireEvent.click(screen.getByText('Advanced Options'))
    })

    it('adds a new empty reference URL row on "Add Reference"', () => {
      fireEvent.click(screen.getByText('Add Reference'))
      expect(screen.getAllByPlaceholderText('https://lunit.atlassian.net/wiki/spaces/...')).toHaveLength(3)
    })

    it('removes a reference URL row when its remove button is clicked', () => {
      fireEvent.click(screen.getByText('Add Reference'))
      fireEvent.click(screen.getByText('Add Reference'))
      const removeButtons = screen.getAllByRole('button', { name: '' }).filter((b) =>
        b.querySelector('path[d="M3 3l10 10M13 3L3 13"]')
      )
      fireEvent.click(removeButtons[0])
      expect(screen.getAllByPlaceholderText('https://lunit.atlassian.net/wiki/spaces/...')).toHaveLength(3)
    })
  })

  describe('context configuration', () => {
    beforeEach(() => {
      render(<FeatureListForm />)
      fireEvent.click(screen.getByText('Advanced Options'))
    })

    it('defaults Project Summary to Beginning, PRD & Child Pages to Middle, Reference Docs to End', () => {
      const selects = screen.getAllByDisplayValue(/Beginning|Middle|End/)
      expect(selects.map((s) => (s as HTMLSelectElement).value)).toEqual(['beginning', 'middle', 'end'])
    })

    it('swaps positions when two sources are set to the same value', () => {
      const selects = screen.getAllByDisplayValue(/Beginning|Middle|End/)
      // Project Summary (beginning) -> middle, which PRD & Child Pages already holds
      fireEvent.change(selects[0], { target: { value: 'middle' } })

      const updated = screen.getAllByDisplayValue(/Beginning|Middle|End/)
      expect((updated[0] as HTMLSelectElement).value).toBe('middle')
      expect((updated[1] as HTMLSelectElement).value).toBe('beginning')
    })

    it('clamps a below-minimum char limit up to 500 as soon as it is typed', () => {
      const inputs = screen.getAllByRole('spinbutton')
      fireEvent.change(inputs[0], { target: { value: '100' } })
      expect(inputs[0]).toHaveValue(500)
    })

    it('clamps an above-maximum char limit down to 20000 as soon as it is typed', () => {
      const inputs = screen.getAllByRole('spinbutton')
      fireEvent.change(inputs[0], { target: { value: '99999' } })
      expect(inputs[0]).toHaveValue(20000)
    })
  })

  describe('Run', () => {
    it('calls onRun with a running temp record and the in-flight promise', async () => {
      const onRun = vi.fn()
      render(<FeatureListForm onRun={onRun} />)
      await fillRequiredFields()

      fireEvent.click(screen.getByTestId('run-btn'))

      expect(onRun).toHaveBeenCalledTimes(1)
      const [temp, promise] = onRun.mock.calls[0] as [FeatureListRun, Promise<FeatureListRun>]
      expect(temp).toMatchObject({ status: 'running', projectName: 'Payment Module Refactor' })
      expect(promise).toBeInstanceOf(Promise)
    })

    it('sends the default context configuration and an empty reference list when Advanced Options is untouched', async () => {
      render(<FeatureListForm />)
      await fillRequiredFields()

      fireEvent.click(screen.getByTestId('run-btn'))

      expect(featureListApi.runFeatureList).toHaveBeenCalledWith({
        project_id: '1',
        prd_page_url: 'https://confluence.example.com/prd',
        feature_list_page_url: 'https://confluence.example.com/feature-list',
        reference_urls: [],
        context_config: {
          project_summary: { position: 'beginning', char_limit: 1500 },
          prd_pages: { position: 'middle', char_limit: 10000 },
          reference_docs: { position: 'end', char_limit: 10000 },
        },
      })
    })

    it('excludes blank reference URL rows from the request', async () => {
      render(<FeatureListForm />)
      fireEvent.click(screen.getByText('Advanced Options'))
      fireEvent.click(screen.getByText('Add Reference'))
      const refInput = screen
        .getAllByPlaceholderText('https://lunit.atlassian.net/wiki/spaces/...')
        .find((el) => !el.hasAttribute('data-testid'))!
      fireEvent.change(refInput, { target: { value: 'https://confluence.example.com/ref-1' } })
      await fillRequiredFields()

      fireEvent.click(screen.getByTestId('run-btn'))

      expect(featureListApi.runFeatureList).toHaveBeenCalledWith(
        expect.objectContaining({ reference_urls: ['https://confluence.example.com/ref-1'] })
      )
    })
  })
})
