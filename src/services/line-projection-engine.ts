import pb from '@/lib/pocketbase/client'
import {
  LineProjectionConfig,
  ProjectionEngineResult,
  DailyProjectionRow,
  StockProjectionStatus,
  ProjectionInputItemDetail,
} from '@/types/inventory-projection'

export class LineProjectionEngine {
  /**
   * Obtém ou cria a configuração padrão de projeção para uma linha.
   * Suporta configuração genérica para qualquer linha, com templates específicos prontos para ENDL1 e ACABL2.
   */
  public async getOrCreateConfig(lineCode: string): Promise<LineProjectionConfig> {
    try {
      const records = await pb.collection('line_projection_configs').getFullList({
        filter: `line_code = '${lineCode}'`,
        sort: '-version',
      })

      if (records.length > 0) {
        const r = records[0]
        return {
          id: r.id,
          line_id: r.line_id,
          line_code: r.line_code,
          horizon_days: r.horizon_days || 15,
          initial_stock_tons: r.initial_stock_tons || 0,
          unit: r.unit || 't',
          min_stock_limit: r.min_stock_limit || 0,
          target_stock_limit: r.target_stock_limit || 0,
          max_stock_limit: r.max_stock_limit || 0,
          friday_target_stock_limit: r.friday_target_stock_limit,
          cooling_time_hours: r.cooling_time_hours || 0,
          cooling_rules_payload: r.cooling_rules_payload || [],
          calendar_rules_payload: r.calendar_rules_payload || [],
          input_flow_definitions: r.input_flow_definitions || [],
          output_flow_definitions: r.output_flow_definitions || [],
          hourly_productivity_rate: r.hourly_productivity_rate || 10,
          operating_hours_per_day: r.operating_hours_per_day || 21,
          active: r.active ?? true,
          version: r.version || 1,
        }
      }
    } catch (err) {
      console.warn('Configuração de projeção não encontrada no banco, gerando baseline:', err)
    }

    // Configuração Baseline Estruturada para Novas Linhas (sem hardcode de valores produtivos fictícios)
    return this.createBaselineConfigForLine(lineCode)
  }

  /**
   * Cria baseline configurável respeitando a lógica funcional de cada processo (ex: ENDL1 vs ACABL2)
   */
  public createBaselineConfigForLine(lineCode: string): LineProjectionConfig {
    const isAcabL2 = lineCode === 'ACAB_L2' || lineCode === 'ACABL2'
    const isEndL1 = lineCode === 'END_L1' || lineCode === 'ENDL1' || lineCode === 'L1'

    if (isAcabL2) {
      // Modelo de Referência ACABL2: Saldo anterior + Produção L2 + Tarugos L1/Blocos + Redondos L1 + Retrabalho - Produção ACABL2
      return {
        line_code: lineCode,
        horizon_days: 15,
        initial_stock_tons: 0,
        unit: 't',
        min_stock_limit: 150,
        target_stock_limit: 450,
        max_stock_limit: 900,
        friday_target_stock_limit: 500, // Regra específica de sexta-feira
        cooling_time_hours: 4, // 4h de resfriamento para materiais quentes oriundos de Laminação
        hourly_productivity_rate: 18.5, // t/h meta de produtividade
        operating_hours_per_day: 21, // 3 turnos de 7h líquidas
        active: true,
        version: 1,
        calendar_rules_payload: [
          {
            dayOfWeek: 5,
            dayName: 'Sexta-feira',
            customTargetTons: 500,
            description: 'Pulmão reforçado para virada de final de semana',
          },
        ],
        input_flow_definitions: [
          {
            id: 'in-l2-prod',
            name: 'Produção Semiacabado L2 (Upstream)',
            direction: 'INPUT',
            flowType: 'UPSTREAM_PRODUCTION',
            sourceOrTargetLineCode: 'L2',
            coolingTimeHours: 4,
            isScheduleDependent: true,
            active: true,
            description: 'Entrada de barras laminadas na L2 com resfriamento obrigatório de 4h',
          },
          {
            id: 'in-l1-tarugos',
            name: 'Tarugos L1 e Blocos',
            direction: 'INPUT',
            flowType: 'TRANSFER',
            sourceOrTargetLineCode: 'L1',
            coolingTimeHours: 0,
            isScheduleDependent: false,
            active: true,
            description: 'Transferência de tarugos e blocos da Linha 1',
          },
          {
            id: 'in-l1-redondos',
            name: 'Redondos L1',
            direction: 'INPUT',
            flowType: 'TRANSFER',
            sourceOrTargetLineCode: 'L1',
            coolingTimeHours: 0,
            isScheduleDependent: false,
            active: true,
            description: 'Transferência de perfis redondos da Linha 1',
          },
          {
            id: 'in-retrabalho',
            name: 'Retrabalho Geral',
            direction: 'INPUT',
            flowType: 'REWORK',
            sourceOrTargetLineCode: 'RETRAB',
            coolingTimeHours: 0,
            isScheduleDependent: false,
            active: true,
            description: 'Retorno de barras reprocessadas',
          },
        ],
        output_flow_definitions: [
          {
            id: 'out-acabl2-prod',
            name: 'Produção ACAB L2 (Consumo/Processamento)',
            direction: 'OUTPUT',
            flowType: 'LINE_PRODUCTION',
            fixedRatePerHourOrDay: 0,
            isScheduleDependent: true,
            active: true,
            description: 'Consumo calculado por: Horas Disponíveis × Produtividade (t/h)',
          },
          {
            id: 'out-expedicao',
            name: 'Expedição Direta',
            direction: 'OUTPUT',
            flowType: 'EXPEDITION',
            fixedRatePerHourOrDay: 0,
            isScheduleDependent: false,
            active: true,
            description: 'Expedição e faturamento para clientes',
          },
        ],
      }
    }

    if (isEndL1) {
      return {
        line_code: lineCode,
        horizon_days: 15,
        initial_stock_tons: 0,
        unit: 't',
        min_stock_limit: 100,
        target_stock_limit: 300,
        max_stock_limit: 600,
        cooling_time_hours: 2,
        hourly_productivity_rate: 15,
        operating_hours_per_day: 21,
        active: true,
        version: 1,
        input_flow_definitions: [
          {
            id: 'in-forno-l1',
            name: 'Alimentação Forno / Tarugos L1',
            direction: 'INPUT',
            flowType: 'SAP_STOCK',
            storageLocationCode: '0001',
            coolingTimeHours: 2,
            isScheduleDependent: true,
            active: true,
          },
        ],
        output_flow_definitions: [
          {
            id: 'out-endl1-prod',
            name: 'Consumo Endireitamento L1',
            direction: 'OUTPUT',
            flowType: 'LINE_CONSUMPTION',
            isScheduleDependent: true,
            active: true,
          },
        ],
      }
    }

    // Baseline genérico para qualquer outra linha
    return {
      line_code: lineCode,
      horizon_days: 15,
      initial_stock_tons: 0,
      unit: 't',
      min_stock_limit: 50,
      target_stock_limit: 200,
      max_stock_limit: 500,
      cooling_time_hours: 0,
      hourly_productivity_rate: 12,
      operating_hours_per_day: 21,
      active: true,
      version: 1,
      input_flow_definitions: [
        {
          id: `in-${lineCode.toLowerCase()}-default`,
          name: 'Entradas Previstas (SAP / Upstream)',
          direction: 'INPUT',
          flowType: 'SAP_STOCK',
          coolingTimeHours: 0,
          isScheduleDependent: true,
          active: true,
        },
      ],
      output_flow_definitions: [
        {
          id: `out-${lineCode.toLowerCase()}-default`,
          name: 'Saída de Produção / Consumo',
          direction: 'OUTPUT',
          flowType: 'LINE_CONSUMPTION',
          isScheduleDependent: true,
          active: true,
        },
      ],
    }
  }

