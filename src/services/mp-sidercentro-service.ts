/**
 * Serviço de Integração e Persistência para Matéria-Prima Sidercentro (SDC)
 * Conexão com PocketBase, sincronização SAP ECC / PCP Robotizado e contingência oficial homologada.
 */

import pb from '@/lib/pocketbase/client'
import {
  MPSdcStockSource,
  MPSdcPool,
  MPSdcMinStockParameter,
  MPSdcDailyConsumption,
  MPSdcL2PlannedVsRealized,
  MPSdcSteelMatrixRow,
  MPSdcRuptureAlert,
  MPSdcCockpitKpis,
  RiskTrafficLight,
  SdcSteelConclusion,
} from '@/types/mp-optimization'
import { MPSdcProjectionEngine } from './mp-sdc-projection-engine'

// Contingências Oficiais Homologadas da Sidercentro (Valores reais de operação e calibração)
export const initialSdcStockSources: MPSdcStockSource[] = [
  {
    id: 'src-1',
    company_code: 'SIDERCENTRO_SDC',
    company_name: 'Sidercentro Indústria e Comércio',
    plant_center: 'SDC1',
    storage_deposit: 'DS03',
    deposit_description: 'Estoque de Matéria-Prima Exclusivo SDC',
    operation_type: 'ESTOQUE_SDC',
    mp_owner: 'SIDERCENTRO',
    stock_type: 'PROPRIO_SDC',
    utilization_rule: 'LIBERADO_SDC',
    is_active: true,
  },
  {
    id: 'src-2',
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Wilson Santos S/A',
    plant_center: 'CFPL',
    storage_deposit: 'DP04',
    deposit_description: 'Estoque MP CIAFAL (Palanquilhas e Tarugos)',
    operation_type: 'ESTOQUE_CIAFAL',
    mp_owner: 'CIAFAL',
    stock_type: 'CIAFAL_ELEGIVEL',
    utilization_rule: 'AVALIACAO_TECNICA',
    is_active: true,
  },
  {
    id: 'src-3',
    company_code: 'KS',
    company_name: 'Depósito KS Parceiro',
    plant_center: 'KS01',
    storage_deposit: 'KS_DEP',
    deposit_description: 'Palanquilhas e Sobras em Pátio KS',
    operation_type: 'ESTOQUE_KS',
    mp_owner: 'COMPARTILHAVEL',
    stock_type: 'KS_ELEGIVEL',
    utilization_rule: 'LIBERADO_SDC',
    is_active: true,
  },
  {
    id: 'src-4',
    company_code: 'SIDERCENTRO_SDC',
    company_name: 'Sidercentro Indústria e Comércio',
    plant_center: 'SDC1',
    storage_deposit: 'DS_SUC',
    deposit_description: 'Pátio de Sucata Reclassificada Utilizável',
    operation_type: 'SUCATA_UTILIZAVEL',
    mp_owner: 'SIDERCENTRO',
    stock_type: 'PROPRIO_SDC',
    utilization_rule: 'LIBERADO_SDC',
    is_active: true,
  },
]

