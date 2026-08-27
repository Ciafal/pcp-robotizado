import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Can } from '@/components/auth/Can'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import {
  Layers,
  Plus,
  Zap,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Play,
  Send,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useSearchParams } from 'react-router-dom'

interface MockScheduleOrder {
  id: string
  orderNumber: string
  lineCode: string
  material: string
  quantityTons: number
  deliveryDate: string
  status: 'DRAFT' | 'SIMULATED' | 'PHASE1_APPROVED' | 'PUBLISHED' | 'REJECTED'
  rulePack: string
  oeeEstimated: number
}

const mockOrders: MockScheduleOrder[] = [
  {
    id: 'ord-1',
    orderNumber: 'OP-2025-0891',
    lineCode: 'L1',
    material: 'Tubo Industrial 50x50x2.00 - Aço SAE 1020',
    quantityTons: 120,
    deliveryDate: '2025-09-02',
    status: 'SIMULATED',
    rulePack: 'Regra Padrão Aço Carbono v1.2',
    oeeEstimated: 94,
  },
  {
    id: 'ord-2',
    orderNumber: 'OP-2025-0892',
    lineCode: 'ENF_L1',
    material: 'Tarugo Laminado 4 pol - Curva Térmica Controlada',
    quantityTons: 85,
    deliveryDate: '2025-09-03',
    status: 'DRAFT',
    rulePack: 'Enfornamento e Aquecimento Contínuo',
    oeeEstimated: 91,
  },
  {
    id: 'ord-3',
    orderNumber: 'OP-2025-0893',
    lineCode: 'L2',
    material: 'Perfil Estrutural Retangular 80x40x3.00',
    quantityTons: 210,
    deliveryDate: '2025-09-05',
    status: 'PHASE1_APPROVED',
    rulePack: 'Otimização de Setup de Matrizes L2',
    oeeEstimated: 88,
  },
]

