import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import {
  MatrizAnualIndicadores,
  MATRIZ_Z_INDEX,
  MATRIZ_COL_CONFIG,
} from '@/components/pcp-indicadores/MatrizAnualIndicadores'
import {
  IndicadorMatrizLinha,
  IndicadorPCPRecord,
  MESES_ANO,
} from '@/services/pcp-indicadores-service'

const mockIndicador: IndicadorPCPRecord = {
  id: 'ind-01',
  codigo: 'IND_05_CUMPRIMENTO_PLANO',
  nome: 'Cumprimento do Plano de Produção',
  descricao: 'Percentual de cumprimento do volume programado',
  unidade: '%',
  meta: 95.0,
  regra_comparacao: '>=',
  sentido_indicador: 'MAIOR_MELHOR',
  tipo_indicador: 'PROGRAMACAO',
  status_ativo: true,
  ordem_exibicao: 1,
  fonte_dados_tipo: 'MES',
  fonte_dados_descricao: 'weekly_schedules',
}

const mockLinha: IndicadorMatrizLinha = {
  indicador: mockIndicador,
  metaFormatada: '95,0 %',
  regraFormatada: '>= 95,0 %',
  meses: MESES_ANO.map((m) => ({
    mesIndex: m.index,
    mesNomeCurto: m.curto,
    mesNomeLongo: m.longo,
    metaVigente: 95.0,
    regraVigente: '>=',
    realizado: 96.2,
    desvioAbsoluto: 1.2,
    desvioPercentual: 1.26,
    status: 'ATINGIDA' as const,
    qtdApontamentos: 24,
    temDados: true,
  })),
  mediaOuAcumuladoAno: 96.0,
  statusConsolidadoAno: 'ATINGIDA',
  totalMesesAtingidos: 12,
  totalMesesFora: 0,
  totalMesesSemDados: 0,
  ultimoResultado: 96.2,
  desvioAtual: 1.2,
  projecaoDezembro: 96.5,
  projecaoFechamentoFormatada: '96,5 %',
  isProjecaoPreliminar: false,
  tendencia: 'ESTAVEL',
  mediaHistoricaAnoMenos2: null,
  mediaHistoricaAnoMenos1: null,
  mediaUltimos2Anos: null,
}

describe('MatrizAnualIndicadores — Validação de Sticky Columns e Prevenção de Sobreposição', () => {
  it('1. Deve exportar e aplicar tokens de z-index rigorosamente hierárquicos', () => {
    expect(MATRIZ_Z_INDEX.BASE).toBe('z-0')
    expect(MATRIZ_Z_INDEX.STICKY_BODY).toBe('z-10')
    expect(MATRIZ_Z_INDEX.STICKY_HEADER).toBe('z-20')
    expect(MATRIZ_Z_INDEX.STICKY_CORNER).toBe('z-30')
  })

  it('2. Deve ter larguras e left acumulados calculados de forma exata e contígua', () => {
    expect(MATRIZ_COL_CONFIG.INDICADOR_LEFT).toBe(0)
    expect(MATRIZ_COL_CONFIG.META_LEFT).toBe(MATRIZ_COL_CONFIG.INDICADOR_WIDTH)
    expect(MATRIZ_COL_CONFIG.REGRA_LEFT).toBe(
      MATRIZ_COL_CONFIG.INDICADOR_WIDTH + MATRIZ_COL_CONFIG.META_WIDTH,
    )
    expect(MATRIZ_COL_CONFIG.REGRA_LEFT).toBe(350)
  })

  it('3. Cabeçalhos das 3 colunas congeladas (INDICADOR, META, REGRA) devem ser sticky com camada mais alta (STICKY_CORNER)', () => {
    render(<MatrizAnualIndicadores linhas={[mockLinha]} ano={2026} onAbrirDetalhe={vi.fn()} />)

    const thIndicador = screen.getByTestId('th-indicador')
    const thMeta = screen.getByTestId('th-meta')
    const thRegra = screen.getByTestId('th-regra')

    // Deve conter classes sticky e top-0
    expect(thIndicador.className).toContain('sticky')
    expect(thIndicador.className).toContain('top-0')
    expect(thIndicador.className).toContain(MATRIZ_Z_INDEX.STICKY_CORNER)
    expect(thIndicador.style.left).toBe('0px')
    expect(thIndicador.style.width).toBe('260px')

    expect(thMeta.className).toContain('sticky')
    expect(thMeta.className).toContain('top-0')
    expect(thMeta.className).toContain(MATRIZ_Z_INDEX.STICKY_CORNER)
    expect(thMeta.style.left).toBe('260px')
    expect(thMeta.style.width).toBe('90px')

    expect(thRegra.className).toContain('sticky')
    expect(thRegra.className).toContain('top-0')
    expect(thRegra.className).toContain(MATRIZ_Z_INDEX.STICKY_CORNER)
    expect(thRegra.style.left).toBe('350px')
    expect(thRegra.style.width).toBe('70px')
  })

  it('4. Células do corpo das 3 colunas congeladas devem ser sticky com fundo 100% opaco e STICKY_BODY (z-10)', () => {
    render(<MatrizAnualIndicadores linhas={[mockLinha]} ano={2026} onAbrirDetalhe={vi.fn()} />)

    const tdIndicador = screen.getByTestId(`td-indicador-${mockIndicador.codigo}`)
    const tdMeta = screen.getByTestId(`td-meta-${mockIndicador.codigo}`)
    const tdRegra = screen.getByTestId(`td-regra-${mockIndicador.codigo}`)

    // Verifica sticky e z-index
    expect(tdIndicador.className).toContain('sticky')
    expect(tdIndicador.className).toContain(MATRIZ_Z_INDEX.STICKY_BODY)
    expect(tdIndicador.style.left).toBe('0px')
    // Fundo deve ser sólido (ex: #ffffff ou #f8fafc), sem bg-inherit ou transparência
    expect(tdIndicador.className).toMatch(/bg-\[#(ffffff|f8fafc)\]/)
    expect(tdIndicador.className).not.toContain('bg-inherit')
    expect(tdIndicador.className).not.toContain('bg-transparent')

    expect(tdMeta.className).toContain('sticky')
    expect(tdMeta.className).toContain(MATRIZ_Z_INDEX.STICKY_BODY)
    expect(tdMeta.style.left).toBe('260px')
    expect(tdMeta.className).toMatch(/bg-\[#(ffffff|f8fafc)\]/)
    expect(tdMeta.className).not.toContain('bg-inherit')

    expect(tdRegra.className).toContain('sticky')
    expect(tdRegra.className).toContain(MATRIZ_Z_INDEX.STICKY_BODY)
    expect(tdRegra.style.left).toBe('350px')
    expect(tdRegra.className).toMatch(/bg-\[#(ffffff|f8fafc)\]/)
    expect(tdRegra.className).not.toContain('bg-inherit')
  })

  it('5. Container de rolagem interna deve estar presente e isolado', () => {
    render(<MatrizAnualIndicadores linhas={[mockLinha]} ano={2026} onAbrirDetalhe={vi.fn()} />)

    const container = screen.getByTestId('matriz-scroll-container')
    expect(container.className).toContain('overflow-x-auto')
    expect(container.className).toContain('w-full')
  })
})
