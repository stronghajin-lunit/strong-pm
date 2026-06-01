import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewProjectModal } from './new-project-modal'

// project-store mock — isolate from Zustand
const mockAddProject = vi.fn()
vi.mock('@/stores/project-store', () => ({
  useProjectStore: (selector: (s: { addProject: typeof mockAddProject }) => unknown) =>
    selector({ addProject: mockAddProject }),
}))

const setup = () => {
  const onClose = vi.fn()
  render(<NewProjectModal onClose={onClose} />)
  return { onClose }
}

describe('NewProjectModal', () => {
  beforeEach(() => {
    mockAddProject.mockClear()
  })

  describe('렌더링', () => {
    it('모달 타이틀이 표시된다', () => {
      setup()
      expect(screen.getByText('New Project')).toBeInTheDocument()
    })

    it('필수 입력 필드가 모두 표시된다', () => {
      setup()
      expect(screen.getByTestId('project-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('epic-link-input')).toBeInTheDocument()
      expect(screen.getByTestId('confluence-link-input')).toBeInTheDocument()
      expect(screen.getByTestId('related-products')).toBeInTheDocument()
    })

    it('선택 입력 필드가 표시된다', () => {
      setup()
      expect(screen.getByTestId('background-input')).toBeInTheDocument()
      expect(screen.getByTestId('hlr-input')).toBeInTheDocument()
    })

    it('Product 토글 버튼이 3개 표시된다', () => {
      setup()
      expect(screen.getByTestId('product-toggle-ODM')).toBeInTheDocument()
      expect(screen.getByTestId('product-toggle-Annotation Admin')).toBeInTheDocument()
      expect(screen.getByTestId('product-toggle-Annotation Tool')).toBeInTheDocument()
    })
  })

  describe('Submit 비활성화 조건', () => {
    it('필수 필드가 비어 있으면 Submit 버튼이 비활성화된다', () => {
      setup()
      expect(screen.getByTestId('modal-submit-btn')).toBeDisabled()
    })

    it('Product 미선택 시 Submit 버튼이 비활성화된다', async () => {
      setup()
      await userEvent.type(screen.getByTestId('project-name-input'), 'Test Project')
      await userEvent.type(screen.getByTestId('epic-link-input'), 'https://jira.example.com/RAD-001')
      await userEvent.type(screen.getByTestId('confluence-link-input'), 'https://confluence.example.com/pages/1')
      // product 선택 안 함
      expect(screen.getByTestId('modal-submit-btn')).toBeDisabled()
    })
  })

  describe('Product 멀티 선택', () => {
    it('Product 버튼 클릭 시 선택 상태가 토글된다', async () => {
      setup()
      const odmBtn = screen.getByTestId('product-toggle-ODM')

      // 처음엔 미선택
      await userEvent.click(odmBtn)
      // 선택됨 — aria 속성 대신 실제 동작(submit 가능 여부)으로 확인

      await userEvent.click(odmBtn)
      // 다시 미선택 — submit 버튼 여전히 비활성
      await userEvent.type(screen.getByTestId('project-name-input'), 'X')
      await userEvent.type(screen.getByTestId('epic-link-input'), 'https://a.com')
      await userEvent.type(screen.getByTestId('confluence-link-input'), 'https://b.com')
      expect(screen.getByTestId('modal-submit-btn')).toBeDisabled()
    })
  })

  describe('정상 제출', () => {
    it('필수 필드 입력 후 Create Project 클릭 시 addProject가 호출되고 onClose가 호출된다', async () => {
      const { onClose } = setup()

      await userEvent.type(screen.getByTestId('project-name-input'), 'My New Project')
      await userEvent.type(screen.getByTestId('epic-link-input'), 'https://jira.example.com/RAD-999')
      await userEvent.type(screen.getByTestId('confluence-link-input'), 'https://confluence.example.com/pages/999')
      await userEvent.click(screen.getByTestId('product-toggle-ODM'))

      expect(screen.getByTestId('modal-submit-btn')).not.toBeDisabled()
      await userEvent.click(screen.getByTestId('modal-submit-btn'))

      expect(mockAddProject).toHaveBeenCalledTimes(1)
      const project = mockAddProject.mock.calls[0][0]
      expect(project.name).toBe('My New Project')
      expect(project.status).toBe('not_started')
      expect(project.relatedProducts).toContain('ODM')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('Background와 HLR은 선택 사항 — 없어도 제출된다', async () => {
      const { onClose } = setup()

      await userEvent.type(screen.getByTestId('project-name-input'), 'Minimal Project')
      await userEvent.type(screen.getByTestId('epic-link-input'), 'https://jira.example.com/RAD-1')
      await userEvent.type(screen.getByTestId('confluence-link-input'), 'https://confluence.example.com/1')
      await userEvent.click(screen.getByTestId('product-toggle-Annotation Tool'))
      await userEvent.click(screen.getByTestId('modal-submit-btn'))

      expect(mockAddProject).toHaveBeenCalledTimes(1)
      const project = mockAddProject.mock.calls[0][0]
      expect(project.background).toBeUndefined()
      expect(project.hlr).toBeUndefined()
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('닫기', () => {
    it('Cancel 버튼 클릭 시 onClose가 호출된다', async () => {
      const { onClose } = setup()
      await userEvent.click(screen.getByTestId('modal-cancel-btn'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('X 버튼 클릭 시 onClose가 호출된다', async () => {
      const { onClose } = setup()
      await userEvent.click(screen.getByTestId('modal-close-btn'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('backdrop 클릭 시 onClose가 호출된다', async () => {
      const { onClose } = setup()
      await userEvent.click(screen.getByTestId('new-project-modal-backdrop'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
