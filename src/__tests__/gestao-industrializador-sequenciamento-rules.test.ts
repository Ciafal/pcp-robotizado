import { describe, it, expect } from 'vitest'
import { calcularDiaUtil } from '@/services/checklist-fechamento-service'

describe('Suíte de Aceitação — Gestão Industrializador: Sequenciamento P x R (Regras e Cálculos)', () => {
  // Teste 3: WMS numa quarta (07/10/2026) → Faturamento 08/10 (quinta), Data Industrializador Final 13/10 (segunda 12/10 é feriado Nossa Senhora Aparecida)
  it('Teste 3: WMS numa quarta (07/10/2026) -> Faturamento 08/10 (quinta), Data Industrializador Final 13/10 (terça, pulando sex/sab/dom e feriado 12/10)', () => {
    const feriados = ['2026-10-12'] // 12 de outubro é feriado nacional
    const dataWms = '2026-10-07' // Quarta-feira

    // Faturamento = WMS + 1 dia útil -> 08/10/2026 (quinta)
    const fat = calcularDiaUtil(dataWms, 1, feriados)
    expect(fat.dataIso).toBe('2026-10-08')
    expect(fat.dataFormatada).toBe('08/10/2026')

    // Data Industrializador Final = Faturamento + 2 dias úteis:
    // Dia 1: 09/10/2026 (sexta)
    // 10/10 e 11/10 (sábado e domingo pulados)
    // 12/10 (feriado pulado)
    // Dia 2: 13/10/2026 (terça)
    const arc = calcularDiaUtil(fat.dataIso, 2, feriados)
    expect(arc.dataIso).toBe('2026-10-13')
    expect(arc.dataFormatada).toBe('13/10/2026')
  })

  // Teste 4: WMS numa sexta → sábado/domingo pulados
  it('Teste 4: WMS numa sexta (02/10/2026) -> Faturamento 05/10 (segunda) pulando sábado e domingo', () => {
    const feriados: string[] = []
    const dataWmsSexta = '2026-10-02' // Sexta-feira

    const fat = calcularDiaUtil(dataWmsSexta, 1, feriados)
    expect(fat.dataIso).toBe('2026-10-05') // Segunda-feira
    expect(fat.dataFormatada).toBe('05/10/2026')

    const arc = calcularDiaUtil(fat.dataIso, 2, feriados)
    expect(arc.dataIso).toBe('2026-10-07') // Quarta-feira (05 + 2 úteis: ter 06, qua 07)
    expect(arc.dataFormatada).toBe('07/10/2026')
  })

  // Teste 5: Feriado cadastrado → pulado
  it('Teste 5: Feriado cadastrado no meio da semana é devidamente pulado', () => {
    const feriados = ['2026-04-21'] // Tiradentes (terça-feira)
    const dataWms = '2026-04-20' // Segunda-feira

    // Faturamento = 20/04 + 1 dia útil: terça 21 é feriado -> quarta 22/04
    const fat = calcularDiaUtil(dataWms, 1, feriados)
    expect(fat.dataIso).toBe('2026-04-22')
    expect(fat.dataFormatada).toBe('22/04/2026')
  })

  // Teste 6: Produto sem Data WMS → Faturamento/Data Industrializador Final "—", sem invenção
  it('Teste 6: Produto sem Data WMS gera Faturamento e Data Industrializador Final "—" sem dados fictícios', () => {
    const semData = calcularDiaUtil('', 1, [])
    expect(semData.dataIso).toBe('')
    expect(semData.dataFormatada).toBe('—')

    const semDataArc = calcularDiaUtil(semData.dataIso, 2, [])
    expect(semDataArc.dataIso).toBe('')
    expect(semDataArc.dataFormatada).toBe('—')
  })
})
