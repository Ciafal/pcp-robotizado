import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import {
  pcpStorageDepositsService,
  PROVISIONAL_STORAGE_DEPOSITS,
  PROVISIONAL_DEPOSITS_LIST,
  normalizeForSearch,
} from '@/services/pcp-storage-deposits-service'
import { sapParametersMasterDataService } from '@/services/sap-parameters-master-data-service'
import { NovaDemandaInventarioModal } from '@/components/pcp/inventory/NovaDemandaInventarioModal'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { LancarInventarioModal } from '@/components/pcp/inventory/LancarInventarioModal'
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

describe('Inventário de Matéria-Prima — Depósito Controlado Provisório (Regras de Produto & Aceite)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Critério: A lista apresenta exatamente os códigos fornecidos (DP01..DP37, DP98, DP99, DC01..DC15, DS01..DS13, DW01 — 68 itens)
  it('A lista provisória de homologação possui exatamente 68 depósitos controlados', () => {
    const list = pcpStorageDepositsService.getProvisionalDeposits()
    expect(list).toHaveLength(68)
    expect(PROVISIONAL_STORAGE_DEPOSITS).toHaveLength(68)
    expect(PROVISIONAL_DEPOSITS_LIST).toHaveLength(68)

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

  // Testes Obrigatórios de busca solicitados:
  // search("DP07") → exatamente 1 resultado "DP07 — Matéria Prima L1"
  // search("DC09") → exatamente 1 resultado "DC09 — Tarugo acabado"
  // search("DS06") → exatamente 1 resultado "DS06 — Acabado SDC"
  // search("DW01") → exatamente 1 resultado "DW01 — Armazém"
  // search("Almoxarifado") → 7 resultados (DP01, DP31, DC01, DC02, DC03, DC12, DS01)
  // search("XYZ999") → vazio (0 resultados)
  it('Testes Obrigatórios da função de busca (DP07, DC09, DS06, DW01, Almoxarifado, XYZ999)', () => {
    // 1. DP07 -> exatamente 1 resultado
    const resDP07 = pcpStorageDepositsService.getProvisionalDeposits('DP07')
    expect(resDP07).toHaveLength(1)
    expect(resDP07[0].code).toBe('DP07')
    expect(resDP07[0].description).toBe('Matéria Prima L1')
    expect(resDP07[0].label).toBe('DP07 — Matéria Prima L1')
    expect(pcpStorageDepositsService.formatDepositLabel('DP07')).toBe('DP07 — Matéria Prima L1')

    // 2. DC09 -> exatamente 1 resultado
    const resDC09 = pcpStorageDepositsService.getProvisionalDeposits('DC09')
    expect(resDC09).toHaveLength(1)
    expect(resDC09[0].code).toBe('DC09')
    expect(resDC09[0].description).toBe('Tarugo acabado')
    expect(resDC09[0].label).toBe('DC09 — Tarugo acabado')
    expect(pcpStorageDepositsService.formatDepositLabel('DC09')).toBe('DC09 — Tarugo acabado')

    // 3. DS06 -> exatamente 1 resultado
    const resDS06 = pcpStorageDepositsService.getProvisionalDeposits('DS06')
    expect(resDS06).toHaveLength(1)
    expect(resDS06[0].code).toBe('DS06')
    expect(resDS06[0].description).toBe('Acabado SDC')
    expect(resDS06[0].label).toBe('DS06 — Acabado SDC')
    expect(pcpStorageDepositsService.formatDepositLabel('DS06')).toBe('DS06 — Acabado SDC')

    // 4. DW01 -> exatamente 1 resultado
    const resDW01 = pcpStorageDepositsService.getProvisionalDeposits('DW01')
    expect(resDW01).toHaveLength(1)
    expect(resDW01[0].code).toBe('DW01')
    expect(resDW01[0].description).toBe('Armazém')
    expect(resDW01[0].label).toBe('DW01 — Armazém')
    expect(pcpStorageDepositsService.formatDepositLabel('DW01')).toBe('DW01 — Armazém')

    // 5. Almoxarifado -> exatamente 7 resultados (DP01, DP31, DC01, DC02, DC03, DC12, DS01)
    const resAlmox = pcpStorageDepositsService.getProvisionalDeposits('Almoxarifado')
    expect(resAlmox).toHaveLength(7)
    const almoxCodes = resAlmox.map((d) => d.code).sort()
    expect(almoxCodes).toEqual(['DC01', 'DC02', 'DC03', 'DC12', 'DP01', 'DP31', 'DS01'].sort())

    // 5b. Tolerância a acento: "almoxarifado" minúsculo e sem acento deve achar os mesmos 7
    const resAlmoxNoAccent = pcpStorageDepositsService.getProvisionalDeposits('almoxarifado')
    expect(resAlmoxNoAccent).toHaveLength(7)

    // 6. XYZ999 -> vazio
    const resXYZ = pcpStorageDepositsService.getProvisionalDeposits('XYZ999')
    expect(resXYZ).toHaveLength(0)
  })

  // Normalização e busca tolerante a acentos e maiúsculas/minúsculas
  it('Normalização remove acentos e marcas diacríticas corretamente', () => {
    expect(normalizeForSearch('Matéria Prima L1')).toBe('materia prima l1')
    expect(normalizeForSearch('Óleo da L1')).toBe('oleo da l1')
    expect(normalizeForSearch('Armazém')).toBe('armazem')
    expect(normalizeForSearch('Gases Indust.')).toBe('gases indust.')
    expect(normalizeForSearch('Refra-Consignado')).toBe('refra-consignado')

    // Busca por "oleo" sem acento encontra os óleos
    const oleoSearch = pcpStorageDepositsService.getProvisionalDeposits('oleo')
    expect(oleoSearch.length).toBeGreaterThanOrEqual(5)
    expect(oleoSearch.some((d) => d.code === 'DP13')).toBe(true)

    // Busca por "materia" sem acento encontra matérias primas
    const mpSearch = pcpStorageDepositsService.getProvisionalDeposits('materia')
    expect(mpSearch.length).toBeGreaterThanOrEqual(4)
    expect(mpSearch.some((d) => d.code === 'DP07')).toBe(true)
    expect(mpSearch.some((d) => d.code === 'DP02')).toBe(true)
  })

  // Preservação de grafias exatas da matriz operacional
  it('Preserva grafias exatas da matriz de homologação', () => {
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

  // Validação: não permitir salvar valor livre que não pertença à lista controlada
  it('Validação rejeita códigos inexistentes e aceita códigos válidos', () => {
    expect(pcpStorageDepositsService.isValidDepositCode('DP07')).toBe(true)
    expect(pcpStorageDepositsService.isValidDepositCode('DC09')).toBe(true)
    expect(pcpStorageDepositsService.isValidDepositCode('DS06')).toBe(true)
    expect(pcpStorageDepositsService.isValidDepositCode('DW01')).toBe(true)
    expect(pcpStorageDepositsService.isValidDepositCode('dp07')).toBe(true) // tolerância a case

    // Inválidos
    expect(pcpStorageDepositsService.isValidDepositCode('XYZ999')).toBe(false)
    expect(pcpStorageDepositsService.isValidDepositCode('DEP_INVALIDO')).toBe(false)
    expect(pcpStorageDepositsService.isValidDepositCode('QUALQUER_COISA')).toBe(false)
    expect(pcpStorageDepositsService.isValidDepositCode('')).toBe(false)
    expect(pcpStorageDepositsService.isValidDepositCode('   ')).toBe(false)
    expect(pcpStorageDepositsService.isValidDepositCode(null)).toBe(false)
    expect(pcpStorageDepositsService.isValidDepositCode(undefined)).toBe(false)
  })

  // Combobox não fica bloqueado por empresa na fonte temporária
  it('Combobox de Depósito está habilitado mesmo sem selecionar Empresa previamente', async () => {
    render(
      <NovaDemandaInventarioModal
        open={true}
        onOpenChange={() => {}}
        onSuccess={() => {}}
        initialContext={{
          company: '',
          line: '',
          center: '',
        }}
      />,
    )

    const depTrigger = screen.getByTestId('select-deposito-trigger')
    expect(depTrigger).toBeInTheDocument()
    expect(depTrigger).not.toBeDisabled()

    // Clica no trigger de Depósito mesmo sem empresa selecionada
    fireEvent.click(depTrigger)

    // Os depósitos aparecem normalmente
    await waitFor(() => {
      expect(screen.getByTestId('deposito-option-DP07')).toBeInTheDocument()
      expect(screen.getByText('DP07 — Matéria Prima L1')).toBeInTheDocument()
      expect(screen.getByTestId('sap-deposito-provisional-hint')).toBeInTheDocument()
      expect(screen.getByText('68 itens')).toBeInTheDocument()
    })
  })

  // Seleção e gravação do depósito
  it('Nova Demanda grava apenas o código (DP07) na submissão da demanda', async () => {
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
    fireEvent.click(depTrigger)

    await waitFor(() => {
      expect(screen.getByTestId('deposito-option-DP07')).toBeInTheDocument()
    })

    // Seleciona DP07
    fireEvent.click(screen.getByTestId('deposito-option-DP07'))
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
      expect(payload.storage_deposit).toBe('DP07')
    })
  })

  // Modal de sucesso e modal de lançamento exibem rótulo correto
  it('Depósito aparece com código + descrição nos modais de sucesso e lançamento', () => {
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

    const { unmount } = render(
      <DemandaSucessoModal
        open={true}
        onOpenChange={() => {}}
        demand={mockDemand}
        onClose={() => {}}
        onViewDetails={() => {}}
      />,
    )

    expect(screen.getByText('DC09 — Tarugo acabado')).toBeInTheDocument()
    unmount()

    const mockDemand2: any = {
      ...mockDemand,
      id: 'dem-002',
      storage_deposit: 'DS06',
    }

    render(
      <LancarInventarioModal
        open={true}
        onOpenChange={() => {}}
        demand={mockDemand2}
        onSuccess={() => {}}
      />,
    )

    expect(screen.getByText('DS06 — Acabado SDC')).toBeInTheDocument()
  })
})
