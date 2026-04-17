'use client'

import { useState } from 'react'
import type { JiraProduct, JiraTicketRunRecord, JiraTicketRunStatus, JiraTicketType } from '@/types/jira-ticket'

interface JiraTicketFormProps {
  initialHistory: JiraTicketRunRecord[]
}

const STATUS_CONFIG: Record<JiraTicketRunStatus, { label: string; bg: string; color: string }> = {
  running: { label: 'Running', bg: '#FAEEDA', color: '#854F0B' },
  done:    { label: 'Done',    bg: '#E1F5EE', color: '#0F6E56' },
  error:   { label: 'Error',   bg: '#FAECE7', color: '#993C1D' },
}

const TYPE_CONFIG: Record<JiraTicketType, { bg: string; color: string }> = {
  Task: { bg: '#E8EDF8', color: '#1F3F8E' },
  Bug:  { bg: '#FAECE7', color: '#993C1D' },
}

const PRODUCTS: JiraProduct[] = ['ODM', 'Annotation Admin', 'Annotation Tool']

export function JiraTicketForm({ initialHistory }: JiraTicketFormProps) {
  const [product, setProduct]     = useState<JiraProduct | ''>('')
  const [feature, setFeature]     = useState('')
  const [dod, setDod]             = useState('')
  const [sprint, setSprint]       = useState('')
  const [type, setType]           = useState<JiraTicketType>('Task')
  const [history, setHistory]     = useState<JiraTicketRunRecord[]>(initialHistory)

  const canRun = product !== '' && feature.trim() !== '' && dod.trim() !== '' && sprint.trim() !== ''

  const handleRun = () => {
    if (!canRun || !product) return

    const featureFirstLine = feature.trim().split('\n')[0].slice(0, 60)
    const summary = `${product} > ... > ${featureFirstLine}`

    const newRecord: JiraTicketRunRecord = {
      id: `jt-${Date.now()}`,
      summary,
      product,
      sprint: `Onco Sprint ${sprint.trim()}`,
      type,
      requestedAt: nowStr(),
      status: 'running',
      jiraUrl: null,
    }

    setHistory((prev) => [newRecord, ...prev])

    setTimeout(() => {
      setHistory((prev) =>
        prev.map((r) =>
          r.id === newRecord.id
            ? { ...r, status: 'done', jiraUrl: 'https://lunit.atlassian.net/browse/RAD-0000' }
            : r,
        ),
      )
    }, 2500)
  }

  return (
    <div className="max-w-[780px]">
      {/* Config card */}
      <div
        className="rounded-[12px] p-5 mb-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-[14px]"
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
              <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
                Type{' '}
                <span
                  className="text-[10px] font-normal px-[6px] py-[1px] rounded-[6px]"
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
                        ? { background: TYPE_CONFIG[t].bg, color: TYPE_CONFIG[t].color, borderColor: 'transparent' }
                        : { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-md)' }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ width: 120 }}>
              <Field label="Sprint #" required>
                <input
                  type="number"
                  data-testid="sprint-input"
                  value={sprint}
                  onChange={(e) => setSprint(e.target.value)}
                  placeholder="77"
                  min={1}
                  className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-md)',
                    color: 'var(--text-1)',
                  }}
                />
              </Field>
            </div>
          </div>

          {/* Feature */}
          <Field label="Feature Description" required hint="어떤 기능인지, 어떤 페이지에서 어떤 작업이 필요한지 설명하세요.">
            <textarea
              data-testid="feature-input"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="예) 블록 등록 폼에 라이선스 필드를 추가. 라이선스 목록은 드롭다운으로 선택하며, 선택한 값은 POST /api/v1/blocks에 license_id로 전달된다."
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
          <Field label="Definition of Done" required hint="수동태 과거형으로 작성. 예) The license field is added to the block registration form.">
            <textarea
              data-testid="dod-input"
              value={dod}
              onChange={(e) => setDod(e.target.value)}
              placeholder="예) The license dropdown is displayed on the block registration form. The selected license_id is sent to POST /api/v1/blocks."
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

      {/* Run button */}
      <div className="flex justify-end mb-7">
        <button
          type="button"
          data-testid="run-btn"
          onClick={handleRun}
          disabled={!canRun}
          className="flex items-center gap-[6px] px-[22px] py-[10px] rounded-[8px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 16 16" fill="#fff" width="12" height="12">
            <polygon points="4,2 14,8 4,14" />
          </svg>
          Run
        </button>
      </div>

      {/* Run History */}
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-[9px]"
        style={{ color: 'var(--text-3)' }}
      >
        Run History
      </div>

      <div
        className="rounded-[12px] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {['Summary', 'Sprint', 'Type', 'Requested', 'Status', 'Link'].map((col) => (
                <th
                  key={col}
                  className="text-left px-[14px] py-2"
                  style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="py-10 flex flex-col items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" width="28" height="28" className="opacity-30" style={{ color: 'var(--text-3)' }}>
                      <rect x="2" y="5" width="12" height="9" rx="1" />
                      <path d="M2 9h12" />
                      <path d="M5 5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V5" />
                    </svg>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>아직 실행 기록이 없습니다</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>위 Run 버튼을 눌러 시작하세요.</p>
                  </div>
                </td>
              </tr>
            ) : (
              history.map((record, idx) => {
                const cfg = STATUS_CONFIG[record.status]
                const typeCfg = TYPE_CONFIG[record.type]
                return (
                  <tr
                    key={record.id}
                    data-testid={`history-row-${record.id}`}
                    className="transition-colors"
                    style={idx < history.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-[14px] py-[9px] text-[12px]" style={{ color: 'var(--text-2)', maxWidth: 300 }}>
                      <span className="block truncate">{record.summary}</span>
                    </td>
                    <td className="px-[14px] py-[9px] text-[12px] whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
                      {record.sprint}
                    </td>
                    <td className="px-[14px] py-[9px]">
                      <span
                        className="text-[10px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                        style={{ background: typeCfg.bg, color: typeCfg.color }}
                      >
                        {record.type}
                      </span>
                    </td>
                    <td className="px-[14px] py-[9px] text-[12px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                      {record.requestedAt}
                    </td>
                    <td className="px-[14px] py-[9px]">
                      <span
                        data-testid={`history-status-${record.id}`}
                        className="text-[10px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-[14px] py-[9px]">
                      {record.jiraUrl ? (
                        <a
                          href={record.jiraUrl}
                          target="_blank"
                          rel="noreferrer"
                          data-testid={`history-link-${record.id}`}
                          className="text-[11px] underline cursor-pointer"
                          style={{ color: 'var(--accent)' }}
                        >
                          Jira ↗
                        </a>
                      ) : (
                        <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
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
            className="text-[10px] font-normal px-[6px] py-[1px] rounded-[6px]"
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

function nowStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
