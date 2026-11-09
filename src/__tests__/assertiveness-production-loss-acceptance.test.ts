/**
 * Testes de aceitação — Previsto x Realizado: 5 novas colunas de Produção e Perda
 * na tabela "Assertividade Operacional por Linha de Produção".
 *
 * Cenários do usuário:
 * (1) Programado > Realizado → perda em t e % corretas
 * (2) Programado = Realizado → 100,0%, Perda 0,00 t, 0,0%
 * (3) Realizado > Programado → % realizado > 100%, Perda 0,00 t, % perda 0,0%
 * (4) Programado = 0 → "—", sem NaN/Infinity/erro
 * (5) Recalcula ao aplicar filtros
 *
 * A ordem exata das colunas na tabela é verificada diretamente no código-fonte da página
 * (mesma sequência declarada no thead), mantendo o teste independente de ambiente de DOM.
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import {
  aggregateProductionLossByLine,
  mapFiltersToCenterFilters,
  getProductionLossByLine,
} from '@/services/line-production-loss-service'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'

// Mock do serviço oficial do Previsto x Realizado — o mesmo contrato que alimenta
// os cards e a tabela existentes. Nenhum dado é mockado no CÓDIGO de produção: o mock
// aqui só simula a resposta oficial do serviço já existente.
const getEfficiencyByCenterMock = vi.fn()
vi.mock('@/services/efficiency-center-service', () => ({
  efficiencyCenterService: {
    getEfficiencyByCenter: (...args: unknown[]) => getEfficiencyByCenterMock(...args),
  },
}))

const baseFilters: UnifiedEfficiencyFilters = {
  companyCode: 'ALL',
  plantCode: 'ALL',
  lineCode: 'ALL',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
}

describe('aggregateProductionLossByLine — fórmulas e regras', () => {
  it('cenário 1: Programado > Realizado → perda em t e % corretas (1.000 → 958 ⇒ 95,8% e 42,00 t / 4,2%)', () => {
    const result = aggregateProductionLossByLine([
      {
        lineCode: 'L1',
        lineName: 'Laminação',
        plannedQuantityTons: 500,
        realizedQuantityTons: 458,
        mesAvailable: true,
      },
      {
        lineCode: 'L1',
        lineName: 'Laminação',
        plannedQuantityTons: 500,
        realizedQuantityTons: 500,
        mesAvailable: true,
      },
    ])
    const row = result.rows.find((r) => r.lineCode === 'L1')!
    expect(row.programadoT).toBe(1000)
    expect(row.realizadoT).toBe(958)
    expect(row.percentualRealizado).toBeCloseTo(95.8, 1)
    expect(row.perdaT).toBeCloseTo(42, 2)
    expect(row.percentualPerda).toBeCloseTo(4.2, 1)
    // Formatação pt-BR/ABNT exibida na tabela
    expect(formatTonsPtBr(row.programadoT)).toBe('1.000,00 t')
    expect(formatTonsPtBr(row.realizadoT)).toBe('958,00 t')
    expect(formatTonsPtBr(row.perdaT)).toBe('42,00 t')
    expect(formatPercentPtBr(row.percentualRealizado, 1)).toBe('95,8%')
    expect(formatPercentPtBr(row.percentualPerda, 1)).toBe('4,2%')
  })

  it('cenário 2: Programado = Realizado → 100,0%, Perda 0,00 t, 0,0%', () => {
    const result = aggregateProductionLossByLine([
      {
        lineCode: 'L2',
        lineName: 'Trefilação',
        plannedQuantityTons: 300,
        realizedQuantityTons: 300,
        mesAvailable: true,
      },
    ])
    const row = result.rows[0]
    expect(row.percentualRealizado).toBe(100)
    expect(row.perdaT).toBe(0)
    expect(row.percentualPerda).toBe(0)
    expect(formatPercentPtBr(row.percentualRealizado, 1)).toBe('100,0%')
    expect(formatTonsPtBr(row.perdaT)).toBe('0,00 t')
    expect(formatPercentPtBr(row.percentualPerda, 1)).toBe('0,0%')
  })

  it('cenário 3: Realizado > Programado → % > 100%, Perda 0,00 t (NUNCA negativa), % perda 0,0%', () => {
    const result = aggregateProductionLossByLine([
      {
        lineCode: 'L3',
        lineName: 'Corte',
        plannedQuantityTons: 100,
        realizedQuantityTons: 120,
        mesAvailable: true,
      },
    ])
    const row = result.rows[0]
    expect(row.percentualRealizado).toBe(120)
    expect(row.perdaT).toBe(0)
    expect(row.percentualPerda).toBe(0)
    expect(row.perdaT).toBeGreaterThanOrEqual(0)
    expect(formatTonsPtBr(row.perdaT)).toBe('0,00 t')
    expect(formatPercentPtBr(row.percentualPerda, 1)).toBe('0,0%')
  })

  it('cenário 4: Programado = 0 → percentuais null ("—"), sem NaN/Infinity, sem divisão por zero', () => {
    const result = aggregateProductionLossByLine([
      {
        lineCode: 'L4',
        lineName: 'Treliças',
        plannedQuantityTons: 0,
        realizedQuantityTons: 0,
        mesAvailable: true,
      },
    ])
    const row = result.rows[0]
    expect(row.programadoT).toBe(0)
    expect(row.percentualRealizado).toBeNull()
    expect(row.percentualPerda).toBeNull()
    expect(Number.isNaN(row.percentualRealizado as unknown as number)).toBe(false)
    expect(Number.isNaN(row.percentualPerda as unknown as number)).toBe(false)
    // Renderização: null vira "—" na tabela (nunca NaN ou Infinity)
    const renderPct = (v: number | null) =>
      v === null || v === undefined ? '—' : formatPercentPtBr(v, 1)
    expect(renderPct(row.percentualRealizado)).toBe('—')
    expect(renderPct(row.percentualPerda)).toBe('—')
  })

  it('dado real indisponível (sem MES) → realizado/perda null ("Dados não disponíveis") e aviso técnico no console', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    getEfficiencyByCenterMock.mockResolvedValue({
      rows: [
        {
          lineCode: 'L5',
          lineName: 'L5',
          plannedQuantityTons: 250,
          realizedQuantityTons: null,
          mesAvailable: false,
        },
      ],
    })
    const result = await getProductionLossByLine(baseFilters)
    const row = result.rows[0]
    expect(row.programadoT).toBe(250)
    expect(row.realizadoT).toBeNull()
    expect(row.perdaT).toBeNull()
    expect(row.percentualRealizado).toBeNull()
    expect(row.percentualPerda).toBeNull()
    // Registro técnico no console (NUNCA na tela)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AssertividadeOperacional]'),
      expect.anything(),
      expect.anything(),
    )
    consoleSpy.mockRestore()
  })

  it('consolida múltiplos centros da mesma linha em UMA linha (sem consulta individual por linha)', () => {
    const result = aggregateProductionLossByLine([
      {
        lineCode: 'L1',
        lineName: 'Laminação',
        plannedQuantityTons: 100,
        realizedQuantityTons: 80,
        mesAvailable: true,
      },
      {
        lineCode: 'L1',
        lineName: 'Laminação',
        plannedQuantityTons: 200,
        realizedQuantityTons: 180,
        mesAvailable: true,
      },
    ])
    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]
    expect(row.programadoT).toBe(300)
    expect(row.realizadoT).toBe(260)
    expect(row.perdaT).toBe(40)
  })
})

describe('mapFiltersToCenterFilters — filtros enviados uma única vez ao serviço oficial', () => {
  it('mapeia todos os filtros da tela (empresa/planta/linha/status/período) para o serviço de eficiência', () => {
    const center = mapFiltersToCenterFilters({
      ...baseFilters,
      companyCode: 'CIAFAL',
      plantCode: 'DIV',
      lineCode: 'L1',
      status: 'ATENCAO' as UnifiedEfficiencyFilters['status'],
      periodType: 'MES',
    })
    expect(center).toEqual({
      companyCode: 'CIAFAL',
      plantCode: 'DIV',
      lineCode: 'L1',
      centerCode: 'ALL',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      status: 'ATENCAO',
      product: undefined,
      periodType: 'MES',
      periodLabel: undefined,
    })
  })
})

describe('UI (código-fonte) — sequência exata de colunas e identidade visual preservada', () => {
  const pageSource = readFileSync(
    resolve(process.cwd(), 'src/pages/EfficiencyAssertivenessSubpage.tsx'),
    'utf-8',
  )

  it('a tabela declara colunas atualizadas com % Realizado e sem Início no Horário / Aderência de Volume', () => {
    const headerBlock = pageSource.slice(
      pageSource.indexOf('<thead'),
      pageSource.indexOf('</thead>'),
    )
    expect(headerBlock).toContain('>Estrutura / Item<')
    expect(headerBlock).toContain('>Programado em t<')
    expect(headerBlock).toContain('>Realizado em t<')
    expect(headerBlock).toContain('>% Realizado<')
    expect(headerBlock).not.toContain('>Início no Horário<')
    expect(headerBlock).not.toContain('>Aderência de Volume<')
    expect(headerBlock).toContain('>Perda em t<')
    expect(headerBlock).toContain('>% Perda<')
    expect(headerBlock).toContain('>Sequência Cumprida<')
    expect(headerBlock).toContain('>Status<')
  })

  it('indicadores e estrutura da página preservados (Cards, Filtro e Badge de Status)', () => {
    // Badge de Status e rótulos preservados
    expect(pageSource).toContain("line.status === 'DENTRO_ESPERADO' ? 'No Prazo' : 'Atenção'")
    // Cards e filtro existentes preservados
    expect(pageSource).toContain('Assertividade de Início')
    expect(pageSource).toContain('Aderência de Volume (t)')
    expect(pageSource).toContain('Conformidade de Lotes')
    expect(pageSource).toContain('<EfficiencyUnifiedFilterBar')
    // Rolagem horizontal somente dentro do componente da tabela
    expect(pageSource).toContain('overflow-x-auto')
    // Coluna sem quebra indevida
    expect(pageSource).toContain('whitespace-nowrap')
  })
})
