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

export interface OfficialMpTypeItem {
  code: string
  label: string
}

export const OFFICIAL_MP_TYPES_CATALOG: OfficialMpTypeItem[] = [
  { code: 'TARUGO_130X130', label: 'Tarugo 130 x 130 mm' },
  { code: 'TARUGO_150X150', label: 'Tarugo 150 x 150 mm' },
  { code: 'BLOCO', label: 'Bloco' },
  { code: 'PLACA', label: 'Placa' },
  { code: 'REDONDO', label: 'Redondo' },
  { code: 'LINGOTE', label: 'Lingote' },
  { code: 'TARUGO_105X105', label: 'Tarugo 105 x 105 mm' },
  { code: 'TARUGO_115X105', label: 'Tarugo 115 x 105 mm' },
  { code: 'TARUGO_155X155', label: 'Tarugo 155 x 155 mm' },
  { code: 'MP_IRREGULAR', label: 'MP irregular' },
  { code: 'ESBOCO', label: 'Esboço' },
]

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

export interface MpRowInput {
  id: string
  mpType: string
  materialCode: string
  yieldPct: number
  quantityTons: number
  // Campos opcionais de disponibilidade
  totalStockTons?: number | null // null = aguardando SAP/WMS
  pcpProgrammedStockTons?: number
  supplierReceiptsTons?: number
  pcpUpstreamPlannedTons?: number
  finalBalanceTons?: number | null
  status?: string
  statusLabel?: string
}

export interface MpRowAvailabilityResult {
  id: string
  materialCode: string
  mpType: string
  yieldPct: number
  quantityTons: number
  totalStockTons: number | null
  totalStockDisplay: string
  supplierReceiptsTons: number | null
  supplierReceiptsDisplay: string
  supplierReceiptsDate?: string
  pcpUpstreamPlannedTons: number
  pcpUpstreamPlannedDate?: string
  pcpProgrammedStockTons: number // consumo já programado em outras programações
  thisProgramQuantityTons: number
  finalBalanceTons: number | null
  finalBalanceDisplay: string
  status:
    | 'ATENDIDO'
    | 'AGUARDANDO_ENTRADA'
    | 'SALDO_NEGATIVO_RISCO_RUPTURA'
    | 'NAO_PROGRAMADA'
    | 'EXCESSO'
  statusTrafficLight: 'GREEN' | 'YELLOW' | 'RED'
  statusLabel: string
  deficitTons: number
}

export interface MpSummaryControlResult {
  plannedProductionTons: number
  yieldPct: number
  totalRequiredTons: number // Produção Programada / (Rendimento % / 100)
  totalProgrammedMpTons: number // SOMA das linhas de MP
  differenceTons: number // totalProgrammedMpTons - totalRequiredTons
  fulfillmentPct: number // (totalProgrammedMpTons / totalRequiredTons) * 100
  status:
    | 'ATENDIDO'
    | 'MP_PARCIALMENTE_ATENDIDA'
    | 'AGUARDANDO_ENTRADA'
    | 'MP_NAO_PROGRAMADA'
    | 'SALDO_NEGATIVO_RISCO_RUPTURA'
    | 'EXCESSO'
  statusLabel: string
  color: 'GREEN' | 'YELLOW' | 'RED'
  alertMessage?: string
  isExcessBlocked: boolean // TRUE apenas se totalProgrammedMpTons > totalRequiredTons
  canSave: boolean
  rowsAvailability: MpRowAvailabilityResult[]
}

export class MpProgrammingEngine {
  public static readonly WAITING_SAP_WMS_MSG = 'N/D — aguardando integração SAP/WMS'

  /**
   * FÓRMULA CANÔNICA DE MP NECESSÁRIA:
   * MP Necessária = Produção Programada / (Rendimento % / 100)
   * Ex.: 100 t / 0,90 = 111,11 t.
   * PROIBIDO: 100 + 10%.
   */
  public static calculateCanonicalMpRequired(
    plannedProductionTons: number,
    yieldPct: number,
  ): number {
    const prod = Number(plannedProductionTons) || 0
    const yPct = Number(yieldPct) || 0
    if (prod <= 0 || yPct <= 0) return 0
    const decimal = yPct / 100
    return Math.round((prod / decimal) * 100) / 100
  }

