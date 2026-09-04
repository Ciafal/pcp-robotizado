/**
 * SERVIÇO DE MATÉRIA-PRIMA OFICIAL PARA PROGRAMAÇÃO
 * Resolução de MP, rendimento metálico, estoques WMS/SAP e cálculo direto / inverso
 */

import pb from '@/lib/pocketbase/client'
import { LineOverviewData } from '@/types/line-master'

export interface OfficialMpOption {
  code: string
  description: string
  mpType: string
  stockAvailableTons: number | null
  supplierName?: string
  priorityOrder?: number
  status?: string
  defaultYieldPct: number // ex: 95.0%
}

export const OFFICIAL_MP_TYPES: string[] = [
  'TARUGO 130x130',
  'TARUGO 150x150',
  'BOBINA BQ',
  'BOBINA BQ SAE 1012',
  'BOBINA GALVANIZADA',
  'PALANQUILHA',
  'BLOCO FORJADO',
  'SUCATA INDUSTRIAL',
]

export class MpProgrammingEngine {
  /**
   * Cálculo Direto: Quantidade MP = Produção Boa / Rendimento
   * Ex: 100 t ÷ 95% = 105.26 t
   */
  public static calculateMpFromProduction(producaoBoaTons: number, rendimentoPct: number): number {
    if (rendimentoPct <= 0) return producaoBoaTons
    const decimal = rendimentoPct / 100
    return Math.round((producaoBoaTons / decimal) * 100) / 100
  }

  /**
   * Cálculo Inverso: Produção Boa = Quantidade MP × Rendimento
   * Ex: 105.26 t × 95% = 100 t
   */
  public static calculateProductionFromMp(quantidadeMpTons: number, rendimentoPct: number): number {
    if (rendimentoPct <= 0) return quantidadeMpTons
    const decimal = rendimentoPct / 100
    return Math.round(quantidadeMpTons * decimal * 100) / 100
  }

  /**
   * Saldo MP pós-programação = MP disponível − MP necessária
   */
  public static calculateMpPostBalance(
    mpDisponivelTons: number | null,
    mpNecessariaTons: number,
  ): {
    balanceTons: number | null
    hasDeficit: boolean
    deficitTons: number
    warningMessage?: string
  } {
    if (mpDisponivelTons === null) {
      return {
        balanceTons: null,
        hasDeficit: false,
        deficitTons: 0,
        warningMessage: 'Saldo disponível de matéria-prima aguardando integração SAP/WMS.',
      }
    }
    const balance = Math.round((mpDisponivelTons - mpNecessariaTons) * 100) / 100
    const hasDeficit = balance < 0
    const deficitTons = hasDeficit ? Math.abs(balance) : 0
    let warningMessage: string | undefined

    if (hasDeficit) {
      warningMessage = `ALERTA DE DÉFICIT DE MP: A matéria-prima necessária (${mpNecessariaTons.toFixed(
        2,
      )} t) excede o saldo disponível (${mpDisponivelTons.toFixed(
        2,
      )} t) em ${deficitTons.toFixed(2)} t.`
    }

    return {
      balanceTons: balance,
      hasDeficit,
      deficitTons,
      warningMessage,
    }
  }

  /**
   * Carrega opções de MP oficiais cadastradas na Ficha Mestre / Prioridades da Linha
   */
  public static async fetchOfficialMpOptions(
    lineCode: string,
    lineOverview: LineOverviewData | null,
  ): Promise<OfficialMpOption[]> {
    const cleanLine = lineCode.trim().toUpperCase()
    const options: OfficialMpOption[] = []

    // 1. Prioridades da Ficha Mestre da linha
    if (lineOverview?.rawMaterials && lineOverview.rawMaterials.length > 0) {
      lineOverview.rawMaterials.forEach((rm) => {
        options.push({
          code: rm.material_code,
          description: rm.material_description || rm.material_code,
          mpType: rm.material_group || 'TARUGO 130x130',
          stockAvailableTons: null, // será verificado se houver no banco
          supplierName: rm.material_origin || 'CIAFAL Aciaria',
          priorityOrder: rm.priority_order || 1,
          status: rm.active ? 'HOMOLOGADO' : 'INATIVO',
          defaultYieldPct: cleanLine.includes('L2') ? 94.5 : 97.5,
        })
      })
    }

    // 2. Busca line_raw_material_priorities se não estiver em lineOverview
    if (options.length === 0) {
      try {
        const records = await pb
          .collection('line_raw_material_priorities')
          .getFullList({ filter: 'active=true', sort: 'priority_order' })
        records.forEach((r: any) => {
          options.push({
            code: r.material_code,
            description: r.material_description || r.material_code,
            mpType: r.material_group || 'BOBINA BQ',
            stockAvailableTons: null,
            supplierName: r.material_origin || 'Fornecedor Homologado',
            priorityOrder: r.priority_order || 1,
            status: 'HOMOLOGADO',
            defaultYieldPct: 97.0,
          })
        })
      } catch (err) {
        console.warn('Erro ao consultar line_raw_material_priorities:', err)
      }
    }

    // 3. Fallback de opções padrão oficiais da indústria CIAFAL se catálogo vazio
    if (options.length === 0) {
      options.push(
        {
          code: 'TAR-130-1020',
          description: 'Tarugo Laminação 130x130 SAE 1020',
          mpType: 'TARUGO 130x130',
          stockAvailableTons: null,
          supplierName: 'Aciaria Divinópolis',
          priorityOrder: 1,
          status: 'HOMOLOGADO',
          defaultYieldPct: 97.5,
        },
        {
          code: 'TAR-150-1045',
          description: 'Tarugo Laminação Pesada 150x150 SAE 1045',
          mpType: 'TARUGO 150x150',
          stockAvailableTons: null,
          supplierName: 'Gerdau Ouro Branco',
          priorityOrder: 2,
          status: 'HOMOLOGADO',
          defaultYieldPct: 96.0,
        },
        {
          code: 'BOB-CSN-BQ-1012',
          description: 'Bobina Laminada a Quente SAE 1012 (CSN)',
          mpType: 'BOBINA BQ',
          stockAvailableTons: null,
          supplierName: 'CSN Volta Redonda',
          priorityOrder: 1,
          status: 'HOMOLOGADO',
          defaultYieldPct: 98.0,
        },
      )
    }

    return options
  }
}
