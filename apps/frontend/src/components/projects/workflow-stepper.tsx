interface WorkflowStepperProps {
  currentStep: number
  isDone: boolean
  selectedStep: number
  onStepClick: (idx: number) => void
  onAdvance: () => void
  onMarkDone: () => void
}

const STEPS = [
  { label: 'Project Creation', sub: '' },
  { label: 'Kick off', sub: '' },
  { label: 'PRD', sub: '' },
  { label: 'Feature List', sub: 'No features yet' },
  { label: 'Development', sub: 'No features yet' },
  { label: 'Deployment', sub: '' },
]

export function WorkflowStepper({ currentStep, isDone, selectedStep, onStepClick, onAdvance, onMarkDone }: WorkflowStepperProps) {
  return (
    <div
      className="rounded-[12px] p-[18px_20px]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Circle + connector row */}
      <div className="flex items-center">
        {STEPS.map((step, idx) => {
          const isDoneStep = isDone || idx < currentStep
          const isActive = !isDone && idx === currentStep
          const isSelected = idx === selectedStep
          const isClickable = isDoneStep || isActive

          return (
            <div key={idx} className="flex items-center flex-1 last:flex-none">
              <div
                className="w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0 transition-all"
                style={{
                  cursor: isClickable ? 'pointer' : 'default',
                  ...(isActive || isSelected
                    ? { background: 'var(--teal-light)', border: '2px solid var(--teal)' }
                    : isDoneStep
                    ? { background: 'var(--surface-2)', border: '1px solid var(--border-md)' }
                    : { background: 'var(--surface-2)', border: '1px solid var(--border)' }),
                }}
                onClick={() => isClickable && onStepClick(idx)}
              >
                {isDoneStep ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"
                    style={{ color: isSelected ? 'var(--teal)' : 'var(--text-3)' }}>
                    <path d="M3 8l3.5 3.5L13 5" />
                  </svg>
                ) : isActive ? (
                  <div className="w-[8px] h-[8px] rounded-full" style={{ background: 'var(--teal)' }} />
                ) : (
                  <div className="w-[6px] h-[6px] rounded-full" style={{ background: 'var(--border-md)' }} />
                )}
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  className="flex-1 h-[2px] mx-[6px]"
                  style={{ background: isDone || idx < currentStep ? 'var(--accent)' : 'var(--border)' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Label row */}
      <div className="flex mt-[6px]">
        {STEPS.map((step, idx) => {
          const isDoneStep = isDone || idx < currentStep
          const isActive = !isDone && idx === currentStep
          const isSelected = idx === selectedStep
          const isClickable = isDoneStep || isActive

          return (
            <div
              key={idx}
              className="flex-1 last:flex-none flex flex-col items-center text-center"
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
              onClick={() => isClickable && onStepClick(idx)}
            >
              <div
                className="text-[11px] font-semibold leading-[1.3]"
                style={{ color: isSelected ? 'var(--teal)' : isActive ? 'var(--teal)' : isDoneStep ? 'var(--text-2)' : 'var(--text-3)' }}
              >
                {step.label}
              </div>
              {step.sub && (
                <div className="text-[10px] mt-[1px]" style={{ color: 'var(--text-3)' }}>
                  {step.sub}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action row */}
      <div className="mt-[14px] flex justify-end">
        {isDone ? (
          <span className="flex items-center gap-[5px] text-[11px] font-medium" style={{ color: 'var(--teal)' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
              <path d="M3 8l3.5 3.5L13 5" />
            </svg>
            All steps complete
          </span>
        ) : currentStep < 5 ? (
          <button
            type="button"
            onClick={onAdvance}
            className="flex items-center gap-[5px] px-[14px] py-[6px] rounded-[6px] text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--teal)' }}
          >
            Mark &quot;{STEPS[currentStep].label}&quot; as Complete
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onMarkDone}
            className="flex items-center gap-[5px] px-[14px] py-[6px] rounded-[6px] text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Mark Project as Done
          </button>
        )}
      </div>
    </div>
  )
}