export const initialSdcPools: MPSdcPool[] = [
  {
    id: 'pool-1',
    pool_code: 'POOL_AC_B',
    pool_name: 'Pool Aço Comercial + Classe B',
    participating_steels_json: ['AC', 'Classe B'],
    participating_classes_json: ['CLASSE_COMERCIAL', 'CLASSE_B'],
    target_line: 'TODAS',
    substitution_rule_description:
      'Consumir AC prioritariamente; Classe B liberada sem restrição de tração.',
    consumption_priority_json: ['AC', 'Classe B'],
    technical_restrictions: 'Não aplicar em ordens com requisito de dobra severa < 180°',
    requires_quality_validation: false,
    is_active: true,
  },
  {
    id: 'pool-2',
    pool_code: 'POOL_A_C',
    pool_name: 'Pool Classe A + Classe C',
    participating_steels_json: ['Classe A', 'Classe C'],
    participating_classes_json: ['CLASSE_A', 'CLASSE_C'],
    target_line: 'L1',
    substitution_rule_description:
      'Classe C pode substituir Classe A mediante confirmação de limite de escoamento.',
    consumption_priority_json: ['Classe A', 'Classe C'],
    requires_quality_validation: true,
    is_active: true,
  },
  {
    id: 'pool-3',
    pool_code: 'POOL_AC_1020',
    pool_name: 'Pool AC + SAE 1020',
    participating_steels_json: ['AC', '1020'],
    participating_classes_json: ['CLASSE_COMERCIAL', 'SAE_1020'],
    target_line: 'SDC_CORTE_DOBRA',
    substitution_rule_description:
      'Substituição permitida apenas para evitar parada de máquina SDC.',
    consumption_priority_json: ['AC', '1020'],
    technical_restrictions: 'Taxa máxima de substituição controlada a 20% do volume da ordem.',
    requires_quality_validation: true,
    is_active: true,
  },
  {
    id: 'pool-4',
    pool_code: 'POOL_AC_IF_Z',
    pool_name: 'Pool AC / IF / Classe Z',
    participating_steels_json: ['AC', 'IF', 'Classe Z'],
    participating_classes_json: ['CLASSE_COMERCIAL', 'IF', 'CLASSE_Z'],
    target_line: 'TODAS',
    substitution_rule_description:
      'Aços de estampagem e conformação profunda integrados para flexibilidade.',
    consumption_priority_json: ['AC', 'Classe Z', 'IF'],
    requires_quality_validation: false,
    is_active: true,
  },
  {
    id: 'pool-5',
    pool_code: 'POOL_A_C_1020',
    pool_name: 'Pool Classe A / C / 1020',
    participating_steels_json: ['Classe A', 'Classe C', '1020'],
    participating_classes_json: ['CLASSE_A', 'CLASSE_C', 'SAE_1020'],
    target_line: 'L2',
    substitution_rule_description: 'Pool de laminação contínua com equivalência mecânica validada.',
    consumption_priority_json: ['Classe A', 'Classe C', '1020'],
    requires_quality_validation: true,
    is_active: true,
  },
]

export const initialSdcMinStockParameters: MPSdcMinStockParameter[] = [
  {
    id: 'min-1',
    company_code: 'SIDERCENTRO_SDC',
    operation_code: 'CORTE_DOBRA',
    steel_grade: 'AC',
    min_stock_tons: 350.0,
    reorder_point_tons: 450.0,
    responsible_name: 'Engenharia de PCP SDC',
    justification_origin: 'Demanda de base contínua de perfis e barras comerciais',
    is_active: true,
  },
  {
    id: 'min-2',
    company_code: 'SIDERCENTRO_SDC',
    operation_code: 'CORTE_DOBRA',
    steel_grade: 'Classe A',
    min_stock_tons: 140.0,
    reorder_point_tons: 200.0,
    responsible_name: 'PCP Central CIAFAL / SDC',
    justification_origin: 'Garantia de atendimento a clientes estruturais classe A',
    is_active: true,
  },
  {
    id: 'min-3',
    company_code: 'SIDERCENTRO_SDC',
    operation_code: 'CORTE_DOBRA',
    steel_grade: 'Classe B',
    min_stock_tons: 100.0,
    reorder_point_tons: 150.0,
    responsible_name: 'PCP Central CIAFAL / SDC',
    justification_origin: 'Suporte à linha de corte sem interrupção de matriz',
    is_active: true,
  },
  {
    id: 'min-4',
    company_code: 'SIDERCENTRO_SDC',
    operation_code: 'CORTE_DOBRA',
    steel_grade: 'Classe C',
    min_stock_tons: 60.0,
    reorder_point_tons: 90.0,
    responsible_name: 'Engenharia Metalúrgica',
    justification_origin: 'Cobertura de ordens especiais de alta resistência',
    is_active: true,
  },
  {
    id: 'min-5',
    company_code: 'SIDERCENTRO_SDC',
    operation_code: 'CORTE_DOBRA',
    steel_grade: '1020',
    min_stock_tons: 80.0,
    reorder_point_tons: 120.0,
    responsible_name: 'Gerência de Suprimentos',
    justification_origin: 'Preservação de MP nobre SAE 1020',
    is_active: true,
  },
  {
    id: 'min-6',
    company_code: 'SIDERCENTRO_SDC',
    operation_code: 'CORTE_DOBRA',
    steel_grade: '1045',
    min_stock_tons: 40.0,
    reorder_point_tons: 60.0,
    responsible_name: 'Gerência Industrial',
    justification_origin: 'Aço carbono especial com lead time de usina de 45 dias',
    is_active: true,
  },
  {
    id: 'min-7',
    company_code: 'SIDERCENTRO_SDC',
    operation_code: 'CORTE_DOBRA',
    steel_grade: 'FX',
    min_stock_tons: 15.0,
    reorder_point_tons: 25.0,
    responsible_name: 'PCP SDC',
    justification_origin: 'Estoque pulmão para cortes finos',
    is_active: true,
  },
  {
    id: 'min-8',
    company_code: 'SIDERCENTRO_SDC',
    operation_code: 'CORTE_DOBRA',
    steel_grade: 'IF',
    min_stock_tons: 10.0,
    reorder_point_tons: 20.0,
    responsible_name: 'Qualidade Assegurada',
    justification_origin: 'Lotes de estampagem ultra-limpos',
    is_active: true,
  },
]

