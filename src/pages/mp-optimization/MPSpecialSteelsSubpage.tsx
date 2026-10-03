import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MPSpecialSteelRow, CalculationExplainPayload } from '@/types/mp-optimization'
import { MPCentralProjectionEngine } from '@/services/mp-central-projection-engine'
import { CalculationExplainerModal } from '@/components/mp-optimization/CalculationExplainerModal'
import { SteelMultiSelect, SteelOption } from '@/components/mp-optimization/SteelMultiSelect'
import {
  sapParametersMasterDataService,
  SapCompanyOption,
} from '@/services/sap-parameters-master-data-service'
import { sapWerksService } from '@/services/sap-werks-service'
import { lineMasterService } from '@/services/line-master'
import { ProductionLine } from '@/types/line-master'
import { mpSdcService } from '@/services/mp-sidercentro-service'
import { pb } from '@/lib/pocketbase/client'
import { formatPtBrNumber } from '@/lib/number-format'
import {
  Building2,
  GitBranch,
  Layers,
  HelpCircle,
  AlertTriangle,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Bot,
  Activity,
  Calendar,
  CheckCircle2,
  Package,
  ArrowUpRight,
  RefreshCw,
  Info,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'

export interface EmpresaOpcao {
  werks: string
  name: string
  label: string
}

export interface LinhaOpcao {
  id: string
  code: string
  name: string
  label: string
  werks: string
}

// Catálogo canônico de Pools dimensionais de Tarugos
const DIMENSION_POOLS = [
  {
    value: '525_KG',
    label: 'Pool Tarugo 525 kg (130x130)',
    nominalWeight: 525,
    section: '130x130',
  },
  {
    value: '510_KG',
    label: 'Pool Tarugo 510 kg (120x120)',
    nominalWeight: 510,
    section: '120x120',
  },
  { value: '533_KG', label: 'Pool Tarugo 533 kg', nominalWeight: 533, section: '130x130' },
  { value: '472_KG', label: 'Pool Tarugo 472 kg', nominalWeight: 472, section: '120x120' },
  { value: '480_KG', label: 'Pool Tarugo 480 kg', nominalWeight: 480, section: '120x120' },
  { value: '540_KG', label: 'Pool Tarugo 540 kg', nominalWeight: 540, section: '140x140' },
]

// Base periódica turno a turno oficial da planilha "Niveis de estoque Aços Especiais.xlsx"
const BASE_PERIODS = [
  {
    period_ref: 'SEM 36 - D1',
    date_str: '2026-07-06',
    shift_code: 'T1',
    initBase: 420.0,
    recBase: 0,
    l2ProdBase: 80.0,
    consBase: 45.0,
  },
  {
    period_ref: 'SEM 36 - D1',
    date_str: '2026-07-06',
    shift_code: 'T2',
    initBase: 451.0,
    recBase: 0,
    l2ProdBase: 75.0,
    consBase: 50.0,
  },
  {
    period_ref: 'SEM 36 - D1',
    date_str: '2026-07-06',
    shift_code: 'T3',
    initBase: 472.25,
    recBase: 0,
    l2ProdBase: 60.0,
    consBase: 40.0,
  },
  {
    period_ref: 'SEM 36 - D2',
    date_str: '2026-07-07',
    shift_code: 'T1',
    initBase: 489.25,
    recBase: 60.0,
    l2ProdBase: 85.0,
    consBase: 55.0,
  },
  {
    period_ref: 'SEM 36 - D2',
    date_str: '2026-07-07',
    shift_code: 'T2',
    initBase: 575.0,
    recBase: 0,
    l2ProdBase: 80.0,
    consBase: 50.0,
  },
  {
    period_ref: 'SEM 36 - D2',
    date_str: '2026-07-07',
    shift_code: 'T3',
    initBase: 601.0,
    recBase: 0,
    l2ProdBase: 65.0,
    consBase: 45.0,
  },
  {
    period_ref: 'SEM 36 - D3',
    date_str: '2026-07-08',
    shift_code: 'T1',
    initBase: 617.75,
    recBase: 0,
    l2ProdBase: 40.0,
    consBase: 60.0,
  },
  {
    period_ref: 'SEM 36 - D3',
    date_str: '2026-07-08',
    shift_code: 'T2',
    initBase: 595.75,
    recBase: 0,
    l2ProdBase: 50.0,
    consBase: 55.0,
  },
  {
    period_ref: 'SEM 36 - D3',
    date_str: '2026-07-08',
    shift_code: 'T3',
    initBase: 588.25,
    recBase: 0,
    l2ProdBase: 40.0,
    consBase: 50.0,
  },
  {
    period_ref: 'SEM 36 - D4',
    date_str: '2026-07-09',
    shift_code: 'T1',
    initBase: 576.25,
    recBase: 0,
    l2ProdBase: 30.0,
    consBase: 65.0,
  },
  {
    period_ref: 'SEM 36 - D4',
    date_str: '2026-07-09',
    shift_code: 'T2',
    initBase: 539.75,
    recBase: 0,
    l2ProdBase: 20.0,
    consBase: 60.0,
  },
  {
    period_ref: 'SEM 36 - D4',
    date_str: '2026-07-09',
    shift_code: 'T3',
    initBase: 498.75,
    recBase: 0,
    l2ProdBase: 10.0,
    consBase: 55.0,
  },
]

// Pesos proporcionais da carteira por classe/aço especial na carteira consolidada
// Usado na interseção combinada quando o usuário seleciona subconjuntos de aços
const STEEL_PORTFOLIO_WEIGHTS: Record<string, { weight: number; class: string; name: string }> = {
  '1020': { weight: 0.32, class: 'POOL_A', name: 'SAE 1020 Nobre' },
  '1045': { weight: 0.28, class: 'POOL_B', name: 'SAE 1045 Tratado' },
  '1050': { weight: 0.12, class: 'POOL_B', name: 'SAE 1050 Forjaria' },
  '1060': { weight: 0.08, class: 'POOL_B', name: 'SAE 1060 Molas' },
  '1524': { weight: 0.07, class: 'POOL_D', name: 'SAE 1524 Alto Manganês' },
  '1522': { weight: 0.05, class: 'POOL_D', name: 'SAE 1522 / 20MnCr5' },
  '4140': { weight: 0.05, class: 'POOL_C', name: 'SAE 4140 Aço Liga' },
  '8620': { weight: 0.03, class: 'POOL_C', name: 'SAE 8620 Cementação' },
}

export const MPSpecialSteelsSubpage: React.FC = () => {
  // --------------------------------------------------------------------------
  // ESTADOS DOS FILTROS
  // --------------------------------------------------------------------------
  // 1. Empresa (padrão 'TODAS' = Todas as Empresas)
  const [selectedCompany, setSelectedCompany] = useState<string>('TODAS')
  const [companiesOptions, setCompaniesOptions] = useState<EmpresaOpcao[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState<boolean>(false)

  // 2. Linha (padrão 'TODAS' = Todas as Linhas da empresa selecionada)
  const [selectedLine, setSelectedLine] = useState<string>('TODAS')
  const [lineOptions, setLineOptions] = useState<LinhaOpcao[]>([])
  const [allMasterLines, setAllMasterLines] = useState<ProductionLine[]>([])
  const [loadingLines, setLoadingLines] = useState<boolean>(false)

  // 3. Dimensão / Pool (existente, mantido integralmente)
  const [selectedDimensionPool, setSelectedDimensionPool] = useState<string>('525_KG')

  // 4. Classe / Aço vira MULTISSELEÇÃO (novo componente SteelMultiSelect)
  // Array vazio = Todos os aços
  const [selectedSteels, setSelectedSteels] = useState<string[]>([])
  const [steelOptions, setSteelOptions] = useState<SteelOption[]>([])
  const [loadingSteels, setLoadingSteels] = useState<boolean>(false)

  // 5. Cenário (existente, mantido integralmente)
  const [selectedScenario, setSelectedScenario] = useState<string>('BASE')

  // 6. Fator Atendimento L2 (existente, mantido integralmente)
  const [l2YieldFactor, setL2YieldFactor] = useState<number>(0.95) // ex: 0.95 = 95%

  // Modal de Explicabilidade
  const [explainerPayload, setExplainerPayload] = useState<CalculationExplainPayload | null>(null)
  const [isExplainerOpen, setIsExplainerOpen] = useState(false)

  // --------------------------------------------------------------------------
  // 1. CARGA DE EMPRESAS: sapParametersMasterDataService.fetchCompanies()
  //    com fallback para sapWerksService.getWerksList()
  // --------------------------------------------------------------------------
  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true)
    try {
      const res = await sapParametersMasterDataService.fetchCompanies().catch(() => null)
      let list: EmpresaOpcao[] = []

      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        list = res.data.map((c: SapCompanyOption) => ({
          werks: c.werks,
          name: c.name || c.werks,
          label: c.label || `${c.werks} — ${c.name || 'Empresa'}`,
        }))
      } else {
        const werksRes = await sapWerksService.getWerksList().catch(() => ({ items: [] }))
        if (werksRes && Array.isArray(werksRes.items) && werksRes.items.length > 0) {
          list = werksRes.items.map((w) => ({
            werks: w.werks,
            name: w.description || w.werks,
            label: `${w.werks} — ${w.description || 'Empresa'}`,
          }))
        }
      }

      // Fallback robusto garantido com unidades CIAFAL caso banco/RFC indisponíveis
      if (list.length === 0) {
        list = [
          { werks: '1000', name: 'CIAFAL Matriz', label: '1000 — CIAFAL Matriz' },
          { werks: '2000', name: 'CIAFAL Contagem', label: '2000 — CIAFAL Contagem' },
          { werks: '3000', name: 'SIDERCENTRO SDC', label: '3000 — Sidercentro SDC' },
        ]
      }

      setCompaniesOptions(list)
    } catch (err) {
      console.warn('[MPSpecialSteelsSubpage] Falha ao carregar empresas:', err)
      setCompaniesOptions([
        { werks: '1000', name: 'CIAFAL Matriz', label: '1000 — CIAFAL Matriz' },
        { werks: '2000', name: 'CIAFAL Contagem', label: '2000 — CIAFAL Contagem' },
        { werks: '3000', name: 'SIDERCENTRO SDC', label: '3000 — Sidercentro SDC' },
      ])
    } finally {
      setLoadingCompanies(false)
    }
  }, [])

  // --------------------------------------------------------------------------
  // 2. CARGA DE LINHAS: lineMasterService.listLines({ activeOnly: true })
  //    Filtradas pela Empresa selecionada
  // --------------------------------------------------------------------------
  const loadLines = useCallback(async () => {
    setLoadingLines(true)
    try {
      const linesData = await lineMasterService.listLines({ activeOnly: true }).catch(() => [])
      setAllMasterLines(linesData)
    } catch (err) {
      console.warn('[MPSpecialSteelsSubpage] Falha ao listar linhas:', err)
    } finally {
      setLoadingLines(false)
    }
  }, [])

  // Atualiza as opções de linha em cascata quando a Empresa muda
  useEffect(() => {
    let filtered: ProductionLine[] = allMasterLines

    if (selectedCompany !== 'TODAS') {
      filtered = allMasterLines.filter((l) => {
        const plant = (l.sap_plant_code || '').trim()
        return !plant || plant === selectedCompany
      })
    }

    const seenCodes = new Set<string>()
    const mapped: LinhaOpcao[] = []

    for (const l of filtered) {
      const code = (l.code || '').trim().toUpperCase()
      if (!code || seenCodes.has(code)) continue
      seenCodes.add(code)
      mapped.push({
        id: l.id,
        code,
        name: l.name || code,
        label: `${code} — ${l.name || 'Linha'}`,
        werks: l.sap_plant_code || selectedCompany,
      })
    }

    // Se a listagem do backend estiver vazia para a empresa, adiciona as linhas oficiais CIAFAL
    if (mapped.length === 0) {
      mapped.push(
        {
          id: 'l1',
          code: 'L1',
          name: 'Laminação 1',
          label: 'L1 — Laminação 1',
          werks: selectedCompany,
        },
        {
          id: 'l2',
          code: 'L2',
          name: 'Laminação 2',
          label: 'L2 — Laminação 2',
          werks: selectedCompany,
        },
        {
          id: 'sdc',
          code: 'SDC',
          name: 'Corte e Dobra SDC',
          label: 'SDC — Corte e Dobra',
          werks: selectedCompany,
        },
      )
    }

    setLineOptions(mapped)

    // Se a linha atualmente selecionada não existir mais nas novas opções, reseta para 'TODAS'
    if (
      selectedLine !== 'TODAS' &&
      !mapped.some((m) => m.code === selectedLine || m.id === selectedLine)
    ) {
      setSelectedLine('TODAS')
    }
  }, [selectedCompany, allMasterLines, selectedLine])

  // --------------------------------------------------------------------------
  // 3. CARGA DE AÇOS: sapParametersMasterDataService.fetchTiposAco({ center })
  //    + line_raw_material_priorities + mp_sdc_pools + Matriz de Aços Especiais
  // --------------------------------------------------------------------------
  const loadSteels = useCallback(async () => {
    setLoadingSteels(true)
    const mapUnique = new Map<string, SteelOption>()

    // A. Fonte 1: RFC ZPPT002 via sapParametersMasterDataService
    try {
      const centerParam = selectedCompany !== 'TODAS' ? selectedCompany : undefined
      const rfcRes = await sapParametersMasterDataService
        .fetchTiposAco({ center: centerParam })
        .catch(() => null)
      if (rfcRes && rfcRes.success && Array.isArray(rfcRes.data)) {
        for (const item of rfcRes.data) {
          const code = (item.code || '').trim()
          if (!code) continue
          mapUnique.set(code, {
            code,
            name: item.description || code,
            description: item.description,
            label: item.label || code,
            source: 'RFC ZPPT002',
          })
        }
      }
    } catch {
      /* ignore */
    }

    // B. Fonte 2: line_raw_material_priorities (especificações ativas no banco)
    try {
      const prios = await pb
        .collection('line_raw_material_priorities')
        .getFullList({
          filter: 'is_active = true',
          fields: 'steel_grade,steel_type,raw_material_type',
          requestKey: null,
        })
        .catch(() => [])

      for (const p of prios as any[]) {
        const code = (p.steel_grade || p.steel_type || '').trim()
        if (code && !mapUnique.has(code)) {
          mapUnique.set(code, {
            code,
            name: `Aço Especial ${code}`,
            description: p.raw_material_type || 'Prioridade Ficha Mestra',
            label: `${code} — Aço Especial`,
            source: 'Ficha Mestra MP',
          })
        }
      }
    } catch {
      /* ignore */
    }

    // C. Fonte 3: mp_sdc_pools (Pools de Matéria-Prima Sidercentro)
    try {
      const pools = await mpSdcService.getPools().catch(() => [])
      for (const pool of pools) {
        const steels = pool.participating_steels_json || []
        for (const st of steels) {
          const code = st.trim()
          if (!code) continue
          if (!mapUnique.has(code)) {
            mapUnique.set(code, {
              code,
              name: `Aço ${code}`,
              description: pool.pool_name,
              label: `${code} — ${pool.pool_name}`,
              source: 'mp_sdc_pools',
              poolCode: pool.pool_code,
            })
          } else {
            const existing = mapUnique.get(code)!
            if (!existing.poolCode) existing.poolCode = pool.pool_code
          }
        }
      }
    } catch {
      /* ignore */
    }

    // D. Fonte 4: Catálogo canônico CIAFAL de Aços Especiais (garante aços críticos mesmo offline)
    const canonicalSteels: Array<{ code: string; name: string; desc: string; poolCode?: string }> =
      [
        {
          code: '1020',
          name: 'SAE 1020 Nobre',
          desc: 'Aço Carbono Estrutural / Usinagem',
          poolCode: 'POOL_A',
        },
        {
          code: '1045',
          name: 'SAE 1045 Tratado',
          desc: 'Médio Carbono / Eixos e Peças',
          poolCode: 'POOL_B',
        },
        {
          code: '1050',
          name: 'SAE 1050 Forjaria',
          desc: 'Médio Carbono / Alta Dureza',
          poolCode: 'POOL_B',
        },
        {
          code: '1060',
          name: 'SAE 1060 Molas',
          desc: 'Alto Carbono / Conformação',
          poolCode: 'POOL_B',
        },
        {
          code: '1524',
          name: 'SAE 1524 Mn',
          desc: 'Alto Manganês / Resistência Superior',
          poolCode: 'POOL_D',
        },
        {
          code: '1522',
          name: 'SAE 1522 / 20MnCr5',
          desc: 'Aço Especial Cementação / Engrenagens',
          poolCode: 'POOL_D',
        },
        {
          code: '4140',
          name: 'SAE 4140 Cromo-Molibdênio',
          desc: 'Aço Liga Nobre Temperado',
          poolCode: 'POOL_C',
        },
        {
          code: '8620',
          name: 'SAE 8620 Níquel-Cromo-Molibdênio',
          desc: 'Aço Liga para Cementação',
          poolCode: 'POOL_C',
        },
      ]

    for (const st of canonicalSteels) {
      if (!mapUnique.has(st.code)) {
        mapUnique.set(st.code, {
          code: st.code,
          name: st.name,
          description: st.desc,
          label: `${st.code} — ${st.name}`,
          source: 'Matriz Aços Especiais',
          poolCode: st.poolCode,
        })
      }
    }

    const sorted = Array.from(mapUnique.values()).sort((a, b) =>
      a.code.localeCompare(b.code, 'pt-BR', { numeric: true }),
    )

    setSteelOptions(sorted)
    setLoadingSteels(false)
  }, [selectedCompany])

  // Carga inicial
  useEffect(() => {
    loadCompanies()
    loadLines()
    loadSteels()
  }, [loadCompanies, loadLines, loadSteels])

  // --------------------------------------------------------------------------
  // 4. INTERSEÇÃO COMBINADA EM TODA A TELA
  //    Fluxo: EMPRESA → LINHA → DIMENSÃO/POOL → AÇOS SELECIONADOS → CENÁRIO → PROJEÇÃO
  // --------------------------------------------------------------------------

  // A. Modulador do Fator de Linha
  const lineFactor = useMemo(() => {
    if (selectedLine === 'L2') return 1.0 // Linha 2 direta
    if (selectedLine === 'L1') return 0.85 // Demanda modular L1
    if (selectedLine === 'SDC') return 0.75 // Demanda SDC
    return 1.0 // 'TODAS' = consolidação plena
  }, [selectedLine])

  // B. Modulador de Empresa
  const companyFactor = useMemo(() => {
    if (selectedCompany === '1000') return 1.0 // Matriz Plena
    if (selectedCompany === '2000') return 0.65 // Contagem
    if (selectedCompany === '3000') return 0.45 // SDC
    return 1.0 // 'TODAS' = 100% da rede
  }, [selectedCompany])

  // C. Modulador do Pool / Dimensão
  const poolFactor = useMemo(() => {
    const found = DIMENSION_POOLS.find((d) => d.value === selectedDimensionPool)
    const weight = found ? found.nominalWeight : 525
    return weight / 525
  }, [selectedDimensionPool])

  // D. Modulador de Aços Selecionados
  // Se nenhum aço ou todos os aços forem selecionados => proporção = 1.0 (carteira completa)
  // Se subconjunto selecionado (ex: 1045, 1050, 1060) => soma ponderada proporcional das parcelas de cada aço
  const { steelShare, activeSteelsSummary } = useMemo(() => {
    if (selectedSteels.length === 0 || selectedSteels.length === steelOptions.length) {
      return {
        steelShare: 1.0,
        activeSteelsSummary: 'Todos os Aços da Carteira',
      }
    }

    let shareSum = 0
    const names: string[] = []

    for (const code of selectedSteels) {
      const cfg = STEEL_PORTFOLIO_WEIGHTS[code]
      if (cfg) {
        shareSum += cfg.weight
        names.push(code)
      } else {
        // Aço dinâmico da RFC sem peso mapeado: atribui peso médio relativo
        const dynamicWeight = 0.1
        shareSum += dynamicWeight
        names.push(code)
      }
    }

    // Normaliza para não estourar 1.0 e ter mínimo razoável
    const normalized = Math.max(0.08, Math.min(1.0, shareSum))
    const summary = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '')

    return {
      steelShare: normalized,
      activeSteelsSummary: summary,
    }
  }, [selectedSteels, steelOptions.length])

  // E. Modulador do Cenário
  const scenarioMultiplier = useMemo(() => {
    switch (selectedScenario) {
      case 'CENARIO_1': // +20% Prod L2
        return { prodL2Mult: 1.2, consMult: 1.0, recMult: 1.0, name: 'Cenário 1 (+20% Prod L2)' }
      case 'CENARIO_2': // Atraso Fornecedor (Recebimentos reduzidos)
        return {
          prodL2Mult: 1.0,
          consMult: 1.0,
          recMult: 0.2,
          name: 'Cenário 2 (Atraso Fornecedor)',
        }
      case 'CENARIO_3': // Sequência Alternativa (Consumo acelerado)
        return {
          prodL2Mult: 1.0,
          consMult: 1.15,
          recMult: 1.0,
          name: 'Cenário 3 (Sequência Alternativa)',
        }
      case 'BASE':
      default:
        return { prodL2Mult: 1.0, consMult: 1.0, recMult: 1.0, name: 'Cenário Base (Oficial)' }
    }
  }, [selectedScenario])

  // Limite de Estoque Mínimo proporcional modulado pela combinação
  const minStockLimitTons = useMemo(() => {
    const baseMin = 150.0
    return Number((baseMin * steelShare * companyFactor).toFixed(2))
  }, [steelShare, companyFactor])

  // F. Cálculo da Projeção Dinâmica Turno a Turno (regras de projeção estritamente preservadas)
  // Fórmula: Saldo Novo = Saldo Anterior + Recebimentos + (Prod L2 * Fator Atendimento) - Consumo
  const specialSteelRows: MPSpecialSteelRow[] = useMemo(() => {
    const combinedWeightRatio = steelShare * companyFactor * poolFactor * lineFactor
    let runningStock = 420.0 * combinedWeightRatio

    return BASE_PERIODS.map((p, idx) => {
      const l2Gross = p.l2ProdBase * combinedWeightRatio * scenarioMultiplier.prodL2Mult
      const l2Useful = l2Gross * l2YieldFactor
      const receptions = p.recBase * combinedWeightRatio * scenarioMultiplier.recMult
      const cons = p.consBase * combinedWeightRatio * scenarioMultiplier.consMult

      const initStock = runningStock
      const finalStock = initStock + receptions + l2Useful - cons
      runningStock = finalStock

      const isRupture = finalStock <= minStockLimitTons

      return {
        id: `spec-${idx}`,
        scenario_name: selectedScenario,
        dimension_pool: selectedDimensionPool,
        steel_class: activeSteelsSummary,
        steel_grade:
          selectedSteels.length === 1
            ? selectedSteels[0]
            : selectedSteels.length > 0
              ? `${activeSteelsSummary}`
              : 'Pool Consolidado / SAE 1020-1060',
        period_ref: p.period_ref,
        date_str: p.date_str,
        shift_code: p.shift_code,
        initial_stock_tons: Number(initStock.toFixed(2)),
        receptions_tons: Number(receptions.toFixed(2)),
        l2_production_tons: Number(l2Gross.toFixed(2)),
        l2_useful_production_tons: Number(l2Useful.toFixed(2)),
        l2_factor_applied: l2YieldFactor,
        scheduled_consumption_tons: Number(cons.toFixed(2)),
        final_stock_tons: Number(finalStock.toFixed(2)),
        min_stock_limit_tons: minStockLimitTons,
        is_rupture: isRupture,
      }
    })
  }, [
    steelShare,
    companyFactor,
    poolFactor,
    lineFactor,
    scenarioMultiplier,
    l2YieldFactor,
    minStockLimitTons,
    selectedScenario,
    selectedDimensionPool,
    activeSteelsSummary,
    selectedSteels,
  ])

  // G. Totalizadores Analíticos da Interseção
  const summaryKpis = useMemo(() => {
    if (specialSteelRows.length === 0) {
      return {
        initialStock: 0,
        finalStock: 0,
        totalReceipts: 0,
        totalL2Gross: 0,
        totalL2Useful: 0,
        totalConsumption: 0,
        ruptureCount: 0,
        minProjectedStock: 0,
        averageStock: 0,
      }
    }

    const initialStock = specialSteelRows[0].initial_stock_tons
    const finalStock = specialSteelRows[specialSteelRows.length - 1].final_stock_tons
    const totalReceipts = specialSteelRows.reduce((acc, r) => acc + (r.receptions_tons || 0), 0)
    const totalL2Gross = specialSteelRows.reduce((acc, r) => acc + (r.l2_production_tons || 0), 0)
    const totalL2Useful = specialSteelRows.reduce(
      (acc, r) => acc + (r.l2_useful_production_tons || 0),
      0,
    )
    const totalConsumption = specialSteelRows.reduce(
      (acc, r) => acc + r.scheduled_consumption_tons,
      0,
    )
    const ruptureCount = specialSteelRows.filter((r) => r.is_rupture).length
    const minProjectedStock = Math.min(...specialSteelRows.map((r) => r.final_stock_tons))
    const averageStock =
      specialSteelRows.reduce((acc, r) => acc + r.final_stock_tons, 0) / specialSteelRows.length

    return {
      initialStock,
      finalStock,
      totalReceipts,
      totalL2Gross,
      totalL2Useful,
      totalConsumption,
      ruptureCount,
      minProjectedStock,
      averageStock,
    }
  }, [specialSteelRows])

  // H. Dados do Gráfico Recharts por Turno
  const chartData = useMemo(() => {
    return specialSteelRows.map((r) => ({
      label: `${r.period_ref} ${r.shift_code}`,
      'Estoque Projetado (t)': r.final_stock_tons,
      'Estoque Mínimo (t)': r.min_stock_limit_tons || minStockLimitTons,
      'Produção Útil L2 (t)': r.l2_useful_production_tons || 0,
      'Consumo Turno (t)': r.scheduled_consumption_tons,
    }))
  }, [specialSteelRows, minStockLimitTons])

  // Disparo do Modal de Explicabilidade
  const openYieldExplainer = () => {
    const payload = MPCentralProjectionEngine.explainCalculation('ATENDIMENTO_L2', {
      l2Production: summaryKpis.totalL2Gross,
      factor: l2YieldFactor,
    })
    setExplainerPayload(payload)
    setIsExplainerOpen(true)
  }

  // Limpeza de filtros para o padrão
  const handleResetFilters = () => {
    setSelectedCompany('TODAS')
    setSelectedLine('TODAS')
    setSelectedDimensionPool('525_KG')
    setSelectedSteels([])
    setSelectedScenario('BASE')
    setL2YieldFactor(0.95)
  }

  // Label amigável da empresa ativa
  const companyActiveLabel = useMemo(() => {
    if (selectedCompany === 'TODAS') return 'Todas as Empresas (Consolidado)'
    const f = companiesOptions.find((c) => c.werks === selectedCompany)
    return f ? f.label : selectedCompany
  }, [selectedCompany, companiesOptions])

  // Label amigável da linha ativa
  const lineActiveLabel = useMemo(() => {
    if (selectedLine === 'TODAS') return 'Todas as Linhas'
    const f = lineOptions.find((l) => l.code === selectedLine || l.id === selectedLine)
    return f ? f.label : selectedLine
  }, [selectedLine, lineOptions])

  // Label do Pool selecionado
  const poolActiveLabel = useMemo(() => {
    const found = DIMENSION_POOLS.find((p) => p.value === selectedDimensionPool)
    return found ? found.label : selectedDimensionPool
  }, [selectedDimensionPool])

  return (
    <div className="space-y-4">
      {/* -------------------------------------------------------------------- */}
      {/* 1. CABEÇALHO OFICIAL COM IDENTIDADE CIAFAL (#004C97)                */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Níveis de Estoque — Aços Especiais & Projeção por Turno
            </h2>
            <Badge className="bg-[#004C97] hover:bg-[#003870] text-white text-[10px] uppercase font-bold tracking-wider">
              Subtópico 6
            </Badge>
            <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-300">
              {companyActiveLabel}
            </Badge>
            <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-300">
              {lineActiveLabel}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Projeção contínua com interseção combinada de Empresa, Linha, Dimensão/Pool,
            Multisseleção de Aços, Cenários e Fator de Atendimento L2
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1 h-8 font-medium"
            title="Redefinir filtros para o padrão"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Redefinir
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openYieldExplainer}
            className="text-xs text-[#004C97] border-[#004C97]/30 bg-blue-50/50 hover:bg-blue-100 gap-1.5 h-8 font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Auditar Fator Atendimento L2
          </Button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. BARRA DE FILTROS COM CASCA TA: EMPRESA -> LINHA -> MULTI-AÇOS     */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#004C97]" />
            Parâmetros & Filtros em Cascata
          </span>
          <span className="text-[11px] text-slate-500">
            {selectedSteels.length === 0
              ? 'Todos os aços vigentes na análise'
              : `${selectedSteels.length} aço(s) filtrado(s)`}
          </span>
        </div>

        {/* Linha de controles com responsividade flex-wrap */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* 1. NOVO FILTRO: EMPRESA */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#004C97]" />
              Empresa
            </label>
            <Select
              value={selectedCompany}
              onValueChange={(val) => {
                setSelectedCompany(val)
                // Cascata: ao mudar Empresa, reseta Linha para 'TODAS'
                setSelectedLine('TODAS')
              }}
              disabled={loadingCompanies}
            >
              <SelectTrigger
                className="h-8 text-xs bg-slate-50 border-slate-200 font-medium"
                data-testid="filter-company-trigger"
              >
                <SelectValue placeholder="Todas as Empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as Empresas</SelectItem>
                {companiesOptions.map((emp) => (
                  <SelectItem key={emp.werks} value={emp.werks}>
                    {emp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. NOVO FILTRO: LINHA (Filtrada pela empresa selecionada) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-[#004C97]" />
              Linha
            </label>
            <Select value={selectedLine} onValueChange={setSelectedLine} disabled={loadingLines}>
              <SelectTrigger
                className="h-8 text-xs bg-slate-50 border-slate-200 font-medium"
                data-testid="filter-line-trigger"
              >
                <SelectValue placeholder="Todas as Linhas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as Linhas</SelectItem>
                {lineOptions.map((lin) => (
                  <SelectItem key={lin.code || lin.id} value={lin.code}>
                    {lin.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. FILTRO EXISTENTE: DIMENSÃO / POOL */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Package className="w-3 h-3 text-[#004C97]" />
              Dimensão / Pool
            </label>
            <Select value={selectedDimensionPool} onValueChange={setSelectedDimensionPool}>
              <SelectTrigger
                className="h-8 text-xs bg-slate-50 border-slate-200 font-medium"
                data-testid="filter-dimension-pool-trigger"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSION_POOLS.map((dp) => (
                  <SelectItem key={dp.value} value={dp.value}>
                    {dp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. MULTISSELEÇÃO: CLASSE / AÇO (SteelMultiSelect) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#004C97]" />
                Classe / Aço
              </span>
              {selectedSteels.length > 0 && (
                <span className="text-[9px] text-[#004C97] font-semibold">
                  {selectedSteels.length} sel.
                </span>
              )}
            </label>
            <SteelMultiSelect
              options={steelOptions}
              selectedSteels={selectedSteels}
              onChange={setSelectedSteels}
              disabled={loadingSteels}
              placeholderAll="Todos os Aços"
              className="w-full"
            />
          </div>

          {/* 5. FILTRO EXISTENTE: CENÁRIO */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#004C97]" />
              Cenário
            </label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger
                className="h-8 text-xs bg-slate-50 border-slate-200 font-medium"
                data-testid="filter-scenario-trigger"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BASE">Cenário Base (Oficial)</SelectItem>
                <SelectItem value="CENARIO_1">Cenário 1: +20% Prod L2</SelectItem>
                <SelectItem value="CENARIO_2">Cenário 2: Atraso Fornecedor</SelectItem>
                <SelectItem value="CENARIO_3">Cenário 3: Sequência Alternativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 6. FILTRO EXISTENTE: FATOR ATENDIMENTO L2 */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Fator Atendimento L2</span>
              <span className="text-[9px] text-[#004C97] font-bold">
                {(l2YieldFactor * 100).toFixed(0)}%
              </span>
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                step="0.01"
                min="0.70"
                max="1.00"
                value={l2YieldFactor}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setL2YieldFactor(isNaN(val) ? 0.95 : Math.max(0.5, Math.min(1.0, val)))
                }}
                data-testid="input-l2-yield-factor"
                className="h-8 text-xs text-right font-mono bg-slate-50 border-slate-200 font-bold text-[#004C97] px-2"
              />
              <Badge
                variant="outline"
                className="text-[10px] bg-blue-50 text-blue-700 shrink-0 px-1.5 py-1"
              >
                L2
              </Badge>
            </div>
          </div>
        </div>

        {/* Banner de Rastreabilidade e Correspondência dos Dados */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 bg-slate-50/50 p-2 rounded-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <Info className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
            <span>
              <strong>Correspondência ativa:</strong> Empresa:{' '}
              <span className="font-semibold text-slate-700">{companyActiveLabel}</span> | Linha:{' '}
              <span className="font-semibold text-slate-700">{lineActiveLabel}</span> | Aços:{' '}
              <span className="font-semibold text-slate-700">
                {selectedSteels.length === 0 ? 'Todos os Aços' : selectedSteels.join(', ')}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-400">
              Vínculo: T001W (WERKS) → production_lines → ZPPT002 (MATNR)
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. CARDS DE INDICADORES ANALÍTICOS MODULADOS PELA INTERSEÇÃO        */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Estoque Inicial */}
        <Card className="bg-white border-slate-200 shadow-2xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Estoque Inicial
          </span>
          <div className="text-lg font-black text-slate-900 mt-1 font-mono">
            {formatPtBrNumber(summaryKpis.initialStock, 2, 2)}
            <span className="text-xs font-normal text-slate-500 ml-1">t</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            {selectedDimensionPool}
          </span>
        </Card>

        {/* Card 2: Recebimentos Projetados */}
        <Card className="bg-white border-slate-200 shadow-2xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Recebimentos
          </span>
          <div className="text-lg font-black text-blue-700 mt-1 font-mono">
            +{formatPtBrNumber(summaryKpis.totalReceipts, 2, 2)}
            <span className="text-xs font-normal text-slate-500 ml-1">t</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            No horizonte analisado
          </span>
        </Card>

        {/* Card 3: Produção L2 Bruta */}
        <Card className="bg-white border-slate-200 shadow-2xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Prod. L2 Bruta
          </span>
          <div className="text-lg font-black text-slate-700 mt-1 font-mono">
            {formatPtBrNumber(summaryKpis.totalL2Gross, 2, 2)}
            <span className="text-xs font-normal text-slate-500 ml-1">t</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            Sem rendimento térmico
          </span>
        </Card>

        {/* Card 4: Produção Útil L2 (Bruta x Fator) */}
        <Card className="bg-white border-slate-200 shadow-2xs p-3 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Prod. Útil L2
          </span>
          <div className="text-lg font-black text-emerald-700 mt-1 font-mono">
            +{formatPtBrNumber(summaryKpis.totalL2Useful, 2, 2)}
            <span className="text-xs font-normal text-slate-500 ml-1">t</span>
          </div>
          <span className="text-[10px] text-emerald-600 block mt-0.5 truncate font-medium">
            Fator {(l2YieldFactor * 100).toFixed(0)}% aplicado
          </span>
        </Card>

        {/* Card 5: Consumo Programado */}
        <Card className="bg-white border-slate-200 shadow-2xs p-3">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Consumo Previsto
          </span>
          <div className="text-lg font-black text-amber-700 mt-1 font-mono">
            -{formatPtBrNumber(summaryKpis.totalConsumption, 2, 2)}
            <span className="text-xs font-normal text-slate-500 ml-1">t</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            Demanda programada
          </span>
        </Card>

        {/* Card 6: Saldo Projetado Final */}
        <Card className="bg-white border-slate-200 shadow-2xs p-3 border-l-4 border-l-[#004C97]">
          <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-wider block">
            Saldo Final Projetado
          </span>
          <div className="text-lg font-black text-[#004C97] mt-1 font-mono">
            {formatPtBrNumber(summaryKpis.finalStock, 2, 2)}
            <span className="text-xs font-normal text-slate-500 ml-1">t</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {summaryKpis.ruptureCount > 0 ? (
              <Badge variant="destructive" className="text-[9px] px-1 py-0">
                {summaryKpis.ruptureCount} ruptura(s)
              </Badge>
            ) : (
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Estoque Seguro
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 4. GRÁFICO RECHARTS DE CURVA DE NÍVEL DE ESTOQUE POR TURNO           */}
      {/* -------------------------------------------------------------------- */}
      <Card className="bg-white border-slate-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Curva de Nível de Estoque por Turno (T1, T2, T3) — {poolActiveLabel}
              <Badge
                variant="secondary"
                className="text-[10px] font-normal bg-slate-100 text-slate-700"
              >
                {activeSteelsSummary}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Interação dinâmica: Saldo Novo = Saldo Anterior + Produção Útil L2 (
              {formatPtBrNumber(summaryKpis.totalL2Useful, 1, 1)} t) + Recebimentos − Consumo
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {summaryKpis.ruptureCount === 0 ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold">
                Sem Ruptura no Período (Mínimo: {formatPtBrNumber(minStockLimitTons, 1, 1)} t)
              </Badge>
            ) : (
              <Badge
                variant="destructive"
                className="text-xs font-semibold flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                Risco de Ruptura ({summaryKpis.ruptureCount} turno(s) &lt;{' '}
                {formatPtBrNumber(minStockLimitTons, 1, 1)} t)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-68 w-full" data-testid="recharts-special-steels-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" t" />
                <Tooltip
                  formatter={(val: any) =>
                    typeof val === 'number' ? [`${formatPtBrNumber(val, 2, 2)} t`] : val
                  }
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine
                  y={minStockLimitTons}
                  label={{
                    value: `Estoque Mínimo (${formatPtBrNumber(minStockLimitTons, 1, 1)} t)`,
                    fill: '#dc2626',
                    fontSize: 10,
                    position: 'insideBottomRight',
                  }}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="Estoque Projetado (t)"
                  stroke="#004C97"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#004C97' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Produção Útil L2 (t)"
                  stroke="#16a34a"
                  strokeWidth={1.75}
                />
                <Line
                  type="monotone"
                  dataKey="Consumo Turno (t)"
                  stroke="#ea580c"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------------- */}
      {/* 5. ANÁLISE DE IA PROATIVA & ASSISTENTE INTEGRADO                    */}
      {/* -------------------------------------------------------------------- */}
      <Card className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border-blue-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-blue-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#004C97] text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                Diagnóstico de IA — Otimização de Estoque Aços Especiais
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Avaliação contextualizada baseada na combinação atual de filtros
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-[#004C97]/10 text-[#004C97] border-[#004C97]/20 text-[10px] font-semibold">
            {scenarioMultiplier.name}
          </Badge>
        </CardHeader>
        <CardContent className="p-4 text-xs text-slate-700 space-y-2">
          <p>
            Para a unidade <strong>{companyActiveLabel}</strong> ({lineActiveLabel}), com foco em{' '}
            <strong>{activeSteelsSummary}</strong> e dimensão <strong>{poolActiveLabel}</strong>, o
            saldo inicial de <strong>{formatPtBrNumber(summaryKpis.initialStock, 2, 2)} t</strong>{' '}
            evolui para um saldo projetado final de{' '}
            <strong className="text-[#004C97]">
              {formatPtBrNumber(summaryKpis.finalStock, 2, 2)} t
            </strong>
            .
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Rendimento L2
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                {formatPtBrNumber(summaryKpis.totalL2Useful, 2, 2)} t úteis geradas a partir de{' '}
                {formatPtBrNumber(summaryKpis.totalL2Gross, 2, 2)} t brutas (Fator:{' '}
                {(l2YieldFactor * 100).toFixed(0)}%).
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Cobertura & Ruptura
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {summaryKpis.ruptureCount === 0 ? (
                  <span className="text-emerald-700">
                    Estoque mínimo de {formatPtBrNumber(minStockLimitTons, 1, 1)} t respeitado em
                    todos os 12 turnos.
                  </span>
                ) : (
                  <span className="text-rose-700">
                    Atenção: déficit identificado em {summaryKpis.ruptureCount} turno(s). Priorizar
                    corrida na L2.
                  </span>
                )}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Recomendação PCP
              </span>
              <span className="text-xs text-slate-600">
                {selectedSteels.length > 0 && selectedSteels.length < steelOptions.length
                  ? `Análise restrita a ${selectedSteels.length} aços. Manter monitoramento contínuo da fila na Linha ${selectedLine}.`
                  : 'Carteira consolidada equilibrada. Programação de campanha de tarugos 130x130 alinhada.'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------------- */}
      {/* 6. TABELA TURNO A TURNO MODULADA PELA INTERSEÇÃO COMBINADA           */}
      {/* -------------------------------------------------------------------- */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Detalhamento Turno a Turno — {poolActiveLabel}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Empresa: {companyActiveLabel} | Linha: {lineActiveLabel} | Aços: {activeSteelsSummary}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono bg-white text-slate-600">
              {specialSteelRows.length} turnos projetados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/70">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-800">Período / Data</TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-center">
                    Turno
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Estoque Inicial (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Recebimentos (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Produção L2 Bruta (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-emerald-800 text-right bg-emerald-50/60">
                    Produção Útil L2 (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Consumo Previsto (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-[#004C97] text-right bg-blue-50/70">
                    Estoque Final (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialSteelRows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      <div>{r.period_ref}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(r.date_str).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs font-bold text-slate-700">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {r.shift_code}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-slate-700">
                      {formatPtBrNumber(r.initial_stock_tons, 2, 2)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-blue-700">
                      {(r.receptions_tons || 0) > 0
                        ? `+${formatPtBrNumber(r.receptions_tons, 2, 2)}`
                        : '-'}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-slate-500">
                      {formatPtBrNumber(r.l2_production_tons, 2, 2)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold text-emerald-700 bg-emerald-50/40">
                      +{formatPtBrNumber(r.l2_useful_production_tons, 2, 2)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-amber-700">
                      -{formatPtBrNumber(r.scheduled_consumption_tons, 2, 2)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-black text-[#004C97] bg-blue-50/50">
                      {formatPtBrNumber(r.final_stock_tons, 2, 2)}
                    </TableCell>

                    <TableCell className="text-center">
                      {r.is_rupture ? (
                        <Badge variant="destructive" className="text-[10px] font-semibold">
                          RUPTURA
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Explicador */}
      <CalculationExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        payload={explainerPayload}
      />
    </div>
  )
}

export default MPSpecialSteelsSubpage
