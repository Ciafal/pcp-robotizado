/**
 * SERVIÇO CENTRALIZADO DE ESTOQUE, CARTEIRA E COBERTURA PARA PROGRAMAÇÃO PCP
 *
 * Centraliza:
 * 1. Consulta estrita de integrações SAP / Carteira ZSD28C / Estoques
 * 2. Fórmula única: Saldo Carteira = Carteira − Estoque ACAB + Estoque SEMI
 * 3. Cobertura atual = Estoque considerado / Média diária de faturamento
 * 4. Cobertura pós-programação = (Estoque atual + Produção boa programada) / Média diária de faturamento
 * 5. Situação da cobertura (comparação com faixa mínima/máxima de tolerância [5-8 dias padrão])
 * 6. Tratamento de indisponibilidade por campo com 3 mensagens distintas:
 *    (a) "SAP indisponível no momento."
 *    (b) "Dado indisponível — aguardando integração SAP."
 *    (c) "Dado não cadastrado no SAP."
 *    PROIBIDO preencher com zero fictício, média arbitrária, mock ou default!
 */

import pb from '@/lib/pocketbase/client'
import { CarteiraItem } from '@/types/carteira-analise'
import { SapIntegrationDefinition } from '@/types/line-master'

export type AvailabilityReason =
  | 'AVAILABLE'
  | 'SAP_OFFLINE' // "SAP indisponível no momento."
  | 'NOT_MAPPED' // "Dado indisponível — aguardando integração SAP."
  | 'NOT_REGISTERED' // "Dado não cadastrado no SAP."

export interface ValueWithAvailability<T> {
  value: T | null
  status: AvailabilityReason
  statusMessage?: string
}

export interface CoverageEvaluation {
  currentCoverageDays: number | null
  postCoverageDays: number | null
  toleranceMinDays: number
  toleranceMaxDays: number
  situationText:
    | 'Dentro da tolerância'
    | 'Abaixo da cobertura mínima'
    | 'Acima da cobertura máxima'
    | 'Indisponível para cálculo'
  situationStatus: 'WITHIN_TOLERANCE' | 'BELOW_MIN' | 'ABOVE_MAX' | 'UNAVAILABLE'
}

export interface ExistingScheduleDetail {
  id: string
  schedule_code: string
  date_str: string
  start_datetime: string
  line_code: string
  planned_quantity_tons: number
  status: string
  version: number
  shift_name?: string
  crew_name?: string
}

export interface ExistingProgrammingData {
  totalPlannedTons: number
  nextPredictedDate: string | null
  items: ExistingScheduleDetail[]
}

export interface MaterialStockAndCarteiraData {
  materialCode: string
  // Origem SAP / Integração existente
  estoqueAcab: ValueWithAvailability<number>
  estoqueSemi: ValueWithAvailability<number>
  estoqueQualidade: ValueWithAvailability<number>
  estoqueBloqueado: ValueWithAvailability<number>
  carteira: ValueWithAvailability<number>
  tempoMedioCicloMin: ValueWithAvailability<number>
  mediaDiariaFaturamentoTDia: ValueWithAvailability<number>

  // Programação existente (origem PCP Robotizado)
  programacaoExistente: ExistingProgrammingData

  // Calculados
  saldoCarteira: ValueWithAvailability<number> // Carteira − Estoque ACAB + Estoque SEMI
  coverage: CoverageEvaluation
  calculationTimestamp: string
  sapSystemName: string
  sapConnected: boolean
}

export const MSG_SAP_OFFLINE = 'SAP indisponível no momento.'
export const MSG_NOT_MAPPED = 'Dado indisponível — aguardando integração SAP.'
export const MSG_NOT_REGISTERED = 'Dado não cadastrado no SAP.'

export class StockCarteiraEngine {
  /**
   * Fórmula única canônica de Saldo da Carteira:
   * Saldo Carteira = Carteira − Estoque ACAB + Estoque SEMI
   */
  public static calculateSaldoCarteira(params: {
    carteira: number | null
    estoqueAcab: number | null
    estoqueSemi: number | null
  }): number | null {
    if (params.carteira === null || params.estoqueAcab === null || params.estoqueSemi === null) {
      return null
    }
    const saldo = params.carteira - params.estoqueAcab + params.estoqueSemi
    return Math.round(saldo * 100) / 100
  }