  /**
   * Cálculo Direto: Quantidade MP = Produção Boa / (Rendimento % / 100)
   * Mantido por retrocompatibilidade com a assinatura canônica
   */
  public static calculateMpFromProduction(producaoBoaTons: number, rendimentoPct: number): number {
    return this.calculateCanonicalMpRequired(producaoBoaTons, rendimentoPct)
  }

  /**
   * Cálculo Inverso: Produção Boa = Quantidade MP × Rendimento
   * Ex: 111.11 t × 90% = 100 t
   */
  public static calculateProductionFromMp(quantidadeMpTons: number, rendimentoPct: number): number {
    const qty = Number(quantidadeMpTons) || 0
    const yPct = Number(rendimentoPct) || 0
    if (yPct <= 0) return qty
    const decimal = yPct / 100
    return Math.round(qty * decimal * 100) / 100
  }

  /**
   * DISPONIBILIDADE INDIVIDUAL POR LINHA DE MP:
   * Saldo por MP individual =
   *   ESTOQUE TOTAL
   *   + recebimentos previstos ATÉ a data da produção
   *   + produção interna prevista até a data
   *   − estoque já programado PCP em outras programações
   *   − quantidade desta programação
   *
   * Ex.: 200 + 50 + 30 − 100 − 111,11 = 68,89 → OK.
   *
   * REGRA CRÍTICA DE DATAS:
   * Recebimentos ou produções com data POSTERIOR à produção NÃO contam.
   *
   * REGRA CRÍTICA DE INTEGRAÇÃO:
   * Sem integração real SAP/WMS para Estoque Total ou Recebimento Fornecedor:
   * PROIBIDO inventar valores -> exibir "N/D — aguardando integração SAP/WMS".
   */
  public static calculateIndividualMpAvailability(params: {
    row: MpRowInput
    productionDate?: Date | string | null
    // Estoque total físico no SAP/WMS (se disponível; null/undefined se sem integração)
    realTotalStockTons?: number | null
    // Pedidos de compra / fornecedores com data
    supplierReceipts?: Array<{
      quantityTons: number
      deliveryDate: Date | string
      confirmed?: boolean
    }>
    // Produção interna prevista PCP com data
    upstreamProductions?: Array<{
      quantityTons: number
      plannedEndDate: Date | string
      confirmed?: boolean
    }>
    // Estoque já comprometido pelo PCP em outras programações
    pcpCommittedInOtherSchedulesTons?: number
  }): MpRowAvailabilityResult {
    const {
      row,
      productionDate,
      realTotalStockTons = null,
      supplierReceipts = [],
      upstreamProductions = [],
      pcpCommittedInOtherSchedulesTons = 0,
    } = params

    const targetDate = productionDate
      ? typeof productionDate === 'string'
        ? new Date(productionDate.replace(' ', 'T'))
        : productionDate
      : new Date()

    const hasTargetDate = !isNaN(targetDate.getTime())

    // 1. Estoque Total: Sem integração real SAP/WMS -> N/D
    const stockAvailable =
      realTotalStockTons !== null && realTotalStockTons !== undefined
        ? Number(realTotalStockTons)
        : null

    const totalStockDisplay =
      stockAvailable !== null ? `${stockAvailable.toFixed(2)} t` : this.WAITING_SAP_WMS_MSG

    // 2. Recebimentos previstos de fornecedores ATÉ a data da produção (data posterior NÃO conta)
    let validSupplierReceiptsTons = 0
    let nextSupplierReceiptDate: string | undefined = undefined
    let hasSupplierReceiptsData = supplierReceipts && supplierReceipts.length > 0

    if (hasSupplierReceiptsData) {
      supplierReceipts.forEach((rc) => {
        const rcDate =
          typeof rc.deliveryDate === 'string'
            ? new Date(rc.deliveryDate.replace(' ', 'T'))
            : rc.deliveryDate
        if (!isNaN(rcDate.getTime()) && hasTargetDate) {
          if (rcDate <= targetDate) {
            validSupplierReceiptsTons += Number(rc.quantityTons) || 0
            if (!nextSupplierReceiptDate) {
              nextSupplierReceiptDate = rcDate.toLocaleDateString('pt-BR')
            }
          }
        }
      })
    }

    const supplierReceiptsDisplay = hasSupplierReceiptsData
      ? `${validSupplierReceiptsTons.toFixed(2)} t`
      : this.WAITING_SAP_WMS_MSG

    // 3. Produção interna prevista PCP ATÉ a data da produção (data posterior NÃO conta)
    let validUpstreamTons = 0
    let nextUpstreamDate: string | undefined = undefined

    upstreamProductions.forEach((up) => {
      const upDate =
        typeof up.plannedEndDate === 'string'
          ? new Date(up.plannedEndDate.replace(' ', 'T'))
          : up.plannedEndDate
      if (!isNaN(upDate.getTime()) && hasTargetDate) {
        if (upDate <= targetDate) {
          validUpstreamTons += Number(up.quantityTons) || 0
          if (!nextUpstreamDate) {
            nextUpstreamDate = upDate.toLocaleDateString('pt-BR')
          }
        }
      }
    })

    // 4. Estoque já programado pelo PCP em outras programações
    const pcpProgrammed = Number(pcpCommittedInOtherSchedulesTons) || 0

    // 5. Quantidade desta programação
    const thisProgramQty = Number(row.quantityTons) || 0

    // 6. Saldo Final por MP individual
    // Se não há estoque SAP integrado, mas há recebimentos ou produção PCP, calcula sobre o que é conhecido ou retorna null
    let finalBalanceTons: number | null = null
    let finalBalanceDisplay = this.WAITING_SAP_WMS_MSG

    if (stockAvailable !== null) {
      // Cálculo completo: Estoque + Recebimentos (<= data) + Produção PCP (<= data) − Outras Programações − Esta
      const balance =
        stockAvailable +
        validSupplierReceiptsTons +
        validUpstreamTons -
        pcpProgrammed -
        thisProgramQty
      finalBalanceTons = Math.round(balance * 100) / 100
      finalBalanceDisplay = `${finalBalanceTons.toFixed(2)} t`
    } else if (validSupplierReceiptsTons > 0 || validUpstreamTons > 0 || pcpProgrammed > 0) {
      // Projeção conhecida estritamente do PCP (sem base SAP completa)
      const balanceKnown =
        validSupplierReceiptsTons + validUpstreamTons - pcpProgrammed - thisProgramQty
      finalBalanceTons = Math.round(balanceKnown * 100) / 100
      finalBalanceDisplay = `${finalBalanceTons.toFixed(2)} t (parcial PCP)`
    }

    // 7. Status e semáforo da linha individual
    let status:
      | 'ATENDIDO'
      | 'AGUARDANDO_ENTRADA'
      | 'SALDO_NEGATIVO_RISCO_RUPTURA'
      | 'NAO_PROGRAMADA'
      | 'EXCESSO' = 'ATENDIDO'
    let statusTrafficLight: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN'
    let statusLabel = 'ATENDIDO'
    let deficitTons = 0

    if (thisProgramQty <= 0) {
      status = 'NAO_PROGRAMADA'
      statusTrafficLight = 'RED'
      statusLabel = 'MP NÃO PROGRAMADA'
    } else if (finalBalanceTons !== null && finalBalanceTons < 0) {
      status = 'SALDO_NEGATIVO_RISCO_RUPTURA'
      statusTrafficLight = 'RED'
      deficitTons = Math.abs(finalBalanceTons)
      statusLabel = `RISCO DE RUPTURA (−${deficitTons.toFixed(2)} t)`
    } else if (validSupplierReceiptsTons > 0 || validUpstreamTons > 0) {
      status = 'AGUARDANDO_ENTRADA'
      statusTrafficLight = 'YELLOW'
      statusLabel = 'AGUARDANDO ENTRADA'
    } else {
      status = 'ATENDIDO'
      statusTrafficLight = 'GREEN'
      statusLabel = 'OK'
    }

    return {
      id: row.id,
      materialCode: row.materialCode,
      mpType: row.mpType,
      yieldPct: Number(row.yieldPct) || 97.5,
      quantityTons: thisProgramQty,
      totalStockTons: stockAvailable,
      totalStockDisplay,
      supplierReceiptsTons: hasSupplierReceiptsData ? validSupplierReceiptsTons : null,
      supplierReceiptsDisplay,
      supplierReceiptsDate: nextSupplierReceiptDate,
      pcpUpstreamPlannedTons: validUpstreamTons,
      pcpUpstreamPlannedDate: nextUpstreamDate,
      pcpProgrammedStockTons: pcpProgrammed,
      thisProgramQuantityTons: thisProgramQty,
      finalBalanceTons,
      finalBalanceDisplay,
      status,
      statusTrafficLight,
      statusLabel,
      deficitTons,
    }
  }

