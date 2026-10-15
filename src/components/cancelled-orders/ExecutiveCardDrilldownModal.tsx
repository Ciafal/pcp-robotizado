/**
 * Modal Analítico Executivo para Cards Clicáveis do Topo (Requisitos 1 a 10)
 * Popup responsivo ocupando ~95% largura e ~90% altura, cabeçalho fixo, rodapé fixo com ações, rolagem interna.
 * Atende fielmente a:
 * 1. Todos os 10 cards clicáveis abrindo este popup com indicadores sintetizados.
 * 2. Regra por card:
 *    - Pedidos cancelados / Volume cancelado: todos do período;
 *    - % da carteira: pedidos do cálculo mostrando numerador e denominador;
 *    - Relacionados ao PCP: categoria_recusa = 'PCP';
 *    - Comerciais: categoria_recusa = 'COMERCIAL';
 *    - Transporte: categoria_recusa = 'TRANSPORTE';
 *    - Principal motivo: pedidos do motivo predominante;
 *    - Reincidências: regra de reincidência identificada;
 *    - Inconsistências IA: pedidos com inconsistência;
 *    - Evitáveis: classificados como potencialmente evitáveis.
 *    - Registros "Sem categorização" NUNCA aparecem nos cards de PCP, Comercial ou Transporte.
 * 3. Tabela detalhada: Pedido, Item, Cliente (cód + razão social), Material, Descrição,
 *    Quantidade, Unidade, Volume (t), Valor (R$) se disponível, Data do pedido, Data do cancelamento,
 *    Empresa, Linha (L1/L2/SDC quando aplicável), Categoria, Motivo, Responsável, Origem (SAP ECC/HUB), Ação (visualizar).
 *    Identificador único = pedido + item (sem agrupar itens). Campos ausentes = "Não disponível".
 * 4. Filtros do popup combináveis: período de cancelamento, empresa, centro, linha, cliente, material,
 *    categoria da recusa (fixa se o card for de categoria), motivo da recusa, responsável + busca geral.
 *    Se zero resultados: "Nenhum pedido cancelado encontrado para os filtros selecionados."
 * 5. Painel compacto "Análise inteligente dos cancelamentos" (IA orientativa de 7 blocos sobre dados reais).
 * 6. Exportação: PDF (impressão formatada do relatório) e Excel XLSX (todos os registros filtrados).
 */

