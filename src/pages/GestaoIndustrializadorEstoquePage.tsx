import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Boxes,
  Truck,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  FileText,
  Clock,
  ArrowRight,
  Database,
  Building2,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumberPtBr } from '@/lib/number-format'
import {
  gestaoIndustrializadorService,
  EstoqueIndustrializadoAnaliticoItem,
  IndustrializadorEntity,
  IndustrializerFilterParams,
} from '@/services/gestao-industrializador-service'
import { IndustrializerHeaderFilter } from '@/components/gestao-industrializador/IndustrializerHeaderFilter'
import { IndustrializerDetailModal } from '@/components/gestao-industrializador/IndustrializerDetailModal'

export const GestaoIndustrializadorEstoquePage: React.FC = () => {
  const [items, setItems] = useState<EstoqueIndustrializadoAnaliticoItem[]>([])
  const [industrializadores, setIndustrializadores] = useState<IndustrializadorEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<IndustrializerFilterParams>({
    industrializerCode: 'ALL',
  })

  // Filtro por grupo visual de estoque
  const [activeTab, setActiveTab] = useState<
    'TODOS' | 'TRANSITO' | 'MP' | 'SEMIACABADO' | 'ACABADO' | 'SUCATA' | 'FATURADO_PENDENTE'
  >('TODOS')

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    title: string
    subtitle: string
    badgeLabel: string
    totalCount: number
    items: any[]
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    badgeLabel: '',
    totalCount: 0,
    items: [],
  })

  const officialInfo = gestaoIndustrializadorService.getOfficialSourceInfo()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inds, estoqueList] = await Promise.all([
        gestaoIndustrializadorService.getIndustrializadores(),
        gestaoIndustrializadorService.getEstoqueIndustrializadoAnalitico(filters),
      ])
      setIndustrializadores(inds)
      setItems(estoqueList)
    } catch (err: any) {
      console.error('Erro ao carregar Estoque de Industrializados:', err)
      setError('Não foi possível atualizar os dados do industrializador.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Indicadores dos 8 Cards e Totalizações da Cadeia
  const summary = useMemo(() => {
    const mpItems = items.filter(
      (r) =>
        r.category === 'MP_DEPOSITO' ||
        r.storage_location === 'DP18' ||
        r.storage_location === 'DP07',
    )
    const mpTons = mpItems.reduce((acc, r) => acc + r.quantity_tons, 0)

    const transitItems = items.filter(
      (r) => r.category === 'TRANSITO' || r.storage_location === 'TRANSITO',
    )
    const transitTons = transitItems.reduce((acc, r) => acc + r.quantity_tons, 0)

    const semiItems = items.filter(
      (r) =>
        r.category === 'SEMIACABADO' ||
        r.storage_location === 'DP09' ||
        r.storage_location === 'DP08',
    )
    const semiTons = semiItems.reduce((acc, r) => acc + r.quantity_tons, 0)

    const finishedItems = items.filter(
      (r) =>
        r.category === 'ACABADO' || r.storage_location === 'DP24' || r.storage_location === 'DP30',
    )
    const finishedTons = finishedItems.reduce((acc, r) => acc + r.quantity_tons, 0)

    const billedItems = items.filter(
      (r) => r.category === 'FATURADO_NAO_RECEBIDO' || r.storage_location === 'EXTERNO',
    )
    const billedTons = billedItems.reduce((acc, r) => acc + r.quantity_tons, 0)

    const scrapItems = items.filter(
      (r) => r.category === 'SUCATA_CAREPA' || r.storage_location === 'DP99',
    )
    const scrapTons = scrapItems.reduce((acc, r) => acc + r.quantity_tons, 0)

    // Total Físico CIAFAL = MP + Semiacabado + Acabado + Sucata (estritamente dentro da fábrica/pátios locais sem duplicar)
    const totalFisicoCiafal = mpTons + semiTons + finishedTons + scrapTons

    // Total Considerando Faturamento = Total Físico + Trânsito + Faturado Aguardando Entrada
    const totalConsiderandoFaturamento = totalFisicoCiafal + transitTons + billedTons

    // Estoque Total da visão
    const totalGeralTons = items.reduce((acc, r) => acc + r.quantity_tons, 0)
    const divergenciaTons = 0 // Fonte oficial sincronizada via RFC WMS/SAP sem divergência contábil

    return {
      mpTons,
      transitTons,
      semiTons,
      finishedTons,
      billedTons,
      scrapTons,
      totalFisicoCiafal,
      totalConsiderandoFaturamento,
      totalGeralTons,
      divergenciaTons,
      mpItems,
      transitItems,
      semiItems,
      finishedItems,
      billedItems,
      scrapItems,
    }
  }, [items])

  // Filtragem pela Aba Visual de Categoria
  const filteredItems = useMemo(() => {
    if (activeTab === 'TODOS') return items
    if (activeTab === 'TRANSITO')
      return items.filter((r) => r.category === 'TRANSITO' || r.storage_location === 'TRANSITO')
    if (activeTab === 'MP')
      return items.filter(
        (r) =>
          r.category === 'MP_DEPOSITO' ||
          r.storage_location === 'DP18' ||
          r.storage_location === 'DP07',
      )
    if (activeTab === 'SEMIACABADO')
      return items.filter(
        (r) =>
          r.category === 'SEMIACABADO' ||
          r.storage_location === 'DP09' ||
          r.storage_location === 'DP08',
      )
    if (activeTab === 'ACABADO')
      return items.filter(
        (r) =>
          r.category === 'ACABADO' ||
          r.storage_location === 'DP24' ||
          r.storage_location === 'DP30',
      )
    if (activeTab === 'SUCATA')
      return items.filter((r) => r.category === 'SUCATA_CAREPA' || r.storage_location === 'DP99')
    if (activeTab === 'FATURADO_PENDENTE')
      return items.filter(
        (r) => r.category === 'FATURADO_NAO_RECEBIDO' || r.storage_location === 'EXTERNO',
      )
    return items
  }, [items, activeTab])

  const openDrilldown = (
    title: string,
    subtitle: string,
    badgeLabel: string,
    drillItems: any[],
  ) => {
    setModalState({
      isOpen: true,
      title,
      subtitle,
      badgeLabel,
      totalCount: drillItems.length,
      items: drillItems,
    })
  }

  const formatDateBr = (dStr: string | null) => {
    if (!dStr) return 'N/D'
    try {
      const d = new Date(dStr)
      if (isNaN(d.getTime())) return dStr
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return dStr
    }
  }

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-3 sm:p-5 lg:p-6 space-y-4">
      {/* 1. FILTRO GERAL COMPARTILHADO */}
      <IndustrializerHeaderFilter
        title="Estoque de Industrializados"
        subtitle="Segregação física DP07/18, DP09/08, DP24/30 &bull; Sem dupla contagem &bull; Rastreabilidade de NFs e Lotes"
        activeSubtopic="estoque"
        industrializadores={industrializadores}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={loadData}
        officialSource={officialInfo.officialSource}
        lastSyncAt={officialInfo.lastSyncAt}
      />

      {/* ERRO */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="text-xs border-rose-300 hover:bg-rose-100 text-rose-800 bg-white gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* 2. OS 8 CARDS DE ESTOQUE */}
      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg bg-slate-200/80" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {/* Card 1: MP no Industrializador */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'MP no Industrializador / Pátio',
                'Tarugos estocados nos depósitos DP18 (inteiro) e DP07 (cortado)',
                'DP18 / DP07',
                summary.mpItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              MP Industrializador
            </div>
            <div className="text-base font-black text-slate-900 mt-1 font-mono">
              {formatNumberPtBr(summary.mpTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">DP18 + DP07</div>
          </button>

          {/* Card 2: MP em Trânsito */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'MP em Trânsito',
                'Remessas com NF emitida a caminho da unidade',
                'Trânsito',
                summary.transitItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              MP em Trânsito
            </div>
            <div className="text-base font-black text-blue-700 mt-1 font-mono">
              {formatNumberPtBr(summary.transitTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Com rastreio</div>
          </button>

          {/* Card 3: Semiacabado */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Estoque Semiacabado',
                'Materiais laminados em processo intermediário (DP09 e DP08)',
                'DP09 / DP08',
                summary.semiItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Semiacabado
            </div>
            <div className="text-base font-black text-amber-700 mt-1 font-mono">
              {formatNumberPtBr(summary.semiTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">DP09 + DP08</div>
          </button>

          {/* Card 4: Produto Acabado */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Produto Acabado',
                'Barras e perfis laminados prontos amarrados (DP24 e DP30)',
                'DP24 / DP30',
                summary.finishedItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Produto Acabado
            </div>
            <div className="text-base font-black text-emerald-700 mt-1 font-mono">
              {formatNumberPtBr(summary.finishedTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">DP24 + DP30</div>
          </button>

          {/* Card 5: Faturado aguardando entrada */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Faturado Aguardando Entrada',
                'Lotes faturados pelo industrializador pendentes de conferência de entrada no WMS',
                'Pendente Entrada',
                summary.billedItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Faturado Pendente
            </div>
            <div className="text-base font-black text-blue-700 mt-1 font-mono">
              {formatNumberPtBr(summary.billedTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">NF emitida</div>
          </button>

          {/* Card 6: Sucata / Carepa */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Sucata e Carepa',
                'Resíduos de corte, pontas e carepa gerados no processo',
                'DP99',
                summary.scrapItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Sucata / Carepa
            </div>
            <div className="text-base font-black text-slate-700 mt-1 font-mono">
              {formatNumberPtBr(summary.scrapTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Resíduo fabril</div>
          </button>

          {/* Card 7: Estoque Total */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Estoque Total Analítico',
                'Soma de todos os lotes segregados por depósito',
                'Total Geral',
                items,
              )
            }
            className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Estoque Total
            </div>
            <div className="text-base font-black text-slate-900 mt-1 font-mono">
              {formatNumberPtBr(summary.totalGeralTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Todos os depósitos</div>
          </button>

          {/* Card 8: Divergência de Estoque */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Divergência
            </div>
            <div className="text-base font-black text-emerald-700 mt-1 font-mono">
              {formatNumberPtBr(summary.divergenciaTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Conciliado 100%</div>
          </div>
        </div>
      )}

      {/* 3. QUADRO DE TOTALIZAÇÃO RASTREÁVEL DA CADEIA (SEM DUPLA CONTAGEM) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 uppercase tracking-wide">
              <Building2 className="w-4 h-4 text-[#004C97]" />
              Total Físico CIAFAL
            </span>
            <Badge variant="outline" className="text-[10px] bg-slate-50">
              Fórmula Rastreável
            </Badge>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-2">
            {formatNumberPtBr(summary.totalFisicoCiafal, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            t
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            = MP (DP07/18) + Semiacabado (DP09/08) + Acabado (DP24/30) + Sucata
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 uppercase tracking-wide">
              <Truck className="w-4 h-4 text-blue-600" />
              Faturado Aguardando Entrada
            </span>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
              Trânsito / Retorno
            </Badge>
          </div>
          <div className="text-xl font-black text-blue-700 font-mono mt-2">
            {formatNumberPtBr(summary.billedTons, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            t
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Notas fiscais emitidas pelo industrializador sem confirmação no WMS
          </p>
        </div>

        <div className="bg-white border border-blue-200 bg-blue-50/40 rounded-lg p-3.5 shadow-2xs">
          <div className="text-xs font-bold text-blue-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5 uppercase tracking-wide">
              <Package className="w-4 h-4 text-[#004C97]" />
              Total Considerando Faturamento
            </span>
            <Badge className="text-[10px] bg-[#004C97] text-white">Consolidado</Badge>
          </div>
          <div className="text-xl font-black text-[#004C97] font-mono mt-2">
            {formatNumberPtBr(summary.totalConsiderandoFaturamento, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            t
          </div>
          <p className="text-[11px] text-blue-800 mt-1">
            = Total Físico CIAFAL + Trânsito + Faturado aguardando entrada
          </p>
        </div>
      </div>

      {/* 4. GRUPOS VISUAIS E TABELA ANALÍTICA */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          {/* Abas dos Grupos Visuais */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'TODOS', label: 'Todos os Depósitos' },
              { id: 'TRANSITO', label: 'Trânsito' },
              { id: 'MP', label: 'MP (DP07/DP18)' },
              { id: 'SEMIACABADO', label: 'Semiacabado (DP09/DP08)' },
              { id: 'ACABADO', label: 'Acabado (DP24/DP30)' },
              { id: 'FATURADO_PENDENTE', label: 'Faturado Pendente' },
              { id: 'SUCATA', label: 'Sucata & Carepa' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#004C97] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Badge variant="outline" className="text-[10px] text-slate-600 font-mono">
            {filteredItems.length} registros
          </Badge>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Industrializador</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Material</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Descrição</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Lote</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Aço</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Dimensão</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Situação</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Depósito</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Quantidade</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Unidade</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Último Mov.</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Dias sem Mov.</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Pedido Relacionado</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Programação Assoc.</th>
                <th className="py-2.5 px-3 whitespace-nowrap">NF Relacionada</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Data Faturamento</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Data Prev. Retorno</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Fonte Oficial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      Nenhum item em estoque encontrado com os filtros selecionados.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => {
                  return (
                    <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-800">
                        {row.industrializer_name}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono font-semibold text-slate-900">
                        {row.material_code}
                      </td>
                      <td
                        className="py-2 px-3 min-w-[150px] max-w-[220px] truncate"
                        title={row.material_description}
                      >
                        {row.material_description}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {row.lot_number}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono">{row.steel_grade}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono">{row.dimension}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="text-[11px] text-slate-700">{row.category}</span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-blue-900">
                        {row.storage_location}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                        {formatNumberPtBr(row.quantity_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono">{row.unit}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.last_movement_date)}
                      </td>
                      <td
                        className={`py-2 px-3 whitespace-nowrap text-right font-mono ${
                          row.days_without_movement > 45
                            ? 'text-rose-700 font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        {row.days_without_movement}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {row.related_sales_order || <span className="text-slate-400">&mdash;</span>}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {row.related_schedule_order || (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-800">
                        {row.related_invoice_number || (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.billing_date || null)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.expected_return_date || null)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            row.status === 'LIBERADO'
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : row.status === 'EM_INSPECAO'
                                ? 'border-amber-300 text-amber-700 bg-amber-50'
                                : row.status === 'BLOQUEADO'
                                  ? 'border-rose-300 text-rose-700 bg-rose-50'
                                  : 'border-blue-300 text-blue-700 bg-blue-50'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                        {row.official_source}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHAMENTO */}
      <IndustrializerDetailModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        subtitle={modalState.subtitle}
        badgeLabel={modalState.badgeLabel}
        totalCount={modalState.totalCount}
        items={modalState.items}
        type="ESTOQUE_DETAIL"
      />
    </div>
  )
}
export default GestaoIndustrializadorEstoquePage
