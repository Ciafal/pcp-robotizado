import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NovaValidacaoTab } from '@/components/sap-validation/NovaValidacaoTab'
import { sapStandardModelsService } from '@/services/sap-standard-models-service'
import { sapValidationService } from '@/services/sap-validation-service'
import { pb } from '@/lib/pocketbase/client'

// Mocks
vi.mock('@/services/sap-standard-models-service', () => ({
  sapStandardModelsService: {
    searchMaterialsCatalog: vi.fn(),
    findSuggestedModels: vi.fn(),
    listModels: vi.fn(),
    createModel: vi.fn(),
    updateModel: vi.fn(),
    toggleStatus: vi.fn(),
    checkDuplicate: vi.fn(),
  },
}))

vi.mock('@/services/sap-validation-service', () => ({
  sapValidationService: {
    fetchMaterialFromSap: vi.fn(),
    evaluateModelCodeRules: vi.fn(),
    executeValidation: vi.fn(),
  },
}))

describe('Validação de Cadastro SAP — UI e Interação Real de Digitação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sapStandardModelsService.searchMaterialsCatalog).mockResolvedValue([
      { code: '10200001', description: 'BARRA REDONDA SAE 1020 12,70 MM', material_type: 'ZHAL' },
      { code: '10200002', description: 'BARRA REDONDA SAE 1020 15,88 MM', material_type: 'ZHAL' },
    ])
    vi.mocked(sapStandardModelsService.findSuggestedModels).mockResolvedValue([])
    vi.mocked(sapValidationService.evaluateModelCodeRules).mockReturnValue({
      modelStatus: 'VERDE',
      warnings: [],
    })
    vi.mocked(sapValidationService.fetchMaterialFromSap).mockResolvedValue({
      success: false,
      functional_message: 'Integração SAP/FCA ainda não configurada para consulta.',
    })
  })

  it('CORREÇÃO DO BUG DO CÓDIGO MODELO: aceita digitação real, colar, apagar e mantém o valor controlado', async () => {
    const user = userEvent.setup()
    render(<NovaValidacaoTab fcaStatus={{ fca_configured: false, matrix_loaded: true }} />)

    // Localizar os inputs de Código Novo e Código Modelo por role ou label
    const inputNovo = screen.getByLabelText(/Código Novo/i)
    const inputModelo = screen.getByLabelText(/Código Modelo/i)

    expect(inputNovo).toBeDefined()
    expect(inputModelo).toBeDefined()

    // 1. Digitação no Código Novo
    await user.type(inputNovo, '2002132E')
    expect(inputNovo).toHaveValue('2002132E')

    // 2. Digitação real no Código Modelo (testando se está habilitado, focável e controlado)
    expect(inputModelo).not.toBeDisabled()
    await user.type(inputModelo, '2001987E')
    expect(inputModelo).toHaveValue('2001987E')

    // 3. Teste de apagar e redigitar
    await user.clear(inputModelo)
    expect(inputModelo).toHaveValue('')

    await user.type(inputModelo, '10001872')
    expect(inputModelo).toHaveValue('10001872')

    // 4. Teste de clique em "Validar Modelo" não perde o valor
    const btnValidarModelo = screen.getByRole('button', { name: /Validar Modelo/i })
    expect(btnValidarModelo).not.toBeDisabled()

    await user.click(btnValidarModelo)

    // Verifica que o valor continua preenchido
    expect(inputModelo).toHaveValue('10001872')
    expect(sapValidationService.evaluateModelCodeRules).toHaveBeenCalled()
  })

  it('Layout Vertical: Código Novo posicionado antes do Código Modelo no DOM', () => {
    render(<NovaValidacaoTab fcaStatus={{ fca_configured: false, matrix_loaded: true }} />)

    const inputNovo = screen.getByLabelText(/Código Novo/i)
    const inputModelo = screen.getByLabelText(/Código Modelo/i)

    // Comparar posições no documento (DOCUMENT_POSITION_FOLLOWING = 4)
    const position = inputNovo.compareDocumentPosition(inputModelo)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('Sugestão Automática: botão "Usar este modelo" preenche Código Modelo e Descrição', async () => {
    const mockSuggestedModel = {
      id: 'mod_1',
      material_code: '2001987E',
      description: 'BARRA CHATA SAE 1020 1/2 X 1/8',
      material_type: 'ZHAL',
      line_id: 'L1',
      line_code: 'L1',
      company_id: 'comp_1',
      company_name: 'CIAFAL',
      center: '1001',
      status: 'ATIVO' as const,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    vi.mocked(sapStandardModelsService.findSuggestedModels).mockResolvedValue([mockSuggestedModel])

    const user = userEvent.setup()
    render(<NovaValidacaoTab fcaStatus={{ fca_configured: false, matrix_loaded: true }} />)

    const inputNovo = screen.getByLabelText(/Código Novo/i)
    await user.type(inputNovo, '2002132E')

    // Aguardar surgimento do card de sugestão automática
    const btnUsarModelo = await screen.findByRole('button', { name: /Usar este modelo/i })
    expect(btnUsarModelo).toBeDefined()

    await user.click(btnUsarModelo)

    const inputModelo = screen.getByLabelText(/Código Modelo/i)
    expect(inputModelo).toHaveValue('2001987E')

    // Descrição do modelo também deve ser exibida
    expect(screen.getByText('BARRA CHATA SAE 1020 1/2 X 1/8')).toBeDefined()
  })

  it('Mensagem funcional SAP/FCA quando FCA não configurado ao consultar', async () => {
    const user = userEvent.setup()
    render(<NovaValidacaoTab fcaStatus={{ fca_configured: false, matrix_loaded: true }} />)

    const inputNovo = screen.getByLabelText(/Código Novo/i)
    await user.type(inputNovo, '2002132E')

    const btnsConsultar = screen.getAllByRole('button', { name: /Consultar SAP/i })
    await user.click(btnsConsultar[0])

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível consultar o código 2002132E no SAP/i)).toBeDefined()
    })

    // O código digitado deve ser rigorosamente preservado
    expect(inputNovo).toHaveValue('2002132E')
  })
})
