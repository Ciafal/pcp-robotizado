import { describe, it, expect } from 'vitest'
import { calcularSegundoDiaUtil, avaliarStatusPrazo } from '@/services/checklist-fechamento-service'

describe('Check-list Fechamento — Regras de Negócio & Prazos (Etapa 1)', () => {
  it('1. Calcula corretamente o 2º dia útil do mês seguinte à competência (Setembro/2026 -> Outubro/2026)', () => {
    // Competência: Setembro/2026 (mes = 9, ano = 2026)
    // Outubro/2026:
    // Dia 1 = Quinta-feira (1º dia útil)
    // Dia 2 = Sexta-feira (2º dia útil)
    const res = calcularSegundoDiaUtil(2026, 9, [])
    expect(res.segundoDiaUtilIso).toBe('2026-10-02')
    expect(res.segundoDiaUtilFormatado).toBe('02/10/2026')
  })

  it('2. Considera feriados corporativos e finais de semana no cálculo do 2º dia útil', () => {
    // Exemplo: Janeiro/2026 -> Fevereiro/2026
    // Fev 1 = Domingo (fim de semana)
    // Fev 2 = Segunda-feira (1º dia útil)
    // Fev 3 = Terça-feira (2º dia útil)
    const res1 = calcularSegundoDiaUtil(2026, 1, [])
    expect(res1.segundoDiaUtilIso).toBe('2026-02-03')

    // Se houver feriado no dia 02/02/2026:
    // Fev 2 = Feriado (pula)
    // Fev 3 = Terça (1º dia útil)
    // Fev 4 = Quarta (2º dia útil)
    const res2 = calcularSegundoDiaUtil(2026, 1, ['2026-02-02'])
    expect(res2.segundoDiaUtilIso).toBe('2026-02-04')
  })

  it('3. Avalia status de prazo corretamente (NORMAL, ATENCAO, CRITICO, VENCIDO)', () => {
    // Fechamento concluído sempre fica NORMAL / Concluído
    const concl = avaliarStatusPrazo('2026-10-02', 'Fechado')
    expect(concl.statusPrazo).toBe('NORMAL')
    expect(concl.statusTexto).toBe('Concluído')

    // Data no passado -> VENCIDO
    const venc = avaliarStatusPrazo('2020-01-01', 'Em andamento')
    expect(venc.statusPrazo).toBe('VENCIDO')
    expect(venc.diasRestantes).toBeLessThan(0)
  })
})
