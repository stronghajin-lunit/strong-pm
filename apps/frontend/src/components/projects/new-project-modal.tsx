'use client'

import { useState } from 'react'
import type { Project, RelatedProduct } from '@/types/project'
import { useProjectStore } from '@/stores/project-store'

interface NewProjectModalProps {
  onClose: () => void
}

const PRODUCTS: RelatedProduct[] = ['ODM', 'Annotation Admin', 'Annotation Tool']

export function NewProjectModal({ onClose }: NewProjectModalProps) {
  const addProject = useProjectStore((s) => s.addProject)

  const [name, setName]                         = useState('')
  const [epicLink, setEpicLink]                 = useState('')
  const [confluenceLink, setConfluenceLink]     = useState('')
  const [relatedProducts, setRelatedProducts]   = useState<RelatedProduct[]>([])
  const [background, setBackground]             = useState('')
  const [hlr, setHlr]                           = useState('')

  const canSubmit = name.trim() !== '' && epicLink.trim() !== '' && confluenceLink.trim() !== '' && relatedProducts.length > 0

  const toggleProduct = (product: RelatedProduct) => {
    setRelatedProducts((prev) =>
      prev.includes(product) ? prev.filter((p) => p !== product) : [...prev, product]
    )
  }

  const handleSubmit = () => {
    if (!canSubmit) return

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      description: background.trim() || hlr.trim() || '',
      status: 'not_started',
      epicLink: epicLink.trim(),
      confluenceLink: confluenceLink.trim(),
      relatedProducts,
      background: background.trim() || undefined,
      hlr: hlr.trim() || undefined,
      updatedAt: 'just now',
    }

    addProject(newProject)
    onClose()
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
          {/* Project Name */}
          <Field label="Project Name" required>
            <input
              type="text"
              data-testid="project-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Payment Module Refactor"
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* Epic Link */}
          <Field label="Epic Link" required>
            <input
              type="url"
              data-testid="epic-link-input"
              value={epicLink}
              onChange={(e) => setEpicLink(e.target.value)}
              placeholder="https://lunit.atlassian.net/browse/RAD-000"
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* Project Confluence Link */}
          <Field label="Project Confluence Link" required hint="Top-level project document link. Used by AI to understand project context.">
            <input
              type="url"
              data-testid="confluence-link-input"
              value={confluenceLink}
              onChange={(e) => setConfluenceLink(e.target.value)}
              placeholder="https://lunit.atlassian.net/wiki/spaces/..."
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* Related Product */}
          <div>
            <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
              Related Product{' '}
              <span
                className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                Required
              </span>
            </label>
            <div className="flex gap-2 flex-wrap" data-testid="related-products">
              {PRODUCTS.map((product) => {
                const selected = relatedProducts.includes(product)
                return (
                  <button
                    key={product}
                    type="button"
                    data-testid={`product-toggle-${product}`}
                    onClick={() => toggleProduct(product)}
                    className="px-3 py-[6px] rounded-[6px] text-[12px] font-medium border transition-all"
                    style={
                      selected
                        ? { background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'transparent' }
                        : { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-md)' }
                    }
                  >
                    {product}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Background */}
          <Field label="Background">
            <textarea
              data-testid="background-input"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="Describe the background and reason this project is needed."
              rows={3}
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none resize-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* High Level Requirement */}
          <Field label="High Level Requirement">
            <textarea
              data-testid="hlr-input"
              value={hlr}
              onChange={(e) => setHlr(e.target.value)}
              placeholder="Describe the key requirements this project needs to achieve."
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
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-[8px] rounded-[8px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)' }}
          >
            Create Project
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