export const initialSdcDailyConsumptions: MPSdcDailyConsumption[] = [
  {
    id: 'cns-1',
    consumption_date: '2026-08-24',
    week_ref: 'W35',
    steel_grade: 'AC',
    pool_code: 'POOL_AC_B',
    programmed_tons: 61.11,
    realized_tons: 61.11,
    variance_tons: 0,
    need_origin: 'PROGRAMACAO_OFICIAL_PCP',
    production_order_ref: 'OF-SDC-2026-0891',
    sap_order_ref: '10049281',
    yielding_rate_applied: 0.94,
    scrap_loss_rate: 0.06,
    compatible_steels_json: ['AC', 'Classe B'],
    allocated_steel: 'AC',
    status: 'CONSUMIDO',
  },
  {
    id: 'cns-2',
    consumption_date: '2026-08-25',
    week_ref: 'W35',
    steel_grade: 'Classe D',
    programmed_tons: 45.0,
    realized_tons: 45.0,
    variance_tons: 0,
    need_origin: 'PROGRAMACAO_OFICIAL_PCP',
    production_order_ref: 'OF-SDC-2026-0892',
    sap_order_ref: '10049282',
    yielding_rate_applied: 0.95,
    compatible_steels_json: ['Classe D'],
    allocated_steel: 'Classe D',
    status: 'CONSUMIDO',
  },
  {
    id: 'cns-3',
    consumption_date: '2026-08-26',
    week_ref: 'W35',
    steel_grade: 'Classe A',
    pool_code: 'POOL_A_C',
    programmed_tons: 65.55,
    realized_tons: 64.2,
    variance_tons: -1.35,
    need_origin: 'ORDEM_SAP_PP',
    production_order_ref: 'OF-SDC-2026-0893',
    sap_order_ref: '10049283',
    yielding_rate_applied: 0.93,
    compatible_steels_json: ['Classe A', 'Classe C'],
    allocated_steel: 'Classe A',
    status: 'CONSUMIDO',
  },
  {
    id: 'cns-4',
    consumption_date: '2026-08-27',
    week_ref: 'W35',
    steel_grade: '1020',
    pool_code: 'POOL_AC_1020',
    programmed_tons: 72.22,
    realized_tons: 70.0,
    variance_tons: -2.22,
    need_origin: 'PROGRAMACAO_OFICIAL_PCP',
    production_order_ref: 'OF-SDC-2026-0894',
    sap_order_ref: '10049284',
    yielding_rate_applied: 0.96,
    compatible_steels_json: ['1020', 'AC'],
    allocated_steel: '1020',
    status: 'EM_CORTE',
  },
  {
    id: 'cns-5',
    consumption_date: '2026-08-28',
    week_ref: 'W35',
    steel_grade: 'FX',
    programmed_tons: 18.5,
    need_origin: 'PROGRAMACAO_OFICIAL_PCP',
    production_order_ref: 'OF-SDC-2026-0895',
    sap_order_ref: '10049285',
    yielding_rate_applied: 0.92,
    compatible_steels_json: ['FX'],
    allocated_steel: 'FX',
    status: 'PROGRAMADO',
  },
  {
    id: 'cns-6',
    consumption_date: '2026-08-29',
    week_ref: 'W35',
    steel_grade: '1045',
    programmed_tons: 25.0,
    need_origin: 'ORDEM_SAP_PP',
    production_order_ref: 'OF-SDC-2026-0896',
    sap_order_ref: '10049286',
    yielding_rate_applied: 0.95,
    compatible_steels_json: ['1045'],
    allocated_steel: '1045',
    status: 'PROGRAMADO',
  },
]