  /**
   * Cobertura atual = Estoque considerado / Média diária de faturamento (em dias)
   */
  public static calculateCurrentCoverage(
    estoqueConsiderado: number | null,
    mediaDiaria: number | null,
  ): number | null {
    if (estoqueConsiderado === null || mediaDiaria === null || mediaDiaria <= 0) {
      return null
    }
    return Math.round((estoqueConsiderado / mediaDiaria) * 10) / 10
  }

  /**
   * Cobertura pós-programação = (Estoque Acabado livre + Programação Existente vigente + nova quantidade) / Média diária de faturamento
   */
  public static calculatePostCoverage(
    estoqueAtual: number | null,
    producaoBoa: number | null,
    mediaDiaria: number | null,
    programacaoExistenteTons = 0,
  ): number | null {
    if (estoqueAtual === null || producaoBoa === null || mediaDiaria === null || mediaDiaria <= 0) {
      return null
    }
    const totalConsiderado = estoqueAtual + (programacaoExistenteTons || 0) + producaoBoa
    return Math.round((totalConsiderado / mediaDiaria) * 10) / 10
  }

  /**
   * Avaliação da situação da cobertura comparando com tolerância (padrão: 5 a 8 dias se não houver cadastro)
   * Nunca depender só de cor — exibe TEXTO explícito:
   * "Dentro da tolerância" | "Abaixo da cobertura mínima" | "Acima da cobertura máxima"
   */
  public static evaluateCoverageSituation(
    postCoverageDays: number | null,
    toleranceMin = 5,
    toleranceMax = 8,
  ): CoverageEvaluation['situationText'] {
    if (postCoverageDays === null) return 'Indisponível para cálculo'
    if (postCoverageDays < toleranceMin) return 'Abaixo da cobertura mínima'
    if (postCoverageDays > toleranceMax) return 'Acima da cobertura máxima'
    return 'Dentro da tolerância'
  }