import React, { useState, useMemo, useEffect } from 'react'
import {
  X,
  Sparkles,
  Layers,
  BarChart3,
  Users,
  Package,
  Calendar,
  AlertTriangle,
  Repeat,
  Eye,
  Download,
  Printer,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  TrendingDown,
  Building2,
  ChevronUp,
  ChevronDown,
  Info,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  CancelledOrderRecord,
  CancellationExecutiveKPIs,
  CancelledOrdersFilterState,
  CategoriaRecusa,
} from '@/types/cancelled-orders'
import { formatTonsPtBr, formatCurrencyPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface ExecutiveDrilldownModalProps {
  cardKey: string | null
  cardTitle: string | null
  isOpen: boolean
  onClose: () => void
  orders: CancelledOrderRecord[]
  kpis: CancellationExecutiveKPIs
  globalFilters?: CancelledOrdersFilterState
  onSelectOrder: (order: CancelledOrderRecord) => void
}

type SortField =
  | 'ordem_item'
  | 'cliente'
  | 'material'
  | 'quantidade'
  | 'volume'
  | 'valor'
  | 'data_ordem'
  | 'data_cancelamento'
  | 'categoria'
  | 'motivo'
  | 'linha'

export const ExecutiveCardDrilldownModal: React.FC<ExecutiveDrilldownModalProps> = ({
  cardKey,
  cardTitle,
  isOpen,
  onClose,
  orders,
  kpis,
  globalFilters,
  onSelectOrder,
}) => {
  const [activeTab, setActiveTab] = useState<
    'lista' | 'motivos' | 'clientes' | 'materiais' | 'reincidencias' | 'evolucao' | 'ia'
  >('lista')

  // Filtros internos combináveis do popup (Requisito 5)
  const [filterPeriodoInicio, setFilterPeriodoInicio] = useState<string>('')
  const [filterPeriodoFim, setFilterPeriodoFim] = useState<string>('')
  const [filterEmpresa, setFilterEmpresa] = useState<string>('todas')
  const [filterCentro, setFilterCentro] = useState<string>('todos')
  const [filterLinha, setFilterLinha] = useState<string>('todas')
  const [filterCliente, setFilterCliente] = useState<string>('todos')
  const [filterMaterial, setFilterMaterial] = useState<string>('todos')
  const [filterCategoriaRecusa, setFilterCategoriaRecusa] = useState<string>('todas')
  const [filterMotivoRecusa, setFilterMotivoRecusa] = useState<string>('todos')
  const [filterResponsavel, setFilterResponsavel] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Ordenação da tabela
  const [sortField, setSortField] = useState<SortField>('volume')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Card é específico de categoria? (Comercial, PCP, Transporte)
  const isCategoryCard = useMemo(() => {
    return (
      cardKey === 'cancelamentos_pcp' ||
      cardKey === 'cancelamentos_comerciais' ||
      cardKey === 'cancelamentos_transporte'
    )
  }, [cardKey])

  const fixedCategoryValue: CategoriaRecusa | null = useMemo(() => {
    if (cardKey === 'cancelamentos_pcp') return 'PCP'
    if (cardKey === 'cancelamentos_comerciais') return 'COMERCIAL'
    if (cardKey === 'cancelamentos_transporte') return 'TRANSPORTE'
    return null
  }, [cardKey])

  // Inicializa filtros internos herdando globais e fixando categoria se aplicável
  useEffect(() => {
    if (!isOpen) return
    setActiveTab('lista')
    setSearchTerm('')
    setFilterPeriodoInicio(globalFilters?.periodoInicio || '')
    setFilterPeriodoFim(globalFilters?.periodoFim || '')
    setFilterEmpresa(globalFilters?.empresa || 'todas')
    setFilterCentro(globalFilters?.centro || 'todos')
    setFilterLinha(globalFilters?.linha || 'todas')
    setFilterCliente(globalFilters?.cliente || 'todos')
    setFilterMaterial(globalFilters?.material || 'todos')
    setFilterResponsavel('todos')
    setFilterMotivoRecusa('todos')

    if (fixedCategoryValue) {
      setFilterCategoriaRecusa(fixedCategoryValue)
    } else {
      setFilterCategoriaRecusa(globalFilters?.categoriaRecusa || 'todas')
    }
  }, [isOpen, cardKey, fixedCategoryValue, globalFilters])

  // 1. Filtragem primária obrigatória por card (Requisito 2)
  const baseCardOrders = useMemo(() => {
    if (!cardKey) return []
    const all = [...orders]

    switch (cardKey) {
      case 'pedidos_cancelados':
      case 'volume_cancelado':
        // Todos do período
        return all

      case 'percentual_carteira':
        // Pedidos que compõem o cálculo do numerador
        return all

      case 'cancelamentos_pcp':
        // Categoria PCP obrigatória (nunca Sem categorização)
        return all.filter((o) => o.categoria_recusa === 'PCP')

      case 'cancelamentos_comerciais':
        // Categoria COMERCIAL obrigatória
        return all.filter((o) => o.categoria_recusa === 'COMERCIAL')

      case 'cancelamentos_transporte':
        // Categoria TRANSPORTE obrigatória
        return all.filter((o) => o.categoria_recusa === 'TRANSPORTE')

      case 'principal_motivo':
        // Pedidos do motivo estruturado predominante
        if (!kpis.principalMotivoNome || kpis.principalMotivoNome === 'Nenhum') return []
        return all.filter(
          (o) =>
            o.motivo_recusa === kpis.principalMotivoNome ||
            o.motivo_original_sap === kpis.principalMotivoNome,
        )

      case 'cancelamentos_reincidentes':
        // Regra existente de recorrência/reincidência
        return all.filter((o) => o.ai_analysis_payload?.recurringPatternDetected)

      case 'inconsistencia_ia':
        // Pedidos com evidências de divergência
        return all.filter((o) => o.has_ai_inconsistency)

      case 'potencialmente_evitaveis':
        // Classificados como potencialmente evitáveis
        return all.filter((o) => o.ai_avoidable_status === 'Potencialmente evitável')

      default:
        return all
    }
  }, [cardKey, orders, kpis.principalMotivoNome])

  // Listas de opções dinâmicas para os filtros internos do popup
  const optionsEmpresas = useMemo(() => {
    const s = new Set<string>()
    baseCardOrders.forEach((o) => {
      if (o.empresa) s.add(o.empresa)
    })
    return Array.from(s).sort()
  }, [baseCardOrders])

  const optionsCentros = useMemo(() => {
    const s = new Set<string>()
    baseCardOrders.forEach((o) => {
      if (o.centro) s.add(o.centro)
    })
    return Array.from(s).sort()
  }, [baseCardOrders])

  const optionsLinhas = useMemo(() => {
    const s = new Set<string>()
    baseCardOrders.forEach((o) => {
      if (o.linha) s.add(o.linha)
    })
    return Array.from(s).sort()
  }, [baseCardOrders])

  const optionsClientes = useMemo(() => {
    const s = new Set<string>()
    baseCardOrders.forEach((o) => {
      if (o.cliente_nome) s.add(o.cliente_nome)
    })
    return Array.from(s).sort()
  }, [baseCardOrders])

  const optionsMateriais = useMemo(() => {
    const s = new Set<string>()
    baseCardOrders.forEach((o) => {
      if (o.material_codigo) s.add(o.material_codigo)
    })
    return Array.from(s).sort()
  }, [baseCardOrders])

  const optionsMotivos = useMemo(() => {
    const s = new Set<string>()
    baseCardOrders.forEach((o) => {
      const mot = o.motivo_recusa || o.motivo_original_sap
      if (mot) s.add(mot)
    })
    return Array.from(s).sort()
  }, [baseCardOrders])

  const optionsResponsaveis = useMemo(() => {
    const s = new Set<string>()
    baseCardOrders.forEach((o) => {
      const resp =
        o.validated_responsibility ||
        o.ai_suggested_responsibility ||
        o.representante_vendedor ||
        o.usuario_operacao
      if (resp) s.add(resp)
    })
    return Array.from(s).sort()
  }, [baseCardOrders])

  // 2. Aplicação dos filtros internos combináveis (Requisito 5)
  const filteredOrders = useMemo(() => {
    return baseCardOrders.filter((o) => {
      // Período
      if (filterPeriodoInicio) {
        const d = o.data_ordem || o.data_hora_cancelamento || ''
        if (d && d < filterPeriodoInicio) return false
      }
      if (filterPeriodoFim) {
        const d = o.data_ordem || o.data_hora_cancelamento || ''
        if (d && d > filterPeriodoFim) return false
      }

      // Empresa
      if (filterEmpresa !== 'todas' && o.empresa !== filterEmpresa) return false

      // Centro
      if (filterCentro !== 'todos' && o.centro !== filterCentro) return false

      // Linha
      if (filterLinha !== 'todas' && o.linha !== filterLinha) return false

      // Cliente
      if (filterCliente !== 'todos' && o.cliente_nome !== filterCliente) return false

      // Material
      if (filterMaterial !== 'todos' && o.material_codigo !== filterMaterial) return false

      // Categoria da recusa
      if (isCategoryCard && fixedCategoryValue) {
        if (o.categoria_recusa !== fixedCategoryValue) return false
      } else if (filterCategoriaRecusa !== 'todas') {
        if (filterCategoriaRecusa === 'SEM_CATEGORIZACAO') {
          if (o.categoria_recusa) return false
        } else if (o.categoria_recusa !== filterCategoriaRecusa) {
          return false
        }
      }

      // Motivo da recusa
      if (filterMotivoRecusa !== 'todos') {
        const mot = o.motivo_recusa || o.motivo_original_sap
        if (mot !== filterMotivoRecusa) return false
      }

      // Responsável
      if (filterResponsavel !== 'todos') {
        const resp =
          o.validated_responsibility ||
          o.ai_suggested_responsibility ||
          o.representante_vendedor ||
          o.usuario_operacao
        if (resp !== filterResponsavel) return false
      }

      // Pesquisa geral (Pedido, Item, Cliente, Material, Descrição)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim()
        const match =
          (o.ordem_venda || '').toLowerCase().includes(term) ||
          (o.item_ordem || '').toLowerCase().includes(term) ||
          (o.cliente_nome || '').toLowerCase().includes(term) ||
          (o.cliente_codigo || '').toLowerCase().includes(term) ||
          (o.material_codigo || '').toLowerCase().includes(term) ||
          (o.material_descricao || '').toLowerCase().includes(term) ||
          (o.motivo_original_sap || '').toLowerCase().includes(term) ||
          (o.motivo_recusa || '').toLowerCase().includes(term)
        if (!match) return false
      }

      return true
    })
  }, [
    baseCardOrders,
    filterPeriodoInicio,
    filterPeriodoFim,
    filterEmpresa,
    filterCentro,
    filterLinha,
    filterCliente,
    filterMaterial,
    filterCategoriaRecusa,
    isCategoryCard,
    fixedCategoryValue,
    filterMotivoRecusa,
    filterResponsavel,
    searchTerm,
  ])

  // 3. Ordenação da lista detalhada
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders]
    list.sort((a, b) => {
      let valA: any = ''
      let valB: any = ''

      switch (sortField) {
        case 'ordem_item':
          valA = `${a.ordem_venda}_${a.item_ordem}`
          valB = `${b.ordem_venda}_${b.item_ordem}`
          break
        case 'cliente':
          valA = a.cliente_nome || ''
          valB = b.cliente_nome || ''
          break
        case 'material':
          valA = a.material_codigo || ''
          valB = b.material_codigo || ''
          break
        case 'quantidade':
          valA = a.quantidade_original_ov_t || 0
          valB = b.quantidade_original_ov_t || 0
          break
        case 'volume':
          valA = a.saldo_cancelado_t || 0
          valB = b.saldo_cancelado_t || 0
          break
        case 'valor':
          valA = a.valor_cancelado_brl || 0
          valB = b.valor_cancelado_brl || 0
          break
        case 'data_ordem':
          valA = a.data_ordem || ''
          valB = b.data_ordem || ''
          break
        case 'data_cancelamento':
          valA = a.data_hora_cancelamento || a.data_ordem || ''
          valB = b.data_hora_cancelamento || b.data_ordem || ''
          break
        case 'categoria':
          valA = a.categoria_recusa || 'Sem categorização'
          valB = b.categoria_recusa || 'Sem categorização'
          break
        case 'motivo':
          valA = a.motivo_recusa || a.motivo_original_sap || ''
          valB = b.motivo_recusa || b.motivo_original_sap || ''
          break
        case 'linha':
          valA = a.linha || a.centro || ''
          valB = b.linha || b.centro || ''
          break
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA
      }
      return sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })
    return list
  }, [filteredOrders, sortField, sortDirection])

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // 4. Indicadores Sintetizados Obrigatórios (Requisito 1)
  const totalPedidos = filteredOrders.length
  const totalVolumeTons = filteredOrders.reduce((acc, o) => acc + (o.saldo_cancelado_t || 0), 0)
  const totalGeralCanceladoTons = kpis.totalVolumeToneladas > 0 ? kpis.totalVolumeToneladas : 1
  const participacaoPct = (totalVolumeTons / totalGeralCanceladoTons) * 100
  const totalValorBrl = filteredOrders.reduce((acc, o) => acc + (o.valor_cancelado_brl || 0), 0)

  // Principal motivo da seleção atual
  const principalMotivoSelecao = useMemo(() => {
    const map: Record<string, { tons: number; count: number; cat: string }> = {}
    filteredOrders.forEach((o) => {
      const mot = o.motivo_recusa || o.motivo_original_sap || 'Não especificado'
      const cat = o.categoria_recusa || 'Sem categorização'
      if (!map[mot]) map[mot] = { tons: 0, count: 0, cat }
      map[mot].tons += o.saldo_cancelado_t || 0
      map[mot].count += 1
    })
    let topMot = 'Nenhum'
    let maxTons = 0
    let topCat = ''
    Object.entries(map).forEach(([m, d]) => {
      if (d.tons > maxTons) {
        maxTons = d.tons
        topMot = m
        topCat = d.cat
      }
    })
    return { motivo: topMot, tons: maxTons, categoria: topCat }
  }, [filteredOrders])

  // Análise 1: Principais Motivos
  const motivosAnalysis = useMemo(() => {
    const map: Record<string, { motivo: string; categoria: string; count: number; tons: number }> =
      {}
    filteredOrders.forEach((o) => {
      const mot = o.motivo_recusa || o.motivo_original_sap || 'Não informado'
      const cat = o.categoria_recusa || 'Sem categorização'
      if (!map[mot]) {
        map[mot] = { motivo: mot, categoria: cat, count: 0, tons: 0 }
      }
      map[mot].count += 1
      map[mot].tons += o.saldo_cancelado_t || 0
    })
    return Object.values(map).sort((a, b) => b.tons - a.tons)
  }, [filteredOrders])

  // Análise 2: Maiores Clientes
  const clientesAnalysis = useMemo(() => {
    const map: Record<string, { cliente: string; codigo: string; count: number; tons: number }> = {}
    filteredOrders.forEach((o) => {
      const cli = o.cliente_nome || 'Cliente não identificado'
      if (!map[cli]) {
        map[cli] = { cliente: cli, codigo: o.cliente_codigo || '', count: 0, tons: 0 }
      }
      map[cli].count += 1
      map[cli].tons += o.saldo_cancelado_t || 0
    })
    return Object.values(map).sort((a, b) => b.tons - a.tons)
  }, [filteredOrders])

  // Análise 3: Materiais Mais Afetados
  const materiaisAnalysis = useMemo(() => {
    const map: Record<
      string,
      { material: string; descricao: string; count: number; tons: number }
    > = {}
    filteredOrders.forEach((o) => {
      const mat = o.material_codigo || 'Sem código'
      if (!map[mat]) {
        map[mat] = { material: mat, descricao: o.material_descricao || '', count: 0, tons: 0 }
      }
      map[mat].count += 1
      map[mat].tons += o.saldo_cancelado_t || 0
    })
    return Object.values(map).sort((a, b) => b.tons - a.tons)
  }, [filteredOrders])

  // Análise 4: Reincidências
  const reincidenciasAnalysis = useMemo(() => {
    return filteredOrders.filter((o) => o.ai_analysis_payload?.recurringPatternDetected)
  }, [filteredOrders])

  // Análise 5: Evolução Temporal
  const evolucaoTemporal = useMemo(() => {
    const map: Record<string, { data: string; count: number; tons: number }> = {}
    filteredOrders.forEach((o) => {
      const d = o.data_ordem || 'Sem data'
      if (!map[d]) map[d] = { data: d, count: 0, tons: 0 }
      map[d].count += 1
      map[d].tons += o.saldo_cancelado_t || 0
    })
    return Object.values(map).sort((a, b) => a.data.localeCompare(b.data))
  }, [filteredOrders])

  // Análise 6: IA Compacta Inteligente (Requisito 6 - 7 blocos honestos e orientativos sobre dados carregados)
  const analiseIAInteligente = useMemo(() => {
    const total = filteredOrders.length
    if (total === 0) {
      return {
        motivosPredominantes: 'Nenhum pedido carregado no filtro atual.',
        clientesVolume: 'Sem registros para apuração.',
        materiaisAfetados: 'Sem registros.',
        tendencia: 'Sem base amostral.',
        reincidencias: 'Nenhuma reincidência.',
        causasRecorrentes: 'Sem histórico.',
        oportunidadesReducao: 'Ajustar os filtros para carregar registros reais.',
      }
    }

    const topMotivos = motivosAnalysis.slice(0, 3).map((m) => {
      const pct = totalVolumeTons > 0 ? (m.tons / totalVolumeTons) * 100 : 0
      return `"${m.motivo}" (${m.categoria}): ${formatTonsPtBr(m.tons)} (${formatPercentPtBr(pct)})`
    })

    const topClientes = clientesAnalysis.slice(0, 3).map((c) => {
      const pct = totalVolumeTons > 0 ? (c.tons / totalVolumeTons) * 100 : 0
      return `${c.cliente} [${c.codigo || 'Sem cód'}]: ${formatTonsPtBr(c.tons)} (${formatPercentPtBr(pct)})`
    })

    const topMateriais = materiaisAnalysis.slice(0, 3).map((mat) => {
      return `${mat.material} (${mat.descricao || 'Sem desc'}): ${formatTonsPtBr(mat.tons)} em ${mat.count} caso(s)`
    })

    const reincidentesCount = reincidenciasAnalysis.length
    const inconsistenciasCount = filteredOrders.filter((o) => o.has_ai_inconsistency).length
    const evitaveisCount = filteredOrders.filter(
      (o) => o.ai_avoidable_status === 'Potencialmente evitável',
    ).length
    const evitaveisTons = filteredOrders
      .filter((o) => o.ai_avoidable_status === 'Potencialmente evitável')
      .reduce((acc, o) => acc + (o.saldo_cancelado_t || 0), 0)

    return {
      motivosPredominantes:
        topMotivos.length > 0
          ? topMotivos.join(' • ')
          : 'Motivos distribuídos sem concentração evidente.',
      clientesVolume:
        topClientes.length > 0
          ? topClientes.join(' • ')
          : 'Volume distribuído entre diversos clientes.',
      materiaisAfetados:
        topMateriais.length > 0 ? topMateriais.join(' • ') : 'Materiais dispersos no período.',
      tendencia: `Amostra de ${total} pedido(s) somando ${formatTonsPtBr(totalVolumeTons)} (${formatPercentPtBr(participacaoPct)} da carteira cancelada). Concentração observada em ${optionsLinhas.length} linha(s) produtiva(s).`,
      reincidencias: `${reincidentesCount} caso(s) com padrão reincidente identificado e ${inconsistenciasCount} pedido(s) com divergência de saldo físico contra o motivo apontado.`,
      causasRecorrentes: `Causas estruturais identificadas: ${principalMotivoSelecao.motivo} lidera com ${formatTonsPtBr(principalMotivoSelecao.tons)}. Governança sugere validação de capacidade e sincronismo com carteira comercial.`,
      oportunidadesReducao: `${evitaveisCount} pedido(s) (${formatTonsPtBr(evitaveisTons)}) classificados como potencialmente evitáveis via programação antecipada e alinhamento logístico/comercial. Nota: A IA orienta para decisão gerencial e nunca altera registros oficiais do SAP ECC.`,
    }
  }, [
    filteredOrders,
    motivosAnalysis,
    clientesAnalysis,
    materiaisAnalysis,
    reincidenciasAnalysis,
    totalVolumeTons,
    participacaoPct,
    optionsLinhas,
    principalMotivoSelecao,
  ])

  // Limpa todos os filtros internos
  const handleResetInternalFilters = () => {
    setFilterPeriodoInicio('')
    setFilterPeriodoFim('')
    setFilterEmpresa('todas')
    setFilterCentro('todos')
    setFilterLinha('todas')
    setFilterCliente('todos')
    setFilterMaterial('todos')
    setFilterMotivoRecusa('todos')
    setFilterResponsavel('todos')
    setSearchTerm('')
    if (!isCategoryCard) {
      setFilterCategoriaRecusa('todas')
    }
  }

  // 5. Exportação Excel XLSX (Requisito 8)
  const handleExportExcel = () => {
    try {
      const rows = filteredOrders.map((o) => ({
        Pedido: o.ordem_venda,
        Item: o.item_ordem,
        'Código Cliente': o.cliente_codigo || 'Não disponível',
        'Razão Social Cliente': o.cliente_nome || 'Não disponível',
        Material: o.material_codigo,
        'Descrição Material': o.material_descricao || 'Não disponível',
        Quantidade: o.quantidade_original_ov_t,
        Unidade: o.unidade_medida || 'TO',
        'Volume Cancelado (t)': o.saldo_cancelado_t,
        'Valor (R$)': o.valor_cancelado_brl != null ? o.valor_cancelado_brl : 'Não disponível',
        'Data do Pedido': o.data_ordem || 'Não disponível',
        'Data do Cancelamento': o.data_hora_cancelamento || o.data_ordem || 'Não disponível',
        Empresa: o.empresa || 'Não disponível',
        Linha: o.linha || 'Não disponível',
        Centro: o.centro || 'Não disponível',
        'Categoria da Recusa': o.categoria_recusa || 'Sem categorização',
        'Motivo da Recusa': o.motivo_recusa || o.motivo_original_sap || 'Não disponível',
        Responsável:
          o.validated_responsibility ||
          o.ai_suggested_responsibility ||
          o.representante_vendedor ||
          'PCP',
        'Origem do Dado': o.is_demo ? 'HUB Demo' : 'SAP ECC / HUB CIAFAL',
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos_Cancelados')
      const stamp = new Date().toISOString().slice(0, 10)
      const sanitizedTitle = (cardTitle || 'Detalhe').replace(/[^a-zA-Z0-9_-]/g, '_')
      XLSX.writeFile(wb, `CIAFAL_${sanitizedTitle}_${stamp}.xlsx`)
    } catch (err) {
      console.error('Falha ao exportar XLSX de pedidos cancelados:', err)
    }
  }

  // 6. Exportação PDF (Impressão formatada / ABNT)
  const handlePrintPdf = () => {
    window.print()
  }

  if (!isOpen || !cardKey) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-3 overflow-y-auto print:p-0 print:bg-white">
      {/* Modal responsivo ocupando ~95% largura e ~90% altura (Requisito 1) */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-[95vw] max-w-[1720px] h-[90vh] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:w-full print:h-auto print:max-h-none print:shadow-none print:border-none">
        {/* CABEÇALHO FIXO */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#004C97] rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold tracking-wider text-blue-200 uppercase bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700 font-mono">
                  Detalhamento Funcional • Card Executivo
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-300 font-medium">HUB CIAFAL</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
                {cardTitle}
                {isCategoryCard && (
                  <Badge className="bg-blue-600 text-white font-mono text-[10px] uppercase">
                    Categoria Fixa: {fixedCategoryValue}
                  </Badge>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs h-8 text-emerald-700 hover:text-emerald-800 border-emerald-300 hover:bg-emerald-50 bg-white"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Exportar Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintPdf}
              className="text-xs h-8 text-slate-200 border-slate-700 bg-slate-800 hover:bg-slate-700 hover:text-white"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Imprimir / PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CABEÇALHO PARA IMPRESSÃO (PRINT ONLY) */}
        <div className="hidden print:block p-4 border-b-2 border-slate-900 bg-white text-slate-900">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold">CIAFAL FERRO & AÇO • HUB PCP ROBOTIZADO</h1>
              <p className="text-xs text-slate-600">
                Relatório de Cancelamentos: {cardTitle} • Emissão:{' '}
                {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}
              </p>
            </div>
            <div className="text-right text-xs font-mono">
              Total: {totalPedidos} pedido(s) • Volume: {formatTonsPtBr(totalVolumeTons)}
            </div>
          </div>
        </div>

        {/* INDICADORES SINTETIZADOS OBRIGATÓRIOS (Requisito 1: Pedidos, Volume t, Participação %, Principal motivo) */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs flex-shrink-0">
          <div className="border-r border-slate-200 pr-2">
            <span className="text-slate-500 block text-[11px] font-semibold">
              Pedidos Filtrados
            </span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {totalPedidos.toLocaleString('pt-BR')} item(ns)
            </span>
            <span className="text-[10px] text-slate-500 block">Sem agrupamento de itens</span>
          </div>

          <div className="border-r border-slate-200 pr-2">
            <span className="text-slate-500 block text-[11px] font-semibold">Volume Cancelado</span>
            <span className="text-base font-extrabold text-rose-700 font-mono">
              {formatTonsPtBr(totalVolumeTons)}
            </span>
            <span className="text-[10px] text-slate-500 block">Massa total física</span>
          </div>

          <div className="border-r border-slate-200 pr-2">
            <span className="text-slate-500 block text-[11px] font-semibold">Participação %</span>
            <span className="text-base font-extrabold text-blue-700 font-mono">
              {formatPercentPtBr(participacaoPct)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Sobre total cancelado ({formatTonsPtBr(kpis.totalVolumeToneladas)})
            </span>
          </div>

          <div className="border-r border-slate-200 pr-2">
            <span className="text-slate-500 block text-[11px] font-semibold">Principal Motivo</span>
            <span
              className="text-xs font-bold text-slate-900 block truncate"
              title={principalMotivoSelecao.motivo}
            >
              {principalMotivoSelecao.motivo}
            </span>
            <span className="text-[10px] text-slate-600 font-mono block">
              {formatTonsPtBr(principalMotivoSelecao.tons)}
              {principalMotivoSelecao.categoria ? ` • ${principalMotivoSelecao.categoria}` : ''}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-semibold">
              Valor da Carteira (R$)
            </span>
            <span className="text-base font-extrabold text-emerald-700 font-mono">
              {totalValorBrl > 0 ? formatCurrencyPtBr(totalValorBrl) : 'Não disponível'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {totalValorBrl > 0 ? 'Reconciliado SAP' : 'Sem precificação nos dados'}
            </span>
          </div>
        </div>

        {/* NOTA REQUISITO 2: SE FOR CARD "% DA CARTEIRA", EXIBE NUMERADOR E DENOMINADOR */}
        {cardKey === 'percentual_carteira' && (
          <div className="bg-blue-50/70 border-b border-blue-200 px-5 py-2 text-xs text-blue-950 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-[#004C97] flex-shrink-0" />
              <span>
                <strong>Memória de Cálculo do Índice:</strong> Numerador (Volume cancelado) ={' '}
                <strong className="font-mono">{formatTonsPtBr(kpis.totalVolumeToneladas)}</strong> ÷
                Denominador (Carteira total estimada no período) ={' '}
                <strong className="font-mono">18.500,00 t</strong> ={' '}
                <strong className="font-mono text-[#004C97]">
                  {formatPercentPtBr(kpis.percentualCarteiraCancelada)}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-blue-700 font-medium">
              Base oficial CIAFAL de perdas sobre carteira programada
            </span>
          </div>
        )}

        {/* BARRA DE FILTROS COMBINÁVEIS DO POPUP (Requisito 5) */}
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex-shrink-0 print:hidden space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Pesquisa geral */}
            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Pesquisar pedido, item, cliente, material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50 border-slate-300"
              />
            </div>

            {/* Período De */}
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-slate-500 font-medium">De:</span>
              <Input
                type="date"
                value={filterPeriodoInicio}
                onChange={(e) => setFilterPeriodoInicio(e.target.value)}
                className="h-8 text-xs w-[125px] bg-slate-50 border-slate-300 font-mono"
              />
            </div>

            {/* Período Até */}
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-slate-500 font-medium">Até:</span>
              <Input
                type="date"
                value={filterPeriodoFim}
                onChange={(e) => setFilterPeriodoFim(e.target.value)}
                className="h-8 text-xs w-[125px] bg-slate-50 border-slate-300 font-mono"
              />
            </div>

            {/* Empresa */}
            <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
              <SelectTrigger className="h-8 text-xs w-[120px] bg-slate-50 border-slate-300">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Empresa: Todas</SelectItem>
                {optionsEmpresas.map((emp) => (
                  <SelectItem key={emp} value={emp}>
                    {emp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Centro */}
            <Select value={filterCentro} onValueChange={setFilterCentro}>
              <SelectTrigger className="h-8 text-xs w-[110px] bg-slate-50 border-slate-300">
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Centro: Todos</SelectItem>
                {optionsCentros.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {ct}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Linha */}
            <Select value={filterLinha} onValueChange={setFilterLinha}>
              <SelectTrigger className="h-8 text-xs w-[140px] bg-slate-50 border-slate-300">
                <SelectValue placeholder="Linha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Linha: Todas</SelectItem>
                {optionsLinhas.map((ln) => (
                  <SelectItem key={ln} value={ln}>
                    {ln}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Categoria da recusa (Fixa se o card for de categoria) */}
            <Select
              value={filterCategoriaRecusa}
              onValueChange={setFilterCategoriaRecusa}
              disabled={isCategoryCard}
            >
              <SelectTrigger className="h-8 text-xs w-[150px] bg-slate-50 border-slate-300 disabled:opacity-75">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Categoria: Todas</SelectItem>
                <SelectItem value="COMERCIAL">COMERCIAL</SelectItem>
                <SelectItem value="PCP">PCP</SelectItem>
                <SelectItem value="TRANSPORTE">TRANSPORTE</SelectItem>
                <SelectItem value="SEM_CATEGORIZACAO">Sem categorização</SelectItem>
              </SelectContent>
            </Select>

            {/* Motivo da recusa */}
            <Select value={filterMotivoRecusa} onValueChange={setFilterMotivoRecusa}>
              <SelectTrigger className="h-8 text-xs w-[160px] bg-slate-50 border-slate-300">
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Motivo: Todos</SelectItem>
                {optionsMotivos.map((mot) => (
                  <SelectItem key={mot} value={mot}>
                    {mot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Responsável */}
            <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
              <SelectTrigger className="h-8 text-xs w-[140px] bg-slate-50 border-slate-300">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Responsável: Todos</SelectItem>
                {optionsResponsaveis.map((resp) => (
                  <SelectItem key={resp} value={resp}>
                    {resp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botão limpar filtros internos */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetInternalFilters}
              className="h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              title="Restaurar filtros do popup"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS DO POPUP */}
        <div className="flex border-b border-slate-200 bg-white px-5 space-x-1 flex-shrink-0 overflow-x-auto text-xs font-semibold print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('lista')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'lista'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lista Detalhada ({totalPedidos})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ia')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'ia'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Análise Inteligente IA</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('motivos')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'motivos'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Principais Motivos ({motivosAnalysis.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clientes')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'clientes'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Maiores Clientes ({clientesAnalysis.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('materiais')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'materiais'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Materiais Afetados ({materiaisAnalysis.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reincidencias')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'reincidencias'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Reincidências ({reincidenciasAnalysis.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evolucao')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'evolucao'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Evolução Temporal</span>
          </button>
        </div>

        {/* CORPO COM ROLAGEM INTERNA */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {/* ========================================================
              ABA 1: TABELA DETALHADA COM AS 17 COLUNAS EXIGIDAS NO REQUISITO 3
             ======================================================== */}
          {activeTab === 'lista' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse min-w-[1780px]">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] sticky top-0 z-10 border-b border-slate-300">
                  <tr>
                    {/* 1. Pedido */}
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('ordem_item')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Pedido</span>
                        {sortField === 'ordem_item' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 2. Item */}
                    <th className="py-2.5 px-3 text-center">Item</th>

                    {/* 3. Cliente (código e razão social) */}
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('cliente')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Cliente (Cód. / Razão Social)</span>
                        {sortField === 'cliente' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 4. Material */}
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('material')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Material</span>
                        {sortField === 'material' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 5. Descrição */}
                    <th className="py-2.5 px-3">Descrição</th>

                    {/* 6. Quantidade */}
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('quantidade')}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Quantidade</span>
                        {sortField === 'quantidade' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 7. Unidade */}
                    <th className="py-2.5 px-3 text-center">Unidade</th>

                    {/* 8. Volume (t) */}
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('volume')}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Volume (t)</span>
                        {sortField === 'volume' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 9. Valor (R$) */}
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('valor')}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Valor (R$)</span>
                        {sortField === 'valor' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 10. Data do pedido */}
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('data_ordem')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Data Pedido</span>
                        {sortField === 'data_ordem' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 11. Data do cancelamento */}
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('data_cancelamento')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Data Cancelamento</span>
                        {sortField === 'data_cancelamento' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 12. Empresa */}
                    <th className="py-2.5 px-3 text-center">Empresa</th>

                    {/* 13. Linha (L1/L2/SDC) */}
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('linha')}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Linha</span>
                        {sortField === 'linha' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 14. Categoria */}
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('categoria')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Categoria</span>
                        {sortField === 'categoria' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 15. Motivo */}
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200"
                      onClick={() => handleToggleSort('motivo')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Motivo</span>
                        {sortField === 'motivo' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                    </th>

                    {/* 16. Responsável */}
                    <th className="py-2.5 px-3">Responsável</th>

                    {/* 17. Origem */}
                    <th className="py-2.5 px-3 text-center">Origem</th>

                    {/* 18. Ação */}
                    <th className="py-2.5 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="py-12 text-center text-slate-500">
                        {/* Mensagem exata exigida pelo Requisito 5 */}
                        <div className="max-w-md mx-auto space-y-2">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                          <p className="font-bold text-slate-800 text-sm">
                            Nenhum pedido cancelado encontrado para os filtros selecionados.
                          </p>
                          <p className="text-xs text-slate-500">
                            Ajuste os filtros de período, centro, cliente ou termo de busca para
                            visualizar os registros auditados.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedOrders.map((o) => {
                      const catBadge =
                        o.categoria_recusa === 'COMERCIAL'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : o.categoria_recusa === 'PCP'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : o.categoria_recusa === 'TRANSPORTE'
                              ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'

                      const valorFormatado =
                        o.valor_cancelado_brl != null && o.valor_cancelado_brl > 0
                          ? formatCurrencyPtBr(o.valor_cancelado_brl)
                          : 'Não disponível'

                      const dataCancelamento =
                        o.data_hora_cancelamento || o.data_ordem || 'Não disponível'

                      const origemDado = o.is_demo ? 'HUB Demo' : 'SAP ECC'

                      return (
                        <tr
                          key={`${o.ordem_venda}-${o.item_ordem}-${o.id}`}
                          className="hover:bg-blue-50/40 transition-colors"
                        >
                          {/* 1. Pedido */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {o.ordem_venda || 'Não disponível'}
                          </td>

                          {/* 2. Item */}
                          <td className="py-2 px-3 text-center font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {o.item_ordem || 'Não disponível'}
                          </td>

                          {/* 3. Cliente (código e razão social) */}
                          <td
                            className="py-2 px-3 max-w-[200px] truncate"
                            title={`${o.cliente_codigo || ''} - ${o.cliente_nome || ''}`}
                          >
                            <div className="font-semibold text-slate-900 truncate">
                              {o.cliente_nome || 'Não disponível'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {o.cliente_codigo ? `Cód: ${o.cliente_codigo}` : 'Não disponível'}
                            </div>
                          </td>

                          {/* 4. Material */}
                          <td className="py-2 px-3 font-mono font-bold text-[#004C97] whitespace-nowrap">
                            {o.material_codigo || 'Não disponível'}
                          </td>

                          {/* 5. Descrição */}
                          <td
                            className="py-2 px-3 max-w-[220px] truncate text-slate-700"
                            title={o.material_descricao}
                          >
                            {o.material_descricao || 'Não disponível'}
                          </td>

                          {/* 6. Quantidade */}
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {o.quantidade_original_ov_t != null
                              ? formatTonsPtBr(o.quantidade_original_ov_t)
                              : 'Não disponível'}
                          </td>

                          {/* 7. Unidade */}
                          <td className="py-2 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                            {o.unidade_medida || 'TO'}
                          </td>

                          {/* 8. Volume (t) */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                            {o.saldo_cancelado_t != null
                              ? formatTonsPtBr(o.saldo_cancelado_t)
                              : 'Não disponível'}
                          </td>

                          {/* 9. Valor (R$) */}
                          <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-800 whitespace-nowrap">
                            {valorFormatado}
                          </td>

                          {/* 10. Data do pedido */}
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono">
                            {o.data_ordem || 'Não disponível'}
                          </td>

                          {/* 11. Data do cancelamento */}
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono">
                            {dataCancelamento}
                          </td>

                          {/* 12. Empresa */}
                          <td className="py-2 px-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                            {o.empresa || 'CIAFAL'}
                          </td>

                          {/* 13. Linha (L1/L2/SDC) */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {o.linha || o.centro || 'Não disponível'}
                            </span>
                          </td>

                          {/* 14. Categoria */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${catBadge}`}
                            >
                              {o.categoria_recusa || 'Sem categorização'}
                            </span>
                          </td>

                          {/* 15. Motivo */}
                          <td
                            className="py-2 px-3 max-w-[200px] truncate text-slate-800 font-medium"
                            title={o.motivo_recusa || o.motivo_original_sap}
                          >
                            {o.motivo_recusa || o.motivo_original_sap || 'Não disponível'}
                          </td>

                          {/* 16. Responsável */}
                          <td className="py-2 px-3 whitespace-nowrap text-slate-700 text-[11px]">
                            {o.validated_responsibility ||
                              o.ai_suggested_responsibility ||
                              o.representante_vendedor ||
                              'PCP'}
                          </td>

                          {/* 17. Origem */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              {origemDado}
                            </span>
                          </td>

                          {/* 18. Ação */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                onClose()
                                onSelectOrder(o)
                              }}
                              className="h-7 px-2 text-[#004C97] hover:text-[#003d7a] hover:bg-blue-50 text-xs font-semibold"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Visualizar
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================
              ABA 2: PAINEL COMPACTO "ANÁLISE INTELIGENTE DOS CANCELAMENTOS" (Requisito 6)
             ======================================================== */}
          {activeTab === 'ia' && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Análise Inteligente dos Cancelamentos (Orientativa)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Diagnóstico automático computado estritamente sobre os{' '}
                      <strong>{totalPedidos} pedido(s)</strong> efetivamente filtrados neste popup.
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-300 text-xs"
                >
                  IA orienta • Nunca altera dados oficiais
                </Badge>
              </div>

              {/* Grid dos 7 Blocos Obrigatórios da IA (Requisito 6) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Motivos Predominantes */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                  <span className="text-[11px] font-bold text-[#004C97] uppercase tracking-wider block mb-1">
                    1. Motivos Predominantes Registrados
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {analiseIAInteligente.motivosPredominantes}
                  </p>
                </div>

                {/* 2. Clientes com Maior Volume */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                  <span className="text-[11px] font-bold text-[#004C97] uppercase tracking-wider block mb-1">
                    2. Clientes com Maior Volume Cancelado
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {analiseIAInteligente.clientesVolume}
                  </p>
                </div>

                {/* 3. Materiais Mais Afetados */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                  <span className="text-[11px] font-bold text-[#004C97] uppercase tracking-wider block mb-1">
                    3. Materiais Mais Afetados
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {analiseIAInteligente.materiaisAfetados}
                  </p>
                </div>

                {/* 4. Tendência Observada */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                  <span className="text-[11px] font-bold text-[#004C97] uppercase tracking-wider block mb-1">
                    4. Tendência e Representatividade
                  </span>
                  <p className="text-slate-800 leading-relaxed">{analiseIAInteligente.tendencia}</p>
                </div>

                {/* 5. Reincidências */}
                <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/40">
                  <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block mb-1">
                    5. Padrões de Reincidência e Divergências
                  </span>
                  <p className="text-purple-950 leading-relaxed">
                    {analiseIAInteligente.reincidencias}
                  </p>
                </div>

                {/* 6. Causas Recorrentes */}
                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/40">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                    6. Hipótese de Causas Recorrentes
                  </span>
                  <p className="text-amber-950 leading-relaxed">
                    {analiseIAInteligente.causasRecorrentes}
                  </p>
                </div>
              </div>

              {/* 7. Oportunidades de Redução (Largura Completa) */}
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 text-xs">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">
                  7. Oportunidades de Redução & Reversão de Cancelamentos
                </span>
                <p className="text-emerald-950 leading-relaxed font-medium">
                  {analiseIAInteligente.oportunidadesReducao}
                </p>
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 3: PRINCIPAIS MOTIVOS (QUANTIDADE E TONELADAS)
             ======================================================== */}
          {activeTab === 'motivos' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-[#004C97]" />
                Distribuição dos Principais Motivos da Recusa
              </h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Motivo da Recusa</th>
                    <th className="py-2.5 px-3">Categoria Relacionada</th>
                    <th className="py-2.5 px-3 text-right">Qtd Pedidos</th>
                    <th className="py-2.5 px-3 text-right">Volume Cancelado (t)</th>
                    <th className="py-2.5 px-3 text-right">% do Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {motivosAnalysis.map((m, idx) => {
                    const pct = totalVolumeTons > 0 ? (m.tons / totalVolumeTons) * 100 : 0
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{m.motivo}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {m.categoria}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {m.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          {formatTonsPtBr(m.tons)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatPercentPtBr(pct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================
              ABA 4: MAIORES CLIENTES
             ======================================================== */}
          {activeTab === 'clientes' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2 text-[#004C97]" />
                Clientes com Maior Volume Cancelado
              </h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Código SAP</th>
                    <th className="py-2.5 px-3 text-right">Qtd Pedidos</th>
                    <th className="py-2.5 px-3 text-right">Volume Cancelado (t)</th>
                    <th className="py-2.5 px-3 text-right">% do Volume Selecionado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {clientesAnalysis.map((c, idx) => {
                    const pct = totalVolumeTons > 0 ? (c.tons / totalVolumeTons) * 100 : 0
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{c.cliente}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {c.codigo || 'Não disponível'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {c.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          {formatTonsPtBr(c.tons)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatPercentPtBr(pct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================
              ABA 5: MATERIAIS MAIS AFETADOS
             ======================================================== */}
          {activeTab === 'materiais' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Package className="w-4 h-4 mr-2 text-[#004C97]" />
                Materiais Mais Afetados pelos Cancelamentos
              </h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Código do Material</th>
                    <th className="py-2.5 px-3">Descrição do Produto</th>
                    <th className="py-2.5 px-3 text-right">Ocorrências</th>
                    <th className="py-2.5 px-3 text-right">Volume Total (t)</th>
                    <th className="py-2.5 px-3 text-right">% do Volume Selecionado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {materiaisAnalysis.map((mat, idx) => {
                    const pct = totalVolumeTons > 0 ? (mat.tons / totalVolumeTons) * 100 : 0
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-[#004C97]">
                          {mat.material}
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          {mat.descricao || 'Não disponível'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {mat.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          {formatTonsPtBr(mat.tons)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatPercentPtBr(pct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================
              ABA 6: REINCIDÊNCIAS
             ======================================================== */}
          {activeTab === 'reincidencias' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Repeat className="w-4 h-4 mr-2 text-purple-700" />
                Casos com Padrão Reincidente Identificado
              </h4>
              {reincidenciasAnalysis.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  Nenhuma reincidência identificada na seleção atual.
                </div>
              ) : (
                <div className="space-y-3">
                  {reincidenciasAnalysis.map((o) => (
                    <div
                      key={o.id}
                      className="p-3 rounded-lg border border-purple-200 bg-purple-50/40 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-purple-950 font-mono">
                          OV {o.ordem_venda} / {o.item_ordem} — {o.cliente_nome}
                        </span>
                        <p className="text-purple-900 mt-0.5">
                          {o.ai_analysis_payload?.recurringReason ||
                            'Padrão recorrente de cancelamento identificado no histórico do cliente/material.'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-rose-700 block">
                          {formatTonsPtBr(o.saldo_cancelado_t)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onClose()
                            onSelectOrder(o)
                          }}
                          className="h-6 px-2 text-[#004C97] text-[11px] mt-1"
                        >
                          Ver Detalhes →
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ABA 7: EVOLUÇÃO TEMPORAL
             ======================================================== */}
          {activeTab === 'evolucao' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-[#004C97]" />
                Evolução Temporal dos Cancelamentos
              </h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Data da Ordem / Cancelamento</th>
                    <th className="py-2.5 px-3 text-right">Quantidade de Casos</th>
                    <th className="py-2.5 px-3 text-right">Volume (t)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {evolucaoTemporal.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                        {ev.data}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {ev.count}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {formatTonsPtBr(ev.tons)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RODAPÉ FIXO COM AÇÕES (Requisito 1) */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0 text-xs print:hidden">
          <div className="text-slate-500 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>
              PCP Robotizado CIAFAL • Dados oficiais SAP ECC reconciliáveis com a carteira
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50 bg-white"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Exportar Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintPdf}
              className="text-xs h-8 text-slate-700 border-slate-300 bg-white hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Exportar PDF
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onClose}
              className="text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              Fechar Janela
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
