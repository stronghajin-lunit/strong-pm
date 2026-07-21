'use client'

import { useEffect, useState } from 'react'
import { getAiSettings, updateAiSettings } from '@/api/ai-settings'
import { useUIStore } from '@/stores/ui-store'
import type { AiSettingItem } from '@/types/settings'

const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-8': 'Claude Opus 4',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
}

export default function AiModelsPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const [settings, setSettings] = useState<AiSettingItem[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [pending, setPending] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTopbarTitle('AI Model Settings')
    void getAiSettings()
      .then((data) => {
        setSettings(data.settings)
        setAvailableModels(data.available_models)
        const initial: Record<string, string> = {}
        data.settings.forEach((s) => { initial[s.feature_key] = s.model })
        setPending(initial)
      })
      .catch(() => setError('Failed to load settings'))
  }, [setTopbarTitle])

  const isDirty = settings.some((s) => pending[s.feature_key] !== s.model)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = await updateAiSettings(pending)
      setSettings(data.settings)
      const updated: Record<string, string> = {}
      data.settings.forEach((s) => { updated[s.feature_key] = s.model })
      setPending(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold" style={{ color: 'var(--text-1)' }}>
          AI Model Settings
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>
          Configure which AI model each feature uses.
        </p>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-[8px] text-[13px]"
          style={{ background: '#FAECE7', color: '#993C1D' }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-[12px] overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {settings.map((item, index) => (
          <div
            key={item.feature_key}
            className="flex items-center justify-between px-5 py-4"
            style={{
              borderBottom: index < settings.length - 1 ? '1px solid var(--border)' : undefined,
              background: 'var(--surface)',
            }}
          >
            <div className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
              {item.label}
            </div>
            <select
              value={pending[item.feature_key] ?? item.model}
              onChange={(e) =>
                setPending((prev) => ({ ...prev, [item.feature_key]: e.target.value }))
              }
              className="text-[13px] rounded-[8px] px-3 py-[6px] outline-none"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-1)',
                minWidth: 200,
              }}
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {MODEL_LABELS[model] ?? model}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="px-5 py-[8px] rounded-[8px] text-[13px] font-medium transition-opacity"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            opacity: saving || !isDirty ? 0.5 : 1,
            cursor: saving || !isDirty ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && (
          <span className="text-[13px]" style={{ color: 'var(--teal)' }}>
            Saved
          </span>
        )}
      </div>
    </div>
  )
}
