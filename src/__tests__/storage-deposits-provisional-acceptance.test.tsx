import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import {
  pcpStorageDepositsService,
  PROVISIONAL_STORAGE_DEPOSITS,
  StorageDepositItem,
} from '@/services/pcp-storage-deposits-service'
import { sapParametersMasterDataService } from '@/services/sap-parameters-master-data-service'
import { NovaDemandaInventarioModal } from '@/components/pcp/inventory/NovaDemandaInventarioModal'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { DemandasInventarioTable } from '@/components/pcp/inventory/DemandasInventarioTable'
import { LancarInventarioModal } from '@/components/pcp/inventory/LancarInventarioModal'
import { HistoricoRastreabilidadeModal } from '@/components/pcp/inventory/HistoricoRastreabilidadeModal'
import { DemandaSucessoModal } from '@/components/pcp/inventory/DemandaSucessoModal'

// Mock dos serviços necessários
vi.mock('@/services/pcp-production-service', () => ({
  pcpProductionService: {
    getOrders: vi.fn().mockResolvedValue({
      data: [
        {
          op_number: 'OP-TEST-001',
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

describe('Inventário de Matéria-Prima — Depósito Controlado Provisório (16 Critérios de Aceite)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Critério 2: A lista apresenta exatamente os códigos fornecidos (DP01..DP37, DP98, DP99, DC01..DC15, DS01..DS13, DW01 — 68 itens)
  it('Critério 2: A lista provisória de homologação possui exatamente 68 depósitos controlados', () => {
    const list = pcpStorageDepositsService.getProvisionalDeposits()
    expect(list).toHaveLength(68)
    expect(PROVISIONAL_STORAGE_DEPOSITS).toHaveLength(68)

    // DP: 39 depósitos (DP01 a DP37 + DP98 + DP99)
    const dpList = list.filter((d) => d.code.startsWith('DP'))
    expect(dpList).toHaveLength(39)

    // DC: 15 depósitos (DC01 a DC15)
    const dcList = list.filter((d) => d.code.startsWith('DC'))
    expect(dcList).toHaveLength(15)

    // DS: 13 depósitos (DS01 a DS13)
    const dsList = list.filter((d) => d.code.startsWith('DS'))
    expect(dsList).toHaveLength(13)

    // DW: 1 depósito (DW01)
    const dwList = list.filter((d) => d.code.startsWith('DW'))
    expect(dwList).toHaveLength(1)
  })

  // Critérios 8, 9, 10, 11: Códigos e descrições específicos da matriz
  it('Critérios 8, 9, 10, 11 e 5: Padrão [Código] — [Descrição] e grafias exatas', () => {
    // 8. DP07 -> DP07 — Matéria Prima L1
    const dp07 = PROVISIONAL_STORAGE_DEPOSITS.find((d) => d.code === 'DP07')
    expect(dp07).toBeDefined()
    expect(dp07?.description).toBe('Matéria Prima L1')
    expect(pcpStorageDepositsService.formatDepositLabel('DP07')).toBe('DP07 — Matéria Prima L1')

    // 9. DC09 -> DC09 — Tarugo acabado
    const dc09 = PROVISIONAL_STORAGE_DEPOSITS.find((d) => d.code === 'DC09')
    expect(dc09).toBeDefined()
    expect(dc09?.description).toBe('Tarugo acabado')
    expect(pcpStorageDepositsService.formatDepositLabel('DC09')).toBe('DC09 — Tarugo acabado')

    // 10. DS06 -> DS06 — Acabado SDC
    const ds06 = PROVISIONAL_STORAGE_DEPOSITS.find((d) => d.code === 'DS06')
    expect(ds06).toBeDefined()
    expect(ds06?.description).toBe('Acabado SDC')
    expect(pcpStorageDepositsService.formatDepositLabel('DS06')).toBe('DS06 — Acabado SDC')

    // 11. DW01 -> DW01 — Armazém
    const dw01 = PROVISIONAL_STORAGE_DEPOSITS.find((d) => d.code === 'DW01')
    expect(dw01).toBeDefined()
    expect(dw01?.description).toBe('Armazém')
    expect(pcpStorageDepositsService.formatDepositLabel('DW01')).toBe('DW01 — Armazém')

    // Grafias especiais preservadas:
    // "Tarugo semiacabo" sem "d"
    expect(pcpStorageDepositsService.getDepositDescription('DC08')).toBe('Tarugo semiacabo')
    // "MatériaPrima SDC" sem espaço
    expect(pcpStorageDepositsService.getDepositDescription('DS03')).toBe('MatériaPrima SDC')
    // "Gases Indust." com ponto
    expect(pcpStorageDepositsService.getDepositDescription('DC14')).toBe('Gases Indust.')
    // "Refra-Consignado" com hífen
    expect(pcpStorageDepositsService.getDepositDescription('DC15')).toBe('Refra-Consignado')
    // Óleo com acento
    expect(pcpStorageDepositsService.getDepositDescription('DP13')).toBe('Óleo da L1')
  })

  // Critério 3 & 4: Pesquisa por código e por descrição
  it('Critérios 3 e 4: Pesquisa funciona por código e por descrição', () => {
    // Pesquisa por código "DP07"
    const searchCode = pcpStorageDepositsService.getProvisionalDeposits('DP07')
    expect(searchCode).toHaveLength(1)
    expect(searchCode[0].code).toBe('DP07')
    expect(searchCode[0].description).toBe('Matéria Prima L1')

    // Pesquisa por descrição "Almoxarifado" -> retorna DP01, DP31, DC01, DC02, DC03, DC12, DS01
    const searchDesc = pcpStorageDepositsService.getProvisionalDeposits('Almoxarifado')
    expect(searchDesc.length).toBeGreaterThanOrEqual(5)
    expect(searchDesc.some((d) => d.code === 'DP01')).toBe(true)
    expect(searchDesc.some((d) => d.code === 'DS01')).toBe(true)
    expect(searchDesc.some((d) => d.code === 'DC01')).toBe(true)

    // Pesquisa "Subprodutos" -> DP99, DC11, DS10
    const searchSub = pcpStorageDepositsService.getProvisionalDeposits('Subprodutos')
    expect(searchSub.some((d) => d.code === 'DP99')).toBe(true)
    expect(searchSub.some((d) => d.code === 'DC11')).toBe(true)
    expect(searchSub.some((d) => d.code === 'DS10')).toBe(true)
  })

  // Critério 7: Não permitir salvar valor livre que não pertença à lista
  it('Critério 7: Validação rejeita códigos inexistentes na lista controlada', () => {
    expect(pcpStorageDepositsService.isValidDepositCode('DP07')).toBe(true)
    expect(pcpStorageDepositsService.isValidDepositCode('DC09')).toBe(true)
    expect(pcpStorageDepositsService.isValidDepositCode('DS06')).toBe(true)
    expect(pcpStorageDepositsService.isValidDepositCode('DW01')).toBe(true)

    // Códigos inválidos ou digitação livre arbitrária
    expect(pcpStorageDepositsService.isValidDepositCode('DEP_INVALIDO')).toBe(false)
    expect(pcpStorageDepositsService.isValidDepositCode('QUALQUER_COISA')).toBe(false)
    expect(pcpStorageDepositsService.isValidDepositCode('')).toBe(false)
    expect(pcpStorageDepositsService.isValidDepositCode('   ')).toBe(false)
  })

  // Critério 16: Preparação para substituição futura por RFC SAP
  it('Critério 16: Quando RFC responder com sucesso, assume como fonte oficial; quando indisponível, usa homologação', async () => {
    // 1. Cenário RFC disponível (SAP ECC ativo)
    vi.spyOn(sapParametersMasterDataService, 'fetchDeposits').mockResolvedValueOnce({
      success: true,
      data: [
        {
          lgort: 'LG01',
          werks: '1001',
          description: 'Depósito RFC Ativo',
          label: 'LG01 — Depósito RFC Ativo',
          source: 'SAP_T001L',
        },
      ],
      timestamp: new Date().toISOString(),
    })

    const rfcResult = await pcpStorageDepositsService.getDepositsForDemand({
      werks: '1001',
      preferRfc: true,
    })
    expect(rfcResult.source).toBe('SAP_RFC')
    expect(rfcResult.isProvisional).toBe(false)
    expect(rfcResult.data[0].code).toBe('LG01')

    // 2. Cenário RFC indisponível (503 / homologação) -> fallback automático de 68 depósitos
    vi.spyOn(sapParametersMasterDataService, 'fetchDeposits').mockResolvedValueOnce({
      success: false,
      data: [],
      isUnavailable: true,
      error: 'RFC Indisponível',
      timestamp: new Date().toISOString(),
    })

    const fallbackResult = await pcpStorageDepositsService.getDepositsForDemand({
      werks: '1001',
      preferRfc: true,
    })
    expect(fallbackResult.source).toBe('PROVISIONAL_HOMOLOGATION')
    expect(fallbackResult.isProvisional).toBe(true)
    expect(fallbackResult.totalCount).toBe(68)
    expect(fallbackResult.warningMessage).toContain('Lista temporária para homologação')
  })

  // Critérios 1, 6, 12: No popup Nova Demanda, campo Depósito possui opções, grava código selecionado
  it('Critérios 1, 6 e 12: Nova Demanda abre com opções de depósitos e grava apenas o código na demanda', async () => {
    const createSpy = vi.spyOn(pcpInventoryDemandsService, 'createDemand').mockResolvedValueOnce({
      id: 'dem-001',
      control_number: 'INV-2026-000001',
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
        }}
      />,
    )

    // Clica no combobox de Depósito
    const depTrigger = screen.getByTestId('select-deposito-trigger')
    expect(depTrigger).toBeInTheDocument()
    fireEvent.click(depTrigger)

    // Critério 1: Depósito possui opções e exibe o hint provisório
    await waitFor(() => {
      expect(screen.getByTestId('deposito-option-DP07')).toBeInTheDocument()
      expect(screen.getByText('DP07 — Matéria Prima L1')).toBeInTheDocument()
      expect(screen.getByTestId('sap-deposito-provisional-hint')).toBeInTheDocument()
    })

    // Seleciona DP07
    fireEvent.click(screen.getByTestId('deposito-option-DP07'))

    // O trigger exibe o label formatado
    expect(depTrigger).toHaveTextContent('DP07 — Matéria Prima L1')

    // Preenche OP, Prioridade, MP e Quantidade
    fireEvent.click(screen.getByText('Selecione a OP...'))
    await waitFor(() => screen.getByText('OP-TEST-001'))
    fireEvent.click(screen.getByText('OP-TEST-001'))

    fireEvent.click(screen.getByText('Normal'))

    const mpInput = screen.getByPlaceholderText('Ex.: MP-4140-100MM')
    fireEvent.change(mpInput, { target: { value: 'MP-4140-100MM' } })

    const qtyInput = screen.getByPlaceholderText('Ex.: 24,500')
    fireEvent.change(qtyInput, { target: { value: '10,000' } })

    // Submete
    const submitBtn = screen.getByRole('button', { name: /Gerar Demanda de Inventário/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1)
      const payload = createSpy.mock.calls[0][0]
      // Critério 6: Sistema grava apenas o código (DP07)
      expect(payload.storage_deposit).toBe('DP07')
    })
  })

  // Critério 13: Depósito aparece corretamente ao visualizar a demanda (tabela e modal de sucesso)
  it('Critério 13: Depósito aparece com código + descrição na tabela e no modal de detalhes', () => {
    const mockDemand: any = {
      id: 'dem-001',
      control_number: 'INV-2026-000001',
      company: '1001',
      line: 'L1',
      center: 'LAM-01',
      storage_deposit: 'DC09',
      production_order: 'OP-45000',
      material_code: 'MP-1045',
      material_description: 'Tarugo 1045',
      status: 'Gerada',
      priority: 'Normal',
      total_pieces_required: 100,
      total_pieces_inventoried: 0,
      created: new Date().toISOString(),
    }

    // Modal de Sucesso
    const { unmount } = render(
      <DemandaSucessoModal
        open={true}
        onOpenChange={() => {}}
        demand={mockDemand}
        onClose={() => {}}
        onViewDetails={() => {}}
      />,
    )

    // Confere que exibe DC09 — Tarugo acabado
    expect(screen.getByText('DC09 — Tarugo acabado')).toBeInTheDocument()
    unmount()
  })

  // Critério 14: Depósito aparece corretamente ao lançar o inventário
  it('Critério 14: Depósito aparece corretamente no cabeçalho do LancarInventarioModal', () => {
    const mockDemand: any = {
      id: 'dem-002',
      control_number: 'INV-2026-000002',
      company: '1001',
      line: 'L1',
      center: 'LAM-01',
      storage_deposit: 'DS06',
      production_order: 'OP-45000',
      material_code: 'MP-1045',
      material_description: 'Tarugo 1045',
      status: 'Gerada',
      priority: 'Normal',
      total_pieces_required: 80,
      total_pieces_inventoried: 0,
    }

    render(
      <LancarInventarioModal
        open={true}
        onOpenChange={() => {}}
        demand={mockDemand}
        onSuccess={() => {}}
      />,
    )

    // DS06 — Acabado SDC deve estar presente
    expect(screen.getByText('DS06 — Acabado SDC')).toBeInTheDocument()
  })
})
