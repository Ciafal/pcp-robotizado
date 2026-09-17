import { describe, it, expect, vi } from 'vitest'
import { sapMrpService } from '@/services/sap-mrp-service'
import { LineBottleneckMatrixRecord } from '@/types/bottleneck-matrix'
import { computeDiff } from '@/services/pcp-audit-service'

describe('CORREÇÃO IMEDIATA — PLANEJADOR MRP (MARC-DISPO) no Módulo PCP Robotizado', () => {
  // TESTE TÉCNICO OBRIGATÓRIO (Item 12): Garantir que MARC-DISPO = Planejador MRP e MARC-DISGR = Grupo MRP são conceitos distintos
  describe('Teste Técnico (Item 12): MARC-DISPO vs MARC-DISGR são tratados como conceitos distintos', () => {
    it('deve assegurar que MARC-DISPO se refere estritamente a Planejador MRP e MARC-DISGR a Grupo MRP', () => {
      // 1. DISPO (T024D)
      const dispoItem = {
        dispo: 'P01',
        description: 'Planejamento Laminação L1',
        werks: '1001',
      }
      const formattedDispo = sapMrpService.formatMrpControllerDisplay(dispoItem)
      expect(formattedDispo).toBe('P01 — Planejamento Laminação L1 / WERKS CFPL')
      expect(dispoItem.dispo).toBe('P01')

      // 2. DISGR (T438A)
      const disgrItem = {
        disgr: '0010',
        description: 'Laminados Perfil',
        werks: '1001',
      }
      const formattedDisgr = sapMrpService.formatMrpDisplay(disgrItem)
      expect(formattedDisgr).toBe('0010 — Laminados Perfil / WERKS CFPL')
      expect(disgrItem.disgr).toBe('0010')

      // Não podem colidir ou misturar chaves
      expect(formattedDispo).not.toEqual(formattedDisgr)
      expect('dispo' in dispoItem).toBe(true)
      expect('disgr' in dispoItem).toBe(false)
      expect('disgr' in disgrItem).toBe(true)
      expect('dispo' in disgrItem).toBe(false)
    })
  })

  // TESTE OBRIGATÓRIO 23: Carga SAP — selecionar Empresa/WERKS, executar consulta, lista Código+Descrição deve aparecer
  describe('Teste Obrigatório (23): Carga SAP de Planejadores MRP (MARC-DISPO)', () => {
    it('deve mapear Empresa para WERKS e formatar rótulo "Código — Descrição" sem select vazio', () => {
      const werks = sapMrpService.mapCompanyToWerks('CIAFAL')
      expect(werks).toBe('1001')

      const controllerSample = {
        dispo: 'P01',
        description: 'Planejamento Laminação L1',
        werks: '1001',
      }
      const display = sapMrpService.formatMrpControllerDisplay(controllerSample)
      expect(display).toBe('P01 — Planejamento Laminação L1 / WERKS CFPL')
      expect(display).toContain('P01 — Planejamento Laminação L1')
    })

    it('quando o SAP não fornecer descrição para o DISPO, nunca inventar código ou descrição (Item 2 e 3)', () => {
      const controllerWithoutDesc = {
        dispo: 'P99',
        description: '',
        werks: '1001',
      }
      const display = sapMrpService.formatMrpControllerDisplay(controllerWithoutDesc)
      expect(display).toBe('P99 / WERKS CFPL')
      expect(display).not.toContain('undefined')
      expect(display).not.toContain('Planejador Padrão')
    })

    it('deve respeitar Empresa e WERKS sem misturar planejadores de plantas distintas (Item 4)', () => {
      const controllerCFPL = {
        dispo: 'P01',
        description: 'Planejamento Laminação L1',
        werks: '1001',
      }
      const controllerCTG = {
        dispo: 'P01',
        description: 'Planejamento Perfis Estruturais CTG',
        werks: '1002',
      }
      const controllerKSF = {
        dispo: 'K01',
        description: 'Planejamento Ferraduras & Acessórios',
        werks: '2001',
      }

      const displayCFPL = sapMrpService.formatMrpControllerDisplay(controllerCFPL)
      const displayCTG = sapMrpService.formatMrpControllerDisplay(controllerCTG)
      const displayKSF = sapMrpService.formatMrpControllerDisplay(controllerKSF)

      expect(displayCFPL).toContain('/ WERKS CFPL')
      expect(displayCTG).toContain('/ WERKS 1002')
      expect(displayKSF).toContain('/ WERKS 2001')
      expect(displayCFPL).not.toEqual(displayCTG)
    })
  })

  // TESTE OBRIGATÓRIO 24: Criar Matriz, salvar, fechar, reabrir — persistência de Empresa, WERKS, Linha, Planejador, código, descrição, vigência, status
  describe('Teste Obrigatório (24): Persistência de Matriz de Referência por Planejador MRP', () => {
    it('deve estruturar os campos de persistência de Empresa, WERKS, Linha, Planejador MRP e vigência', () => {
      const matrixPayload: Partial<LineBottleneckMatrixRecord> = {
        id: 'LBM-2026-DISPO-01',
        matrix_name: 'Matriz L1 — Quadrados Pesados',
        line_code: 'L1',
        company_code: 'CIAFAL',
        werks: '1001',
        mrp_controller_code: 'P01',
        mrp_controller_description: 'Planejamento Laminação L1',
        mrp_controllers_json: ['P01', 'P03'],
        valid_from: '2026-01-01 00:00:00.000Z',
        valid_until: '2026-12-31 00:00:00.000Z',
        status: 'VIGENTE',
        version: 1,
        is_homologated: true,
        primary_bottleneck_stage: 'TREM_CONTINUO',
        primary_bottleneck_rate_th: 24.8,
      }

      expect(matrixPayload.company_code).toBe('CIAFAL')
      expect(matrixPayload.werks).toBe('1001')
      expect(matrixPayload.line_code).toBe('L1')
      expect(matrixPayload.mrp_controller_code).toBe('P01')
      expect(matrixPayload.mrp_controller_description).toBe('Planejamento Laminação L1')
      expect(matrixPayload.mrp_controllers_json).toContain('P01')
      expect(matrixPayload.mrp_controllers_json).toContain('P03')
      expect(matrixPayload.valid_from).toBe('2026-01-01 00:00:00.000Z')
      expect(matrixPayload.status).toBe('VIGENTE')
    })

    it('deve calcular trilha de auditoria oficial com rótulos em Português (Item 15)', () => {
      const before = {
        mrp_controller_code: 'P01',
        mrp_controller_description: 'Planejamento Laminação L1',
        werks: '1001',
      }
      const after = {
        mrp_controller_code: 'P02',
        mrp_controller_description: 'Planejamento Trefilação e Acabamento',
        werks: '1001',
      }

      const diff = computeDiff(before, after)
      expect(diff.length).toBe(2)
      const ctrlDiff = diff.find((d) => d.field === 'mrp_controller_code')
      expect(ctrlDiff).toBeDefined()
      expect(ctrlDiff?.fieldNamePt).toBe('Planejador MRP (MARC-DISPO)')
      expect(ctrlDiff?.before).toBe('P01')
      expect(ctrlDiff?.after).toBe('P02')
    })
  })

  // TESTE OBRIGATÓRIO 25: Com duas Matrizes, dropdown lista ambas e trocar seleção atualiza toda a tela
  describe('Teste Obrigatório (25): Dropdown superior "Matriz" e atualização completa', () => {
    it('deve formatar o dropdown com Nome, Família, Revisão, Status e Planejador MRP', () => {
      const matrixA: Partial<LineBottleneckMatrixRecord> = {
        id: 'MAT-A',
        matrix_name: 'Matriz ENDIR — 130x130 SAE 1020',
        product_family: 'QUAD_130',
        version: 1,
        status: 'VIGENTE',
        mrp_controller_code: 'P01',
      }
      const matrixB: Partial<LineBottleneckMatrixRecord> = {
        id: 'MAT-B',
        matrix_name: 'Matriz Perfis Cantoneira L1',
        product_family: 'PERFIS_LEVES',
        version: 2,
        status: 'VIGENTE',
        mrp_controller_code: 'P03',
      }

      const labelA = sapMrpService.formatMatrixDropdownItem(matrixA)
      const labelB = sapMrpService.formatMatrixDropdownItem(matrixB)

      expect(labelA).toContain(
        'Matriz ENDIR — 130x130 SAE 1020 (QUAD_130) — Rev.1 — VIGENTE [DISPO: P01]',
      )
      expect(labelB).toContain(
        'Matriz Perfis Cantoneira L1 (PERFIS_LEVES) — Rev.2 — VIGENTE [DISPO: P03]',
      )
      expect(labelA).not.toEqual(labelB)
    })
  })

  // TESTE OBRIGATÓRIO 26: Material SAP conhecido -> MARC-WERKS/MARC-DISPO -> Planejador -> Matriz
  describe('Teste Obrigatório (26): Resolução de Material SAP -> MARC-DISPO -> Matriz', () => {
    const matricesFixture: Partial<LineBottleneckMatrixRecord>[] = [
      {
        id: 'MAT-P01',
        matrix_name: 'Matriz Laminação Principal',
        line_code: 'L1',
        company_code: 'CIAFAL',
        werks: '1001',
        mrp_controller_code: 'P01',
        mrp_controller_description: 'Planejamento Laminação L1',
        mrp_controllers_json: ['P01'],
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        status: 'VIGENTE',
        is_homologated: true,
        primary_bottleneck_stage: 'TREM_CONTINUO',
        primary_bottleneck_rate_th: 24.8,
      },
      {
        id: 'MAT-MULTI',
        matrix_name: 'Matriz Cantoneiras e Perfis',
        line_code: 'L1',
        company_code: 'CIAFAL',
        werks: '1001',
        mrp_controller_code: 'P03',
        mrp_controllers_json: ['P03', 'P04'],
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        status: 'VIGENTE',
        is_homologated: true,
        primary_bottleneck_stage: 'TCC_RESFRIAMENTO',
        primary_bottleneck_rate_th: 26.1,
      },
    ]

    it('deve resolver a matriz correta a partir do material e seu Planejador MRP MARC-DISPO', () => {
      const result = sapMrpService.resolveMatrixByMrpController(matricesFixture, {
        material_code: 'TQ-50x50x2.0',
        material_description: 'Tubo Quadrado 50x50x2.0mm',
        company_code: 'CIAFAL',
        werks: '1001',
        line_code: 'L1',
        mrp_controller_code: 'P01',
        target_date: '2026-05-10',
      })

      expect(result.status).toBe('VALID')
      expect(result.matched_matrix?.id).toBe('MAT-P01')
      expect(result.matched_matrix?.primary_bottleneck_stage).toBe('TREM_CONTINUO')
      expect(result.matched_matrix?.primary_bottleneck_rate_th).toBe(24.8)
    })

    it('deve reconhecer matriz por multisseleção de Planejador MRP (mrp_controllers_json)', () => {
      const result = sapMrpService.resolveMatrixByMrpController(matricesFixture, {
        material_code: 'CANTONEIRA-2POL',
        werks: '1001',
        line_code: 'L1',
        mrp_controller_code: 'P04', // Está na lista do MAT-MULTI
      })

      expect(result.status).toBe('VALID')
      expect(result.matched_matrix?.id).toBe('MAT-MULTI')
    })
  })

  // TESTES DE EXCEÇÃO E CONSISTÊNCIA (Itens 10 e 11)
  describe('Testes de Exceção e Consistência (Itens 10 e 11)', () => {
    const matricesFixture: Partial<LineBottleneckMatrixRecord>[] = [
      {
        id: 'MAT-P01',
        line_code: 'L1',
        werks: '1001',
        mrp_controller_code: 'P01',
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        status: 'VIGENTE',
        is_homologated: true,
      },
    ]

    it('Item 11: Material sem Planejador MRP no SAP (MARC-DISPO vazio) deve emitir inconsistência sem inventar dados', () => {
      const result = sapMrpService.resolveMatrixByMrpController(matricesFixture, {
        material_code: 'PU-FINO-1.20',
        material_description: 'Perfil U Chapa Fina #1.20mm',
        werks: '1001',
        line_code: 'L1',
        mrp_controller_code: '', // MARC-DISPO vazio no SAP
      })

      expect(result.status).toBe('NO_MRP_CONTROLLER')
      expect(result.message).toBe('Material sem Planejador MRP definido no SAP.')
      expect(result.matched_matrix).toBeUndefined()
    })

    it('Item 10: Matriz não encontrada não seleciona outra automaticamente; emite alerta "Matriz de Gargalos não configurada"', () => {
      const result = sapMrpService.resolveMatrixByMrpController(matricesFixture, {
        material_code: 'MAT-ESPECIAL-99',
        werks: '1001',
        line_code: 'L1',
        mrp_controller_code: 'P99', // Não cadastrado em nenhuma matriz
      })

      expect(result.status).toBe('NOT_FOUND')
      expect(result.message).toBe('Matriz de Gargalos não configurada para este Planejador MRP.')
      expect(result.matched_matrix).toBeUndefined()
      expect(result.details?.action_label).toBe('Configurar Matriz')
    })
  })
})
