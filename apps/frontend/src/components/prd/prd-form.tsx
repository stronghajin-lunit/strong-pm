'use client'

import { useState } from 'react'
import type { PrdRunRecord, PrdRunStatus } from '@/types/prd'

interface PrdFormProps {
  initialHistory: PrdRunRecord[]
}

const STATUS_CONFIG: Record<PrdRunStatus, { label: string; bg: string; color: string }> = {
  running: { label: 'Running', bg: '#FAEEDA', color: '#854F0B' },
  done:    { label: 'Done',    bg: '#E1F5EE', color: '#0F6E56' },
  error:   { label: 'Error',   bg: '#FAECE7', color: '#993C1D' },
}

export function PrdForm({ initialHistory }: PrdFormProps) {
  const [kickoffUrl, setKickoffUrl]     = useState('')
  const [product, setProduct]           = useState('')
  const [feature, setFeature]           = useState('')
  const [targetTeam, setTargetTeam]     = useState('')
  const [prdPageUrl, setPrdPageUrl]     = useState('')
  const [history, setHistory]           = useState<PrdRunRecord[]>(initialHistory)

  const canRun = kickoffUrl.trim() !== '' && product.trim() !== '' && feature.trim() !== '' && targetTeam.trim() !== '' && prdPageUrl.trim() !== ''

  const handleRun = () => {
    if (!canRun) return

    const featureSummary = feature.trim().split('\n')[0].slice(0, 60)
    const newRecord: PrdRunRecord = {
      id: `prd-${Date.now()}`,
      product: product.trim(),
      featureSummary,
      prdPageUrl: prdPageUrl.trim(),
      requestedAt: nowStr(),
      status: 'running',
      confluenceUrl: null,
    }

    setHistory((prev) => [newRecord, ...prev])

    setTimeout(() => {
      setHistory((prev) =>
        prev.map((r) =>
          r.id === newRecord.id
            ? { ...r, status: 'done', confluenceUrl: prdPageUrl.trim() }
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
          {/* Kickoff URL */}
          <Field label="Kickoff Confluence URL" required>
            <input
              type="url"
              data-testid="kickoff-url-input"
              value={kickoffUrl}
              onChange={(e) => setKickoffUrl(e.target.value)}
              placeholder="https://lunit.atlassian.net/wiki/spaces/..."
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
              Kickoff 문서에서 Overview, Scope, Requirements 등을 자동으로 파싱합니다.
            </p>
          </Field>

          {/* Product */}
          <Field label="Product" required>
            <input
              type="text"
              data-testid="product-input"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. ODM, Annotation Admin, Annotation Tool"
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* Feature */}
          <Field label="Feature Description" required hint="3–5줄로 기능을 설명하세요.">
            <textarea
              data-testid="feature-input"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="예) 블록 등록 폼에 라이선스 필드를 추가하고, ODM에서 라이선스를 선택할 수 있도록 합니다. 선택된 라이선스는 API를 통해 검증되며..."
              rows={4}
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none resize-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* Target Team */}
          <Field label="Target Team" required>
            <input
              type="text"
              data-testid="target-team-input"
              value={targetTeam}
              onChange={(e) => setTargetTeam(e.target.value)}
              placeholder="e.g. ODM Team, MDM Team"
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* PRD Page URL */}
          <Field label="PRD Page URL (업데이트 대상)" required hint="기존 PRD Confluence 페이지 URL. 이 페이지에 내용이 채워집니다.">
            <input
              type="url"
              data-testid="prd-page-url-input"
              value={prdPageUrl}
              onChange={(e) => setPrdPageUrl(e.target.value)}
              placeholder="https://lunit.atlassian.net/wiki/spaces/..."
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

      {/* Run button */}
      <div className="flex justify-end mb-7">
        <button
          type="button"
          data-testid="run-btn"
          onClick={handleRun}
          disabled={!canRun}
          className="flex items-center gap-[5px] px-[18px] py-2 rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
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
              {['Product', 'Feature', 'Requested', 'Status', 'Link'].map((col) => (
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
                <td colSpan={5} className="px-[14px] py-[20px] text-center text-[12px]" style={{ color: 'var(--text-3)' }}>
                  실행 기록이 없습니다.
                </td>
              </tr>
            ) : (
              history.map((record, idx) => {
                const cfg = STATUS_CONFIG[record.status]
                return (
                  <tr
                    key={record.id}
                    data-testid={`history-row-${record.id}`}
                    style={idx < history.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                  >
                    <td className="px-[14px] py-[9px] text-[12px] font-medium whitespace-nowrap">
                      {record.product}
                    </td>
                    <td className="px-[14px] py-[9px] text-[12px]" style={{ color: 'var(--text-2)' }}>
                      {record.featureSummary}
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
                      {record.confluenceUrl ? (
                        <a
                          href={record.confluenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          data-testid={`history-link-${record.id}`}
                          className="text-[11px] underline cursor-pointer"
                          style={{ color: 'var(--accent)' }}
                        >
                          Confluence ↗
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
