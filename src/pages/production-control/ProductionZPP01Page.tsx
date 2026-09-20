import React, { useState, useEffect } from 'react'
import {
  FileSpreadsheet,
  BarChart3,
  Sparkles,
  Download,
  Settings,
  Layers,
  RefreshCw,
  Plus,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import { ProductionIndicatorModal } from '@/components/production-control/ProductionIndicatorModal'
import { ProductionOrderDetailModal } from '@/components/production-control/ProductionOrderDetailModal'
import { pcpProductionService, type MESConnectionStatus } from '@/services/pcp-production-service'
import type { ProductionOrder, ProductionZPP01Config } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR, formatNumberPTBR } from '@/lib/formatters-ptbr'

export const ProductionZPP01Page: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [configs, setConfigs] = useState<ProductionZPP01Config[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [activeViewMode, setActiveViewMode] = useState<'tabela' | 'graficos' | 'ia'>('tabela')

  // Modais de Drill-Down
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const [drillModalOpen, setDrillModalOpen] = useState(false)
  const [drillModalTitle, setDrillModalTitle] = useState('')
  const [drillOrders, setDrillOrders] = useState<ProductionOrder[]>([])

  // Modal de Parametrização do ZPP_01 (Backend Parametrizável)
  const [paramModalOpen, setParamModalOpen] = useState(false)
  const [newGroupCode, setNewGroupCode] = useState('')
  const [newGroupLabel, setNewGroupLabel] = useState('')
  const [newColCode, setNewColCode] = useState('')
  const [newColLabel, setNewColLabel] = useState('')
  const [newCenterCode, setNewCenterCode] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, list, cfg] = await Promise.all([
        pcpProductionService.checkMESConnection(),
        pcpProductionService.listOrders(),
        pcpProductionService.listZPP01Configs(),
      ])
      setMesStatus(mes)
      setOrders(list)
      setConfigs(cfg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Agrupamento parametrizado dos blocos do ZPP_01
  const groups = Array.from(new Set(configs.map((c) => c.group_code)))

  // Cálculo da célula (Volume e Nº de Registros/Ordens)
  const getCellData = (groupCode: string, colCode: string) => {
    const config = configs.find((c) => c.group_code === groupCode && c.column_code === colCode)
    if (!config) return { tons: 0, count: 0, orders: [] }

    // Ordens correspondentes ao centro
    let matchedOrders = orders.filter((o) => o.centro_code === config.center_code)
    if (config.center_code === 'SDC_TOT' || config.center_code === 'CISAM_TOT') {
      matchedOrders = orders.filter((o) =>
        config.center_code === 'SDC_TOT'
          ? o.empresa_code.includes('SIDERCENTRO')
          : o.empresa_code.includes('CISAM'),
      )
    }

    const tons = matchedOrders.reduce((acc, o) => acc + (o.quantity_produced_tons || 0), 0)
    return {
      tons,
      count: matchedOrders.length,
      orders: matchedOrders,
    }
  }

  const handleCellClick = (groupCode: string, colCode: string, colLabel: string) => {
    const data = getCellData(groupCode, colCode)
    setDrillModalTitle(`Drill-down ZPP_01: ${groupCode} — ${colLabel}`)
    setDrillOrders(data.orders)
    setDrillModalOpen(true)
  }

  const handleAddParam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupCode || !newColCode || !newCenterCode) return

    await pcpProductionService.saveZPP01Config({
      group_code: newGroupCode.toUpperCase(),
      group_label: newGroupLabel || newGroupCode,
      column_code: newColCode.toUpperCase(),
      column_label: newColLabel || newColCode,
      center_code: newCenterCode.toUpperCase(),
      is_active: true,
      order_seq: configs.length + 1,
    })

    alert(`Configuração ${newColCode} adicionada com sucesso no backend parametrizável!`)
    setParamModalOpen(false)
    loadData()
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Relatório ZPP_01 Consolidado
            </h1>
            <Badge className="bg-blue-700 text-white font-mono text-xs">
              ESTRUTURA EXATA + EXPANSÃO ANALÍTICA
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Blocos homologados (TOTAL, ARCELOR, VALLOUREC, KS, SIDERCENTRO, CISAM). Células
            clicáveis com drill-down e parametrização dinâmica.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setParamModalOpen(true)}
            className="h-8 text-xs bg-white text-slate-700 border-slate-300"
          >
            <Settings className="w-3.5 h-3.5 mr-1" />
            Parametrizar Centros
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs bg-white text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar ZPP_01
          </Button>
        </div>
      </div>

      {/* Banner MES 4.0 */}
      <MESIntegrationBanner
        status={mesStatus}
        loading={loading}
        onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
      />

      {/* Alternância: [Tabela] [Gráficos] [IA] */}
      <div className="flex items-center justify-between bg-white border rounded-lg p-2">
        <div className="flex items-center gap-1">
          <Button
            variant={activeViewMode === 'tabela' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveViewMode('tabela')}
            className="h-8 text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Tabela ZPP_01 Oficial
          </Button>
          <Button
            variant={activeViewMode === 'graficos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveViewMode('graficos')}
            className="h-8 text-xs"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Gráficos & Distribuição
          </Button>
          <Button
            variant={activeViewMode === 'ia' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveViewMode('ia')}
            className="h-8 text-xs text-indigo-700"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Alertas & Diagnósticos IA
          </Button>
        </div>
        <span className="text-xs text-slate-500 font-mono hidden md:inline">
          Clique em qualquer célula de volume para abrir o modal de drill-down
        </span>
      </div>

      {/* Modo 1: Tabela ZPP_01 com Estrutura Exata Homologada */}
      {activeViewMode === 'tabela' && (
        <div className="space-y-4">
          {groups.map((grpCode) => {
            const grpConfigs = configs.filter((c) => c.group_code === grpCode)
            const grpLabel = grpConfigs[0]?.group_label || grpCode

            return (
              <div key={grpCode} className="bg-white border rounded-lg shadow-2xs overflow-hidden">
                <div className="bg-slate-100/90 px-4 py-2.5 border-b flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 tracking-wide uppercase">
                    Bloco: {grpLabel}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono bg-white">
                    {grpConfigs.length} Centros Parametrizados
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
                      <tr>
                        {grpConfigs.map((c) => (
                          <th
                            key={c.column_code}
                            className="py-2.5 px-3 text-center border-r last:border-0"
                          >
                            <div>{c.column_label}</div>
                            <span className="text-[10px] font-mono text-slate-400 font-normal">
                              Centro: {c.center_code}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y">
                      <tr>
                        {grpConfigs.map((c) => {
                          const cell = getCellData(grpCode, c.column_code)
                          return (
                            <td
                              key={c.column_code}
                              onClick={() =>
                                handleCellClick(grpCode, c.column_code, c.column_label)
                              }
                              className="py-3 px-3 text-center border-r last:border-0 hover:bg-blue-50/70 cursor-pointer transition-colors group"
                            >
                              <div className="font-bold font-mono text-base text-blue-900 group-hover:text-blue-700">
                                {formatQuantity(cell.tons, 't')}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                {cell.count} {cell.count === 1 ? 'registro' : 'registros / OPs'}
                              </div>
                              <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 block transition-opacity mt-1">
                                Ver Drill-down →
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modo 2: Gráficos de Produção por Centro e Pareto */}
      {activeViewMode === 'graficos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              Volume Produzido por Centro Industrial (t)
            </h3>
            <div className="space-y-2 pt-2">
              {['SEML1', 'ENDL1', 'PNCL1', 'PNCL2', 'OXIFERKS', 'PNCSDC'].map((c) => {
                const cOrders = orders.filter((o) => o.centro_code === c)
                const tons = cOrders.reduce((acc, o) => acc + (o.quantity_produced_tons || 0), 0)
                const pct = (tons / 200) * 100 // escala base
                return (
                  <div key={c} className="text-xs">
                    <div className="flex justify-between font-mono mb-1">
                      <span className="font-bold text-slate-800">{c}</span>
                      <span className="text-blue-900 font-semibold">
                        {formatQuantity(tons, 't')}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-700 h-full rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              Pareto de Causas de Desvios de Fechamento
            </h3>
            <div className="space-y-2.5 pt-2 text-xs">
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span>Erro de Integração SAP ZPPT010</span>
                  <span className="font-bold text-rose-700">45%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-600 h-full rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span>Saldo Residual Aberto na OP</span>
                  <span className="font-bold text-amber-700">30%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '30%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span>Rendimento Metálico Fora da Tolerância</span>
                  <span className="font-bold text-amber-700">15%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '15%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span>Sobreprodução não Aprovada</span>
                  <span className="font-bold text-blue-700">10%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modo 3: Alertas e Diagnósticos por IA */}
      {activeViewMode === 'ia' && (
        <div className="bg-white border rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Diagnósticos Especialistas do Relatório ZPP_01 (Agente Skip Cloud)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/40">
              <span className="font-bold text-indigo-950 block mb-1">
                Centro SEML1 (Semiacabado)
              </span>
              <p className="text-slate-700 leading-relaxed">
                [FATO] Programado 5.500,000 t; Realizado 5.312,994 t; Desvio -187,006 t; Aderência
                96,6%; OPs: 42. [AÇÃO] Priorizar liberação de tarugos na linha 1 para fechamento da
                meta semanal.
              </p>
            </div>
            <div className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/40">
              <span className="font-bold text-indigo-950 block mb-1">
                Bloco KS (Oxi-corte e Perdas)
              </span>
              <p className="text-slate-700 leading-relaxed">
                [FATO] 42,500 t processadas em OXIFERKS. Apurada taxa de refugo de 3,8% em PERDAKS.
                [HIPÓTESE] Instabilidade no gás de corte nos maçaricos 2 e 4.
              </p>
            </div>
            <div className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/40">
              <span className="font-bold text-indigo-950 block mb-1">Sidercentro (Argolas)</span>
              <p className="text-slate-700 leading-relaxed">
                [FATO] Produção aguardando fila de aquecimento de tarugo SDC. [AÇÃO] Programação PCP
                validar disponibilidade de sucata pesada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Parametrização ZPP_01 (Backend Parametrizável) */}
      <Dialog open={paramModalOpen} onOpenChange={setParamModalOpen}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Parametrizar Novo Centro no ZPP_01
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddParam} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Código do Bloco / Grupo
              </label>
              <Input
                value={newGroupCode}
                onChange={(e) => setNewGroupCode(e.target.value)}
                placeholder="Ex: ARCELOR, KS, NOVOCENTRO"
                required
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rótulo do Bloco</label>
              <Input
                value={newGroupLabel}
                onChange={(e) => setNewGroupLabel(e.target.value)}
                placeholder="Ex: NOVO GRUPO INDUSTRIAL"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Código da Coluna</label>
              <Input
                value={newColCode}
                onChange={(e) => setNewColCode(e.target.value)}
                placeholder="Ex: SEML2, CORTE3"
                required
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rótulo da Coluna</label>
              <Input
                value={newColLabel}
                onChange={(e) => setNewColLabel(e.target.value)}
                placeholder="Ex: SEML2 (Semiacabado L2)"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Código do Centro Físico
              </label>
              <Input
                value={newCenterCode}
                onChange={(e) => setNewCenterCode(e.target.value)}
                placeholder="Ex: SEML2"
                required
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setParamModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-blue-700 hover:bg-blue-800 text-white">
                Salvar Centro no Backend
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Amplo de Drill-down da Célula */}
      <ProductionIndicatorModal
        open={drillModalOpen}
        onOpenChange={setDrillModalOpen}
        title={drillModalTitle}
        subtitle="Detalhamento das OPs e apontamentos que formaram o valor desta célula do ZPP_01"
        orders={drillOrders}
        onSelectOrder={(ord) => {
          setSelectedOrder(ord)
          setDetailModalOpen(true)
        }}
      />

      {/* Modal Completo de Detalhe da OP */}
      <ProductionOrderDetailModal
        order={selectedOrder}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onOrderUpdated={loadData}
      />
    </div>
  )
}

export default ProductionZPP01Page
