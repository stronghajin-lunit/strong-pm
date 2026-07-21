import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AiModelsPage from './page'
import * as aiSettingsApi from '@/api/ai-settings'
import type { AiSettingsResponse } from '@/types/settings'

const mockSetTopbarTitle = vi.fn()

vi.mock('@/stores/ui-store', () => ({
  useUIStore: (sel: (s: { setTopbarTitle: (t: string) => void }) => unknown) =>
    sel({ setTopbarTitle: mockSetTopbarTitle }),
}))

vi.mock('@/api/ai-settings', () => ({
  getAiSettings: vi.fn(),
  updateAiSettings: vi.fn(),
}))

const MOCK_SETTINGS: AiSettingsResponse = {
  settings: [
    { feature_key: 'prd_writer', label: 'PRD Writer', model: 'claude-sonnet-4-6', default_model: 'claude-sonnet-4-6' },
    { feature_key: 'action_phrase', label: 'Action Phrase', model: 'claude-haiku-4-5-20251001', default_model: 'claude-haiku-4-5-20251001' },
  ],
  available_models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(aiSettingsApi.getAiSettings).mockResolvedValue(MOCK_SETTINGS)
  vi.mocked(aiSettingsApi.updateAiSettings).mockResolvedValue(MOCK_SETTINGS)
})

describe('AiModelsPage', () => {
  it('loads and displays each feature with its configured model', async () => {
    render(<AiModelsPage />)

    expect(await screen.findByText('PRD Writer')).toBeInTheDocument()
    expect(screen.getByText('Action Phrase')).toBeInTheDocument()
  })

  it('shows an error message when settings fail to load', async () => {
    vi.mocked(aiSettingsApi.getAiSettings).mockRejectedValue(new Error('network error'))

    render(<AiModelsPage />)

    expect(await screen.findByText('Failed to load settings')).toBeInTheDocument()
  })

  it('disables Save Changes until a model is changed', async () => {
    render(<AiModelsPage />)
    await screen.findByText('PRD Writer')

    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('enables Save Changes after a model selection changes', async () => {
    render(<AiModelsPage />)
    await screen.findByText('PRD Writer')

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'claude-opus-4-8' } })

    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
  })

  it('calls updateAiSettings with the pending model map on Save', async () => {
    render(<AiModelsPage />)
    await screen.findByText('PRD Writer')

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'claude-opus-4-8' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(aiSettingsApi.updateAiSettings).toHaveBeenCalledWith({
        prd_writer: 'claude-opus-4-8',
        action_phrase: 'claude-haiku-4-5-20251001',
      })
    })
  })

  it('shows a "Saved" indicator after a successful save', async () => {
    render(<AiModelsPage />)
    await screen.findByText('PRD Writer')

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'claude-opus-4-8' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
  })

  it('shows an error message when saving fails', async () => {
    vi.mocked(aiSettingsApi.updateAiSettings).mockRejectedValue(new Error('save failed'))

    render(<AiModelsPage />)
    await screen.findByText('PRD Writer')

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'claude-opus-4-8' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.getByText('Failed to save settings')).toBeInTheDocument())
  })
})
