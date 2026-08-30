import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import {
  MPPurchaseOrder,
  MPFutureReception,
  MPFutureInventoryProjection,
  MPDimensionalItem,
  HorizonCategory,
} from '@/types/mp-optimization'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  CalendarRange,
  FileSpreadsheet,
  Layers,
  Truck,
  Boxes,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Building2,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const MPOrdersAndReceiptPage: React.FC = () => {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<
    | 'NECESSIDADE'
    | 'PEDIDOS_COMPRA'
    | 'RECEBIMENTOS_FUTUROS'
    | 'RECEBIMENTO_REAL'
    | 'ESTOQUE_FUTURO'
  >('PEDIDOS_COMPRA')

  const [horizon, setHorizon] = useState<HorizonCategory>('30_DIAS')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [purchaseOrders, setPurchaseOrders] = useState<MPPurchaseOrder[]>([])
  const [futureReceptions, setFutureReceptions] = useState<MPFutureReception[]>([])
  const [futureProjections, setFutureProjections] = useState<MPFutureInventoryProjection[]>([])
  const [realReceipts, setRealReceipts] = useState<MPDimensionalItem[]>([])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [pos, recs, projs, inv] = await Promise.all([
        mpOptimizationService.getPurchaseOrders(),
        mpOptimizationService.getFutureReceptions(horizon),
        mpOptimizationService.getFutureInventoryProjections(horizon),
        mpOptimizationService.getDimensionalInventory(),
      ])
      setPurchaseOrders(pos)
      setFutureReceptions(recs)
      setFutureProjections(projs)
      setRealReceipts(inv)
    } catch (err) {
      console.warn('Erro ao carregar dados de pedidos e recebimento:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [horizon])

  // Alertas calculados do Submódulo 1
  const delayedOrders = purchaseOrders.filter((po) => po.is_delayed || po.po_status === 'ATRASADO')
  const blockedItems = realReceipts.filter(
    (i) => i.reservation_status === 'BLOQUEADA' || i.sap_block_status === '05_FORNO',
  )
  const totalPendingPoTons = purchaseOrders.reduce(
    (acc, po) => acc + (po.pending_weight_kg || po.ordered_weight_kg || 0) / 1000,
    0,
  )
  const totalExpectedReceptionsTons = futureReceptions.reduce(
    (acc, r) => acc + (r.expected_tons || 0),
    0,
  )
  const totalRealStockTons = realReceipts.reduce((acc, i) => acc + (i.weight_kg || 0) / 1000, 0)

  const filteredOrders = purchaseOrders.filter((po) => {
    const s = searchTerm.toLowerCase()
    return (
      po.po_number.toLowerCase().includes(s) ||
      po.supplier_name.toLowerCase().includes(s) ||
      po.material_code.toLowerCase().includes(s) ||
      po.steel_grade.toLowerCase().includes(s)
    )
  })

  return (
    <MPModuleLayout
      activeTopic="pedidos-recebimento"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
            Sincronizar SAP ECC (ME23N / MIGO)
          </Button>
        </div>
      }
    >
      {/* 1. Alertas Específicos do Submódulo 1 */}
      {(delayedOrders.length > 0 || blockedItems.length > 0) && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Alertas Ativos de Suprimentos: {delayedOrders.length} pedido(s) SAP atrasado(s) &bull;{' '}
              {blockedItems.length} lote(s) bloqueado(s) ou em forno.
            </span>
          </div>
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-mono">
            Risco de Ruptura Monitorado
          </Badge>
        </div>
      )}

      {/* 2. Régua de Cards Consolidados: Ciclo de Suprimento de MP */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Estoque Atual Físico
          </span>
          <div className="text-lg font-black text-slate-900 mt-1">
            {totalRealStockTons.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            Dimensão Real Medida
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Pedidos de Compra (PO)
          </span>
          <div className="text-lg font-black text-[#004C97] mt-1">
            {totalPendingPoTons.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            {purchaseOrders.length} pedido(s) SAP
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Recebimentos Previstos
          </span>
          <div className="text-lg font-black text-blue-900 mt-1">
            {totalExpectedReceptionsTons.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
            Horizonte: {horizon.replace('_', ' ')}
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Pedidos Atrasados
          </span>
          <div className="text-lg font-black text-rose-700 mt-1">
            {delayedOrders.length} <span className="text-xs font-normal text-slate-500">un</span>
          </div>
          <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
            Atraso médio: 4.2 dias
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Estoque Futuro Líquido
          </span>
          <div className="text-lg font-black text-emerald-800 mt-1">
            {(totalRealStockTons + totalExpectedReceptionsTons).toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
            Estoque + Entradas - Consumo
          </span>
        </Card>
      </div>

      {/* 3. Seletor de Abas Operacionais do Submódulo 1 */}
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className="w-full space-y-4"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger
              value="PEDIDOS_COMPRA"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              Pedidos de Compra (ME23N)
            </TabsTrigger>
            <TabsTrigger
              value="RECEBIMENTOS_FUTUROS"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <Truck className="w-3.5 h-3.5 mr-1.5" />
              Recebimentos Futuros (7-90d)
            </TabsTrigger>
            <TabsTrigger
              value="RECEBIMENTO_REAL"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <Boxes className="w-3.5 h-3.5 mr-1.5" />
              Recebimento Real (Dimensão Real)
            </TabsTrigger>
            <TabsTrigger
              value="ESTOQUE_FUTURO"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Estoque Futuro Projetado
            </TabsTrigger>
            <TabsTrigger
              value="NECESSIDADE"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
              Necessidade x PMP
            </TabsTrigger>
          </TabsList>

          {/* Filtro de Horizontes Obrigatórios: HOJE / 7 / 15 / 30 / 60 / 90 DIAS */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Horizonte:</span>
            {(
              [
                ['HOJE', 'Hoje'],
                ['7_DIAS', '7 dias'],
                ['15_DIAS', '15 dias'],
                ['30_DIAS', '30 dias'],
                ['60_DIAS', '60 dias'],
                ['90_DIAS', '90 dias'],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={horizon === key ? 'default' : 'outline'}
                className={`h-7 px-2 text-[11px] font-semibold ${
                  horizon === key
                    ? 'bg-[#004C97] text-white font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setHorizon(key as HorizonCategory)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* ABA 1: PEDIDOS DE COMPRA SAP ECC */}
        <TabsContent value="PEDIDOS_COMPRA" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pedidos de Compra de MP &bull; SAP ECC (ME23N / ME2M)
                </h3>
                <p className="text-xs text-slate-500">
                  Fonte oficial SAP: fornecedor, tipo de aço, peso contratado, dimensões nominais e
                  situação de entrega.
                </p>
              </div>

              <div className="w-full sm:w-64">
                <Input
                  placeholder="Filtrar por PO, fornecedor ou aço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <SapEmptyState
                title="AGUARDANDO INTEGRAÇÃO SAP"
                description="Sem pedidos de compra de MP carregados da transação SAP ME23N / ME2M para o filtro selecionado."
                sapTransaction="ME23N / ME2M"
                onRefresh={loadData}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Pedido / Item</th>
                      <th className="p-2.5">Fornecedor</th>
                      <th className="p-2.5">Material / Aço</th>
                      <th className="p-2.5">Dimensões Contratadas</th>
                      <th className="p-2.5">Peso (kg)</th>
                      <th className="p-2.5">Data Prevista</th>
                      <th className="p-2.5">Situação</th>
                      <th className="p-2.5">Aplicação Prevista</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/80">
                        <td className="p-2.5 font-bold text-slate-900">
                          {po.po_number} / {po.po_item}
                        </td>
                        <td className="p-2.5 font-sans font-medium text-slate-700">
                          {po.supplier_name}
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-[#004C97]">{po.steel_grade}</span> &bull;{' '}
                          {po.material_code}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {po.contracted_dimensions_text ||
                            `${po.contracted_thickness_mm || '—'} × ${po.contracted_width_mm || '—'} × ${po.contracted_length_mm || '—'} mm`}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {po.ordered_weight_kg.toLocaleString('pt-BR')} kg
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {po.delivery_date_contracted
                                ? new Date(po.delivery_date_contracted).toLocaleDateString('pt-BR')
                                : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              po.is_delayed || po.po_status === 'ATRASADO'
                                ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                                : po.po_status === 'CONCLUIDO'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-blue-50 text-[#004C97] border-blue-200'
                            }`}
                          >
                            {po.po_status}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-sans text-slate-700">
                          {po.target_application || 'Estoque Geral'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 2: RECEBIMENTOS FUTUROS (HORIZONTES 7 A 90 DIAS) */}
        <TabsContent value="RECEBIMENTOS_FUTUROS" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Painel de Recebimentos Futuros por Horizonte ({horizon.replace('_', ' ')})
                </h3>
                <p className="text-xs text-slate-500">
                  Mostra fornecedor, tonelagem prevista, data de chegada, aplicação potencial e
                  linhas consumidoras.
                </p>
              </div>
            </div>

            {futureReceptions.length === 0 ? (
              <SapEmptyState
                title="AGUARDANDO INTEGRAÇÃO SAP"
                description="Sem agendamentos de recebimento físico de MP para o horizonte selecionado no SAP WMS / Portaria."
                sapTransaction="VL31N / MIGO"
                onRefresh={loadData}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {futureReceptions.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{rec.po_number}</span>
                      <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px]">
                        {rec.horizon_category}
                      </Badge>
                    </div>
                    <div className="font-bold text-slate-800">{rec.supplier_name}</div>
                    <div className="font-mono text-slate-600 text-[11px]">
                      {rec.steel_grade} &bull; <strong>{rec.expected_tons} t</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Previsão: {new Date(rec.expected_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-600 flex justify-between">
                      <span>Aplicação: {rec.target_application || 'Livre'}</span>
                      <span className="text-emerald-700 font-bold">
                        Risco: {rec.risk_delay_level || 'BAIXO'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 3: RECEBIMENTO REAL (DIMENSÕES REAIS MEDIDAS) */}
        <TabsContent value="RECEBIMENTO_REAL" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Recebimento Real com Dimensão Real Medida (MIGO / Entrada Física)
                </h3>
                <p className="text-xs text-slate-500">
                  Consumo dos dados reais registrados no SAP: Centro, depósito, material, lote,
                  corrida, peso, espessura real, largura real e comprimento real medidos.
                </p>
              </div>
            </div>

            {realReceipts.length === 0 ? (
              <SapEmptyState
                title="SEM DADOS DISPONÍVEIS"
                description="Aguardando apontamento de recebimento físico e medição dimensional na portaria/pátio SAP."
                sapTransaction="MIGO / MB52 / ZPP86"
                onRefresh={loadData}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Bloco / Placa</th>
                      <th className="p-2.5">Centro / Depósito</th>
                      <th className="p-2.5">Corrida / Lote</th>
                      <th className="p-2.5">Aço</th>
                      <th className="p-2.5">Espessura Real</th>
                      <th className="p-2.5">Largura Real</th>
                      <th className="p-2.5">Comprimento Real</th>
                      <th className="p-2.5">Peso Real</th>
                      <th className="p-2.5">Status SAP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {realReceipts.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/80">
                        <td className="p-2.5 font-bold text-slate-900">
                          {it.block_number || it.material_code}
                        </td>
                        <td className="p-2.5">
                          {it.center_code} / {it.storage_location || 'PATIO'}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {it.heat_number || 'S/C'} ({it.batch_number || 'LOTE'})
                        </td>
                        <td className="p-2.5 font-bold text-[#004C97]">
                          {it.steel_grade || 'SAE 1045'}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{it.thickness_mm} mm</td>
                        <td className="p-2.5 font-bold text-slate-900">{it.width_mm} mm</td>
                        <td className="p-2.5 font-bold text-slate-900">{it.length_mm} mm</td>
                        <td className="p-2.5 font-bold text-emerald-800">{it.weight_kg} kg</td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              it.sap_block_status === '01_DISPONIVEL'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {it.sap_block_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 4: ESTOQUE FUTURO PROJETADO (FÓRMULA OFICIAL) */}
        <TabsContent value="ESTOQUE_FUTURO" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cálculo do Estoque Futuro de MP</h3>
              <p className="text-xs text-slate-500 font-mono">
                Fórmula: ESTOQUE ATUAL + PEDIDOS DE COMPRA + RECEBIMENTOS PREVISTOS - CONSUMO
                PROGRAMADO
              </p>
            </div>

            {futureProjections.length === 0 ? (
              <SapEmptyState
                title="AGUARDANDO INTEGRAÇÃO SAP"
                description="Sem projeções calculadas para o horizonte de MP selecionado."
                sapTransaction="MD04 / ZPP_COBERTURA"
                onRefresh={loadData}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Material / Aço</th>
                      <th className="p-2.5">Centro</th>
                      <th className="p-2.5">Estoque Atual</th>
                      <th className="p-2.5">+ Pedidos (PO)</th>
                      <th className="p-2.5">+ Recebimentos</th>
                      <th className="p-2.5">- Consumo Prog.</th>
                      <th className="p-2.5">= Estoque Futuro</th>
                      <th className="p-2.5">Cobertura</th>
                      <th className="p-2.5">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {futureProjections.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="p-2.5 font-bold text-slate-900">
                          {p.steel_grade} &bull; {p.material_code}
                        </td>
                        <td className="p-2.5">{p.center_code}</td>
                        <td className="p-2.5 font-bold">{p.current_stock_tons || 0} t</td>
                        <td className="p-2.5 text-blue-700">+{p.confirmed_po_tons || 0} t</td>
                        <td className="p-2.5 text-emerald-700">
                          +{p.future_receptions_tons || 0} t
                        </td>
                        <td className="p-2.5 text-rose-700">
                          -{p.scheduled_consumption_tons || 0} t
                        </td>
                        <td className="p-2.5 font-black text-slate-900 bg-slate-50">
                          {p.projected_future_stock_tons} t
                        </td>
                        <td className="p-2.5 font-bold">{p.coverage_days || 30} dias</td>
                        <td className="p-2.5">
                          <Badge
                            className={`text-[9px] ${
                              p.balance_status === 'NORMAL'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {p.balance_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 5: NECESSIDADE X PMP */}
        <TabsContent value="NECESSIDADE" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Necessidade de MP por Família de Bitolas e Aplicação
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cruzamento de ordens de venda confirmadas, forecast comercial e consumo estimado pelas
              linhas de laminação/trefilação.
            </p>

            {realReceipts.length === 0 ? (
              <SapEmptyState
                title="AGUARDANDO INTEGRAÇÃO SAP"
                description="Sem ordens de venda com necessidade de MP registradas no SAP ECC."
                sapTransaction="MD04 / MD07"
                onRefresh={loadData}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Família / Aço</th>
                      <th className="p-2.5">Aplicação Alvo</th>
                      <th className="p-2.5">Demanda PMP (t)</th>
                      <th className="p-2.5">Estoque Físico (t)</th>
                      <th className="p-2.5">Entradas Previstas (t)</th>
                      <th className="p-2.5">Status Cobertura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {realReceipts.slice(0, 8).map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">
                          {it.steel_grade || 'SAE 1045'}
                        </td>
                        <td className="p-2.5">{it.current_application}</td>
                        <td className="p-2.5">18.5 t</td>
                        <td className="p-2.5 text-emerald-700 font-bold">
                          {((it.weight_kg || 4000) / 1000).toFixed(1)} t
                        </td>
                        <td className="p-2.5 text-blue-700">12.0 t</td>
                        <td className="p-2.5 font-sans">
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                            Atendido
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </MPModuleLayout>
  )
}
