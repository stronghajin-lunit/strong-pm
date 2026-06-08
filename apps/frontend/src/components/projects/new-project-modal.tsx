'use client'

import { useEffect, useState } from 'react'
import { fetchProducts } from '@/api/products'
import type { ProductOption } from '@/api/products'
import { useProjectStore } from '@/stores/project-store'

interface NewProjectModalProps {
  onClose: () => void
}

export function NewProjectModal({ onClose }: NewProjectModalProps) {
  const addProject = useProjectStore((s) => s.addProject)

  const [name, setName]               = useState('')
  const [epicLink, setEpicLink]       = useState('')
  const [confluenceLink, setConfluenceLink] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [background, setBackground]   = useState('')
  const [hlr, setHlr]                 = useState('')
  const [products, setProducts]       = useState<ProductOption[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    void fetchProducts().then(setProducts)
  }, [])

  const canSubmit =
    name.trim() !== '' &&
    epicLink.trim() !== '' &&
    confluenceLink.trim() !== '' &&
    selectedProductIds.length > 0

  const toggleProduct = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await addProject({
        name: name.trim(),
        epic_link: epicLink.trim() || undefined,
        confluence_link: confluenceLink.trim() || undefined,
        product_ids: selectedProductIds,
        background: background.trim() || undefined,
        hlr: hlr.trim() || undefined,
      })
      onClose()
    } catch {
      setError('Failed to create project. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      data-testid="new-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        data-testid="new-project-modal"
        className="w-full max-w-[540px] rounded-[16px] p-6 mx-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-semibold tracking-[-0.3px]" style={{ color: 'var(--text-1)' }}>
            New Project
          </h3>
          <button
            type="button"
            data-testid="modal-close-btn"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-3)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Project Name" required>
            <input
              type="text"
              data-testid="project-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Payment Module Refactor"
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
            />
          </Field>

          <Field label="Epic Link" required>
            <input
              type="url"
              data-testid="epic-link-input"
              value={epicLink}
              onChange={(e) => setEpicLink(e.target.value)}
              placeholder="https://lunit.atlassian.net/browse/RAD-000"
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
            />
          </Field>

          <Field
            label="Project Confluence Link"
            required
            hint="Top-level project document. AI will crawl this page and all child pages for project context."
          >
            <input
              type="url"
              data-testid="confluence-link-input"
              value={confluenceLink}
              onChange={(e) => setConfluenceLink(e.target.value)}
              placeholder="https://lunit.atlassian.net/wiki/spaces/..."
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
            />
          </Field>

          {/* Related Product */}
          <div>
            <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
              Related Product{' '}
              <span className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                Required
              </span>
            </label>
            <div className="flex gap-2 flex-wrap" data-testid="related-products">
              {products.map((product) => {
                const selected = selectedProductIds.includes(product.id)
                return (
                  <button
                    key={product.id}
                    type="button"
                    data-testid={`product-toggle-${product.name}`}
                    onClick={() => toggleProduct(product.id)}
                    className="px-3 py-[6px] rounded-[6px] text-[12px] font-medium border transition-all"
                    style={
                      selected
                        ? { background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'transparent' }
                        : { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-md)' }
                    }
                  >
                    {product.name}
                  </button>
                )
              })}
            </div>
          </div>

          <Field label="Background">
            <textarea
              data-testid="background-input"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="Describe the background and reason this project is needed."
              rows={3}
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none resize-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
            />
          </Field>

          <Field label="High Level Requirement">
            <textarea
              data-testid="hlr-input"
              value={hlr}
              onChange={(e) => setHlr(e.target.value)}
              placeholder="Describe the key requirements this project needs to achieve."
              rows={3}
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none resize-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
            />
          </Field>
        </div>

        {error && (
          <p className="text-[12px] mt-3 px-3 py-2 rounded-[8px]" style={{ background: '#FAECE7', color: '#993C1D' }}>
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            data-testid="modal-cancel-btn"
            onClick={onClose}
            className="px-4 py-[8px] rounded-[8px] text-[13px] font-medium transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-md)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="modal-submit-btn"
            onClick={() => { void handleSubmit() }}
            disabled={!canSubmit || isSubmitting}
            className="px-4 py-[8px] rounded-[8px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)' }}
          >
            {isSubmitting ? 'Creating…' : 'Create Project'}
          </button>
        </div>
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
          <span className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            Required
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>{hint}</p>}
    </div>
  )
}
