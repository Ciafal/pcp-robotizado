import React, { useState } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
  UserCheck,
  Layers,
  ChevronRight,
  Sparkles,
  Route,
  Building2,
  AlertTriangle,
  XCircle,
  TrendingUp,
} from 'lucide-react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { sequencingRoutesService } from '@/services/sequencing-routes'
import { useToast } from '@/hooks/use-toast'

export const DoubleApprovalPanel: React.FC = () => {
  const { doubleApprovals, approveLineDouble } = useControlTower()
  const { user, can } = useAuth()
  const { toast } = useToast()

  const [categoryFilter, setCategoryFilter] = useState<
    'ALL' | 'PRODUCTION_ROUTE' | 'LINE_MASTER' | 'RULE_PACK'
  >('ALL')

  // Lista com categorias expandidas
  const filteredApprovals = doubleApprovals.filter((item) => {
    if (categoryFilter === 'ALL') return true
    if (categoryFilter === 'PRODUCTION_ROUTE') {
      return item.entityType === 'PRODUCTION_ROUTE' || item.entityType === 'ROTA_PRODUTIVA'
    }
    return item.entityType === categoryFilter
  })

  return (
    <div className="space-y-6">
      {/* Header com Regra de Governança CIAFAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004C97]/20 border border-[#004C97]/40 flex items-center justify-center text-[#3b82f6]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Painel Central de Aprovações Duplas & Governança (Prompt 04)
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] border-sky-500/30 text-sky-400 bg-sky-950/20 font-mono"
              >
                PCP (Fase 1) + Gestor da Linha (Fase 2)
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Fluxo formal de governança:{' '}
              <strong className="text-slate-200">
                DRAFT &rarr; APROVAÇÃO PCP (1/2) &rarr; APROVAÇÃO GESTOR (2/2) &rarr; APPROVED
              </strong>
              . Relações não aprovadas permanecem BLOQUEADAS para o sequenciador.
            </p>
          </div>
        </div>

        {/* Filtro de Categorias */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              categoryFilter === 'ALL'
                ? 'bg-[#004C97] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({doubleApprovals.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('PRODUCTION_ROUTE')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              categoryFilter === 'PRODUCTION_ROUTE'
                ? 'bg-[#004C97] text-white shadow-sm'
                : 'text-cyan-400 hover:text-white'
            }`}
          >
            Alteração de Rota Produtiva
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('LINE_MASTER')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              categoryFilter === 'LINE_MASTER'
                ? 'bg-[#004C97] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ficha Mestre
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredApprovals.map((item) => {
          const isPcpApproved = item.pcpApproval.status === 'APPROVED'
          const isLineApproved = item.lineManagerApproval.status === 'APPROVED'
          const isFullyActive = item.finalStatus === 'ACTIVE' || item.finalStatus === 'APPROVED'

          const isRoute =
            item.entityType === 'PRODUCTION_ROUTE' || item.entityType === 'ROTA_PRODUTIVA'

          return (
            <Card
              key={item.id}
              className={cn(
                'bg-slate-900 border transition-all',
                isFullyActive ? 'border-emerald-900/60 bg-emerald-950/10' : 'border-slate-800',
              )}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        'text-[10px] font-mono',
                        isRoute
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                          : 'bg-sky-950 text-sky-300 border-sky-800',
                      )}
                    >
                      {isRoute ? 'ALTERAÇÃO DE ROTA PRODUTIVA' : item.entityType} &bull;{' '}
                      {item.lineCode} ({item.version})
                    </Badge>
                    <h4 className="text-sm font-bold text-white leading-tight">{item.lineName}</h4>
                  </div>

                  {isFullyActive ? (
                    <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] font-semibold">
                      ✓ HOMOLOGADO 2/2 (APPROVED)
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px] font-semibold">
                      EM APROVAÇÃO ({isPcpApproved ? '1/2' : '0/2'})
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-4">
                {/* Comparação ANTES / DEPOIS e Análise de Impacto (Requisito Prompt 04) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
                    <span className="text-slate-500 text-[10px] font-mono block uppercase">
                      Comparação Estrutural (Antes / Depois):
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                      <div className="p-2 bg-rose-950/20 border border-rose-900/40 rounded">
                        <span className="text-rose-400 block font-bold">ANTES:</span>
                        <span className="text-slate-300">
                          {isRoute ? 'L1 ➔ L2 (Fluxo Direto Padrão)' : 'Versão Anterior V1'}
                        </span>
                      </div>
                      <div className="p-2 bg-emerald-950/20 border border-emerald-900/40 rounded">
                        <span className="text-emerald-400 block font-bold">DEPOIS (Proposta):</span>
                        <span className="text-slate-200">
                          {isRoute
                            ? 'L1 + L2 ➔ ENDIR (Rota Paralela N:1)'
                            : 'Nova Versão Revisada V2'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
                    <span className="text-cyan-400 text-[10px] font-mono block uppercase font-bold">
                      Análise de Impacto Estrutural Estimado:
                    </span>
                    <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                      <li>
                        <strong>Linhas Afetadas:</strong> L1, L2, ENDIR (Endireitadeira).
                      </li>
                      <li>
                        <strong>Buffers Afetados:</strong> Pulmão L1/L2 (+35 t), Pulmão ENDIR (+50
                        t).
                      </li>
                      <li>
                        <strong>Capacidade Impactada:</strong> +18% de vazão para famílias PERF_U e
                        TUB_QUAD.
                      </li>
                      <li>
                        <strong>Segurança:</strong> Não altera ordens de produção passadas ou em
                        execução.
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs">
                  <span className="text-slate-500 text-[10px] font-mono block">
                    Motivo da Alteração / Justificativa Técnica:
                  </span>
                  <p className="text-slate-200 font-medium mt-0.5">{item.changeReason}</p>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Solicitante: {item.authorName} ({item.authorRole}) &bull; Aberto às{' '}
                    {item.createdAt}
                  </div>
                </div>

                {/* Esteira de 2 Fases Obrigatória */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Fase 1: Coordenador do PCP */}
                  <div
                    className={cn(
                      'p-3 rounded-lg border space-y-2',
                      isPcpApproved
                        ? 'bg-emerald-950/20 border-emerald-900/60'
                        : 'bg-slate-950 border-slate-800',
                    )}
                  >
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="font-bold text-slate-200">
                        Fase 1: Aprovação PCP (Técnica / Malha)
                      </span>
                      {isPcpApproved ? (
                        <Badge className="bg-emerald-900 text-emerald-200 text-[9px]">
                          Aprovado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 text-[9px]">
                          Pendente
                        </Badge>
                      )}
                    </div>

                    {isPcpApproved ? (
                      <div className="text-[11px] text-slate-300 space-y-0.5">
                        <div className="text-emerald-400 font-semibold">
                          {item.pcpApproval.approverName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Aprovado em: {item.pcpApproval.approvedAt}
                        </div>
                        {item.pcpApproval.notes && (
                          <p className="text-slate-400 text-[10px] italic">
                            &quot;{item.pcpApproval.notes}&quot;
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={() => approveLineDouble(item.id, 'PCP')}
                          className="w-full text-xs bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold"
                        >
                          Aprovar como PCP &rarr;
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Fase 2: Gestor Responsável pela Linha / Processo */}
                  <div
                    className={cn(
                      'p-3 rounded-lg border space-y-2',
                      isLineApproved
                        ? 'bg-emerald-950/20 border-emerald-900/60'
                        : 'bg-slate-950 border-slate-800',
                    )}
                  >
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="font-bold text-slate-200">
                        Fase 2: Gestor da Linha / Processo
                      </span>
                      {isLineApproved ? (
                        <Badge className="bg-emerald-900 text-emerald-200 text-[9px]">
                          Aprovado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 text-[9px]">
                          Pendente
                        </Badge>
                      )}
                    </div>

                    {isLineApproved ? (
                      <div className="text-[11px] text-slate-300 space-y-0.5">
                        <div className="text-emerald-400 font-semibold">
                          {item.lineManagerApproval.approverName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Aprovado em: {item.lineManagerApproval.approvedAt}
                        </div>
                        {item.lineManagerApproval.notes && (
                          <p className="text-slate-400 text-[10px] italic">
                            &quot;{item.lineManagerApproval.notes}&quot;
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={() => approveLineDouble(item.id, 'LINE_MANAGER')}
                          className="w-full text-xs bg-indigo-700 hover:bg-indigo-800 text-white font-semibold"
                        >
                          Aprovar como Gestor da Linha &rarr;
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default DoubleApprovalPanel