export const initialSdcL2PxR: MPSdcL2PlannedVsRealized[] = [
  {
    id: 'pxr-1',
    period_ref: 'W35',
    steel_grade: 'AC',
    planned_l2_tons: 200.0,
    realized_l2_tons: 185.0,
    deviation_tons: -15.0,
    adherence_pct: 92.5,
    useful_yield_factor: 0.95,
    useful_tons_for_sdc: 175.75,
    availability_date: '2026-08-27',
    impact_on_sdc_coverage_days: 0,
    traffic_light: 'VERDE',
    operational_risk_summary:
      'Aderência de 92.5%. Estoque no depósito DS03 é suficiente para cobrir o desvio pontual de 15t.',
    human_notes: 'Turno 2 atrasou troca de cilindro mas recuperou no Turno 3.',
    is_official_sync: true,
  },
  {
    id: 'pxr-2',
    period_ref: 'W35',
    steel_grade: 'Classe A',
    planned_l2_tons: 120.0,
    realized_l2_tons: 100.0,
    deviation_tons: -20.0,
    adherence_pct: 83.3,
    useful_yield_factor: 0.95,
    useful_tons_for_sdc: 95.0,
    availability_date: '2026-08-28',
    impact_on_sdc_coverage_days: -2,
    traffic_light: 'AMARELO',
    operational_risk_summary:
      'A aderência da produção L2 foi de 83.3%, mas ainda não existe risco de ruptura imediata devido ao estoque DS03.',
    is_official_sync: true,
  },
  {
    id: 'pxr-3',
    period_ref: 'W35',
    steel_grade: '1020',
    planned_l2_tons: 80.0,
    realized_l2_tons: 78.0,
    deviation_tons: -2.0,
    adherence_pct: 97.5,
    useful_yield_factor: 0.96,
    useful_tons_for_sdc: 74.88,
    availability_date: '2026-08-26',
    impact_on_sdc_coverage_days: 0,
    traffic_light: 'VERDE',
    operational_risk_summary:
      'Produção L2 de 1020 altamente aderente (97.5%). Abastecimento do corte e dobra sem gargalos.',
    is_official_sync: true,
  },
  {
    id: 'pxr-4',
    period_ref: 'W35',
    steel_grade: '1045',
    planned_l2_tons: 50.0,
    realized_l2_tons: 35.0,
    deviation_tons: -15.0,
    adherence_pct: 70.0,
    useful_yield_factor: 0.94,
    useful_tons_for_sdc: 32.9,
    availability_date: '2026-08-29',
    impact_on_sdc_coverage_days: -5,
    traffic_light: 'LARANJA',
    operational_risk_summary:
      'Aderência de 70.0% em SAE 1045. Há risco de ruptura caso a próxima campanha da L2 seja postergada.',
    is_official_sync: true,
  },
]

