import React from 'react'
import { FileEdit, Clock, CheckCircle2, Send, CheckCheck, XCircle, HelpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MPCuttingPlanStatus } from '@/services/mp-dimensional-notes-service'

export interface MPCuttingPlanStatusBadgeProps {
  status?: MPCuttingPlanStatus | string
  className?: string
  showIcon?: boolean
}

export const normalizeCuttingPlanStatus = (raw?: string): MPCuttingPlanStatus => {
  if (!raw) return 'Rascunho'
  const trimmed = raw.trim()
  const lower = trimmed.toLowerCase()

  if (lower === 'rascunho') return 'Rascunho'
  if (lower === 'em revisão' || lower === 'em revisao' || lower === 'em_revisao')
    return 'Em Revisão'
  if (lower === 'aprovado') return 'Aprovado'
  if (lower === 'liberado') return 'Liberado'
  if (lower === 'executado') return 'Executado'
  if (lower === 'cancelado') return 'Cancelado'
  if (lower === 'confirmado_pcp') return 'Rascunho'

  return 'Rascunho'
}

export const getStatusConfig = (status: MPCuttingPlanStatus) => {
  switch (status) {
    case 'Rascunho':
      return {
        label: 'Rascunho',
        description: 'Plano salvo, ainda não aprovado.',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        textClass: 'text-slate-700',
        icon: FileEdit,
      }
    case 'Em Revisão':
      return {
        label: 'Em Revisão',
        description: 'Plano alterado e aguardando validação.',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
        textClass: 'text-amber-800',
        icon: Clock,
      }
    case 'Aprovado':
      return {
        label: 'Aprovado',
        description: 'Plano validado pelo responsável autorizado.',
        badgeClass: 'bg-blue-50 text-[#004C97] border-blue-300',
        textClass: 'text-[#004C97]',
        icon: CheckCircle2,
      }
    case 'Liberado':
      return {
        label: 'Liberado',
        description: 'Plano autorizado para execução.',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
        textClass: 'text-indigo-800',
        icon: Send,
      }
    case 'Executado':
      return {
        label: 'Executado',
        description: 'Plano efetivamente realizado, conforme confirmação operacional.',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        textClass: 'text-emerald-800',
        icon: CheckCheck,
      }
    case 'Cancelado':
      return {
        label: 'Cancelado',
        description: 'Plano cancelado com justificativa.',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
        textClass: 'text-rose-800',
        icon: XCircle,
      }
    default:
      return {
        label: status,
        description: '',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        textClass: 'text-slate-700',
        icon: HelpCircle,
      }
  }
}

export const MPCuttingPlanStatusBadge: React.FC<MPCuttingPlanStatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const normalized = normalizeCuttingPlanStatus(status)
  const config = getStatusConfig(normalized)
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-bold inline-flex items-center gap-1 py-0.5 px-2 ${config.badgeClass} ${className}`}
      title={config.description}
    >
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{config.label}</span>
    </Badge>
  )
}
