import { pb } from '@/lib/pocketbase/client'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

export interface SapProdOrdItemPayload {
  id?: string
  schedule_item_id?: string
  sequence_order?: number
  material_code: string
  material_description?: string
  company_code?: string
  werks?: string
  line_code?: string
  arbpl?: string
  planned_quantity_tons: number
  unit?: string
  date_str?: string
  start_date?: string
  end_date?: string
  production_order?: string
  sap_order_number?: string
  production_version?: string
  verid?: string
  order_type?: string
}

export interface SapProdOrdItemResult {
  schedule_item_id: string
  material_code: string
  material_description?: string
  sequence_order: number
  status: 'SUCCESS' | 'ERROR' | 'ALREADY_CREATED'
  order_number: string | null
  message?: string
  error_message?: string
  correlation_id: string
}

export interface SapProdOrdCreateResponse {
  success: boolean
  code?: string
  message: string
  correlation_id?: string
  summary: {
    total: number
    created: number
    failed: number
    skipped_already_created: number
  }
  results: SapProdOrdItemResult[]
}

export const sapProductionOrderService = {
  /**
   * Converte um WeeklyScheduleItem para o payload esperado pela BAPI SAP
   */
  mapScheduleItemToSapPayload(
    item: WeeklyScheduleItem,
    companyCode = '1001',
    lineCode = '',
  ): SapProdOrdItemPayload {
    return {
      id: item.id,
      schedule_item_id: item.id,
      sequence_order: item.sequence_order,
      material_code: item.material_code,
      material_description: item.material_description,
      company_code: item.company_code || companyCode,
      werks: item.company_code || companyCode,
      line_code: item.line_code || lineCode,
      arbpl: item.line_code || lineCode,
      planned_quantity_tons: Number(item.planned_quantity_tons) || 0,
      unit: 'TO', // Tonelada métrica no SAP ECC
      date_str: item.date_str,
      start_date: item.start_datetime ? item.start_datetime.split(' ')[0] : item.date_str,
      end_date: item.end_datetime ? item.end_datetime.split(' ')[0] : item.date_str,
      production_order: item.production_order,
      order_type: item.order_type === 'MTO' ? 'PP01' : 'PP01',
    }
  },

  /**
   * Executa a criação real de Ordens de Produção no SAP ECC via hook backend
   * Retorna erro explícito "Endpoint SAP não configurado — provisionamento pendente"
   * se o backend não estiver integrado a um servidor SAP real.
   */
  async createProductionOrders(params: {
    items: SapProdOrdItemPayload[]
    scheduleCode: string
    companyCode?: string
    lineCode?: string
  }): Promise<SapProdOrdCreateResponse> {
    if (!params.items || params.items.length === 0) {
      throw new Error('Nenhum produto foi selecionado para criação de Ordem de Produção.')
    }

    try {
      const response = await pb.send<SapProdOrdCreateResponse>(
        '/backend/v1/pcp/sap/create-production-orders',
        {
          method: 'POST',
          body: {
            items: params.items,
            schedule_code: params.scheduleCode,
            company_code: params.companyCode || '1001',
            line_code: params.lineCode || '',
          },
        },
      )
      return response
    } catch (err: any) {
      const data = err?.data
      if (data && data.code === 'SAP_ENDPOINT_NOT_CONFIGURED') {
        return {
          success: false,
          code: data.code,
          message: data.message || 'Endpoint SAP não configurado — provisionamento pendente',
          correlation_id: data.correlation_id,
          summary: data.summary || {
            total: params.items.length,
            created: 0,
            failed: params.items.length,
            skipped_already_created: 0,
          },
          results:
            data.results ||
            params.items.map((it) => ({
              schedule_item_id: it.id || it.schedule_item_id || '',
              material_code: it.material_code,
              sequence_order: it.sequence_order || 0,
              status: 'ERROR' as const,
              error_message: 'Endpoint SAP não configurado — provisionamento pendente',
              order_number: null,
              correlation_id: data.correlation_id || `ERR-${Date.now()}`,
            })),
        }
      }

      if (data && data.results) {
        return data as SapProdOrdCreateResponse
      }

      const explicitMsg =
        data?.message ||
        err?.message ||
        'Não foi possível estabelecer comunicação com o SAP. Nenhuma Ordem de Produção foi criada. Tente novamente posteriormente.'

      throw new Error(explicitMsg)
    }
  },

  /**
   * Atualiza a lista em memória e no banco com as Ordens reais criadas pelo SAP
   */
  async applySapResultsToScheduleItems(
    items: WeeklyScheduleItem[],
    results: SapProdOrdItemResult[],
  ): Promise<WeeklyScheduleItem[]> {
    const resultMap = new Map<string, SapProdOrdItemResult>()
    results.forEach((r) => {
      if (r.schedule_item_id) {
        resultMap.set(r.schedule_item_id, r)
      }
      if (r.material_code) {
        resultMap.set(`mat:${r.material_code}:${r.sequence_order}`, r)
      }
    })

    const updated = items.map((item) => {
      const match =
        resultMap.get(item.id) || resultMap.get(`mat:${item.material_code}:${item.sequence_order}`)

      if (match && match.order_number) {
        return {
          ...item,
          production_order: match.order_number,
          metadata: {
            ...(item.metadata || {}),
            sap_production_order: {
              order_number: match.order_number,
              status: match.status,
              correlation_id: match.correlation_id,
              transmitted_at: new Date().toISOString(),
            },
          },
        }
      }
      return item
    })

    return updated
  },
}