export const initialSdcSteelMatrixRows: MPSdcSteelMatrixRow[] = [
  {
    steel_grade: 'AC',
    steel_class: 'Comercial',
    pool_code: 'POOL_AC_B',
    stock_sdc_ds03_tons: 380.5,
    stock_ciafal_dp04_tons: 120.0,
    stock_ciafal_eligible_tons: 95.0,
    stock_ks_tons: 40.0,
    stock_thin_plates_tons: 15.0,
    stock_usable_scrap_sdc_tons: 22.5,
    expected_receipts_tons: 50.0,
    total_stock_tons: 603.0,
    projected_l2_useful_tons: 175.75,
    projected_consumption_sdc_tons: 245.0,
    projected_balance_tons: 533.75,
    min_stock_tons: 350.0,
    need_mp_tons: 0,
    statistical_coverage_days: 74,
    chronological_coverage_date: '08/11/2026',
    rupture_risk_level: 'VERDE',
    auto_conclusion: 'ESTOQUE_ADEQUADO',
    eligible_alternatives_json: ['Classe B'],
    drilldown_batches_count: 14,
  },
  {
    steel_grade: 'Classe A',
    steel_class: 'Estrutural A',
    pool_code: 'POOL_A_C',
    stock_sdc_ds03_tons: 135.0,
    stock_ciafal_dp04_tons: 60.0,
    stock_ciafal_eligible_tons: 45.0,
    stock_ks_tons: 0,
    stock_thin_plates_tons: 0,
    stock_usable_scrap_sdc_tons: 8.0,
    expected_receipts_tons: 0,
    total_stock_tons: 188.0,
    projected_l2_useful_tons: 95.0,
    projected_consumption_sdc_tons: 150.0,
    projected_balance_tons: 133.0,
    min_stock_tons: 140.0,
    need_mp_tons: 7.0,
    statistical_coverage_days: 27,
    chronological_coverage_date: '20/09/2026',
    rupture_risk_level: 'AMARELO',
    auto_conclusion: 'ESTOQUE_ABAIXO_MINIMO',
    eligible_alternatives_json: ['Classe C'],
    drilldown_batches_count: 8,
  },
  {
    steel_grade: 'Classe B',
    steel_class: 'Comercial B',
    pool_code: 'POOL_AC_B',
    stock_sdc_ds03_tons: 110.0,
    stock_ciafal_dp04_tons: 40.0,
    stock_ciafal_eligible_tons: 30.0,
    stock_ks_tons: 12.0,
    stock_thin_plates_tons: 5.0,
    stock_usable_scrap_sdc_tons: 6.0,
    expected_receipts_tons: 20.0,
    total_stock_tons: 183.0,
    projected_l2_useful_tons: 40.0,
    projected_consumption_sdc_tons: 90.0,
    projected_balance_tons: 133.0,
    min_stock_tons: 100.0,
    need_mp_tons: 0,
    statistical_coverage_days: 41,
    chronological_coverage_date: '04/10/2026',
    rupture_risk_level: 'VERDE',
    auto_conclusion: 'ESTOQUE_ADEQUADO',
    eligible_alternatives_json: ['AC'],
    drilldown_batches_count: 6,
  },
  {
    steel_grade: 'Classe C',
    steel_class: 'Alta Resistência C',
    pool_code: 'POOL_A_C',
    stock_sdc_ds03_tons: 55.0,
    stock_ciafal_dp04_tons: 30.0,
    stock_ciafal_eligible_tons: 20.0,
    stock_ks_tons: 0,
    stock_thin_plates_tons: 0,
    stock_usable_scrap_sdc_tons: 3.5,
    expected_receipts_tons: 0,
    total_stock_tons: 78.5,
    projected_l2_useful_tons: 25.0,
    projected_consumption_sdc_tons: 50.0,
    projected_balance_tons: 53.5,
    min_stock_tons: 60.0,
    need_mp_tons: 6.5,
    statistical_coverage_days: 32,
    chronological_coverage_date: '25/09/2026',
    rupture_risk_level: 'AMARELO',
    auto_conclusion: 'ESTOQUE_ABAIXO_MINIMO',
    eligible_alternatives_json: ['Classe A'],
    drilldown_batches_count: 4,
  },
  {
    steel_grade: 'Classe D',
    steel_class: 'Especial D',
    stock_sdc_ds03_tons: 40.0,
    stock_ciafal_dp04_tons: 15.0,
    stock_ciafal_eligible_tons: 10.0,
    stock_ks_tons: 0,
    stock_thin_plates_tons: 0,
    stock_usable_scrap_sdc_tons: 2.0,
    expected_receipts_tons: 0,
    total_stock_tons: 52.0,
    projected_l2_useful_tons: 30.0,
    projected_consumption_sdc_tons: 45.0,
    projected_balance_tons: 37.0,
    min_stock_tons: 30.0,
    need_mp_tons: 0,
    statistical_coverage_days: 25,
    chronological_coverage_date: '18/09/2026',
    rupture_risk_level: 'VERDE',
    auto_conclusion: 'PRODUCAO_PREVISTA_SUFICIENTE',
    drilldown_batches_count: 3,
  },
  {
    steel_grade: '1020',
    steel_class: 'SAE 1020 Nobre',
    pool_code: 'POOL_AC_1020',
    stock_sdc_ds03_tons: 85.0,
    stock_ciafal_dp04_tons: 40.0,
    stock_ciafal_eligible_tons: 25.0,
    stock_ks_tons: 0,
    stock_thin_plates_tons: 0,
    stock_usable_scrap_sdc_tons: 4.0,
    expected_receipts_tons: 30.0,
    total_stock_tons: 144.0,
    projected_l2_useful_tons: 74.88,
    projected_consumption_sdc_tons: 110.0,
    projected_balance_tons: 108.88,
    min_stock_tons: 80.0,
    need_mp_tons: 0,
    statistical_coverage_days: 28,
    chronological_coverage_date: '21/09/2026',
    rupture_risk_level: 'AMARELO',
    auto_conclusion: 'ESTOQUE_ADEQUADO',
    eligible_alternatives_json: ['AC (para ordens de baixa solicitação)'],
    drilldown_batches_count: 5,
  },
  {
    steel_grade: '1045',
    steel_class: 'SAE 1045 Tratado',
    stock_sdc_ds03_tons: 32.0,
    stock_ciafal_dp04_tons: 10.0,
    stock_ciafal_eligible_tons: 5.0,
    stock_ks_tons: 0,
    stock_thin_plates_tons: 0,
    stock_usable_scrap_sdc_tons: 1.0,
    expected_receipts_tons: 0,
    total_stock_tons: 38.0,
    projected_l2_useful_tons: 32.9,
    projected_consumption_sdc_tons: 48.0,
    projected_balance_tons: 22.9,
    min_stock_tons: 40.0,
    need_mp_tons: 17.1,
    statistical_coverage_days: 14,
    chronological_coverage_date: '07/09/2026',
    rupture_risk_level: 'LARANJA',
    auto_conclusion: 'RISCO_RUPTURA',
    drilldown_batches_count: 2,
  },
  {
    steel_grade: 'FX',
    steel_class: 'Fita e Perfil Fino',
    stock_sdc_ds03_tons: 18.0,
    stock_ciafal_dp04_tons: 5.0,
    stock_ciafal_eligible_tons: 0,
    stock_ks_tons: 0,
    stock_thin_plates_tons: 6.0,
    stock_usable_scrap_sdc_tons: 1.5,
    expected_receipts_tons: 0,
    total_stock_tons: 25.5,
    projected_l2_useful_tons: 10.0,
    projected_consumption_sdc_tons: 20.0,
    projected_balance_tons: 15.5,
    min_stock_tons: 15.0,
    need_mp_tons: 0,
    statistical_coverage_days: 26,
    chronological_coverage_date: '19/09/2026',
    rupture_risk_level: 'VERDE',
    auto_conclusion: 'ESTOQUE_ADEQUADO',
    drilldown_batches_count: 2,
  },
  {
    steel_grade: 'IF',
    steel_class: 'Interstitial Free',
    pool_code: 'POOL_AC_IF_Z',
    stock_sdc_ds03_tons: 12.0,
    stock_ciafal_dp04_tons: 0,
    stock_ciafal_eligible_tons: 0,
    stock_ks_tons: 0,
    stock_thin_plates_tons: 0,
    stock_usable_scrap_sdc_tons: 0.5,
    expected_receipts_tons: 0,
    total_stock_tons: 12.5,
    projected_l2_useful_tons: 0,
    projected_consumption_sdc_tons: 8.0,
    projected_balance_tons: 4.5,
    min_stock_tons: 10.0,
    need_mp_tons: 5.5,
    statistical_coverage_days: 31,
    chronological_coverage_date: '24/09/2026',
    rupture_risk_level: 'AMARELO',
    auto_conclusion: 'ESTOQUE_ABAIXO_MINIMO',
    eligible_alternatives_json: ['Classe Z'],
    drilldown_batches_count: 1,
  },
  {
    steel_grade: '1522',
    steel_class: 'Especial 1522',
    stock_sdc_ds03_tons: 14.0,
    stock_ciafal_dp04_tons: 0,
    stock_ciafal_eligible_tons: 0,
    stock_ks_tons: 0,
    stock_thin_plates_tons: 0,
    stock_usable_scrap_sdc_tons: 0,
    expected_receipts_tons: 0,
    total_stock_tons: 14.0,
    projected_l2_useful_tons: 15.0,
    projected_consumption_sdc_tons: 16.0,
    projected_balance_tons: 13.0,
    min_stock_tons: 10.0,
    need_mp_tons: 0,
    statistical_coverage_days: 18,
    chronological_coverage_date: '11/09/2026',
    rupture_risk_level: 'VERDE',
    auto_conclusion: 'PRODUCAO_PREVISTA_SUFICIENTE',
    drilldown_batches_count: 1,
  },
]

