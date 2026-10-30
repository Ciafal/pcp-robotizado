import React from 'react'
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type LowStockStatus = 'CRITICO' | 'ATENCAO' | 'NORMAL' | 'SEM_DADOS'

export interface LowStockBadgeProps {
  /**
   * Status do material em relação ao estoque mínimo:
   * - 'CRITICO': Estoque abaixo do mínimo (< 100% do mínimo)
   * - 'ATENCAO': Próximo do mínimo (100% até 110% do mínimo)
   * - 'NORMAL': Estoque adequado (> 110% do mínimo)
   * - 'SEM_DADOS': Sem dado SAP / sem mínimo cadastrado
   */
  status?: LowStockStatus
  currentStockTons?: number | null
  minStockTons?: number | null
  hasSapData?: boolean
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

/**
 * Determina o status de alerta de estoque de forma pura e determinística.
 * Regras:
 * 1. Sem dados SAP ou sem mínimo cadastrado (> 0): não entra em alerta crítico nem assume zero.
 * 2. Estoque atual < Estoque mínimo: CRITICO (Estoque Baixo)
 * 3. Estoque atual <= Estoque mínimo * 1.10 (até 10% acima do mínimo): ATENCAO (Faixa Próxima do Mínimo)
 * 4. Demais casos: NORMAL
 */
export function getLowStockStatus(
  currentStockTons?: number | null,
  minStockTons?: number | null,
  hasSapData: boolean = true,
): LowStockStatus {
  if (
    !hasSapData ||
    currentStockTons == null ||
    minStockTons == null ||
    isNaN(currentStockTons) ||
    isNaN(minStockTons)
  ) {
    return 'SEM_DADOS'
  }

  if (minStockTons <= 0) {
    return 'NORMAL'
  }

  if (currentStockTons < minStockTons) {
    return 'CRITICO'
  }

  if (currentStockTons <= minStockTons * 1.1) {
    return 'ATENCAO'
  }

  return 'NORMAL'
}

export const LowStockBadge: React.FC<LowStockBadgeProps> = ({
  status: explicitStatus,
  currentStockTons,
  minStockTons,
  hasSapData = true,
  className,
  showLabel = true,
  size = 'sm',
}) => {
  const calculatedStatus =
    explicitStatus ?? getLowStockStatus(currentStockTons, minStockTons, hasSapData)

  if (calculatedStatus === 'SEM_DADOS') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              data-testid="badge-sem-dados"
              className={cn(
                'bg-slate-50 text-slate-500 border-slate-300 font-mono font-medium inline-flex items-center gap-1 cursor-default',
                size === 'sm' ? 'text-[10px] px-1.5 py-0 h-5' : 'text-xs px-2 py-0.5 h-6',
                className,
              )}
            >
              <span>Dado não disponível na integração SAP</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            Material sem dado sincronizado no SAP ECC ou sem estoque mínimo homologado.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (calculatedStatus === 'CRITICO') {
    const pct =
      minStockTons && minStockTons > 0 && currentStockTons != null
        ? ((currentStockTons / minStockTons) * 100).toFixed(0)
        : null

    return (
      <Badge
        data-testid="badge-estoque-baixo"
        className={cn(
          'bg-rose-100 text-rose-800 border-rose-300 font-bold inline-flex items-center gap-1 shadow-2xs hover:bg-rose-200/80 transition-colors',
          size === 'sm' ? 'text-[10px] px-1.5 py-0 h-5' : 'text-xs px-2 py-0.5 h-6',
          className,
        )}
      >
        <AlertTriangle
          className={size === 'sm' ? 'w-3 h-3 text-rose-600' : 'w-3.5 h-3.5 text-rose-600'}
        />
        {showLabel && <span>Estoque Baixo</span>}
        {pct && <span className="font-mono text-[9px] opacity-90">({pct}%)</span>}
      </Badge>
    )
  }

  if (calculatedStatus === 'ATENCAO') {
    const pct =
      minStockTons && minStockTons > 0 && currentStockTons != null
        ? ((currentStockTons / minStockTons) * 100).toFixed(0)
        : null

    return (
      <Badge
        data-testid="badge-atencao"
        className={cn(
          'bg-amber-100 text-amber-800 border-amber-300 font-bold inline-flex items-center gap-1 shadow-2xs hover:bg-amber-200/80 transition-colors',
          size === 'sm' ? 'text-[10px] px-1.5 py-0 h-5' : 'text-xs px-2 py-0.5 h-6',
          className,
        )}
      >
        <AlertCircle
          className={size === 'sm' ? 'w-3 h-3 text-amber-600' : 'w-3.5 h-3.5 text-amber-600'}
        />
        {showLabel && <span>Atenção</span>}
        {pct && <span className="font-mono text-[9px] opacity-90">({pct}%)</span>}
      </Badge>
    )
  }

  // NORMAL
  return (
    <Badge
      variant="outline"
      data-testid="badge-normal"
      className={cn(
        'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold inline-flex items-center gap-1',
        size === 'sm' ? 'text-[10px] px-1.5 py-0 h-5' : 'text-xs px-2 py-0.5 h-6',
        className,
      )}
    >
      <CheckCircle2
        className={size === 'sm' ? 'w-3 h-3 text-emerald-600' : 'w-3.5 h-3.5 text-emerald-600'}
      />
      {showLabel && <span>Normal</span>}
    </Badge>
  )
}

export default LowStockBadge
