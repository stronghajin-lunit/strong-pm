'use client'

import { useEffect, useState } from 'react'
import { fetchJiraSprints, runJiraTicket } from '@/api/jira-tickets'
import type { JiraSprintOption } from '@/api/jira-tickets'
import type { JiraProduct, JiraTicketRunRecord, JiraTicketType } from '@/types/jira-ticket'

interface JiraTicketFormProps {
  onRunComplete?: (record: JiraTicketRunRecord) => void
}

const TYPE_CONFIG: Record<JiraTicketType, { bg: string; color: string }> = {
  Task: { bg: '#E8EDF8', color: '#1F3F8E' },
  Bug:  { bg: '#FAECE7', color: '#993C1D' },
}

const PRODUCTS: JiraProduct[] = ['ODM', 'Annotation Admin', 'Annotation Tool']

export function JiraTicketForm({ onRunComplete }: JiraTicketFormProps) {
  const [product, setProduct]             = useState<JiraProduct | ''>('')
  const [feature, setFeature]             = useState('')
  const [dod, setDod]                     = useState('')
  const [selectedSprint, setSelectedSprint] = useState<JiraSprintOption | null>(null)
  const [type, setType]                   = useState<JiraTicketType>('Task')
  const [isRunning, setIsRunning]         = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [sprintOptions, setSprintOptions] = useState<JiraSprintOption[]>([])
  const [sprintsLoading, setSprintsLoading] = useState(false)

  useEffect(() => {
    if (!product) {
      setSprintOptions([])
      setSelectedSprint(null)
      return
    }
    setSprintsLoading(true)
    setSelectedSprint(null)
    fetchJiraSprints(product)
      .then(setSprintOptions)
      .catch(() => setSprintOptions([]))
      .finally(() => setSprintsLoading(false))
  }, [product])

  const canRun =
    product !== '' && feature.trim() !== '' && dod.trim() !== '' && selectedSprint !== null

  const handleRun = async () => {
    if (!canRun || !product || !selectedSprint) return
    setIsRunning(true)
    setError(null)
    try {
      const record = await runJiraTicket({
        product,
        sprint_id: selectedSprint.sprintId,
        sprint: selectedSprint.label,
        type,
        feature_description: feature,
        definition_of_done: dod,
      })
      onRunComplete?.(record)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-[780px]">
      {/* Config card */}
      <div
        className="rounded-[12px] p-5 mb-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-[14px]"
          style={{ color: 'var(--text-3)' }}
        >
          Configuration
        </div>

        <div className="flex flex-col gap-4">
          {/* Product + Type row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Field label="Product" required>
                <select
                  data-testid="product-select"
                  value={product}
                  onChange={(e) => setProduct(e.target.value as JiraProduct | '')}
                  className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-md)',
                    color: product === '' ? 'var(--text-3)' : 'var(--text-1)',
                  }}
                >
                  <option value="">— Select product —</option>
                  {PRODUCTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ width: 160 }}>
              <label
                className="block text-[11px] font-semibold mb-[5px]"
                style={{ color: 'var(--text-2)' }}
              >
                Type{' '}
                <span
                  className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                >
                  Required
                </span>
              </label>
              <div className="flex gap-2">
                {(['Task', 'Bug'] as JiraTicketType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-testid={`type-btn-${t.toLowerCase()}`}
                    onClick={() => setType(t)}
                    className="flex-1 py-2 rounded-[6px] text-[13px] font-medium border transition-all"
                    style={
                      type === t
                        ? {
                            background: TYPE_CONFIG[t].bg,
                            color: TYPE_CONFIG[t].color,
                            borderColor: 'transparent',
                          }
                        : {
                            background: 'var(--surface-2)',
                            color: 'var(--text-2)',
                            border: '1px solid var(--border-md)',
                          }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ width: 220 }}>
              <Field label="Sprint" required>
                <select
                  data-testid="sprint-select"
                  value={selectedSprint?.sprintId ?? ''}
                  onChange={(e) => {
                    const found = sprintOptions.find((s) => s.sprintId === Number(e.target.value))
                    setSelectedSprint(found ?? null)
                  }}
                  disabled={product === '' || sprintsLoading}
                  className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none disabled:opacity-50"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-md)',
                    color: !selectedSprint ? 'var(--text-3)' : 'var(--text-1)',
                  }}
                >
                  <option value="">{sprintsLoading ? 'Loading…' : '— Select sprint —'}</option>
                  {sprintOptions.map((s) => (
                    <option key={s.sprintId} value={s.sprintId}>{s.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Feature */}
          <Field
            label="Feature Description"
            required
            hint="Describe what the feature does and what work is needed on which page."
          >
            <textarea
              data-testid="feature-input"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="e.g. Add a license field to the block registration form."
              rows={3}
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none resize-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* DoD */}
          <Field
            label="Definition of Done"
            required
            hint="Write in passive past tense. e.g. The license field is added to the block registration form."
          >
            <textarea
              data-testid="dod-input"
              value={dod}
              onChange={(e) => setDod(e.target.value)}
              placeholder="e.g. The license dropdown is displayed on the block registration form."
              rows={3}
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none resize-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          className="text-[12px] mb-3 px-3 py-2 rounded-[8px]"
          style={{ background: '#FAECE7', color: '#993C1D' }}
          data-testid="run-error"
        >
          {error}
        </p>
      )}

      {/* Run button */}
      <div className="flex justify-end">
        <button
          type="button"
          data-testid="run-btn"
          onClick={() => { void handleRun() }}
          disabled={!canRun || isRunning}
          className="flex items-center gap-[6px] px-[22px] py-[10px] rounded-[8px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 16 16" fill="#fff" width="12" height="12">
            <polygon points="4,2 14,8 4,14" />
          </svg>
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}

function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
        {label}{' '}
        {required && (
          <span
            className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            Required
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}
