import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TarugoPlansTab } from '@/components/mp-optimization/TarugoPlansTab'
import { tarugoPlansService } from '@/services/tarugo-plans-service'

// Mock de autenticação e permissões para garantir que Can renderiza como PCP_PROGRAMMER
vi.mock('@/components/auth/Can', () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/services/tarugo-plans-service', () => ({
  tarugoPlansService: {
    listPlans: vi.fn(),
    createPlan: vi.fn(),
    checkDuplicateKey: vi.fn(),
    validatePlan: vi.fn().mockReturnValue([]),
  },
  tarugoFormatters: {
    meters: (v: number) => `${v} m`,
    kg: (v: number) => `${v} kg`,
    dateTime: () => '05/11/2026 12:00',
  },
}))

describe('TarugoPlansTab - Botão "+ Criar Plano" no cabeçalho', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tarugoPlansService.listPlans).mockResolvedValue([])
  })

  it('renderiza o botão com texto verbatim "+ Criar Plano", fundo Pantone 2945 (#004C97) e texto branco', async () => {
    render(<TarugoPlansTab />)

    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).toBeNull()
    })

    const createBtn = screen.getByRole('button', { name: /\+ Criar Plano/i })
    expect(createBtn).toBeInTheDocument()
    expect(createBtn).toHaveTextContent('+ Criar Plano')

    // Estilo visual Ciafal Pantone 2945
    expect(createBtn.className).toContain('bg-[#004C97]')
    expect(createBtn.className).toContain('hover:bg-[#003870]')
    expect(createBtn.className).toContain('text-white')
    expect(createBtn.className).toContain('rounded-md')
  })

  it('abre o modal "Cadastrar Plano Padrão de Tarugos" ao clicar no botão', async () => {
    const user = userEvent.setup()
    render(<TarugoPlansTab />)

    await waitFor(() => {
      expect(tarugoPlansService.listPlans).toHaveBeenCalled()
    })

    const createBtn = screen.getByRole('button', { name: /\+ Criar Plano/i })
    await user.click(createBtn)

    expect(await screen.findByText('Cadastrar Plano Padrão de Tarugos')).toBeInTheDocument()
    expect(screen.getByText('1. Identificação')).toBeInTheDocument()
    expect(screen.getByText('2. Tarugo Principal (Referência)')).toBeInTheDocument()
    expect(screen.getByText(/3\. Tarugos Alternativos/)).toBeInTheDocument()
  })
})
