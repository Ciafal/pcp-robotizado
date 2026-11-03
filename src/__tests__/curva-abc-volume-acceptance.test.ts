import { describe, it, expect } from 'vitest'
import {
  CurvaAbcFaturamentoEngine,
  ItemCurvaAbcCalculado,
} from '@/services/curva-abc-faturamento-engine'
import { formatTons3Decimals } from '@/lib/formatters-ptbr'

describe('Curva ABC e Pareto por Volume Físico (t) — PCP Robotizado', () => {
  const mockItensCarteira: any[] = [
    {
      codigo_material: 'MAT-P-001',
      descricao_material: 'Material Pesado 1',
      carteira_tons: 100.0,
      faturamento_brl: 1000, // Menor faturamento, mas maior volume
      deficit_tons: 15.0,
      saldo_projetado_tons: -15.0,
      estoque_disponivel_tons: 50.0,
      programado_tons: 35.0,
      linha: 'Linha 1',
      centro: '1000',
    },
    {
      codigo_material: 'MAT-C-002',
      descricao_material: 'Material Leve e Caro 2',
      carteira_tons: 20.0,
      faturamento_brl: 500000, // Alto faturamento, mas menor volume
      deficit_tons: 0,
      saldo_projetado_tons: 10.0,
      estoque_disponivel_tons: 30.0,
      programado_tons: 0,
      linha: 'Linha 2',
      centro: '1000',
    },
    {
      codigo_material: 'MAT-M-003',
      descricao_material: 'Material Médio 3',
      carteira_tons: 60.5,
      faturamento_brl: 5000,
      deficit_tons: 5.5,
      saldo_projetado_tons: -5.5,
      estoque_disponivel_tons: 20.0,
      programado_tons: 35.0,
      linha: 'Linha 1',
      centro: '1000',
    },
  ]

  it('ordena materiais pelo VOLUME em toneladas decrescente e calcula percentual acumulado sobre volume', () => {
    const res = CurvaAbcFaturamentoEngine.calcularCurvaAbc(mockItensCarteira, {
      corteA_pct: 85,
      corteB_pct: 95,
      fonte_faturamento: 'ZSD28C',
      considerar_apenas_faturamento: false,
    })

    // Total de volume = 100.0 + 60.5 + 20.0 = 180.500 t
    expect(res.tonelagemTotal_t).toBe(180.5)

    // Primeiro item deve ser MAT-P-001 (100.0 t), segundo MAT-M-003 (60.5 t), terceiro MAT-C-002 (20.0 t)
    expect(res.itens[0].codigo_material).toBe('MAT-P-001')
    expect(res.itens[1].codigo_material).toBe('MAT-M-003')
    expect(res.itens[2].codigo_material).toBe('MAT-C-002')

    // MAT-P-001: 100 / 180.5 = 55.4% -> Curva A
    expect(res.itens[0].curva_abc).toBe('A')
    // MAT-M-003: (100 + 60.5) / 180.5 = 88.9% -> Curva B (já que corteA é 85%)
    expect(res.itens[1].curva_abc).toBe('B')
    // MAT-C-002: (160.5 + 20) / 180.5 = 100% -> Curva C
    expect(res.itens[2].curva_abc).toBe('C')
  })

  it('gera alertas prioritários com base em déficit físico e 3 casas decimais', () => {
    const res = CurvaAbcFaturamentoEngine.calcularCurvaAbc(mockItensCarteira, {
      corteA_pct: 85,
      corteB_pct: 95,
      fonte_faturamento: 'ZSD28C',
      considerar_apenas_faturamento: false,
    })

    // MAT-P-001 está na Curva A e tem déficit de 15.000 t com saldo projetado negativo
    expect(res.alertasPrioritariosCurvaA.length).toBeGreaterThan(0)
    expect(res.alertasPrioritariosCurvaA[0]).toContain('MAT-P-001')
    expect(res.alertasPrioritariosCurvaA[0]).toContain('15,000 t')
    expect(res.alertasPrioritariosCurvaA[0]).not.toContain('R$')
    expect(res.alertasPrioritariosCurvaA[0]).not.toContain('faturamento')
  })

  it('formata toneladas com exatamente 3 casas decimais e vírgula', () => {
    expect(formatTons3Decimals(180.5)).toBe('180,500 t')
    expect(formatTons3Decimals(0)).toBe('0,000 t')
    expect(formatTons3Decimals(1250.75)).toBe('1.250,750 t')
    expect(formatTons3Decimals(116.16)).toBe('116,160 t')
  })
})