export default function SchedulesPage() {
  const { user, hasLineScope, can } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const lineFilterParam = searchParams.get('line')

  const [orders, setOrders] = useState<MockScheduleOrder[]>(mockOrders)
  const [simulating, setSimulating] = useState<string | null>(null)

  const handleSimulate = (orderId: string) => {
    setSimulating(orderId)
    setTimeout(() => {
      setSimulating(null)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'SIMULATED', oeeEstimated: 96 } : o)),
      )
      toast({
        title: 'Simulação Concluída',
        description: 'Sequenciamento otimizado pelo motor de regras CIAFAL.',
      })
    }, 1200)
  }

  const handleApprovePhase1 = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'PHASE1_APPROVED' } : o)),
    )
    toast({
      title: 'Aprovação Fase 1 (PCP) Concedida',
      description: 'Programação liberada tecnicamente para homologação do Gestor de Linha.',
    })
  }

  const handleApprovePhase2 = (orderId: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'PUBLISHED' } : o)))
    toast({
      title: 'Aprovação Fase 2 (Gestor de Linha)',
      description: 'Programação homologada e publicada para chão de fábrica.',
    })
  }

  const handleReject = (orderId: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'REJECTED' } : o)))
    toast({
      variant: 'destructive',
      title: 'Programação Rejeitada',
      description: 'Plano devolvido para resequenciamento com registro em auditoria.',
    })
  }

  const filteredOrders = orders.filter((o) => {
    // 1. Escopo de acesso da linha
    if (!hasLineScope(o.lineCode, o.lineCode)) {
      return false
    }
    // 2. Parâmetro de busca
    if (lineFilterParam && o.lineCode !== lineFilterParam) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              Programação e Sequenciamento de Linhas
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Orquestração de ordens de produção, simulação com Rule Packs e esteira de aprovação em
            duas fases (PCP + Gestor).
          </p>
        </div>

        <Can
          permission="pcp.schedule.create"
          mode="disable"
          explainMessage="Seu perfil não possui autorização para criar novas programações."
        >
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs gap-1.5 h-8"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Ordem / Sequenciamento
          </Button>
        </Can>
      </div>

      {/* Lista de Programações com Autorização Granular */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            Nenhuma programação disponível para as linhas do seu escopo de autorização ativo.
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const hasScopeForThisLine = hasLineScope(ord.lineCode, ord.lineCode)

            return (
              <Card
                key={ord.id}
                className="bg-slate-950 border-slate-800 text-slate-100 hover:border-slate-700 transition-all shadow-sm"
              >
                <CardHeader className="p-4 pb-3 border-b border-slate-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-cyan-400 text-sm">
                        {ord.orderNumber}
                      </span>
                      <Badge className="bg-slate-900 text-slate-300 border-slate-700 text-xs">
                        Linha: {ord.lineCode}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-semibold ${
                          ord.status === 'PUBLISHED'
                            ? 'border-emerald-600 text-emerald-400 bg-emerald-950/40'
                            : ord.status === 'PHASE1_APPROVED'
                              ? 'border-cyan-600 text-cyan-400 bg-cyan-950/40'
                              : ord.status === 'SIMULATED'
                                ? 'border-amber-600 text-amber-400 bg-amber-950/40'
                                : ord.status === 'REJECTED'
                                  ? 'border-rose-600 text-rose-400 bg-rose-950/40'
                                  : 'border-slate-700 text-slate-400'
                        }`}
                      >
                        {ord.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-400">
                      Entrega: <strong className="text-white">{ord.deliveryDate}</strong> &bull;
                      Volume: <strong className="text-white">{ord.quantityTons} ton</strong>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Especificação do Produto:
                      </span>
                      <span className="font-bold text-white text-xs">{ord.material}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Rule Pack:</span>
                        <span className="text-cyan-300 font-mono text-[11px]">{ord.rulePack}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">OEE Previsto:</span>
                        <span className="text-emerald-400 font-bold">{ord.oeeEstimated}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Esteira de Ações Granulares RBAC */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-900">
                    <div className="flex items-center gap-2">
                      {/* Ação: Simular */}
                      <Can
                        permission="pcp.schedule.simulate"
                        mode="disable"
                        explainMessage="Apenas Programadores PCP podem executar simulações de sequenciamento."
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSimulate(ord.id)}
                          disabled={simulating === ord.id}
                          className="border-slate-700 bg-slate-900 text-amber-400 hover:text-amber-300 hover:bg-slate-800 text-xs h-7 gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          {simulating === ord.id ? 'Simulando Regras...' : 'Simular Regras'}
                        </Button>
                      </Can>

                      {/* Ação: Editar */}
                      <Can
                        permission="pcp.schedule.edit"
                        mode="disable"
                        explainMessage="Você não possui permissão para editar os parâmetros desta ordem."
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-7 gap-1"
                        >
                          <Sliders className="w-3 h-3" /> Editar Sequência
                        </Button>
                      </Can>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Ação: Aprovar Fase 1 (PCP) */}
                      <Can
                        permission="pcp.schedule.approve.pcp"
                        mode="disable"
                        explainMessage="Requer permissão pcp.schedule.approve.pcp (Fase 1 - Programador PCP)."
                      >
                        <Button
                          size="sm"
                          onClick={() => handleApprovePhase1(ord.id)}
                          disabled={ord.status === 'PHASE1_APPROVED' || ord.status === 'PUBLISHED'}
                          className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-7 font-semibold gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Aprovar Fase 1 (PCP)
                        </Button>
                      </Can>

                      {/* Ação: Aprovar Fase 2 (Gestor de Linha) */}
                      <Can
                        permission="pcp.schedule.approve.manager"
                        mode="disable"
                        explainMessage="Requer perfil LINE_MANAGER com escopo nesta linha específica para aprovação da Fase 2."
                      >
                        <Button
                          size="sm"
                          onClick={() => handleApprovePhase2(ord.id)}
                          disabled={ord.status !== 'PHASE1_APPROVED'}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 font-bold gap-1"
                        >
                          <Send className="w-3 h-3" /> Homologar Fase 2 (Gestor)
                        </Button>
                      </Can>

                      {/* Ação: Rejeitar */}
                      <Can
                        permission="pcp.schedule.reject"
                        mode="disable"
                        explainMessage="Requer permissão para reprovar planos de produção."
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(ord.id)}
                          className="text-slate-400 hover:text-rose-400 hover:bg-slate-900 text-xs h-7 gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Rejeitar
                        </Button>
                      </Can>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
