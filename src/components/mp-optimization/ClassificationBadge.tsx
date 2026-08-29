import React from 'react'
import { Badge } from '@/components/ui/badge'
import { DimensionalClassification } from '@/types/mp-optimization'
import { CheckCircle, AlertCircle, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react'

interface ClassificationBadgeProps {
  classification?: DimensionalClassification
  showDescription?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  classification = 'NIVEL_1_IDEAL',
  showDescription = false,
  size = 'md',
}) => {
  const configs: Record<
    DimensionalClassification,
    {
      label: string
      tag: string
      bg: string
      text: string
      border: string
      icon: React.ComponentType<{ className?: string }>
      desc: string
    }
  > = {
    NIVEL_1_IDEAL: {
      tag: 'NÍVEL 1',
      label: 'IDEAL',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      icon: CheckCircle,
      desc: 'Dentro da faixa nominal ideal preferencial da aplicação.',
    },
    NIVEL_2_ADMISSIVEL: {
      tag: 'NÍVEL 2',
      label: 'ADMISSÍVEL',
      bg: 'bg-blue-50',
      text: 'text-[#004C97]',
      border: 'border-blue-300',
      icon: CheckCircle,
      desc: 'Dentro da faixa tecnicamente aprovada (ZPPMP Min/Max).',
    },
    NIVEL_3_FORA_IDEAL_CONFORME: {
      tag: 'NÍVEL 3',
      label: 'FORA DO PADRÃO IDEAL (PRODUTO CONFORME)',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-300',
      icon: AlertCircle,
      desc: 'ZPP88: Fora da faixa ideal da MP, porém transformação industrial gera produto final conforme.',
    },
    NIVEL_4_EXCECAO_TECNICA: {
      tag: 'NÍVEL 4',
      label: 'EXCEÇÃO TÉCNICA',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: AlertTriangle,
      desc: 'Exige aprovação técnica formal da Engenharia e Qualidade.',
    },
    NIVEL_5_PROIBIDO: {
      tag: 'NÍVEL 5',
      label: 'PROIBIDO',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      icon: XCircle,
      desc: 'Incompatibilidade física ou metalúrgica. Uso vetado.',
    },
  }

  const current = configs[classification] || configs.NIVEL_1_IDEAL
  const Icon = current.icon

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <div
        className={`inline-flex items-center rounded-md border font-medium shadow-xs ${current.bg} ${current.text} ${current.border} ${sizeClasses[size]}`}
      >
        <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        <span className="font-bold tracking-wider opacity-90">{current.tag}:</span>
        <span>{current.label}</span>
      </div>
      {showDescription && (
        <span className="text-[11px] text-slate-500 font-normal leading-tight">{current.desc}</span>
      )}
    </div>
  )
}
