/**
 * PCP Central Data Layer (Fonte Única da Verdade)
 * CIAFAL - Siderurgia e Laminação
 *
 * Princípio Fundamental:
 * MATERIAL -> Cadastro Mestre / Ficha Mestre
 * CARTEIRA -> Carga ZSD28C (Snapshot V001, V002...)
 * ESTOQUE -> SAP/WMS ou carga QAS
 * PROGRAMAÇÃO -> Programação PCP Aprovada / Versão Ativa
 * MATÉRIA-PRIMA -> Gestão de MP + Projeções Centrais
 * CAPACIDADE -> Matriz de Capacidade Nominal/Líquida
 * SETUP -> Matriz de Setup / Oficina de Cilindros
 * GARGALO -> Matriz de Gargalos e Restrições
 * PEDIDO -> ZSD28C / SAP SD
 * ORDEM -> SAP PP
 *
 * Lineage Obrigatório: source_system, source_transaction, source_file, source_load_id, source_row, imported_at, imported_by
 */

import pb from '@/lib/pocketbase/client'
import { CarteiraItem, CarteiraEntradaFutura, CarteiraUpload } from '@/types/carteira-analise'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

export interface CanonicalLineage {
  source_system: 'SAP_ECC' | 'SAP_QAS' | 'PCP_ENGINE' | 'EXCEL_QAS' | 'MES' | 'WMS'
  source_transaction: string
  source_file?: string
  source_load_id?: string
  source_row?: number
  imported_at: string
  imported_by: string
}

export interface CanonicalCustomerOrder {
  order_id: string
  sales_order: string
  sales_order_item: string
  company_code: string
  plant_code: string
  sales_org?: string
  distribution_channel?: string
  sector?: string
  sales_rep?: string
  customer_code: string
  customer_name: string
  material_code: string
  material_description: string
  order_quantity_tons: number
  invoiced_quantity_tons: number
  open_quantity_tons: number
  unit: string
  requested_date: string
  confirmed_date?: string
  order_date: string
  order_type: 'MTS' | 'MTO'
  product_origin: 'PRODUCAO_PROPRIA' | 'REVENDA' | 'IMPORTADO' | 'INDUSTRIALIZACAO'
  production_line?: string
  lineage: CanonicalLineage
}

export interface CanonicalMaterialStock {
  material_code: string
  free_stock_tons: number
  mto_stock_tons: number
  semi_finished_ciafal_tons: number
  semi_finished_vallourec_tons: number
  finished_stock_tons: number
  total_available_tons: number
  last_snapshot_at: string
  source_origin: 'SAP_MB52' | 'WMS_REAL' | 'CARTEIRA_ZSD28C' | 'QAS_LOAD'
}

export interface PCPDataSnapshot {
  orders: CanonicalCustomerOrder[]
  stocks: Map<string, CanonicalMaterialStock>
  activeWeeklySchedules: WeeklyScheduleItem[]
  currentCarteiraUpload: CarteiraUpload | null
  totalCarteiraTons: number
  totalMtsTons: number
  totalMtoTons: number
  totalOpenOrders: number
  environment: 'HOMOLOGACAO_QAS' | 'DESENVOLVIMENTO' | 'PRODUCAO'
  lastSyncTimestamp: string
}

export type PCPEventType =
  | 'CARTEIRA_UPDATED'
  | 'CARTEIRA_ROLLBACK'
  | 'SCHEDULE_APPROVED'
  | 'SCHEDULE_PUBLISHED'
  | 'STOCK_UPDATED'
  | 'DATA_LAYER_REFRESH'

export interface PCPEventPayload<T = any> {
  event_id: string
  event_type: PCPEventType
  source: 'CARTEIRA_ZSD28C' | 'PCP_WEEKLY_SCHEDULE' | 'PCP_RULES' | 'DATA_LAYER'
  timestamp: string
  correlation_id: string
  user_name?: string
  data: T
}

type PCPEventListener = (event: PCPEventPayload) => void

export class PCPDataLayer {
  private static instance: PCPDataLayer
  private listeners: Map<PCPEventType, Set<PCPEventListener>> = new Map()
  private cachedSnapshot: PCPDataSnapshot | null = null
  private isRefreshing = false