  /**
   * Salva a configuração no PocketBase e registra na Trilha de Auditoria
   */
  public async saveConfig(config: LineProjectionConfig): Promise<LineProjectionConfig> {
    try {
      let savedRecord: any
      if (config.id) {
        savedRecord = await pb.collection('line_projection_configs').update(config.id, {
          ...config,
          version: (config.version || 1) + 1,
        })
      } else {
        savedRecord = await pb.collection('line_projection_configs').create({
          ...config,
          version: 1,
        })
      }

      // Trilha de Auditoria
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: config.id ? 'PROJECTION_CONFIG_CHANGED' : 'PROJECTION_CONFIG_CREATED',
          resource: 'LINE_PROJECTION',
          resource_id: config.line_code,
          scope: 'PRODUCTION_LINE',
          outcome: 'SUCCESS',
          details: { lineCode: config.line_code, version: savedRecord.version },
        })
      } catch {
        /* intentionally ignored */
      }

      return {
        ...config,
        id: savedRecord.id,
        version: savedRecord.version,
      }
    } catch (err) {
      console.error('Erro ao salvar configuração de projeção:', err)
      throw err
    }
  }

  /**
   * MOTOR PRINCIPAL DE PROJEÇÃO:
   * Calcula dia a dia: ESTOQUE PROJETADO FINAL = ESTOQUE INICIAL + ENTRADAS PREVISTAS - SAÍDAS/CONSUMOS PREVISTOS
   * Considera:
   * - Resfriamento / Tempo de espera (Cooling Time)
   * - Capacidade Programável (Horas × Produtividade)
   * - Regras de Calendário Específicas (ex: Sexta-feira)
   * - Distinção ACTUAL / PROJECTED / SIMULATED
   */
  public calculateProjection(
    config: LineProjectionConfig,
    options?: {
      calculationType?: 'ACTUAL' | 'PROJECTED' | 'SIMULATED'
      horizon?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
      customInputs?: { date: string; inputs: ProjectionInputItemDetail[] }[]
      customOutputFactors?: { date: string; operatingHours?: number; productivityRate?: number }[]
    },
  ): ProjectionEngineResult {
    const horizonType = options?.horizon || 'DAILY'
    const calcType = options?.calculationType || 'PROJECTED'
    const daysCount = config.horizon_days || 15

    const dailyRows: DailyProjectionRow[] = []
    let currentStock = config.initial_stock_tons || 0

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const today = new Date()

    let stockoutDays = 0
    let overflowDays = 0
    let minStockReached = currentStock
    let maxStockReached = currentStock
    let totalInputSum = 0
    let totalOutputSum = 0

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const dayOfWeek = d.getDay()
      const dayOfWeekName = dayNames[dayOfWeek]
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

      // 1. Limites do dia (verificar se há regra de calendário específica, ex: sexta-feira)
      const calRule = config.calendar_rules_payload?.find((r) => r.dayOfWeek === dayOfWeek)
      const minLimit = calRule?.customMinTons ?? config.min_stock_limit
      const targetLimit =
        calRule?.customTargetTons ??
        (dayOfWeek === 5 && config.friday_target_stock_limit
          ? config.friday_target_stock_limit
          : config.target_stock_limit)
      const maxLimit = calRule?.customMaxTons ?? config.max_stock_limit

      // 2. Parâmetros de Capacidade & Produtividade do Dia
      const customFactor = options?.customOutputFactors?.find((f) => f.date === dateStr)
      const operatingHours =
        customFactor?.operatingHours ?? (dayOfWeek === 0 ? 0 : config.operating_hours_per_day || 21) // Domingo parado se não configurado
      const productivityRate =
        customFactor?.productivityRate ?? (config.hourly_productivity_rate || 10)

      // 3. Entradas do Dia (Drill-down de Entradas)
      const dayCustomInput = options?.customInputs?.find((c) => c.date === dateStr)
      let inputDetails: ProjectionInputItemDetail[] = []

      if (dayCustomInput && dayCustomInput.inputs.length > 0) {
        inputDetails = dayCustomInput.inputs
      } else {
        // Se não houver dados específicos de OPs, calcula pelas definições ativas de fluxo
        for (const flow of config.input_flow_definitions.filter((f) => f.active)) {
          const flowQty =
            flow.fixedRatePerHourOrDay ??
            (operatingHours > 0
              ? (operatingHours * (config.hourly_productivity_rate * 0.9)) /
                config.input_flow_definitions.length
              : 0)
          const coolingHours = flow.coolingTimeHours ?? config.cooling_time_hours ?? 0

          inputDetails.push({
            id: `in-${flow.id}-${i}`,
            originLine: flow.sourceOrTargetLineCode || 'SAP_ESTOQUE',
            materialCode: 'MP-GERAL',
            materialDescription: flow.name,
            quantityTons: Number(flowQty.toFixed(1)),
            scheduledTime: `${dateStr} 07:00`,
            coolingUntil:
              coolingHours > 0
                ? `${dateStr} ${String(7 + coolingHours).padStart(2, '0')}:00`
                : undefined,
            isPhysicallyAvailable: true,
            isProcessReady: coolingHours <= 0, // Se cooling > 0, precisa de espera para ser utilizável no turno seguinte
            sourceSystem: flow.flowType === 'SAP_STOCK' ? 'SAP' : 'PCP_PROGRAMACAO',
          })
        }
      }

      const inputTonsTotal = inputDetails.reduce((sum, item) => sum + item.quantityTons, 0)
      const availableInputTons = inputDetails.reduce(
        (sum, item) => sum + (item.isProcessReady ? item.quantityTons : item.quantityTons * 0.5),
        0,
      )
      const coolingWaitingTons = inputTonsTotal - availableInputTons

      // 4. Saídas / Consumo do Dia = Horas Disponíveis × Produtividade
      let outputConsumptionTons = 0
      if (operatingHours > 0) {
        outputConsumptionTons = Number((operatingHours * productivityRate).toFixed(1))
      }

      // 5. Cálculo do Estoque Final: Saldo Anterior + Entradas - Saídas
      const initialStockTons = Number(currentStock.toFixed(1))
      const finalStockTons = Number(
        (initialStockTons + availableInputTons - outputConsumptionTons).toFixed(1),
      )

      // 6. Alertas e Status Semântico
      const alerts: string[] = []
      let status: StockProjectionStatus = 'TARGET_RANGE'

      if (finalStockTons < 0) {
        status = 'RISK_OF_STOCKOUT'
        alerts.push('🚨 Risco Iminente de Ruptura (Estoque Negativo)')
        stockoutDays++
      } else if (finalStockTons < minLimit) {
        status = 'BELOW_MINIMUM'
        alerts.push('⚠️ Saldo Projetado Abaixo do Estoque Mínimo')
      } else if (finalStockTons > maxLimit) {
        status = 'ABOVE_MAXIMUM'
        alerts.push('📦 Saldo Projetado Excede Capacidade Máxima do Pátio/Pulmão')
        overflowDays++
      }

      if (coolingWaitingTons > 0) {
        alerts.push(
          `⏳ ${coolingWaitingTons.toFixed(1)} t em período de resfriamento (não disponível de imediato)`,
        )
      }

      if (availableInputTons < outputConsumptionTons * 0.4 && operatingHours > 0) {
        alerts.push('📉 Restrição Upstream: Taxa de alimentação inferior ao ritmo da linha')
      }

      dailyRows.push({
        date: dateStr,
        dayOfWeekName,
        dayIndex: i,
        initialStockTons,
        inputTonsTotal: Number(inputTonsTotal.toFixed(1)),
        availableInputTons: Number(availableInputTons.toFixed(1)),
        coolingWaitingTons: Number(coolingWaitingTons.toFixed(1)),
        outputConsumptionTons,
        finalStockTons,
        minLimitTons: minLimit,
        targetLimitTons: targetLimit,
        maxLimitTons: maxLimit,
        status,
        operatingHours,
        productivityRate,
        inputDetails,
        alerts,
      })

      // Atualiza acumuladores
      minStockReached = Math.min(minStockReached, finalStockTons)
      maxStockReached = Math.max(maxStockReached, finalStockTons)
      totalInputSum += inputTonsTotal
      totalOutputSum += outputConsumptionTons

      // O estoque final vira o estoque inicial do dia seguinte
      currentStock = finalStockTons
    }

    return {
      lineCode: config.line_code,
      horizon: horizonType,
      generatedAt: new Date().toISOString(),
      calculationType: calcType,
      initialStock: config.initial_stock_tons || 0,
      dailyRows,
      summary: {
        minStockReached: Number(minStockReached.toFixed(1)),
        maxStockReached: Number(maxStockReached.toFixed(1)),
        stockoutRiskDays: stockoutDays,
        overflowRiskDays: overflowDays,
        averageDailyConsumption: Number((totalOutputSum / (daysCount || 1)).toFixed(1)),
        totalInputTons: Number(totalInputSum.toFixed(1)),
        totalOutputTons: Number(totalOutputSum.toFixed(1)),
      },
    }
  }
}

export const lineProjectionEngine = new LineProjectionEngine()
export default lineProjectionEngine
