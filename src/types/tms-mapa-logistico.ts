export type HeatmapMetric =
  | 'tons'
  | 'orders_count'
  | 'customers_count'
  | 'order_value'
  | 'items_count'
  | 'potential_loads'

export type TmsLoadStatus =
  | 'ROTA_SUGERIDA_IA'
  | 'CARGA_PLANEJADA'
  | 'CARGA_CONFIRMADA'
  | 'CARGA_EM_NEGOCIACAO'
  | 'TRANSPORTE_CRIADO'
  | 'TRANSPORTE_EM_EXECUCAO'
  | 'CANCELADA'

export interface SapSalesOrderItem {
  id: string
  sales_order: string
  sales_order_item: string
  customer_code: string
  customer_name: string
  city: string
  uf: string
  cep: string
  latitude: number
  longitude: number
  has_valid_geo: boolean
  company_code: string
  company_name: string
  shipping_center_code: string
  shipping_center_name: string
  origin_plant: string
  deposit_code: string
  material_code: string
  material_description: string
  material_group: string
  quantity: number
  unit: string
  weight_tons: number
  order_value_brl: number
  order_date: string
  requested_delivery_date: string
  planned_delivery_date: string
  itinerary_code: string
  itinerary_description: string
  delivery_condition: string
  order_status: 'LIBERADO' | 'BLOQUEADO' | 'FATURADO' | 'CANCELADO' | 'EM_CARGA'
  credit_status: 'APROVADO' | 'BLOQUEADO' | 'EM_ANALISE'
  stock_available_tons: number
  stock_future_tons: number
  pcp_schedule_ref?: string
  pcp_production_status?: string
  commercial_priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'
  customer_restrictions?: Record<string, any>
  assigned_load_id?: string
  rfid_tag_verified: boolean
}

export interface SapItinerario {
  id: string
  code: string
  description: string
  uf: string
  region: string
  origin_name: string
  origin_center_code: string
  destinations_sequence: string[]
  cities_covered: string[]
  distance_km_estimated: number
  transit_time_days_estimated: number
  toll_cost_estimated_brl: number
  default_freight_per_ton_brl: number
  active: boolean
}

export interface TmsPlannedLoad {
  id: string
  load_number: string
  status: TmsLoadStatus
  origin_plant: string
  origin_city: string
  origin_uf: string
  itinerary_code: string
  itinerary_description: string
  destinations_sequence: Array<{ city: string; uf: string; client: string; weight_tons: number }>
  destinations_summary: string
  total_weight_tons: number
  total_orders_count: number
  total_customers_count: number
  vehicle_type_suggested: string
  vehicle_capacity_tons: number
  load_occupancy_pct: number
  carrier_name: string
  carrier_code?: string
  estimated_freight_cost_brl: number
  estimated_toll_cost_brl: number
  estimated_savings_brl: number
  total_unloading_stops: number
  total_distance_km: number
  estimated_travel_time_hours: number
  departure_planned_date: string
  orders_json: Array<{
    sales_order: string
    item: string
    weight: number
    client: string
    city: string
  }>
  ai_rationale?: string
  is_future_prediction: boolean
  wms_rfid_alert?: string
  created_by_user_id?: string
  created_by_user_name?: string
  created?: string
}

export interface TmsFiltersState {
  company: string
  center: string
  origin: string
  region: string
  uf: string
  city: string
  customer: string
  itinerary: string
  material: string
  materialGroup: string
  orderStatus: string
  creditStatus: string
  priority: string
  futureStockMode: 'CURRENT_ONLY' | 'CURRENT_AND_FUTURE'
  startDate: string
  endDate: string
}

export interface CityAggregation {
  city: string
  uf: string
  latitude: number
  longitude: number
  has_valid_geo: boolean
  total_tons: number
  available_tons: number
  future_tons: number
  orders_count: number
  customers_count: number
  customers_names: string[]
  potential_loads: number
  order_value_brl: number
  items_count: number
  primary_itinerary: string
  oldest_order_date: string
  has_rfid_alert: boolean
  orders: SapSalesOrderItem[]
}

export interface UfAggregation {
  uf: string
  region: string
  total_tons: number
  available_tons: number
  future_tons: number
  orders_count: number
  customers_count: number
  potential_loads: number
  order_value_brl: number
  cities_count: number
  cities: CityAggregation[]
}

export interface ConsolidationOpportunity {
  id: string
  itinerary_code: string
  itinerary_description: string
  clients_count: number
  orders_count: number
  total_weight_tons: number
  occupancy_pct: number
  stops_count: number
  estimated_savings_brl: number
  estimated_freight_brl: number
  vehicle_type: string
  origin: string
  destinations: string[]
  feasibility: 'ALTA' | 'MEDIA' | 'BAIXA'
  compatible_dates: boolean
  rationale: string
  orders: SapSalesOrderItem[]
}

export interface AiMapInsight {
  id: string
  type: 'CONCENTRATION' | 'CONSOLIDATION' | 'UNASSIGNED_STOCK' | 'FUTURE_PCP' | 'SAVINGS'
  title: string
  description: string
  impact: string
  traceability_data: Record<string, any>
  action_label?: string
}

export interface MapLayerToggles {
  heatmap: boolean
  availableOrders: boolean
  clients: boolean
  itineraries: boolean
  suggestedLoads: boolean
  plannedLoads: boolean
  availableStock: boolean
  logisticsAlerts: boolean
  showRoutes: boolean
}