  /**
   * MOTOR DE CONTROLE EM TEMPO REAL DE MP (BLOCO A + B):
   * - Necessidade Total é ÚNICA: Produção Programada / (Rendimento % / 100)
   * - Comparada à SOMA das linhas de MP (NUNCA por linha)
   * - Excesso (Σ MP > necessidade): BLOQUEIA o salvamento
   * - Falta parcial (Σ < necessidade e Σ > 0): ALERTA e SALVA
   * - MP zerada (Σ = 0): ALERTA CRÍTICO e SALVA
   * - Saldo negativo / risco de ruptura: ALERTA e SALVA
   *
   * Status canônicos:
   * - ATENDIDO (verde)
   * - MP PARCIALMENTE ATENDIDA (amarelo)
   * - AGUARDANDO ENTRADA (amarelo)
   * - MP NÃO PROGRAMADA (vermelho)
   * - SALDO NEGATIVO/RISCO DE RUPTURA (vermelho)
   * - EXCESSO (vermelho bloqueante)
   */
  public static evaluateScheduleMpControl(params: {
    plannedProductionTons: number
    yieldPct: number
    rawMaterialRows: MpRowInput[]
    productionDate?: Date | string | null
    realStockByMp?: Record<string, number | null>
    supplierReceiptsByMp?: Record<
      string,
      Array<{ quantityTons: number; deliveryDate: Date | string; confirmed?: boolean }>
    >
    upstreamByMp?: Record<
      string,
      Array<{ quantityTons: number; plannedEndDate: Date | string; confirmed?: boolean }>
    >
    pcpCommittedOtherByMp?: Record<string, number>
  }): MpSummaryControlResult {
    const {
      plannedProductionTons,
      yieldPct,
      rawMaterialRows,
      productionDate,
      realStockByMp = {},
      supplierReceiptsByMp = {},
      upstreamByMp = {},
      pcpCommittedOtherByMp = {},
    } = params

    // 1. Necessidade Total ÚNICA
    const totalRequiredTons = this.calculateCanonicalMpRequired(plannedProductionTons, yieldPct)

    // 2. SOMA das linhas de MP
    const totalProgrammedMpTons =
      Math.round(rawMaterialRows.reduce((acc, r) => acc + (Number(r.quantityTons) || 0), 0) * 100) /
      100

    const diff = Math.round((totalProgrammedMpTons - totalRequiredTons) * 100) / 100
    const fulfillmentPct =
      totalRequiredTons > 0
        ? Math.round((totalProgrammedMpTons / totalRequiredTons) * 10000) / 100
        : totalProgrammedMpTons > 0
          ? 100
          : 0

    // 3. Avaliação da disponibilidade por linha individual
    const rowsAvailability = rawMaterialRows.map((row) => {
      const codeKey = (row.materialCode || '').toUpperCase().trim()
      return this.calculateIndividualMpAvailability({
        row,
        productionDate,
        realTotalStockTons: realStockByMp[codeKey] ?? null,
        supplierReceipts: supplierReceiptsByMp[codeKey] || [],
        upstreamProductions: upstreamByMp[codeKey] || [],
        pcpCommittedInOtherSchedulesTons: pcpCommittedOtherByMp[codeKey] || 0,
      })
    })

    // Verifica se alguma linha tem saldo negativo ou está aguardando entrada
    const anyNegativeBalance = rowsAvailability.some(
      (r) =>
        r.status === 'SALDO_NEGATIVO_RISCO_RUPTURA' ||
        (r.finalBalanceTons !== null && r.finalBalanceTons < 0),
    )
    const anyAwaitingEntry = rowsAvailability.some((r) => r.status === 'AGUARDANDO_ENTRADA')

    // 4. Determinação determinística de Status e Regras de Bloqueio/Alerta
    // Tolerância de arredondamento de 0.01 t
    const isExactMatch = Math.abs(diff) <= 0.01 && totalProgrammedMpTons > 0
    const isExcess = diff > 0.01 && totalRequiredTons > 0
    const isZeroMp = totalProgrammedMpTons <= 0
    const isPartial = diff < -0.01 && totalProgrammedMpTons > 0

    let status: MpSummaryControlResult['status'] = 'ATENDIDO'
    let statusLabel = 'ATENDIDO'
    let color: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN'
    let alertMessage: string | undefined = undefined
    let isExcessBlocked = false

    if (isExcess) {
      status = 'EXCESSO'
      statusLabel = 'EXCESSO DE MATÉRIA-PRIMA'
      color = 'RED'
      isExcessBlocked = true
      alertMessage = `Quantidade de matéria-prima programada acima da necessidade calculada (${totalProgrammedMpTons.toFixed(
        2,
      )} t > ${totalRequiredTons.toFixed(2)} t). Excesso de ${diff.toFixed(2)} t.`
    } else if (isZeroMp) {
      status = 'MP_NAO_PROGRAMADA'
      statusLabel = 'MP NÃO PROGRAMADA'
      color = 'RED'
      isExcessBlocked = false
      alertMessage =
        'ATENÇÃO — Produto programado sem matéria-prima suficiente programada. Nenhuma quantidade de MP foi alocada.'
    } else if (anyNegativeBalance) {
      status = 'SALDO_NEGATIVO_RISCO_RUPTURA'
      statusLabel = 'RISCO DE RUPTURA DE MP'
      color = 'RED'
      isExcessBlocked = false
      alertMessage =
        'ATENÇÃO — Saldo de matéria-prima insuficiente/negativo para a data de consumo. Risco de ruptura.'
    } else if (isPartial) {
      status = 'MP_PARCIALMENTE_ATENDIDA'
      statusLabel = 'MP PARCIALMENTE ATENDIDA'
      color = 'YELLOW'
      isExcessBlocked = false
      alertMessage = `ATENÇÃO — Necessidade de matéria-prima não totalmente atendida. Déficit de ${Math.abs(
        diff,
      ).toFixed(2)} t (${fulfillmentPct.toFixed(1)}% coberto).`
    } else if (anyAwaitingEntry) {
      status = 'AGUARDANDO_ENTRADA'
      statusLabel = 'AGUARDANDO ENTRADA'
      color = 'YELLOW'
      isExcessBlocked = false
      alertMessage =
        'A matéria-prima depende de recebimento de fornecedor ou produção interna prévia à data de consumo.'
    } else if (isExactMatch) {
      status = 'ATENDIDO'
      statusLabel = 'ATENDIDO'
      color = 'GREEN'
      isExcessBlocked = false
      alertMessage = undefined
    }

    return {
      plannedProductionTons,
      yieldPct,
      totalRequiredTons,
      totalProgrammedMpTons,
      differenceTons: diff,
      fulfillmentPct,
      status,
      statusLabel,
      color,
      alertMessage,
      isExcessBlocked,
      canSave: !isExcessBlocked,
      rowsAvailability,
    }
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
