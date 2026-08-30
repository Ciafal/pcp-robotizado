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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004C97]/10 border border-[#004C97]/30 flex items-center justify-center text-[#004C97]">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Carteira de Pedidos & Cobertura Produtiva
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50 font-mono font-bold"
              >
                CRM ↔ PCP ↔ WMS Integrados
              </Badge>
            </div>
            <p className="text-xs text-slate-600">
              Visibilidade comercial, rentabilidade por pedido, disponibilidade de estoque físico e
              checagem de capacidade fabril.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsOpportunityModalOpen(true)}
            className="gap-2 bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Oportunidades Comerciais (PCP &rarr; CRM)
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 p-3.5 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">
            Volume em Carteira
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalTons.toLocaleString('pt-BR')} t
          </div>
          <span className="text-[11px] text-slate-500">{totalOrders} ordens de venda</span>
        </Card>

        <Card className="bg-white border-slate-200 p-3.5 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">
            Margem Média da Carteira
          </span>
          <div className="text-2xl font-black text-emerald-700 font-mono">22,8 %</div>
          <span className="text-[11px] text-emerald-700 font-medium">
            Alta Rentabilidade Predominante
          </span>
        </Card>

        <Card className="bg-white border-slate-200 p-3.5 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">
            Itens com Saldo Negativo (WMS)
          </span>
          <div className="text-2xl font-black text-rose-700 font-mono">
            {criticalStockCount} itens
          </div>
          <span className="text-[11px] text-rose-700 font-medium">Risco iminente de ruptura</span>
        </Card>

        <Card className="bg-white border-slate-200 p-3.5 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">
            Dias Negativos Projetados
          </span>
          <div className="text-2xl font-black text-amber-700 font-mono">4 dias</div>
          <span className="text-[11px] text-amber-700 font-medium">
            Horizonte 30 dias na Linha 2
          </span>
        </Card>
      </div>

      {/* Painel de Integração WMS: Dias Negativos e Alerta de Ruptura */}
      <Card className="bg-white border-slate-200 shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#004C97]" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Projeção de Estoque WMS & Monitoramento de Dias Negativos
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-slate-200 text-slate-600 bg-slate-50"
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
                  'p-3.5 rounded-lg border space-y-2',
                  inv.isCritical ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200',
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-[#004C97] font-bold">
                      {inv.itemCode}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 leading-tight">
                      {inv.description}
                    </h5>
                  </div>
                  {inv.isCritical ? (
                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                      RUPTURA PROJETADA
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                      COBERTO
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-white p-2.5 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Físico</span>
                    <span className="text-slate-800 font-semibold">{inv.physicalStockTons} t</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Disponível</span>
                    <span className="text-slate-800 font-semibold">{inv.availableStockTons} t</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Dias Negativos</span>
                    <span
                      className={cn(
                        'font-bold',
                        inv.projectedDaysWithNegativeStock > 0
                          ? 'text-rose-700'
                          : 'text-emerald-700',
                      )}
                    >
                      {inv.projectedDaysWithNegativeStock} dias
                    </span>
                  </div>
                </div>

                {inv.ruptureImpact && (
                  <div className="bg-rose-50 p-2.5 rounded border border-rose-200 text-[11px] text-rose-900 space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                      <span>Impacto da Ruptura (IA WMS):</span>
                    </div>
                    <p className="text-[10px] text-rose-800 leading-tight">
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
      <Card className="bg-white border-slate-200 shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, OV ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
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
                      ? 'bg-slate-100 border-slate-300 text-slate-900 font-bold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50',
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
                className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono font-bold">
                      {item.salesOrderId} / {item.salesOrderItem}
                    </Badge>
                    <span className="text-xs font-bold text-slate-900">{item.customerName}</span>
                    {item.customerPriority === 'ESTRATEGICO' && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold">
                        CLIENTE ESTRATÉGICO
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono font-semibold',
                        item.stockCoverageStatus === 'COBERTO_WMS'
                          ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                          : item.stockCoverageStatus === 'EM_RISCO'
                            ? 'border-rose-300 text-rose-800 bg-rose-50'
                            : 'border-amber-300 text-amber-800 bg-amber-50',
                      )}
                    >
                      WMS: {item.stockCoverageStatus}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono font-semibold',
                        item.capacityCoverageStatus === 'DISPONIVEL'
                          ? 'border-blue-300 text-[#004C97] bg-blue-50'
                          : 'border-rose-300 text-rose-800 bg-rose-50',
                      )}
                    >
                      Capacidade: {item.capacityCoverageStatus}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-white p-2.5 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Produto</span>
                    <span className="text-slate-800 font-semibold">{item.productName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Quantidade</span>
                    <span className="text-slate-900 font-bold">{item.quantityTons} t</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Rentabilidade / Margem</span>
                    <span className="text-emerald-700 font-bold">
                      {item.commercialMarginPct} % ({item.rentabilityLevel})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">
                      Promessa Cliente x Projeção
                    </span>
                    <span className="text-slate-700">
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
        <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#004C97] font-bold text-xs">
              <Sparkles className="w-4 h-4 text-[#004C97]" />
              <span>
                Feedback Inteligente PCP &rarr; CRM &bull; Capacidade Comercial Disponível
              </span>
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Oportunidades de Venda Identificadas no Sequenciamento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              O PCP analisa campanhas programadas e detecta janelas de capacidade ociosa em produtos
              de alta rentabilidade para informar a equipe comercial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#004C97] font-mono">
                  Campanha Tubos SAE 1020 (Semana 38)
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                  Margem Histórica: 24,5 %
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded border border-slate-200 text-center font-mono text-[11px]">
                <div>
                  <div className="text-[9px] text-slate-500">Capacidade Livre</div>
                  <div className="text-[#004C97] font-bold">420 t</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">Carteira Atual</div>
                  <div className="text-slate-800">180 t</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">Janela Comercial</div>
                  <div className="text-emerald-700 font-bold">240 t</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-700">
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
              className="border-slate-300 bg-white text-slate-700 text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