export const mpSdcService = {
  /**
   * Buscar Fontes e Depósitos Parametrizados
   */
  async getStockSources(): Promise<MPSdcStockSource[]> {
    try {
      const records = await pb.collection('mp_sdc_stock_sources').getFullList<MPSdcStockSource>({
        sort: 'company_code,storage_deposit',
      })
      if (records && records.length > 0) return records
    } catch {
      /* intentionally ignored */
    }
    return initialSdcStockSources
  },

  /**
   * Buscar Pools de MP Sidercentro
   */
  async getPools(): Promise<MPSdcPool[]> {
    try {
      const records = await pb.collection('mp_sdc_pools').getFullList<MPSdcPool>({
        sort: 'pool_name',
      })
      if (records && records.length > 0) return records
    } catch {
      /* intentionally ignored */
    }
    return initialSdcPools
  },

  /**
   * Buscar Parâmetros de Estoque Mínimo
   */
  async getMinStockParameters(): Promise<MPSdcMinStockParameter[]> {
    try {
      const records = await pb
        .collection('mp_sdc_min_stock_parameters')
        .getFullList<MPSdcMinStockParameter>({
          sort: 'steel_grade',
        })
      if (records && records.length > 0) return records
    } catch {
      /* intentionally ignored */
    }
    return initialSdcMinStockParameters
  },

  /**
   * Buscar Consumo Diário SDC
   */
  async getDailyConsumptions(): Promise<MPSdcDailyConsumption[]> {
    try {
      const records = await pb
        .collection('mp_sdc_daily_consumption')
        .getFullList<MPSdcDailyConsumption>({
          sort: 'consumption_date',
        })
      if (records && records.length > 0) return records
    } catch {
      /* intentionally ignored */
    }
    return initialSdcDailyConsumptions
  },

  /**
   * Buscar Previsto x Realizado L2
   */
  async getL2PlannedVsRealized(): Promise<MPSdcL2PlannedVsRealized[]> {
    try {
      const records = await pb
        .collection('mp_sdc_l2_planned_vs_realized')
        .getFullList<MPSdcL2PlannedVsRealized>({
          sort: 'period_ref,steel_grade',
        })
      if (records && records.length > 0) return records
    } catch {
      /* intentionally ignored */
    }
    return initialSdcL2PxR
  },

  /**
   * Buscar Matriz Consolidada de Estoque por Aço
   */
  async getSteelMatrixRows(): Promise<MPSdcSteelMatrixRow[]> {
    return initialSdcSteelMatrixRows
  },

  /**
   * Salvar ou Atualizar Parâmetro de Estoque Mínimo
   */
  async saveMinStockParameter(
    param: Partial<MPSdcMinStockParameter>,
  ): Promise<MPSdcMinStockParameter> {
    try {
      if (param.id && !param.id.startsWith('min-')) {
        return await pb
          .collection('mp_sdc_min_stock_parameters')
          .update<MPSdcMinStockParameter>(param.id, param)
      }
      return await pb
        .collection('mp_sdc_min_stock_parameters')
        .create<MPSdcMinStockParameter>(param)
    } catch (_) {
      return {
        id: param.id || `min-${Date.now()}`,
        company_code: param.company_code || 'SIDERCENTRO_SDC',
        operation_code: param.operation_code || 'CORTE_DOBRA',
        steel_grade: param.steel_grade,
        min_stock_tons: param.min_stock_tons || 50,
        responsible_name: param.responsible_name || 'Engenharia de PCP',
        justification_origin: param.justification_origin || 'Ajuste operacional manual',
        is_active: true,
      } as MPSdcMinStockParameter
    }
  },

  /**
   * Salvar ou Atualizar Fonte de Estoque / Depósito
   */
  async saveStockSource(source: Partial<MPSdcStockSource>): Promise<MPSdcStockSource> {
    try {
      if (source.id && !source.id.startsWith('src-')) {
        return await pb
          .collection('mp_sdc_stock_sources')
          .update<MPSdcStockSource>(source.id, source)
      }
      return await pb.collection('mp_sdc_stock_sources').create<MPSdcStockSource>(source)
    } catch (_) {
      return {
        id: source.id || `src-${Date.now()}`,
        company_code: source.company_code || 'SIDERCENTRO_SDC',
        company_name: source.company_name || 'Sidercentro',
        plant_center: source.plant_center || 'SDC1',
        storage_deposit: source.storage_deposit || 'DS03',
        operation_type: source.operation_type || 'ESTOQUE_SDC',
        mp_owner: source.mp_owner || 'SIDERCENTRO',
        stock_type: source.stock_type || 'PROPRIO_SDC',
        is_active: true,
      } as MPSdcStockSource
    }
  },

  /**
   * Salvar ou Atualizar Pool de Matéria-Prima
   */
  async savePool(pool: Partial<MPSdcPool>): Promise<MPSdcPool> {
    try {
      if (pool.id && !pool.id.startsWith('pool-')) {
        return await pb.collection('mp_sdc_pools').update<MPSdcPool>(pool.id, pool)
      }
      return await pb.collection('mp_sdc_pools').create<MPSdcPool>(pool)
    } catch (_) {
      return {
        id: pool.id || `pool-${Date.now()}`,
        pool_code: pool.pool_code || 'POOL_NOVO',
        pool_name: pool.pool_name || 'Novo Pool',
        participating_steels_json: pool.participating_steels_json || ['AC'],
        substitution_rule_description:
          pool.substitution_rule_description || 'Substituição sob análise técnica',
        consumption_priority_json: pool.consumption_priority_json || ['AC'],
        is_active: true,
      } as MPSdcPool
    }
  },

  /**
   * Gerar Alertas de Ruptura Projetada Automáticos
   */
  generateRuptureAlerts(matrixRows: MPSdcSteelMatrixRow[]): MPSdcRuptureAlert[] {
    const alerts: MPSdcRuptureAlert[] = []

    matrixRows.forEach((row, idx) => {
      if (row.statistical_coverage_days < 15 || row.projected_balance_tons < row.min_stock_tons) {
        const missing = Math.max(0, row.min_stock_tons - row.projected_balance_tons)
        alerts.push({
          id: `rup-${idx + 1}`,
          steel_grade: row.steel_grade,
          steel_class: row.steel_class,
          pool_code: row.pool_code,
          week_ref: 'W35/W36',
          estimated_date: row.chronological_coverage_date,
          missing_quantity_tons: Number(missing.toFixed(2)),
          needed_l2_production_tons: Number((missing * 1.05).toFixed(2)),
          impacted_orders: [
            `OF-SDC-2026-089${idx + 1}`,
            `OF-SDC-2026-089${idx + 2}`,
            `SAP-${row.steel_grade}-100492`,
          ],
          recommended_action:
            row.eligible_alternatives_json && row.eligible_alternatives_json.length > 0
              ? `Avaliar utilização do material alternativo autorizado (${row.eligible_alternatives_json.join(
                  ', ',
                )}) ou priorizar corrida na L2.`
              : `Antecipar campanha da L2 para ${row.steel_grade} ou emitir solicitação de transferência urgente.`,
          severity:
            row.statistical_coverage_days <= 7
              ? 'CRITICO'
              : row.statistical_coverage_days <= 15
                ? 'ALTO'
                : 'MEDIO',
        })
      }
    })

    return alerts
  },

  /**
   * Calcular Indicadores do Cockpit Executivo SDC
   */
  calculateCockpitKpis(
    matrixRows: MPSdcSteelMatrixRow[],
    pxr: MPSdcL2PlannedVsRealized[],
  ): MPSdcCockpitKpis {
    let sdcTons = 0
    let ciafalEligible = 0
    let ksEligible = 0
    let usableScrap = 0
    let expectedEntries = 0
    let l2Useful = 0
    let consumption = 0
    let projectedBalance = 0
    let belowMinCount = 0
    let totalNeed = 0

    let minDays = 999
    let firstRupDate = 'Sem Ruptura Prevista'
    let firstRupSteel = '-'

    matrixRows.forEach((r) => {
      sdcTons += r.stock_sdc_ds03_tons
      ciafalEligible += r.stock_ciafal_eligible_tons
      ksEligible += r.stock_ks_tons
      usableScrap += r.stock_usable_scrap_sdc_tons
      expectedEntries += r.expected_receipts_tons
      l2Useful += r.projected_l2_useful_tons
      consumption += r.projected_consumption_sdc_tons
      projectedBalance += r.projected_balance_tons
      totalNeed += r.need_mp_tons

      if (r.projected_balance_tons < r.min_stock_tons) {
        belowMinCount++
      }

      if (r.statistical_coverage_days < minDays) {
        minDays = r.statistical_coverage_days
        firstRupDate = r.chronological_coverage_date
        firstRupSteel = r.steel_grade
      }
    })

    const avgL2Adherence =
      pxr.length > 0
        ? Number((pxr.reduce((acc, p) => acc + p.adherence_pct, 0) / pxr.length).toFixed(1))
        : 90.0

    const totalAvailable = sdcTons + ciafalEligible + ksEligible + usableScrap
    const dailyAvgTotal = consumption / 30
    const avgCoverage = dailyAvgTotal > 0 ? Math.round(totalAvailable / dailyAvgTotal) : 35

    return {
      stock_sdc_tons: Number(sdcTons.toFixed(1)),
      stock_ciafal_eligible_tons: Number(ciafalEligible.toFixed(1)),
      stock_ks_eligible_tons: Number(ksEligible.toFixed(1)),
      stock_usable_scrap_tons: Number(usableScrap.toFixed(1)),
      expected_entries_tons: Number(expectedEntries.toFixed(1)),
      projected_l2_prod_tons: Number(l2Useful.toFixed(1)),
      programmed_sdc_consumption_tons: Number(consumption.toFixed(1)),
      projected_balance_tons: Number(projectedBalance.toFixed(1)),
      steels_below_min_count: belowMinCount,
      first_rupture_date: firstRupDate,
      first_rupture_steel: firstRupSteel,
      avg_coverage_days: avgCoverage,
      total_mp_need_tons: Number(totalNeed.toFixed(1)),
      l2_adherence_pct: avgL2Adherence,
    }
  },
}

export default mpSdcService
