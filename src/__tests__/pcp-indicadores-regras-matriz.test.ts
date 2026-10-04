import { describe, it, expect } from 'vitest'
import {
  avaliarStatusMeta,
  formatarValorPtBr,
  pcpIndicadoresService,
  IndicadorMatrizLinha,
} from '@/services/pcp-indicadores-service'

describe('Regras de Comparação e Avaliação de Metas do PCP (>=, <=, =)', () => {
  describe('Regra >= (Maior ou igual)', () => {
    it('deve marcar ATINGIDA se realizado for estritamente maior que a meta', () => {
      const status = avaliarStatusMeta(96.5, 95.0, '>=')
      expect(status).toBe('ATINGIDA')
    })

    it('deve marcar ATINGIDA se realizado for exatamente igual à meta', () => {
      const status = avaliarStatusMeta(95.0, 95.0, '>=')
      expect(status).toBe('ATINGIDA')
    })

    it('deve marcar FORA_DA_META se realizado for menor que a meta', () => {
      const status = avaliarStatusMeta(94.9, 95.0, '>=')
      expect(status).toBe('FORA_DA_META')
    })
  })

  describe('Regra <= (Menor ou igual)', () => {
    it('deve marcar ATINGIDA se realizado for estritamente menor que a meta (ex: setup/acerto)', () => {
      const status = avaliarStatusMeta(18.5, 20.0, '<=')
      expect(status).toBe('ATINGIDA')
    })

    it('deve marcar ATINGIDA se realizado for exatamente igual à meta máxima permitida', () => {
      const status = avaliarStatusMeta(20.0, 20.0, '<=')
      expect(status).toBe('ATINGIDA')
    })

    it('deve marcar FORA_DA_META se realizado for maior que a meta máxima (ex: estourou setup)', () => {
      const status = avaliarStatusMeta(22.4, 20.0, '<=')
      expect(status).toBe('FORA_DA_META')
    })
  })

  describe('Regra = (Igualdade estrita com tolerância operacional)', () => {
    it('deve marcar ATINGIDA se realizado for idêntico à meta', () => {
      const status = avaliarStatusMeta(100.0, 100.0, '=')
      expect(status).toBe('ATINGIDA')
    })

    it('deve marcar ATINGIDA com tolerância mínima de ponto flutuante', () => {
      const status = avaliarStatusMeta(100.02, 100.0, '=')
      expect(status).toBe('ATINGIDA')
    })

    it('deve marcar FORA_DA_META se realizado divergir da meta', () => {
      const status = avaliarStatusMeta(98.0, 100.0, '=')
      expect(status).toBe('FORA_DA_META')
    })
  })

  describe('Tratamento de Dados Ausentes / Pendentes', () => {
    it('deve retornar PENDENTE_SEM_DADOS quando realizado for null', () => {
      const status = avaliarStatusMeta(null, 95.0, '>=')
      expect(status).toBe('PENDENTE_SEM_DADOS')
    })

    it('deve retornar PENDENTE_SEM_DADOS quando realizado for undefined ou NaN', () => {
      expect(avaliarStatusMeta(undefined, 95.0, '>=')).toBe('PENDENTE_SEM_DADOS')
      expect(avaliarStatusMeta(NaN, 95.0, '>=')).toBe('PENDENTE_SEM_DADOS')
    })
  })

  describe('Formatação Brasileira Pt-BR', () => {
    it('deve formatar número decimal com vírgula e 1 casa decimal', () => {
      expect(formatarValorPtBr(95.5, '%')).toBe('95,5 %')
      expect(formatarValorPtBr(20, 'h')).toBe('20,0 h')
      expect(formatarValorPtBr(3.25, '%')).toBe('3,3 %')
    })

    it('deve retornar travessão para valores nulos ou vazios', () => {
      expect(formatarValorPtBr(null)).toBe('—')
      expect(formatarValorPtBr(undefined)).toBe('—')
    })
  })

  describe('Análise IA baseada exclusivamente em dados reais', () => {
    it('deve produzir análise diagnóstica com os 5 blocos obrigatórios', () => {
      const mockLinha: IndicadorMatrizLinha = {
        indicador: {
          id: 'ind1',
          codigo: 'IND_01_ADERENCIA_PROG',
          nome: 'Aderência à Programação',
          descricao: 'Aderência',
          unidade: '%',
          meta: 95.0,
          regra_comparacao: '>=',
          tipo_indicador: 'PROGRAMACAO',
          status_ativo: true,
          ordem_exibicao: 1,
          fonte_dados_tipo: 'PCP_WEEKLY_SCHEDULES',
          fonte_dados_descricao: 'weekly_schedules',
        },
        metaFormatada: '95,0 %',
        regraFormatada: '>= 95,0 %',
        mediaOuAcumuladoAno: 92.5,
        statusConsolidadoAno: 'FORA_DA_META',
        totalMesesAtingidos: 1,
        totalMesesFora: 1,
        totalMesesSemDados: 10,
        meses: [
          {
            mesIndex: 0,
            mesNomeCurto: 'Jan',
            mesNomeLongo: 'Janeiro',
            realizado: 96.0,
            temDados: true,
            status: 'ATINGIDA',
            desvioAbsoluto: 1.0,
            desvioPercentual: 1.05,
          },
          {
            mesIndex: 1,
            mesNomeCurto: 'Fev',
            mesNomeLongo: 'Fevereiro',
            realizado: 89.0,
            temDados: true,
            status: 'FORA_DA_META',
            desvioAbsoluto: -6.0,
            desvioPercentual: -6.32,
          },
          ...Array.from({ length: 10 }, (_, i) => ({
            mesIndex: i + 2,
            mesNomeCurto: `Mês ${i + 3}`,
            mesNomeLongo: `Mês ${i + 3}`,
            realizado: null,
            temDados: false,
            status: 'PENDENTE_SEM_DADOS' as const,
            desvioAbsoluto: null,
            desvioPercentual: null,
          })),
        ],
      }

      const analise = pcpIndicadoresService.gerarAnaliseIA(mockLinha, 2026, 'CIAFAL', 'L1')
      expect(analise.situacaoAtual).toContain('Aderência à Programação')
      expect(analise.principaisDesvios).toContain('Fev')
      expect(analise.tendencia).toBeDefined()
      expect(analise.possiveisCausas).toBeDefined()
      expect(analise.pontosAtencaoPcp).toContain('Fev')
    })
  })
})