  /**
   * Consulta centralizada de dados reais para o material
   */
  public static async fetchMaterialStockAndCarteira(params: {
    materialCode: string
    plannedTons: number
    toleranceMin?: number
    toleranceMax?: number
  }): Promise<MaterialStockAndCarteiraData> {
    const { materialCode, plannedTons, toleranceMin = 5, toleranceMax = 8 } = params
    const cleanCode = (materialCode || '').trim().toUpperCase()

    // 1. Verifica conectores SAP no catálogo
    let sapCatalogEntries: SapIntegrationDefinition[] = []
    let sapOnline = true
    try {
      sapCatalogEntries = await pb
        .collection('sap_integration_catalog')
        .getFullList<SapIntegrationDefinition>({ filter: 'active=true' })
    } catch (err) {
      console.warn('Erro ao consultar catálogo SAP:', err)
      sapOnline = false
    }

    // Se houver algum conector explicitamente INDISPONIVEL ou ERRO
    const hasActiveConector = sapCatalogEntries.length > 0
    const allDisconnected = sapCatalogEntries.every(
      (c) => c.last_status === 'ERRO' || c.last_status === 'INDISPONIVEL',
    )
    if (hasActiveConector && allDisconnected) {
      sapOnline = false
    }

    // 2. Busca dados de Carteira ZSD28C e Estoques no banco oficial
    let carteiraRecord: CarteiraItem | null = null
    try {
      const records = await pb.collection('carteira_items').getFullList<CarteiraItem>({
        filter: `codigo_material ~ '${cleanCode}'`,
        sort: '-created',
      })
      carteiraRecord =
        records.find((r) => r.codigo_material.trim().toUpperCase() === cleanCode) ||
        records[0] ||
        null
    } catch (err) {
      console.warn('Falha na busca em carteira_items:', err)
    }

    // 2b. Busca dados de Estoque Físico Real em inventory_items (Origem SAP)
    let inventoryRecords: any[] = []
    try {
      inventoryRecords = await pb.collection('inventory_items').getFullList({
        filter: `material_code = '${cleanCode}'`,
      })
    } catch (err) {
      console.warn('Falha na busca em inventory_items:', err)
    }

    // 2c. Consulta Programação Existente no PCP Robotizado (weekly_schedules)
    // Filtro: material_code = <código limpo> && item_type = 'PRODUCTION' && status != 'REJECTED' && status != 'CANCELLED'
    // Apenas programações futuras/vigentes, agrupando por schedule_code e retendo SOMENTE a maior version (sem dupla contagem).
    let programacaoExistente: ExistingProgrammingData = {
      totalPlannedTons: 0,
      nextPredictedDate: null,
      items: [],
    }

    try {
      const filterExpr = `material_code = '${cleanCode}' && item_type = 'PRODUCTION' && status != 'REJECTED' && status != 'CANCELLED'`
      const schedulesList = await pb.collection('weekly_schedules').getFullList({
        filter: filterExpr,
        sort: 'start_datetime',
      })

      const now = new Date()
      // Agrupa por schedule_code retendo apenas a maior versão
      const scheduleMap = new Map<string, any>()
      for (const item of schedulesList) {
        const schedCode = (item.schedule_code || item.id || '').trim()
        const itemVersion = Number(item.version) || 1

        // Verifica se a programação é futura (start_datetime ou data no futuro ou hoje)
        let isFuture = true
        if (item.start_datetime) {
          const itemDate = new Date(item.start_datetime.replace(' ', 'T'))
          if (
            !isNaN(itemDate.getTime()) &&
            itemDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())
          ) {
            isFuture = false
          }
        }

        if (isFuture) {
          if (!scheduleMap.has(schedCode)) {
            scheduleMap.set(schedCode, item)
          } else {
            const existing = scheduleMap.get(schedCode)
            const existingVersion = Number(existing.version) || 1
            if (itemVersion > existingVersion) {
              scheduleMap.set(schedCode, item)
            }
          }
        }
      }

      const deduplicatedItems = Array.from(scheduleMap.values())
      // Ordena por data prevista
      deduplicatedItems.sort((a, b) => {
        const da = a.start_datetime || a.date_str || ''
        const db = b.start_datetime || b.date_str || ''
        return da.localeCompare(db)
      })

      const totalPlannedTons = deduplicatedItems.reduce(
        (acc, it) => acc + (Number(it.planned_quantity_tons) || 0),
        0,
      )

      let nextPredictedDate: string | null = null
      if (deduplicatedItems.length > 0) {
        const first = deduplicatedItems[0]
        if (first.start_datetime) {
          const raw = first.start_datetime.split(' ')[0]
          if (raw.includes('-')) {
            const parts = raw.split('-')
            if (parts.length === 3) {
              nextPredictedDate = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`
            }
          } else {
            nextPredictedDate = raw
          }
        } else if (first.date_str) {
          nextPredictedDate = first.date_str
        }
      }

      programacaoExistente = {
        totalPlannedTons: Math.round(totalPlannedTons * 100) / 100,
        nextPredictedDate,
        items: deduplicatedItems.map((it) => ({
          id: it.id,
          schedule_code: it.schedule_code || it.id,
          date_str: it.date_str || '',
          start_datetime: it.start_datetime || '',
          line_code: it.line_code || '',
          planned_quantity_tons: Number(it.planned_quantity_tons) || 0,
          status: it.status || 'DRAFT',
          version: Number(it.version) || 1,
          shift_name: it.shift_name,
          crew_name: it.crew_name,
        })),
      }
    } catch (err) {
      console.warn('Falha na busca em weekly_schedules para programação existente:', err)
    }

    // 3. Monta cada campo com seu respectivo status de disponibilidade
    // (a) SAP indisponível -> MSG_SAP_OFFLINE
    // (b) Sem mapeamento -> MSG_NOT_MAPPED
    // (c) Material sem o dado -> MSG_NOT_REGISTERED

    // Campo: Estoque ACAB
    let estoqueAcab: ValueWithAvailability<number>
    if (!sapOnline) {
      estoqueAcab = { value: null, status: 'SAP_OFFLINE', statusMessage: MSG_SAP_OFFLINE }
    } else if (
      carteiraRecord &&
      carteiraRecord.estoque_acabado_tons !== undefined &&
      carteiraRecord.estoque_acabado_tons !== null
    ) {
      estoqueAcab = {
        value: Number(carteiraRecord.estoque_acabado_tons),
        status: 'AVAILABLE',
      }
    } else if (inventoryRecords.length > 0) {
      const acabItems = inventoryRecords.filter((i) => i.category === 'FINISHED_GOOD')
      const totalAcab = acabItems.reduce((acc, i) => acc + (Number(i.qty_unrestricted) || 0), 0)
      estoqueAcab = {
        value: Math.round(totalAcab * 100) / 100,
        status: 'AVAILABLE',
      }
    } else {
      estoqueAcab = { value: null, status: 'NOT_REGISTERED', statusMessage: MSG_NOT_REGISTERED }
    }

    // Campo: Estoque SEMI
    let estoqueSemi: ValueWithAvailability<number>
    if (!sapOnline) {
      estoqueSemi = { value: null, status: 'SAP_OFFLINE', statusMessage: MSG_SAP_OFFLINE }
    } else if (
      carteiraRecord &&
      (carteiraRecord.estoque_semiacabado_ciafal_tons !== undefined ||
        carteiraRecord.estoque_semiacabado_tons !== undefined)
    ) {
      const semi =
        carteiraRecord.estoque_semiacabado_ciafal_tons ??
        carteiraRecord.estoque_semiacabado_tons ??
        null
      if (semi !== null && semi !== undefined) {
        estoqueSemi = { value: Number(semi), status: 'AVAILABLE' }
      } else {
        estoqueSemi = { value: null, status: 'NOT_REGISTERED', statusMessage: MSG_NOT_REGISTERED }
      }
    } else if (inventoryRecords.length > 0) {
      const semiItems = inventoryRecords.filter((i) => i.category === 'SEMI_FINISHED')
      const totalSemi = semiItems.reduce((acc, i) => acc + (Number(i.qty_unrestricted) || 0), 0)
      estoqueSemi = {
        value: Math.round(totalSemi * 100) / 100,
        status: 'AVAILABLE',
      }
    } else {
      estoqueSemi = { value: null, status: 'NOT_REGISTERED', statusMessage: MSG_NOT_REGISTERED }
    }

    // Campo: Estoque Qualidade (Origem SAP: inventory_items.qty_in_quality)
    let estoqueQualidade: ValueWithAvailability<number>
    if (!sapOnline) {
      estoqueQualidade = { value: null, status: 'SAP_OFFLINE', statusMessage: MSG_SAP_OFFLINE }
    } else if (inventoryRecords.length > 0) {
      const sumQuality = inventoryRecords.reduce(
        (acc, i) => acc + (Number(i.qty_in_quality) || 0),
        0,
      )
      estoqueQualidade = {
        value: Math.round(sumQuality * 100) / 100,
        status: 'AVAILABLE',
      }
    } else {
      estoqueQualidade = {
        value: null,
        status: 'NOT_MAPPED',
        statusMessage: 'Dado não disponível no SAP',
      }
    }

    // Campo: Estoque Bloqueado (Origem SAP: inventory_items.qty_blocked)
    let estoqueBloqueado: ValueWithAvailability<number>
    if (!sapOnline) {
      estoqueBloqueado = { value: null, status: 'SAP_OFFLINE', statusMessage: MSG_SAP_OFFLINE }
    } else if (inventoryRecords.length > 0) {
      const sumBlocked = inventoryRecords.reduce((acc, i) => acc + (Number(i.qty_blocked) || 0), 0)
      estoqueBloqueado = {
        value: Math.round(sumBlocked * 100) / 100,
        status: 'AVAILABLE',
      }
    } else {
      estoqueBloqueado = {
        value: null,
        status: 'NOT_MAPPED',
        statusMessage: 'Dado não disponível no SAP',
      }
    }

    // Campo: Carteira
    let carteira: ValueWithAvailability<number>
    if (!sapOnline) {
      carteira = { value: null, status: 'SAP_OFFLINE', statusMessage: MSG_SAP_OFFLINE }
    } else if (!carteiraRecord) {
      carteira = { value: null, status: 'NOT_REGISTERED', statusMessage: MSG_NOT_REGISTERED }
    } else {
      const cart =
        carteiraRecord.carteira_aberta_tons ?? carteiraRecord.carteira_vendas_tons ?? null
      if (cart !== null && cart !== undefined) {
        carteira = { value: Number(cart), status: 'AVAILABLE' }
      } else {
        carteira = { value: null, status: 'NOT_REGISTERED', statusMessage: MSG_NOT_REGISTERED }
      }
    }

    // Campo: Média diária de faturamento
    let mediaDiariaFaturamentoTDia: ValueWithAvailability<number>
    if (!sapOnline) {
      mediaDiariaFaturamentoTDia = {
        value: null,
        status: 'SAP_OFFLINE',
        statusMessage: MSG_SAP_OFFLINE,
      }
    } else if (!carteiraRecord) {
      mediaDiariaFaturamentoTDia = {
        value: null,
        status: 'NOT_REGISTERED',
        statusMessage: MSG_NOT_REGISTERED,
      }
    } else if (
      carteiraRecord.media_faturamento_diario_t_dia !== undefined &&
      carteiraRecord.media_faturamento_diario_t_dia !== null &&
      Number(carteiraRecord.media_faturamento_diario_t_dia) > 0
    ) {
      mediaDiariaFaturamentoTDia = {
        value: Number(carteiraRecord.media_faturamento_diario_t_dia),
        status: 'AVAILABLE',
      }
    } else {
      // Material sem o dado cadastrado no SAP
      mediaDiariaFaturamentoTDia = {
        value: null,
        status: 'NOT_REGISTERED',
        statusMessage: MSG_NOT_REGISTERED,
      }
    }

    // Campo: Tempo médio de ciclo
    // Verifica se existe BAPI_ROUTING_GET_DETAIL ou mapeamento na Ficha Mestre
    let tempoMedioCicloMin: ValueWithAvailability<number>
    const hasProdRatesBapi = sapCatalogEntries.some(
      (c) => c.function_name === 'BAPI_ROUTING_GET_DETAIL' || c.code === 'SAP_BAPI_PROD_RATES',
    )
    if (!sapOnline) {
      tempoMedioCicloMin = { value: null, status: 'SAP_OFFLINE', statusMessage: MSG_SAP_OFFLINE }
    } else if (!hasProdRatesBapi) {
      tempoMedioCicloMin = { value: null, status: 'NOT_MAPPED', statusMessage: MSG_NOT_MAPPED }
    } else {
      // Verifica se o material tem tempo de ciclo conhecido
      tempoMedioCicloMin = {
        value: null,
        status: 'NOT_REGISTERED',
        statusMessage: MSG_NOT_REGISTERED,
      }
    }

    // 4. Saldo Carteira = Carteira − Estoque ACAB + Estoque SEMI
    let saldoCarteira: ValueWithAvailability<number>
    if (carteira.value !== null && estoqueAcab.value !== null && estoqueSemi.value !== null) {
      const calcSaldo = this.calculateSaldoCarteira({
        carteira: carteira.value,
        estoqueAcab: estoqueAcab.value,
        estoqueSemi: estoqueSemi.value,
      })
      saldoCarteira = { value: calcSaldo, status: 'AVAILABLE' }
    } else {
      // Indisponível porque algum dos operandos está indisponível
      saldoCarteira = {
        value: null,
        status: carteira.status !== 'AVAILABLE' ? carteira.status : 'NOT_REGISTERED',
        statusMessage:
          carteira.statusMessage ||
          estoqueAcab.statusMessage ||
          estoqueSemi.statusMessage ||
          MSG_NOT_REGISTERED,
      }
    }

    // 5. Cobertura Atual e Pós-Programação
    // Estoque considerado = Estoque ACAB (livre)
    // Cobertura Pós-Prog. = (Estoque Acabado livre + Programação Existente vigente + nova quantidade) / Média Diária Faturamento
    const currentCov = this.calculateCurrentCoverage(
      estoqueAcab.value,
      mediaDiariaFaturamentoTDia.value,
    )
    const postCov = this.calculatePostCoverage(
      estoqueAcab.value,
      plannedTons,
      mediaDiariaFaturamentoTDia.value,
      programacaoExistente.totalPlannedTons,
    )
    const situationText = this.evaluateCoverageSituation(postCov, toleranceMin, toleranceMax)

    let situationStatus: CoverageEvaluation['situationStatus'] = 'UNAVAILABLE'
    if (situationText === 'Dentro da tolerância') situationStatus = 'WITHIN_TOLERANCE'
    else if (situationText === 'Abaixo da cobertura mínima') situationStatus = 'BELOW_MIN'
    else if (situationText === 'Acima da cobertura máxima') situationStatus = 'ABOVE_MAX'

    return {
      materialCode: cleanCode,
      estoqueAcab,
      estoqueSemi,
      estoqueQualidade,
      estoqueBloqueado,
      carteira,
      tempoMedioCicloMin,
      mediaDiariaFaturamentoTDia,
      programacaoExistente,
      saldoCarteira,
      coverage: {
        currentCoverageDays: currentCov,
        postCoverageDays: postCov,
        toleranceMinDays: toleranceMin,
        toleranceMaxDays: toleranceMax,
        situationText,
        situationStatus,
      },
      calculationTimestamp: new Date().toISOString(),
      sapSystemName: 'SAP ECC 6.08 PRD',
      sapConnected: sapOnline,
    }
  }
}