  private constructor() {
    // Registra suporte a eventos globais
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'PCP_EVENT_DISPATCH') {
          try {
            const eventPayload: PCPEventPayload = JSON.parse(e.newValue || '{}')
            if (eventPayload.event_type) {
              this.notifyLocalSubscribers(eventPayload)
            }
          } catch {
            /* ignore */
          }
        }
      })
    }
  }

  public static getInstance(): PCPDataLayer {
    if (!PCPDataLayer.instance) {
      PCPDataLayer.instance = new PCPDataLayer()
    }
    return PCPDataLayer.instance
  }

  /**
   * Assinar eventos do Barramento Central
   */
  public subscribe(eventType: PCPEventType, listener: PCPEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)

    return () => {
      this.listeners.get(eventType)?.delete(listener)
    }
  }

  /**
   * Publicar evento no Barramento Central (Idempotente e com correlation_id)
   */
  public publish(
    eventType: PCPEventType,
    source: PCPEventPayload['source'],
    data: any,
    correlationId?: string,
  ): void {
    const eventPayload: PCPEventPayload = {
      event_id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      event_type: eventType,
      source,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId || `CORR-${Date.now()}`,
      user_name: pb.authStore.record?.name || pb.authStore.record?.email || 'PCP System',
      data,
    }

    // Invalida cache local
    this.cachedSnapshot = null

    // Notifica subscribers locais
    this.notifyLocalSubscribers(eventPayload)

    // Notifica outras abas/janelas
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('PCP_EVENT_DISPATCH', JSON.stringify(eventPayload))
      } catch {
        /* ignore */
      }
    }
  }

  private notifyLocalSubscribers(event: PCPEventPayload): void {
    const list = this.listeners.get(event.event_type)
    if (list) {
      list.forEach((listener) => {
        try {
          listener(event)
        } catch (err) {
          console.error(`Erro no subscriber de ${event.event_type}:`, err)
        }
      })
    }
  }

  /**
   * Obtém snapshot canônico consolidado da fonte única
   */
  public async getCanonicalSnapshot(forceRefresh = false): Promise<PCPDataSnapshot> {
    if (this.cachedSnapshot && !forceRefresh) {
      return this.cachedSnapshot
    }

    if (this.isRefreshing) {
      // Retorna cache existente enquanto atualiza
      if (this.cachedSnapshot) return this.cachedSnapshot
    }

    this.isRefreshing = true

    try {
      // 1. Carrega Carga Vigente da Carteira ZSD28C
      const uploads = await pb
        .collection('carteira_uploads')
        .getFullList<CarteiraUpload>({
          sort: '-created',
        })
        .catch(() => [])

      const currentUpload = uploads.find((u) => u.is_active_current) || uploads[0] || null

      let rawItems: CarteiraItem[] = []
      if (currentUpload) {
        rawItems = await pb
          .collection('carteira_items')
          .getFullList<CarteiraItem>({
            filter: `upload_code = '${currentUpload.upload_code}'`,
          })
          .catch(() => [])
      }

      // 2. Transforma em Canonical Orders & Stocks
      const orders: CanonicalCustomerOrder[] = []
      const stocks = new Map<string, CanonicalMaterialStock>()

      let totalCarteiraTons = 0
      let totalMtsTons = 0
      let totalMtoTons = 0

      rawItems.forEach((it, index) => {
        const matCode = it.codigo_material.trim().toUpperCase()
        const openTons = Number(it.carteira_aberta_tons) || 0
        const orderTons = Number(it.qtd_ordem_tons) || 0
        const invoicedTons = Number(it.qtd_faturada_tons) || 0

        totalCarteiraTons += openTons
        if (it.tipo_ordem === 'MTO') {
          totalMtoTons += openTons
        } else {
          totalMtsTons += openTons
        }

        const canonicalOrder: CanonicalCustomerOrder = {
          order_id: `${it.ordem_venda}_${it.item_ordem}_${matCode}`,
          sales_order: it.ordem_venda,
          sales_order_item: it.item_ordem,
          company_code: it.empresa || 'CIAFAL',
          plant_code: it.centro || '1000',
          customer_code: it.codigo_cliente,
          customer_name: it.nome_cliente,
          material_code: matCode,
          material_description: it.descricao_material,
          order_quantity_tons: orderTons,
          invoiced_quantity_tons: invoicedTons,
          open_quantity_tons: openTons,
          unit: 't',
          requested_date: it.data_desejada,
          order_date: it.data_ordem,
          order_type: it.tipo_ordem,
          product_origin: it.origem_produto,
          production_line: it.linha,
          lineage: {
            source_system: currentUpload?.source_mode === 'EXCEL_QAS' ? 'EXCEL_QAS' : 'SAP_ECC',
            source_transaction: 'ZSD28C',
            source_file: currentUpload?.filename,
            source_load_id: currentUpload?.upload_code,
            source_row: index + 2,
            imported_at: currentUpload?.created || new Date().toISOString(),
            imported_by: currentUpload?.user_name || 'Operador QAS',
          },
        }
        orders.push(canonicalOrder)

        // Consolida Estoques Canônicos por Material
        if (!stocks.has(matCode)) {
          const freeStock = Number(it.estoque_livre_tons) || 0
          const mtoStock = Number(it.estoque_mto_tons) || 0
          const semiCiafal =
            Number(it.estoque_semiacabado_ciafal_tons) || Number(it.estoque_semiacabado_tons) || 0
          const semiVallourec = Number(it.estoque_semiacabado_vallourec_tons) || 0
          const finishedStock = Number(it.estoque_acabado_tons) || 0
          const totalAvail = freeStock + mtoStock + semiCiafal + semiVallourec + finishedStock

          stocks.set(matCode, {
            material_code: matCode,
            free_stock_tons: freeStock,
            mto_stock_tons: mtoStock,
            semi_finished_ciafal_tons: semiCiafal,
            semi_finished_vallourec_tons: semiVallourec,
            finished_stock_tons: finishedStock,
            total_available_tons: totalAvail,
            last_snapshot_at: currentUpload?.created || new Date().toISOString(),
            source_origin: 'CARTEIRA_ZSD28C',
          })
        }
      })

      // 3. Carrega Programações Aprovadas Vigentes
      const activeWeeklySchedules = await pb
        .collection('weekly_schedules')
        .getFullList<WeeklyScheduleItem>({
          filter: "status = 'PUBLICADO' || status = 'APROVADO_PCP'",
          sort: 'sequence_order',
        })
        .catch(() => [])

      const snapshot: PCPDataSnapshot = {
        orders,
        stocks,
        activeWeeklySchedules,
        currentCarteiraUpload: currentUpload,
        totalCarteiraTons: Math.round(totalCarteiraTons * 10) / 10,
        totalMtsTons: Math.round(totalMtsTons * 10) / 10,
        totalMtoTons: Math.round(totalMtoTons * 10) / 10,
        totalOpenOrders: orders.length,
        environment: 'HOMOLOGACAO_QAS',
        lastSyncTimestamp: new Date().toISOString(),
      }

      this.cachedSnapshot = snapshot
      return snapshot
    } finally {
      this.isRefreshing = false
    }
  }

  /**
   * Cálculo Canônico Central de Saldo Projetado
   * Fórmula única: Saldo Projetado = Saldo Atual + Entradas Previstas + Produção Programada - Consumo Previsto
   */
  public calculateProjectedBalance(params: {
    currentStockTons: number
    plannedReceiptsTons: number
    plannedProductionTons: number
    forecastConsumptionTons: number
  }): {
    projectedBalanceTons: number
    formula: string
    inputs: Record<string, number>
    ruleVersion: string
  } {
    const projected =
      params.currentStockTons +
      params.plannedReceiptsTons +
      params.plannedProductionTons -
      params.forecastConsumptionTons

    return {
      projectedBalanceTons: Math.round(projected * 100) / 100,
      formula:
        'Saldo Projetado = Saldo Atual + Entradas Previstas + Produção Programada - Consumo Previsto',
      inputs: {
        currentStockTons: params.currentStockTons,
        plannedReceiptsTons: params.plannedReceiptsTons,
        plannedProductionTons: params.plannedProductionTons,
        forecastConsumptionTons: params.forecastConsumptionTons,
      },
      ruleVersion: 'CIAFAL-BALANCE-v2.1',
    }
  }
}

export const pcpDataLayer = PCPDataLayer.getInstance()
