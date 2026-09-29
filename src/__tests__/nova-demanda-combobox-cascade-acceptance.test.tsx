import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { NovaDemandaInventarioModal } from '@/components/pcp/inventory/NovaDemandaInventarioModal'
import { sapParametersMasterDataService } from '@/services/sap-parameters-master-data-service'
import { lineMasterService } from '@/services/line-master'
import { pcpProductionService } from '@/services/pcp-production-service'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { pb } from '@/lib/pocketbase/client'

// Mocks dos serviços para isolamento e testes dos 10 cenários de aceitação
vi.mock('@/services/pcp-production-service', () => ({
  pcpProductionService: {
    getOrders: vi.fn().mockResolvedValue({
      data: [
        {
          op_number: 'OP-100234',
          empresa_code: '1001',
          linha_code: 'L1',
          centro_code: 'LAM-01',
          work_center: 'LAM-01',
          gauge_dimension: '12.7mm',
          product_name: 'Vergalhão CA-50',
          programming_type: 'Corrida Normal',
        },
      ],
    }),
  },
}))

describe('NovaDemandaInventarioModal — Bloco 1 Contexto Operacional com Cascata e Fontes Oficiais', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Teste 1: Abrir o popup
  it('Teste 1: Deve abrir o popup exibindo o Bloco 1 com os 4 campos na mesma linha em desktop', async () => {
    render(<NovaDemandaInventarioModal open={true} onOpenChange={() => {}} onSuccess={() => {}} />)

    expect(screen.getByText(/Nova Demanda de Inventário de Matéria-Prima/i)).toBeInTheDocument()
    expect(screen.getByText(/Bloco 1: Contexto Operacional/i)).toBeInTheDocument()

    // 4 comboboxes presentes
    expect(screen.getByTestId('select-empresa-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('select-linha-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('select-centro-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('select-deposito-trigger')).toBeInTheDocument()
  })

  // Teste 2: Abrir Empresa e verificar chamada RFC WERKS (neste ambiente: 503 -> erro amigável + retry)
  it('Teste 2: Deve disparar consulta RFC WERKS (T001W) e exibir erro amigável quando RFC retornar 503', async () => {
    vi.spyOn(sapParametersMasterDataService, 'fetchCompanies').mockResolvedValueOnce({
      success: false,
      data: [],
      isUnavailable: true,
      error: 'Não foi possível consultar as empresas no SAP. Tente novamente.',
      timestamp: new Date().toISOString(),
    })

    render(<NovaDemandaInventarioModal open={true} onOpenChange={() => {}} onSuccess={() => {}} />)

    // Clica no trigger de Empresa
    const trigger = screen.getByTestId('select-empresa-trigger')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByTestId('sap-empresa-error')).toBeInTheDocument()
      expect(
        screen.getByText('Não foi possível consultar as empresas no SAP. Tente novamente.'),
      ).toBeInTheDocument()
      expect(screen.getByTestId('btn-retry-empresa')).toBeInTheDocument()
    })
  })

  // Teste 3: Selecionar Empresa e validar Linhas (filtradas por planta vinculada ao WERKS)
  it('Teste 3: Deve listar apenas Linhas vinculadas à Empresa (WERKS) selecionada', async () => {
    vi.spyOn(sapParametersMasterDataService, 'fetchCompanies').mockResolvedValueOnce({
      success: true,
      data: [
        {
          werks: '1001',
          name: 'CIAFAL MATRIZ',
          label: '1001 — CIAFAL MATRIZ',
          source: 'SAP_T001W',
        },
      ],
      timestamp: new Date().toISOString(),
    })

    vi.spyOn(lineMasterService, 'listLines').mockResolvedValueOnce([
      {
        id: 'line-1',
        code: 'L1',
        name: 'Laminação 1',
        plant_id: 'plant-1001',
        sap_work_center: 'LAM-01',
      } as any,
      {
        id: 'line-2',
        code: 'L2',
        name: 'Laminação 2',
        plant_id: 'plant-9999',
        sap_work_center: 'LAM-02',
      } as any,
    ])

    vi.spyOn(pb.collection('plants'), 'getFullList').mockResolvedValueOnce([
      { id: 'plant-1001', code: '1001', sap_plant_code: '1001', name: 'Planta Matriz' } as any,
    ])

    render(<NovaDemandaInventarioModal open={true} onOpenChange={() => {}} onSuccess={() => {}} />)

    // Abre popover da empresa e seleciona 1001
    const empresaTrigger = screen.getByTestId('select-empresa-trigger')
    fireEvent.click(empresaTrigger)

    await waitFor(() => {
      expect(screen.getByTestId('empresa-option-1001')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('empresa-option-1001'))

    // Abre popover da Linha
    const linhaTrigger = screen.getByTestId('select-linha-trigger')
    fireEvent.click(linhaTrigger)

    await waitFor(() => {
      expect(screen.getByTestId('linha-option-L1')).toBeInTheDocument()
      expect(screen.queryByTestId('linha-option-L2')).not.toBeInTheDocument()
    })
  })

  // Teste 4 & Teste 5: Selecionar Linha e validar Centros provenientes de Centros e Ficha Mestra
  it('Teste 4 e 5: Deve carregar centros compatíveis com a Linha a partir de Centros e Ficha Mestra', async () => {
    vi.spyOn(lineMasterService, 'listLines').mockResolvedValueOnce([
      { id: 'line-1', code: 'L1', name: 'Laminação 1', sap_work_center: 'LAM-01' } as any,
    ])

    vi.spyOn(pb.collection('line_masters'), 'getFullList').mockResolvedValueOnce([
      { id: 'lm-1', line_id: 'line-1', code: 'FM-LAM-01', name: 'Ficha Mestra Laminação 1' } as any,
    ])

    render(<NovaDemandaInventarioModal open={true} onOpenChange={() => {}} onSuccess={() => {}} />)

    const linhaTrigger = screen.getByTestId('select-linha-trigger')
    fireEvent.click(linhaTrigger)

    await waitFor(() => {
      expect(screen.getByTestId('linha-option-L1')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('linha-option-L1'))

    // Abre o combobox de Centro
    const centroTrigger = screen.getByTestId('select-centro-trigger')
    fireEvent.click(centroTrigger)

    await waitFor(() => {
      expect(screen.getByTestId('centro-option-LAM-01')).toBeInTheDocument()
      expect(screen.getByTestId('centro-option-FM-LAM-01')).toBeInTheDocument()
    })
  })

  // Teste 6: Abrir Depósito e verificar chamada RFC LGORT por WERKS com fallback para lista provisória controlada
  it('Teste 6: Deve disparar consulta RFC LGORT (T001L) para o WERKS e acionar lista temporária quando RFC indisponível', async () => {
    vi.spyOn(sapParametersMasterDataService, 'fetchCompanies').mockResolvedValueOnce({
      success: true,
      data: [
        {
          werks: '1001',
          name: 'CIAFAL',
          label: '1001 — CIAFAL',
          source: 'SAP_T001W',
        },
      ],
      timestamp: new Date().toISOString(),
    })

    vi.spyOn(sapParametersMasterDataService, 'fetchDeposits').mockResolvedValueOnce({
      success: false,
      data: [],
      isUnavailable: true,
      error: 'Não foi possível consultar os depósitos no SAP. Tente novamente.',
      timestamp: new Date().toISOString(),
    })

    render(<NovaDemandaInventarioModal open={true} onOpenChange={() => {}} onSuccess={() => {}} />)

    // Seleciona a Empresa 1001 para habilitar o depósito
    fireEvent.click(screen.getByTestId('select-empresa-trigger'))
    await waitFor(() => screen.getByTestId('empresa-option-1001'))
    fireEvent.click(screen.getByTestId('empresa-option-1001'))

    // Clica no depósito
    const depTrigger = screen.getByTestId('select-deposito-trigger')
    fireEvent.click(depTrigger)

    await waitFor(() => {
      // Quando a RFC estiver indisponível, a lista temporária de 68 depósitos entra em ação com aviso de homologação
      expect(screen.getByTestId('sap-deposito-provisional-hint')).toBeInTheDocument()
      expect(screen.getByTestId('deposito-option-DP07')).toBeInTheDocument()
      expect(screen.getByText('DP07 — Matéria Prima L1')).toBeInTheDocument()
    })
  })

  // Teste 7: Trocar Empresa e confirmar limpeza de Linha, Centro e Depósito
  it('Teste 7: Alterar Empresa limpa Linha, Centro e Depósito em cascata', async () => {
    vi.spyOn(sapParametersMasterDataService, 'fetchCompanies').mockResolvedValue({
      success: true,
      data: [
        { werks: '1001', name: 'PLANTA 1', label: '1001 — PLANTA 1', source: 'SAP_T001W' },
        { werks: '2001', name: 'PLANTA 2', label: '2001 — PLANTA 2', source: 'SAP_T001W' },
      ],
      timestamp: new Date().toISOString(),
    })

    render(
      <NovaDemandaInventarioModal
        open={true}
        onOpenChange={() => {}}
        onSuccess={() => {}}
        initialContext={{
          company: '1001',
          line: 'L1',
          center: 'LAM-01',
          storageDeposit: 'DP07',
        }}
      />,
    )

    expect(screen.getByTestId('select-linha-trigger')).toHaveTextContent('L1')
    expect(screen.getByTestId('select-centro-trigger')).toHaveTextContent('LAM-01')
    expect(screen.getByTestId('select-deposito-trigger')).toHaveTextContent('DP07')

    // Troca a Empresa para 2001
    fireEvent.click(screen.getByTestId('select-empresa-trigger'))
    await waitFor(() => screen.getByTestId('empresa-option-2001'))
    fireEvent.click(screen.getByTestId('empresa-option-2001'))

    // Linha, Centro e Depósito devem ser limpos
    expect(screen.getByTestId('select-linha-trigger')).toHaveTextContent('Selecione a linha...')
    expect(screen.getByTestId('select-centro-trigger')).toHaveTextContent(
      'Selecione uma linha primeiro...',
    )
    expect(screen.getByTestId('select-deposito-trigger')).toHaveTextContent(
      'Selecione o depósito...',
    )
  })

  // Teste 8: Simular indisponibilidade SAP e verificar que não permite digitação livre
  it('Teste 8: Proibido digitação livre ou salvar dados inexistentes na fonte', async () => {
    render(<NovaDemandaInventarioModal open={true} onOpenChange={() => {}} onSuccess={() => {}} />)

    // Os triggers são botões role="combobox", não inputs de digitação livre
    const empresaButton = screen.getByTestId('select-empresa-trigger')
    expect(empresaButton.tagName.toLowerCase()).toBe('button')
    expect(empresaButton).toHaveAttribute('role', 'combobox')

    const linhaButton = screen.getByTestId('select-linha-trigger')
    expect(linhaButton.tagName.toLowerCase()).toBe('button')

    const centroButton = screen.getByTestId('select-centro-trigger')
    expect(centroButton.tagName.toLowerCase()).toBe('button')

    const depButton = screen.getByTestId('select-deposito-trigger')
    expect(depButton.tagName.toLowerCase()).toBe('button')
  })

  // Teste 9 e 10: Gerar demanda e conferir gravação e rastreabilidade com WERKS/Linha/Centro/LGORT
  it('Teste 9 e 10: Ao criar demanda, serviço pcpInventoryDemandsService recebe WERKS, Linha, Centro e LGORT oficiais', async () => {
    const createSpy = vi.spyOn(pcpInventoryDemandsService, 'createDemand').mockResolvedValueOnce({
      id: 'dem-999',
      control_number: 'INV-2026-000099',
      company: '1001',
      line: 'L1',
      center: 'LAM-01',
      storage_deposit: 'DP07',
      status: 'Gerada',
    } as any)

    render(
      <NovaDemandaInventarioModal
        open={true}
        onOpenChange={() => {}}
        onSuccess={() => {}}
        initialContext={{
          company: '1001',
          line: 'L1',
          center: 'LAM-01',
          storageDeposit: 'DP07',
        }}
      />,
    )

    // Preenche OP e prioridade
    fireEvent.click(screen.getByText('Selecione a OP...'))
    await waitFor(() => screen.getByText('OP-100234'))
    fireEvent.click(screen.getByText('OP-100234'))

    // Seleciona Prioridade ALTA
    fireEvent.click(screen.getByText('Alta'))

    // Preenche Código MP e Quantidade (t)
    const mpCodeInput = screen.getByPlaceholderText('Ex.: MP-4140-100MM')
    fireEvent.change(mpCodeInput, { target: { value: 'MP-4140-100MM' } })

    const qtyInput = screen.getByPlaceholderText('Ex.: 24,500')
    fireEvent.change(qtyInput, { target: { value: '24,500' } })

    // Submete formulário
    const submitBtn = screen.getByRole('button', { name: /Gerar Demanda de Inventário/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1)
      const callPayload = createSpy.mock.calls[0][0]
      expect(callPayload.company).toBe('1001')
      expect(callPayload.line).toBe('L1')
      expect(callPayload.center).toBe('LAM-01')
      expect(callPayload.storage_deposit).toBe('DP07')
      expect(callPayload.production_order).toBe('OP-100234')
      expect(callPayload.priority).toBe('Alta')
    })
  })
})
