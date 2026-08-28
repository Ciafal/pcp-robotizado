import React, { useState } from 'react'
import {
  Briefcase,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  Package,
  Layers,
} from 'lucide-react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export const BacklogModuleView: React.FC = () => {
  const { commercialBacklog, wmsInventory, filters } = useControlTower()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<
    'ALL' | 'VENCIDA' | 'SEM_COBERTURA' | 'EM_RISCO' | 'ALTA_RENTABILIDADE'
  >('ALL')

  // Modal IA Oportunidade PCP -> CRM
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false)

  // Filtragem da Carteira
  const filteredBacklog = commercialBacklog.filter((item) => {
    if (filters.plantCode !== 'ALL' && item.targetLineCode === 'L2' && filters.plantCode === 'DIV')
      return false
    if (filters.lineCode !== 'ALL' && item.targetLineCode !== filters.lineCode) return false

    if (filterType === 'VENCIDA' && item.status !== 'VENCIDO') return false
    if (filterType === 'SEM_COBERTURA' && item.stockCoverageStatus !== 'SEM_COBERTURA') return false
    if (filterType === 'EM_RISCO' && item.stockCoverageStatus !== 'EM_RISCO') return false
    if (filterType === 'ALTA_RENTABILIDADE' && item.rentabilityLevel !== 'ALTA') return false

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        item.salesOrderId.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.productCode.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Totais agregados
  const totalTons = filteredBacklog.reduce((acc, i) => acc + i.quantityTons, 0)
  const totalOrders = filteredBacklog.length
  const criticalStockCount = wmsInventory.filter((w) => w.isCritical).length

  return (
    <div className="space-y-6">
      {/* Header do Módulo Carteira & Integração CRM ↔ PCP ↔ WMS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Carteira de Pedidos & Cobertura Produtiva
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-950/20 font-mono"
              >
                CRM ↔ PCP ↔ WMS Integrados
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Visibilidade comercial, rentabilidade por pedido, disponibilidade de estoque físico e
              checagem de capacidade fabril.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsOpportunityModalOpen(true)}
            className="gap-2 bg-gradient-to-r from-[#004C97] to-sky-700 hover:from-[#003d7a] hover:to-sky-800 text-white text-xs font-semibold shadow"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            Oportunidades Comerciais (PCP &rarr; CRM)
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-900 border-slate-800 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            Volume em Carteira
          </span>
          <div className="text-2xl font-black text-white font-mono">
            {totalTons.toLocaleString('pt-BR')} t
          </div>
          <span className="text-[11px] text-slate-400">{totalOrders} ordens de venda</span>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            Margem Média da Carteira
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">22.8%</div>
          <span className="text-[11px] text-emerald-300/80">Alta Rentabilidade Predominante</span>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            Itens com Saldo Negativo (WMS)
          </span>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {criticalStockCount} itens
          </div>
          <span className="text-[11px] text-rose-300/80">Risco iminente de ruptura</span>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            Dias Negativos Projetados
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono">4 dias</div>
          <span className="text-[11px] text-amber-300/80">Horizonte 30 dias na Linha 2</span>
        </Card>
      </div>

      {/* Painel de Integração WMS: Dias Negativos e Alerta de Ruptura */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-400" />
              <CardTitle className="text-sm font-bold text-white">
                Projeção de Estoque WMS & Monitoramento de Dias Negativos
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-slate-700 text-slate-400"
            >
              Atualização WMS em Tempo Real
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {wmsInventory.map((inv) => (
              <div
                key={inv.itemCode}
                className={cn(
                  'p-3 rounded-lg border space-y-2',
                  inv.isCritical
                    ? 'bg-rose-950/20 border-rose-900/60'
                    : 'bg-slate-950 border-slate-800',
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-sky-400 font-semibold">
                      {inv.itemCode}
                    </span>
                    <h5 className="text-xs font-bold text-white leading-tight">
                      {inv.description}
                    </h5>
                  </div>
                  {inv.isCritical ? (
                    <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px]">
                      RUPTURA PROJETADA
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                      COBERTO
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-slate-900/80 p-2 rounded border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Físico</span>
                    <span className="text-slate-200">{inv.physicalStockTons} t</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Disponível</span>
                    <span className="text-slate-200">{inv.availableStockTons} t</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Dias Negativos</span>
                    <span
                      className={cn(
                        'font-bold',
                        inv.projectedDaysWithNegativeStock > 0
                          ? 'text-rose-400'
                          : 'text-emerald-400',
                      )}
                    >
                      {inv.projectedDaysWithNegativeStock} dias
                    </span>
                  </div>
                </div>

                {inv.ruptureImpact && (
                  <div className="bg-rose-950/40 p-2 rounded border border-rose-900/50 text-[11px] text-rose-200 space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Impacto da Ruptura (IA WMS):</span>
                    </div>
                    <p className="text-[10px] text-rose-300 leading-tight">
                      Primeira ruptura em <strong>{inv.firstRuptureDate}</strong> afetará{' '}
                      <strong>{inv.ruptureImpact.affectedOrdersCount} OPs</strong> (
                      {inv.ruptureImpact.affectedTons} t) na Linha {inv.ruptureImpact.lineCode}.
                      Pedido prioritário afetado: {inv.ruptureImpact.firstAffectedOrder}.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela / Lista de Pedidos em Carteira */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Buscar por cliente, OV ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ALL', 'ALTA_RENTABILIDADE', 'SEM_COBERTURA', 'EM_RISCO'] as const).map((ft) => (
                <Button
                  key={ft}
                  size="sm"
                  variant="ghost"
                  onClick={() => setFilterType(ft)}
                  className={cn(
                    'text-[10px] h-7 px-2.5 border',
                    filterType === ft
                      ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                      : 'border-transparent text-slate-400 hover:text-white',
                  )}
                >
                  {ft === 'ALL' && 'Todos'}
                  {ft === 'ALTA_RENTABILIDADE' && 'Alta Rentabilidade'}
                  {ft === 'SEM_COBERTURA' && 'Sem Cobertura'}
                  {ft === 'EM_RISCO' && 'Em Risco'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          <div className="space-y-3">
            {filteredBacklog.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-sky-950 text-sky-300 border-sky-800 text-[10px] font-mono">
                      {item.salesOrderId} / {item.salesOrderItem}
                    </Badge>
                    <span className="text-xs font-bold text-white">{item.customerName}</span>
                    {item.customerPriority === 'ESTRATEGICO' && (
                      <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[9px]">
                        CLIENTE ESTRATÉGICO
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono',
                        item.stockCoverageStatus === 'COBERTO_WMS'
                          ? 'border-emerald-600/50 text-emerald-400'
                          : item.stockCoverageStatus === 'EM_RISCO'
                            ? 'border-rose-600/50 text-rose-400'
                            : 'border-amber-600/50 text-amber-400',
                      )}
                    >
                      WMS: {item.stockCoverageStatus}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono',
                        item.capacityCoverageStatus === 'DISPONIVEL'
                          ? 'border-sky-600/50 text-sky-400'
                          : 'border-rose-600/50 text-rose-400',
                      )}
                    >
                      Capacidade: {item.capacityCoverageStatus}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Produto</span>
                    <span className="text-slate-200">{item.productName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Quantidade</span>
                    <span className="text-slate-200 font-semibold">{item.quantityTons} t</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Rentabilidade / Margem</span>
                    <span className="text-emerald-400 font-bold">
                      {item.commercialMarginPct}% ({item.rentabilityLevel})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">
                      Promessa Cliente x Projeção
                    </span>
                    <span className="text-slate-300">
                      {item.promisedDeliveryDate} &rarr; {item.projectedDeliveryDate}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal PCP -> CRM: Oportunidades Produtivas */}
      <Dialog open={isOpportunityModalOpen} onOpenChange={setIsOpportunityModalOpen}>
        <DialogContent className="max-w-xl bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                Feedback Inteligente PCP &rarr; CRM &bull; Capacidade Comercial Disponível
              </span>
            </div>
            <DialogTitle className="text-base font-bold text-white">
              Oportunidades de Venda Identificadas no Sequenciamento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              O PCP analisa campanhas programadas e detecta janelas de capacidade ociosa em produtos
              de alta rentabilidade para informar a equipe comercial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="bg-sky-950/30 border border-sky-900/60 p-3 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sky-300 font-mono">
                  Campanha Tubos SAE 1020 (Semana 38)
                </span>
                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                  Margem Histórica: 24.5%
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-2 rounded border border-slate-800 text-center font-mono text-[11px]">
                <div>
                  <div className="text-[9px] text-slate-500">Capacidade Livre</div>
                  <div className="text-sky-400 font-bold">420 t</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">Carteira Atual</div>
                  <div className="text-slate-300">180 t</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">Janela Comercial</div>
                  <div className="text-emerald-400 font-bold">240 t</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-300">
                <strong>Insight PCP para Comercial:</strong> Existe espaço no setup da Linha 1 para
                absorver até 240 toneladas adicionais de Tubo Quadrado 50x50 sem necessidade de
                setup extra.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpportunityModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300 text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
