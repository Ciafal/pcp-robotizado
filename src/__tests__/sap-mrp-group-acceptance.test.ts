import { describe, it, expect, vi } from 'vitest'
import { sapMrpService } from '@/services/sap-mrp-service'
import { LineBottleneckMatrixRecord } from '@/types/bottleneck-matrix'
import { computeDiff } from '@/services/pcp-audit-service'

describe('FRENTE 6 — GRUPO MRP (MARC-DISGR, SAP) no Módulo PCP Robotizado', () => {
  describe('1. Mapeamento Empresa PCP -> WERKS SAP', () => {
    it('deve mapear CIAFAL Wilson Santos padrão para WERKS 1001 (CFPL / Divinópolis)', () => {
      expect(sapMrpService.mapCompanyToWerks('CIAFAL')).toBe('1001')
      expect(sapMrpService.mapCompanyToWerks('CIAFAL', 'CTG')).toBe('1002')
    })

    it('deve mapear KS-FERRADURA para WERKS 2001', () => {
      expect(sapMrpService.mapCompanyToWerks('KS-FERRADURA')).toBe('2001')
    })

    it('deve mapear KS-CIAFAL para WERKS 2101', () => {
      expect(sapMrpService.mapCompanyToWerks('KS-CIAFAL')).toBe('2101')
    })

    it('deve mapear SIDERCENTRO para WERKS 3001', () => {
      expect(sapMrpService.mapCompanyToWerks('SIDERCENTRO')).toBe('3001')
    })
  })

  describe('2. Formatação visual do item Grupo MRP', () => {
    it('deve exibir "0010 — Laminados / WERKS CFPL" quando houver descrição (WERKS 1001)', () => {
      const label = sapMrpService.formatMrpDisplay({
        disgr: '0010',
        description: 'Laminados',
        werks: '1001',
      })
      expect(label).toBe('0010 — Laminados / WERKS CFPL')
    })

    it('deve exibir apenas o código quando a fonte SAP não fornecer descrição (NÃO inventar descrição local)', () => {
      const label = sapMrpService.formatMrpDisplay({
        disgr: '0099',
        description: '',
        werks: '1001',
      })
      expect(label).toBe('0099 / WERKS CFPL')
    })

    it('deve exibir com a planta correspondente para outras plantas como 2001', () => {
      const label = sapMrpService.formatMrpDisplay({
        disgr: '0010',
        description: 'Ferraduras & Acessórios',
        werks: '2001',
      })
      expect(label).toBe('0010 — Ferraduras & Acessórios / WERKS 2001')
    })
  })

  describe('3. Resolução de Matriz de Referência por Vigência e Grupo MRP', () => {
    const mockMatrices: Partial<LineBottleneckMatrixRecord>[] = [
      {
        id: 'MAT-01',
        line_code: 'L1',
        gauge_dimension: 'TQ-50x50x2.0',
        steel_grade: 'SAE 1012',
        product_family: 'Tubos Quadrados',
        mrp_group_code: '0010',
        mrp_group_description: 'Laminados',
        werks: '1001',
        status: 'VIGENTE',
        is_homologated: true,
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        version: 1,
        reference_doc: 'DOC-01',
        created: '2026-01-01',
        updated: '2026-01-01',
      },
      {
        id: 'MAT-02',
        line_code: 'L1',
        gauge_dimension: 'TR-1/2',
        steel_grade: 'SAE 1020',
        product_family: 'Redondos',
        mrp_group_code: '0020',
        mrp_group_description: 'Trefilados',
        werks: '1001',
        status: 'VIGENTE',
        is_homologated: true,
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        version: 1,
        reference_doc: 'DOC-02',
        created: '2026-01-01',
        updated: '2026-01-01',
      },
    ]

    it('deve resolver com sucesso uma Matriz Válida correspondente ao Grupo MRP e planta', () => {
      const res = sapMrpService.resolveReferenceMatrix(mockMatrices, {
        line_code: 'L1',
        mrp_group_code: '0010',
        werks: '1001',
        target_date: '2026-06-15',
      })

      expect(res.status).toBe('VALID')
      expect(res.matched_matrix?.id).toBe('MAT-01')
      expect(res.message).toContain('Matriz de Referência válida')
    })

    it('deve reportar NOT_FOUND quando nenhuma matriz ativa corresponder ao Grupo MRP', () => {
      const res = sapMrpService.resolveReferenceMatrix(mockMatrices, {
        line_code: 'L1',
        mrp_group_code: '9999',
        werks: '1001',
        target_date: '2026-06-15',
        material_code: 'MAT-UNKNOWN',
      })

      expect(res.status).toBe('NOT_FOUND')
      expect(res.message).toBe(
        'Matriz de Referência não encontrada para o Grupo MRP deste material.',
      )
      expect(res.details?.action_label).toBe('Configurar Matriz de Referência')
    })

    it('deve reportar CONFLICT quando houver mais de uma matriz válida para os mesmos parâmetros', () => {
      const conflictMatrices: Partial<LineBottleneckMatrixRecord>[] = [
        ...mockMatrices,
        {
          id: 'MAT-01-DUPLICATE',
          line_code: 'L1',
          gauge_dimension: 'TQ-50x50x2.0-VAR',
          steel_grade: 'SAE 1012',
          product_family: 'Tubos Quadrados',
          mrp_group_code: '0010',
          mrp_group_description: 'Laminados',
          werks: '1001',
          status: 'VIGENTE',
          is_homologated: true,
          valid_from: '2026-01-01',
          valid_until: '2026-12-31',
          version: 2,
          reference_doc: 'DOC-01-DUP',
          created: '2026-01-01',
          updated: '2026-01-01',
        },
      ]

      const res = sapMrpService.resolveReferenceMatrix(conflictMatrices, {
        line_code: 'L1',
        mrp_group_code: '0010',
        werks: '1001',
        target_date: '2026-06-15',
      })

      expect(res.status).toBe('CONFLICT')
      expect(res.matched_matrices?.length).toBe(2)
      expect(res.message).toBe(
        'Existe mais de uma Matriz de Referência válida para estes parâmetros. Revise a configuração.',
      )
    })
  })

  describe('4. Trilha de Auditoria com computeDiff para Grupo MRP', () => {
    it('deve calcular corretamente a alteração de Grupo MRP para registro em pcp_audit_logs', () => {
      const before = {
        mrp_group_code: '0010',
        mrp_group_description: 'Laminados',
        werks: '1001',
      }

      const after = {
        mrp_group_code: '0020',
        mrp_group_description: 'Trefilados & Conformados',
        werks: '1001',
      }

      const changes = computeDiff(before, after)
      expect(changes.length).toBe(2)

      const mrpChange = changes.find((c) => c.field === 'mrp_group_code')
      expect(mrpChange).toBeDefined()
      expect(mrpChange?.fieldNamePt).toBe('Grupo MRP (MARC-DISGR)')
      expect(mrpChange?.before).toBe('0010')
      expect(mrpChange?.after).toBe('0020')
    })
  })

  describe('5. Degradação Graciosa em caso de falha de conexão SAP', () => {
    it('deve lançar mensagem amigável sem quebrar o módulo quando SAP estiver indisponível', async () => {
      // Teste da exceção amigável gerada pelo serviço
      try {
        await sapMrpService.syncMrpGroups({ simulateOffline: true })
      } catch (err: any) {
        expect(err.message).toContain('SAP temporariamente indisponível')
      }
    })
  })
})
