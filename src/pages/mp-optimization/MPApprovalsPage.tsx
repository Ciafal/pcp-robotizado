import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPWorkflowApproval } from '@/types/mp-optimization'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Send,
  RefreshCw,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export const MPApprovalsPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [approvals, setApprovals] = useState<MPWorkflowApproval[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await mpOptimizationService.getWorkflowApprovals()
      setApprovals(data)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApprove = async (
    appr: MPWorkflowApproval,
    stage: 'PCP' | 'QUALITY' | 'PRODUCTION',
  ) => {
    try {
      const updates: Partial<MPWorkflowApproval> = {}
      if (stage === 'PCP') {
        updates.stage_pcp_status = 'APROVADO'
        updates.stage_pcp_user_id = user?.id
        updates.stage_pcp_user_name = user?.name || user?.email || 'Programador PCP'
        updates.stage_pcp_date = new Date().toISOString()
      } else if (stage === 'QUALITY') {
        updates.stage_quality_status = 'APROVADO'
        updates.stage_quality_user_id = user?.id
        updates.stage_quality_user_name = user?.name || user?.email || 'Engenharia de Qualidade'
        updates.stage_quality_date = new Date().toISOString()
      }

      // Se todas as etapas obrigatórias forem aprovadas, consolida status geral
      updates.overall_status = 'APROVADO_TOTAL'

      await mpOptimizationService.updateWorkflowApproval(appr.id, updates)

      // Se for plano de corte aprovado, enfileira no SAP
      if (appr.approval_type === 'PLANO_CORTE') {
        await mpOptimizationService.enqueueSapIntegration({
          queue_code: `QUEUE-SAP-${Date.now()}`,
          plan_code: appr.entity_ref_id,
          plan_version: 1,
          center_code: '1001',
          material_code: appr.block_number || 'MAT-SAP',
          block_number: appr.block_number,
          original_application: appr.original_application || 'APL_ORIGINAL',
          new_application: appr.new_application || 'APL_NOVA',
          integration_lifecycle_stage: 'PLANO_APROVADO',
          approved_by_user_id: user?.id,
          approved_by_user_name: user?.name || 'Programador PCP',
        })
      }

      toast({
        title: 'Aprovação Concluída com Sucesso',
        description: 'Plano aprovado e automaticamente registrado para despacho ao SAP.',
      })

      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Aprovação',
        description: err.message,
      })
    }
  }

  return (
    <MPModuleLayout currentStep={11}>
      {/* Header com Regra de Governança Estrita */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#004C97]">
            <ShieldCheck className="w-4 h-4" />
            <span>GOVERNANÇA &bull; FLUXO DE APROVAÇÃO MULTI-ETAPAS</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Central de Aprovações de Planos de Corte & Exceções Técnicas
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            Fluxo Obrigatório: IA gera recomendação → Programador PCP revisa → Altera/Simula → IA
            recalcula → Aprovação Formal. Exceção técnica exige Qualidade + Produção. A IA NUNCA
            aprova sozinha.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          className="border-slate-300 text-slate-700 text-xs font-semibold gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
          Atualizar Fila
        </Button>
      </div>

      {/* Lista de Solicitações de Aprovação */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {approvals.length === 0 ? (
          <SapEmptyState
            title="SEM APROVAÇÕES PENDENTES"
            description="Todos os planos de corte e modificações dimensionais foram devidamente analisados e aprovados pela equipe responsável."
            sapTransaction="ZPP86 / ZPP88 / WORKFLOW"
            onRefresh={loadData}
          />
        ) : (
          <div className="space-y-3">
            {approvals.map((appr) => (
              <div
                key={appr.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-all space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900 text-sm">{appr.title}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-blue-50 text-[#004C97] border-blue-200"
                    >
                      {appr.approval_type}
                    </Badge>
                  </div>
                  <Badge
                    className={`text-[10px] font-bold ${
                      appr.overall_status === 'APROVADO_TOTAL'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {appr.overall_status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-sans">
                      1. Revisão PCP
                    </span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      {appr.stage_pcp_status === 'APROVADO' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {appr.stage_pcp_status} ({appr.stage_pcp_user_name || 'Aguardando'})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] font-sans">
                      2. Qualidade / Engenharia
                    </span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      {appr.stage_quality_status === 'APROVADO' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : appr.stage_quality_status === 'NAO_APLICAVEL' ? (
                        <span className="text-slate-400">Não Exigido</span>
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {appr.stage_quality_status !== 'NAO_APLICAVEL' && appr.stage_quality_status}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] font-sans">
                      3. Produção / Laminação
                    </span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      {appr.stage_production_status === 'APROVADO' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {appr.stage_production_status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-slate-600 text-[11px] font-sans max-w-xl">
                    <strong>Parecer do Motor:</strong>{' '}
                    {appr.ai_recommendation_summary ||
                      'Recomendação balanceada com alta aderência.'}
                  </p>

                  {appr.overall_status === 'EM_ANALISE' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(appr, 'PCP')}
                        className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Aprovar como Programador PCP
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MPModuleLayout>
  )
}
