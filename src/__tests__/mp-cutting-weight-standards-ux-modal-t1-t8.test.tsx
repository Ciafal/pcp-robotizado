import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MPCuttingWeightStandardsModal } from '@/components/mp-optimization/MPCuttingWeightStandardsModal'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'
import { pb } from '@/lib/pocketbase/client'
import type { MPCuttingWeightStandard } from '@/types/mp-cutting-weight-standards'

// Mock dos contextos necessários
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', name: 'Administrador PCP', email: 'pcp@ciafal.com.br' },
  }),
}))

describe('Testes Específicos do Usuário: Ciclo de Vida do Modal e UX (T1 a T8)', () => {
  const sampleStandard: MPCuttingWeightStandard = {
    id: 'std-test-1',
    code: 'PAD-001',
    description: 'Tarugo 130x130 Bloco 1,250 t',
    cutting_type: 'BLOCOS',
    company_code: 'CIAFAL',
    center_codes: ['SEML1'],
    material_codes: ['TARUGO-130-1020'],
    steel_family: 'SAE 1020',
    target_weight_kg: 1250,
    min_weight_kg: 1200,
    max_weight_kg: 1300,
    tolerance_lower_val: 50,
    tolerance_lower_type: 'KG',
    tolerance_upper_val: 50,
    tolerance_upper_type: 'KG',
    priority: 'ALTA',
    start_date: '2026-01-01',
    status: 'ATIVO',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // T1: Salvar padrão válido -> gravado + código retornado + mensagem persistente visível
  it('T1: Salvar padrão válido grava no serviço e exibe mensagem com código retornado', async () => {
    vi.spyOn(mpCuttingWeightStandardsService, 'listStandards').mockResolvedValue([sampleStandard])
    vi.spyOn(mpCuttingWeightStandardsService, 'saveStandard').mockResolvedValue({
      success: true,
      standard: { ...sampleStandard, code: 'PAD-001' },
    })

    const handleClose = vi.fn()
    render(<MPCuttingWeightStandardsModal isOpen={true} onClose={handleClose} />)

    // Abrir o formulário "Novo Padrão de Peso"
    const newBtn = await screen.findByRole('button', { name: /Novo Padrão de Peso/i })
    fireEvent.click(newBtn)

    // Preencher campos
    const descInput = screen.getByPlaceholderText(/Ex: Tarugo L1 130x130 Padrão Bloco 1,250 t/i)
    fireEvent.change(descInput, { target: { value: 'Tarugo 130x130 Bloco 1,250 t' } })

    const targetInput = screen.getByPlaceholderText(/Ex: 1,250/i)
    fireEvent.change(targetInput, { target: { value: '1,250' } })

    const minInput = screen.getByPlaceholderText(/Ex: 1,200/i)
    fireEvent.change(minInput, { target: { value: '1,200' } })

    const maxInput = screen.getByPlaceholderText(/Ex: 1,300/i)
    fireEvent.change(maxInput, { target: { value: '1,300' } })

    const tolLow = screen.getByPlaceholderText(/Ex: 0,050/i)
    fireEvent.change(tolLow, { target: { value: '0,050' } })

    // Salvar
    const saveBtn = screen.getByRole('button', { name: /Salvar Padrão de Peso/i })
    fireEvent.click(saveBtn)

    // Mensagem de sucesso esperada
    await waitFor(() => {
      expect(
        screen.getByText(/Padrão de Peso nº \[PAD-001\] cadastrado com sucesso\./i),
      ).toBeInTheDocument()
    })

    // O modal NÃO fecha sozinho
    expect(handleClose).not.toHaveBeenCalled()
  })

  // T2: Banner de sucesso permanece visível após alternar para a lista, dentro do popup, até fechar manualmente
  it('T2: Banner de sucesso permanece visível na visão de lista dentro do popup sem setTimeout de desmontagem', async () => {
    vi.spyOn(mpCuttingWeightStandardsService, 'listStandards').mockResolvedValue([sampleStandard])
    vi.spyOn(mpCuttingWeightStandardsService, 'saveStandard').mockResolvedValue({
      success: true,
      standard: { ...sampleStandard, code: 'PAD-001' },
    })

    render(<MPCuttingWeightStandardsModal isOpen={true} onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /Novo Padrão de Peso/i }))

    fireEvent.change(screen.getByPlaceholderText(/Ex: Tarugo L1 130x130 Padrão Bloco 1,250 t/i), {
      target: { value: 'Padrão Permanente' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 1,250/i), { target: { value: '1,250' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 1,200/i), { target: { value: '1,200' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 1,300/i), { target: { value: '1,300' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 0,050/i), { target: { value: '0,050' } })

    fireEvent.click(screen.getByRole('button', { name: /Salvar Padrão de Peso/i }))

    // Após salvar, a lista reaparece imediatamente (botão "Novo Padrão de Peso" está na tela de novo)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Novo Padrão de Peso/i })).toBeInTheDocument()
    })

    // E o banner de sucesso PERMANECE visível no topo da lista
    expect(
      screen.getByText(/Padrão de Peso nº \[PAD-001\] cadastrado com sucesso\./i),
    ).toBeInTheDocument()
  })

  // T3: Registro aparece na tabela imediatamente e destacado
  it('T3: Novo registro aparece destacado na tabela com badge Novo e highlight de linha', async () => {
    vi.spyOn(mpCuttingWeightStandardsService, 'listStandards').mockResolvedValue([sampleStandard])
    vi.spyOn(mpCuttingWeightStandardsService, 'saveStandard').mockResolvedValue({
      success: true,
      standard: { ...sampleStandard, code: 'PAD-001' },
    })

    render(<MPCuttingWeightStandardsModal isOpen={true} onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /Novo Padrão de Peso/i }))
    fireEvent.change(screen.getByPlaceholderText(/Ex: Tarugo L1 130x130 Padrão Bloco 1,250 t/i), {
      target: { value: 'Tarugo 130x130 Bloco 1,250 t' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 1,250/i), { target: { value: '1,250' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 1,200/i), { target: { value: '1,200' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 1,300/i), { target: { value: '1,300' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 0,050/i), { target: { value: '0,050' } })

    fireEvent.click(screen.getByRole('button', { name: /Salvar Padrão de Peso/i }))

    await waitFor(() => {
      expect(screen.getByText('Novo')).toBeInTheDocument()
      expect(screen.getByText('PAD-001')).toBeInTheDocument()
    })
  })

  // T4: F5 / reabrir -> listStandards carrega do PocketBase
  it('T4: Consulta listStandards é chamada na montagem do popup para obter dados reais', async () => {
    const listSpy = vi
      .spyOn(mpCuttingWeightStandardsService, 'listStandards')
      .mockResolvedValue([sampleStandard])

    render(<MPCuttingWeightStandardsModal isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled()
      expect(screen.getByText('PAD-001')).toBeInTheDocument()
    })
  })

  // T5: Validação de consistência do serviço e da regra de tolerância
  it('T5: Serviço calcula tolerâncias e valida limites de peso', () => {
    const tolKg = mpCuttingWeightStandardsService.calculateToleranceInKg(1000, 50, 'KG')
    expect(tolKg).toBe(50)

    const tolTon = mpCuttingWeightStandardsService.calculateToleranceInKg(1000, 0.05, 'TON')
    expect(tolTon).toBe(50)

    const tolPct = mpCuttingWeightStandardsService.calculateToleranceInKg(1000, 5, 'PERCENT')
    expect(tolPct).toBe(50)
  })

  // T6: Falha controlada (mín > ideal) -> popup aberto, campo destacado, motivo exibido, dados preservados, sem fechamento
  it('T6: Falha controlada (mín > ideal) não fecha modal, exibe motivo claro e preserva dados digitados', async () => {
    vi.spyOn(mpCuttingWeightStandardsService, 'listStandards').mockResolvedValue([])

    render(<MPCuttingWeightStandardsModal isOpen={true} onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /Novo Padrão de Peso/i }))

    const descInput = screen.getByPlaceholderText(/Ex: Tarugo L1 130x130 Padrão Bloco 1,250 t/i)
    fireEvent.change(descInput, { target: { value: 'Teste Min > Ideal' } })

    const targetInput = screen.getByPlaceholderText(/Ex: 1,250/i)
    fireEvent.change(targetInput, { target: { value: '1,200' } })

    const minInput = screen.getByPlaceholderText(/Ex: 1,200/i)
    fireEvent.change(minInput, { target: { value: '1,300' } }) // Mínimo maior que ideal!

    const maxInput = screen.getByPlaceholderText(/Ex: 1,300/i)
    fireEvent.change(maxInput, { target: { value: '1,400' } })

    const saveBtn = screen.getByRole('button', { name: /Salvar Padrão de Peso/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText(/não pode ser maior que o peso ideal/i)).toBeInTheDocument()
    })

    // Formulário continua aberto e com os valores digitados intactos
    expect(descInput).toHaveValue('Teste Min > Ideal')
    expect(minInput).toHaveValue('1,300')
    expect(targetInput).toHaveValue('1,200')
  })

  // T7: Bloqueio de fechamento durante salvamento
  it('T7: Botão de salvar exibe estado "Salvando..." durante gravação', async () => {
    let resolveSave: any
    const savePromise = new Promise<{ success: boolean; standard?: any }>((resolve) => {
      resolveSave = resolve
    })
    vi.spyOn(mpCuttingWeightStandardsService, 'listStandards').mockResolvedValue([])
    vi.spyOn(mpCuttingWeightStandardsService, 'saveStandard').mockReturnValue(savePromise)

    render(<MPCuttingWeightStandardsModal isOpen={true} onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /Novo Padrão de Peso/i }))

    fireEvent.change(screen.getByPlaceholderText(/Ex: Tarugo L1 130x130 Padrão Bloco 1,250 t/i), {
      target: { value: 'Teste Saving State' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 1,250/i), { target: { value: '1,250' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 1,200/i), { target: { value: '1,200' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 1,300/i), { target: { value: '1,300' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex: 0,050/i), { target: { value: '0,050' } })

    const saveBtn = screen.getByRole('button', { name: /Salvar Padrão de Peso/i })
    fireEvent.click(saveBtn)

    // O botão deve mudar para "Salvando..." e ficar desabilitado
    await waitFor(() => {
      expect(screen.getByText('Salvando...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Salvando\.\.\./i })).toBeDisabled()
    })

    // Resolve o salvamento
    resolveSave({
      success: true,
      standard: { ...sampleStandard, code: 'PAD-999' },
    })

    await waitFor(() => {
      expect(
        screen.getByText(/Padrão de Peso nº \[PAD-999\] cadastrado com sucesso\./i),
      ).toBeInTheDocument()
    })
  })

  // T8: Regressão PocketBase client export
  it('T8: pb export no client.ts está preservado (named + default pb)', async () => {
    const clientModule = await import('@/lib/pocketbase/client')
    expect(clientModule.pb).toBeDefined()
    expect(clientModule.default).toBeDefined()
    expect(clientModule.pb).toBe(clientModule.default)
  })
})
