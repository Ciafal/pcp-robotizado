import React from 'react'
import {
  calculateRealizedPercent,
  calculateLossTons,
  aggregateCenterFromOps,
  aggregateLineFromCenters,
  HierarchyOpItem,
  HierarchyCenterItem,
} from '@/services/efficiency-assertiveness-hierarchy-service'
import { formatPercentPtBr, formatTonsPtBr } from '@/lib/formatters-ptbr'

describe('Cálculos da hierarquia do Previsto x Realizado', () => {
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

  describe('Agregação hierárquica estrita OP -> Centro -> Linha', () => {
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
        statusOp: 'CONCLUIDA',
        statusMes: null,
        statusSap: null,
      },
      {
        id: 'op-2',
        opNumber: 'OP-102',
        materialCode: 'MAT-B',
        materialDescription: 'Barra Redonda',
        batchNumber: 'L02',
        productName: 'Barra Redonda',
        scheduledDate: '2026-11-09',
        plannedStart: '2026-11-09 10:00:00',
        realStart: '2026-11-09 10:00:00',
        plannedQuantityTons: 50.0,
        realizedQuantityTons: 55.0,
        percentualRealizado: 110.0,
        statusOp: 'CONCLUIDA',
        statusMes: null,
        statusSap: null,
      },
    ]

    it('Centro consolida estritamente as OPs dele', () => {
      const center = aggregateCenterFromOps('C01', 'Centro Laminação 01', 'L1', mockOps)
      expect(center.programadoT).toBe(150.0) // 100 + 50
      expect(center.realizadoT).toBe(150.0) // 95 + 55
      expect(center.percentualRealizado).toBe(100.0)
      expect(center.perdaT).toBe(0)
      expect(center.ordersCount).toBe(2)
    })

    it('Linha consolida estritamente os Centros dela', () => {
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
        status: 'DENTRO_ESPERADO',
        ordersCount: 1,
      }

      const line = aggregateLineFromCenters('L1', 'Linha 1', [center1, center2])
      expect(line.programadoT).toBe(350.0) // 150 + 200
      expect(line.realizadoT).toBe(330.0) // 150 + 180
      expect(line.percentualRealizado).toBe(94.3) // (330 / 350) * 100 = 94.285... -> 94.3
      expect(line.perdaT).toBe(20.0)
    })
  })
})
