import React from 'react'
import { ExecutiveActionRecord, ActionStatus, EfficacyStatus } from '@/types/executive-cockpit'
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Link2,
  Eye,
  Check,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/auth/Can'

interface ExecutiveActionsTrackerProps {
  actions: ExecutiveActionRecord[]
  onUpdateStatus?: (
    actionId: string,
    newStatus: ActionStatus,
    efficacy?: EfficacyStatus,
  ) => Promise<void>
}

export const ExecutiveActionsTracker: React.FC<ExecutiveActionsTrackerProps> = ({
  actions,
  onUpdateStatus,
}) => {
  const renderStatusBadge = (status: ActionStatus) => {
    switch (status) {
      case 'CONCLUIDA':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-bold">Concluída</Badge>
        )
      case 'EM_ANDAMENTO':
        return (
          <Badge className="bg-blue-100 text-[#004C97] text-[9px] font-bold">Em Andamento</Badge>
        )
      case 'ATRASADA':
        return <Badge className="bg-rose-100 text-rose-800 text-[9px] font-bold">Atrasada</Badge>
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 text-[9px] font-bold">Não Iniciada</Badge>
        )
    }
  }

  const renderEfficacyBadge = (eff?: EfficacyStatus) => {
    switch (eff) {
      case 'EFICAZ':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-300">
            Eficaz (+Resultado)
          </Badge>
        )
      case 'PARCIALMENTE_EFICAZ':
        return (
          <Badge className="bg-amber-100 text-amber-800 text-[9px] font-bold border border-amber-300">
            Parcialmente Eficaz
          </Badge>
        )
      case 'INEFICAZ':
        return (
          <Badge className="bg-rose-100 text-rose-800 text-[9px] font-bold border border-rose-300">
            Ineficaz (Reavaliar)
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[9px] text-slate-500 border-slate-300">
            Pendente Avaliação
          </Badge>
        )
    }
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#004C97]" />
            Trilha de Decisões & Plano de Ações Vinculadas
          </CardTitle>
          <p className="text-[11px] text-slate-500">
            Vínculo permanente:{' '}
            <strong>
              Análise &rarr; Decisão &rarr; Ação &rarr; Responsável &rarr; Prazo &rarr; Resultado
              &rarr; Eficácia
            </strong>
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-700">
          {actions.length} Ações Registradas
        </Badge>
      </CardHeader>

      <CardContent className="p-4 pt-1">
        {actions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
            Nenhum plano de ação registrado a partir desta análise executiva. Utilize as
            Recomendações da IA acima para gerar ações com governança.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                  <th className="py-2.5">Código / Título</th>
                  <th className="py-2.5">Tipo / Prioridade</th>
                  <th className="py-2.5">Responsável</th>
                  <th className="py-2.5">Prazo</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Eficácia</th>
                  <th className="py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actions.map((act) => (
                  <tr key={act.id || act.code} className="hover:bg-slate-50">
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900">{act.title}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <span>{act.code}</span>
                        {act.analysis_code && (
                          <span className="text-[#004C97] bg-blue-50 px-1 rounded">
                            Ref: {act.analysis_code}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5">
                      <div className="text-slate-700 font-medium">{act.action_type}</div>
                      <Badge
                        className={`text-[8px] font-bold ${
                          act.priority === 'CRITICA'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {act.priority}
                      </Badge>
                    </td>

                    <td className="py-2.5 text-slate-800 font-semibold">{act.responsible_name}</td>

                    <td className="py-2.5 text-slate-600 font-mono text-[11px]">{act.deadline}</td>

                    <td className="py-2.5">{renderStatusBadge(act.status)}</td>

                    <td className="py-2.5">{renderEfficacyBadge(act.efficacy_status)}</td>

                    <td className="py-2.5 text-right">
                      <Can permission="pcp.executive.actions.manage">
                        {act.status !== 'CONCLUIDA' && act.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateStatus?.(act.id!, 'CONCLUIDA', 'EFICAZ')}
                            className="text-[10px] h-6 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                          >
                            <Check className="w-3 h-3" /> Concluir
                          </Button>
                        )}
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ExecutiveActionsTracker
