import { describe, it, expect } from 'vitest'
import {
  calculateRealizedPercent,
  calculateLossTons,
  aggregateCenterFromOps,
  aggregateLineFromCenters,
  type HierarchyOpItem,
  type HierarchyCenterItem,
} from '@/services/efficiency-assertiveness-hierarchy-service'
import { formatPercentPtBr, formatTonsPtBr } from '@/lib/number-format'
import { buildCorporateReportHtml } from '@/services/pxr-corporate-report-generator'

describe('Cálculos da hierarquia do Previsto x Realizado e Carteira (t)', () => {
  describe('calculateRealizedPercent (% Realizado dinâmico)', () => {
    it('calcula (Realizado / Programado) * 100 com 1 casa decimal', () => {
      expect(calculateRealizedPercent(94.2, 100)).toBe(94.2)
      expect(calculateRealizedPercent(100, 100)).toBe(100.0)
      expect(calculateRealizedPercent(105.7, 100)).toBe(105.7)
      expect(calculateRealizedPercent(442.5, 450.0)).toBe(98.3)
    })

    it('quando Programado = 0 ou <= 0, retorna null sem gerar NaN ou Infinity', () => {
      expect(calculateRealizedPercent(50, 0)).toBeNull()
      expect(calculateRealizedPercent(0, 0)).toBeNull()
      expect(calculateRealizedPercent(10, -5)).toBeNull()
    })

    it('quando Realizado = null ou undefined, retorna null', () => {
      expect(calculateRealizedPercent(null, 100)).toBeNull()
      expect(calculateRealizedPercent(undefined, 100)).toBeNull()
    })

    it('máscara pt-BR formata null como "—" e número com vírgula decimal', () => {
      const pct = calculateRealizedPercent(0, 0)
      const formattedNull = pct === null ? '—' : formatPercentPtBr(pct, 1)
      expect(formattedNull).toBe('—')

      const validPct = calculateRealizedPercent(94.2, 100)
      const formattedValid = validPct === null ? '—' : formatPercentPtBr(validPct, 1)
      expect(formattedValid).toContain('94,2')
    })
  })

  describe('calculateLossTons (Perda em t)', () => {
    it('calcula max(0, programado - realizado)', () => {
      expect(calculateLossTons(80, 100)).toBe(20)
      expect(calculateLossTons(100, 100)).toBe(0)
      expect(calculateLossTons(120, 100)).toBe(0) // NUNCA negativo
    })

    it('retorna null se realizado for null', () => {
      expect(calculateLossTons(null, 100)).toBeNull()
    })
  })

  describe('Agregação hierárquica estrita OP -> Centro -> Linha com Carteira (t) sem duplicação', () => {
    const mockOps: HierarchyOpItem[] = [
      {
        id: 'op-1',
        opNumber: 'OP-101',
        materialCode: 'MAT-A',
        materialDescription: 'Tubo 50x50',
        batchNumber: 'L01',
        productName: 'Tubo 50x50',
        scheduledDate: '2026-11-09',
        plannedStart: '2026-11-09 08:00:00',
        realStart: '2026-11-09 08:10:00',
        plannedQuantityTons: 100.0,
        realizedQuantityTons: 95.0,
        percentualRealizado: 95.0,
        carteiraT: 80.0,
        salesOrderNumber: 'PED-1234',
        statusOp: 'CONCLUIDA',
      },
      {
        id: 'op-2',
        opNumber: 'OP-102',
        materialCode: 'MAT-A',
        materialDescription: 'Tubo 50x50',
        batchNumber: 'L02',
        productName: 'Tubo 50x50',
        scheduledDate: '2026-11-09',
        plannedStart: '2026-11-09 10:00:00',
        realStart: '2026-11-09 10:00:00',
        plannedQuantityTons: 50.0,
        realizedQuantityTons: 55.0,
        percentualRealizado: 110.0,
        carteiraT: 80.0,
        salesOrderNumber: 'PED-1234', // MESMO pedido de OP-101: carteira não duplica
        statusOp: 'CONCLUIDA',
      },
      {
        id: 'op-3',
        opNumber: 'OP-103',
        materialCode: 'MAT-B',
        materialDescription: 'Barra Redonda',
        batchNumber: 'L03',
        productName: 'Barra Redonda',
        scheduledDate: '2026-11-09',
        plannedStart: '2026-11-09 12:00:00',
        realStart: '2026-11-09 12:00:00',
        plannedQuantityTons: 30.0,
        realizedQuantityTons: 30.0,
        percentualRealizado: 100.0,
        carteiraT: -15.5, // Carteira negativa de referência: sinal preservado
        salesOrderNumber: 'PED-5678',
        statusOp: 'CONCLUIDA',
      },
    ]

    it('Centro consolida carteira sem duplicar o mesmo pedido comercial e preserva sinal negativo', () => {
      const center = aggregateCenterFromOps('C01', 'Centro Laminação 01', 'L1', mockOps)
      expect(center.programadoT).toBe(180.0) // 100 + 50 + 30
      expect(center.realizadoT).toBe(180.0) // 95 + 55 + 30
      expect(center.percentualRealizado).toBe(100.0)
      expect(center.perdaT).toBe(0)
      expect(center.ordersCount).toBe(3)

      // Carteira: PED-1234 contado uma só vez (80.0) + PED-5678 (-15.5) = 64.5
      expect(center.carteiraT).toBe(64.5)
    })

    it('Linha consolida estritamente os Centros dela com carteira somada', () => {
      const center1 = aggregateCenterFromOps('C01', 'Centro 01', 'L1', mockOps)
      const center2: HierarchyCenterItem = {
        centerCode: 'C02',
        centerName: 'Centro 02',
        lineCode: 'L1',
        programadoT: 200.0,
        realizadoT: 180.0,
        percentualRealizado: 90.0,
        perdaT: 20.0,
        percentualPerda: 10.0,
        carteiraT: 50.0,
        status: 'DENTRO_ESPERADO',
        ordersCount: 1,
      }

      const line = aggregateLineFromCenters('L1', 'Linha 1', [center1, center2])
      expect(line.programadoT).toBe(380.0)
      expect(line.realizadoT).toBe(360.0)
      expect(line.carteiraT).toBe(114.5) // 64.5 + 50.0
    })
  })

  describe('Geração de Relatório HTML Corporativo', () => {
    it('gera HTML corporativo com tabela formatada em pt-BR e seção de IA', () => {
      const line: HierarchyCenterItem = {
        centerCode: 'C01',
        centerName: 'Centro 01',
        lineCode: 'L1',
        programadoT: 100,
        realizadoT: 95,
        percentualRealizado: 95,
        perdaT: 5,
        percentualPerda: 5,
        carteiraT: 40,
        status: 'DENTRO_ESPERADO',
        ordersCount: 1,
        ops: [
          {
            id: 'op-1',
            opNumber: 'OP-123',
            materialCode: 'COD-1',
            productName: 'Tubo 50',
            plannedQuantityTons: 100,
            realizedQuantityTons: 95,
            percentualRealizado: 95,
            carteiraT: 40,
            statusOp: 'CONCLUIDA',
            observacao: 'Ajuste de faca programado',
          },
        ],
      }

      const hierarchy = [aggregateLineFromCenters('L1', 'Linha 1', [line])]

      const html = buildCorporateReportHtml({
        filters: { companyCode: 'CIAFAL', lineCode: 'L1' } as any,
        hierarchy,
        responsibleName: 'Programador PCP',
      })

      expect(html).toContain('CIAFAL — PCP ROBOTIZADO / PREVISTO X REALIZADO')
      expect(html).toContain('Carteira (t)')
      expect(html).toContain('Atend. (%)')
      expect(html).toContain('OP-123')
      expect(html).toContain('Ajuste de faca programado')
    })
  })
})
