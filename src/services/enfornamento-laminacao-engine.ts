/**
 * MOTOR DE PRODUTIVIDADE E ENFORNAMENTO PARA LAMINAÇÃO
 * Busca produtividade ativa por:
 * Linha + Bitola + Tipo de Enfornamento (Frio, Quente, Intercalado, Tapete, Normal) + Vigência
 * Fonte preferencial: Ficha Mestre / line_setup_matrix / line_bottleneck_matrix / line_productivity_rates
 */

import pb from '@/lib/pocketbase/client'
import { LineOverviewData } from '@/types/line-master'

export type EnfornamentoType = 'FRIO' | 'QUENTE' | 'INTERCALADO' | 'TAPETE' | 'NORMAL'

export const ENFORNAMENTO_OPTIONS: {
  code: EnfornamentoType
  label: string
  description: string
}[] = [
  { code: 'FRIO', label: 'Frio', description: 'Enfornamento de material à temperatura ambiente' },
  {
    code: 'QUENTE',
    label: 'Quente',
    description: 'Enfornamento direto a quente com ganho térmico e cadência elevada',
  },
  {
    code: 'INTERCALADO',
    label: 'Intercalado',
    description: 'Carga intercalada quente/frio respeitando curva térmica',
  },
  { code: 'TAPETE', label: 'Tapete', description: 'Carregamento contínuo em tapete rolante' },
  { code: 'NORMAL', label: 'Normal', description: 'Regime operacional padrão nominal' },
]

export interface EnfornamentoProductivityMatch {
  productivityTh: number
  source: 'BOTTLENECK_MATRIX' | 'PRODUCTIVITY_RATES' | 'FICHA_MESTRE' | 'CALCULATED_FACTOR'
  gauge: string
  lineCode: string
  enfornamentoType: EnfornamentoType
  notes: string
  validFrom?: string
  validUntil?: string
}

export class EnfornamentoLaminacaoEngine {
  /**
   * Fator de ajuste de produtividade por tipo de enfornamento quando não houver taxa explícita
   * Quente: +10% a 15% de produtividade
   * Frio: -5% (limitação térmica do forno)
   * Intercalado: padrão nominal
   * Tapete: +5%
   * Normal: padrão 1.0
   */
  public static getEnfornamentoMultiplier(type: EnfornamentoType): number {
    switch (type) {
      case 'QUENTE':
        return 1.12 // +12%
      case 'FRIO':
        return 0.95 // -5%
      case 'TAPETE':
        return 1.05 // +5%
      case 'INTERCALADO':
      case 'NORMAL':
      default:
        return 1.0
    }
  }

  /**
   * Busca produtividade ativa por linha + bitola + tipo de enfornamento + vigência
   */
  public static async resolveActiveProductivity(params: {
    lineCode: string
    lineOverview: LineOverviewData | null
    materialCode: string
    gaugeDimension?: string
    enfornamentoType: EnfornamentoType
  }): Promise<EnfornamentoProductivityMatch | null> {
    const { lineCode, lineOverview, materialCode, gaugeDimension = '', enfornamentoType } = params
    const cleanLine = lineCode.trim().toUpperCase()
    const cleanMat = (materialCode || '').trim().toUpperCase()
    const cleanGauge = (gaugeDimension || '').trim().toUpperCase()
    const multiplier = this.getEnfornamentoMultiplier(enfornamentoType)

    // 1. Tenta buscar na line_bottleneck_matrix (se houver curva térmica combinada)
    try {
      const records = await pb.collection('line_bottleneck_matrix').getFullList({
        filter: `line_code = '${cleanLine}' && status = 'VIGENTE'`,
      })

      if (records && records.length > 0) {
        // Encontra registro que case com a bitola ou material
        const matched = records.find((r: any) => {
          const rGauge = (r.gauge_dimension || '').toUpperCase()
          const rMat = (r.material_code || '').toUpperCase()
          const rCurve = (r.thermal_curve_type || '').toUpperCase()
          const gaugeMatch = cleanGauge
            ? rGauge.includes(cleanGauge) || cleanGauge.includes(rGauge)
            : false
          const matMatch = cleanMat ? rMat.includes(cleanMat) : false
          const curveMatch = rCurve === enfornamentoType
          return (gaugeMatch || matMatch) && (curveMatch || !rCurve)
        })

        if (matched) {
          const baseRate =
            Number(matched.primary_bottleneck_rate_th) || Number(matched.furnace_capacity_th) || 0
          if (baseRate > 0) {
            const finalRate =
              matched.thermal_curve_type === enfornamentoType
                ? baseRate
                : Math.round(baseRate * multiplier * 10) / 10
            return {
              productivityTh: finalRate,
              source: 'BOTTLENECK_MATRIX',
              gauge: matched.gauge_dimension || cleanGauge || 'Padrão',
              lineCode: cleanLine,
              enfornamentoType,
              notes: `Matriz de Gargalos (${matched.primary_bottleneck_stage || 'FORNO'}) - Ref: ${matched.reference_doc || 'Vigente'}`,
              validFrom: matched.valid_from,
              validUntil: matched.valid_until,
            }
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar line_bottleneck_matrix:', err)
    }

    // 2. Busca na Ficha Mestra local (line_productivity_rates)
    if (lineOverview?.productivity && lineOverview.productivity.length > 0) {
      const prod = lineOverview.productivity.find(
        (p) =>
          p.material_product_code.toUpperCase() === cleanMat ||
          (p.dimension_spec && cleanGauge && p.dimension_spec.toUpperCase().includes(cleanGauge)),
      )
      if (prod) {
        const nominalOrPlanned =
          Number(prod.planned_productivity) || Number(prod.nominal_productivity) || 0
        if (nominalOrPlanned > 0) {
          const adjusted = Math.round(nominalOrPlanned * multiplier * 10) / 10
          return {
            productivityTh: adjusted,
            source: 'PRODUCTIVITY_RATES',
            gauge: prod.dimension_spec || cleanGauge || 'Padrão',
            lineCode: cleanLine,
            enfornamentoType,
            notes: `Ficha Mestre Linha ${cleanLine} (Taxa base: ${nominalOrPlanned} t/h com fator enfornamento ${enfornamentoType})`,
            validFrom: prod.valid_from,
            validUntil: prod.valid_until,
          }
        }
      }
    }

    // 3. Capacidade nominal da Ficha Mestre
    if (
      lineOverview?.master?.nominal_hourly_capacity &&
      lineOverview.master.nominal_hourly_capacity > 0
    ) {
      const baseCap = Number(lineOverview.master.nominal_hourly_capacity)
      const adjusted = Math.round(baseCap * multiplier * 10) / 10
      return {
        productivityTh: adjusted,
        source: 'FICHA_MESTRE',
        gauge: cleanGauge || 'Padrão',
        lineCode: cleanLine,
        enfornamentoType,
        notes: `Capacidade nominal Ficha Mestre (${baseCap} t/h × fator ${enfornamentoType})`,
      }
    }

    return null
  }
}
