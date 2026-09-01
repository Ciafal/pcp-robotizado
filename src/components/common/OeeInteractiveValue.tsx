import React from 'react'
import { Info, ChevronRight, Gauge } from 'lucide-react'
import { useOeeDrilldown } from '@/contexts/OeeDrilldownContext'
import { OeeContext } from '@/types/oee-drilldown'
import { cn } from '@/lib/utils'

export interface OeeInteractiveValueProps {
  value: number | string
  target?: number
  unit?: string
  drilldownContext?: any
  context?: Partial<OeeContext>
  showIcon?: boolean
  iconType?: 'info' | 'chevron' | 'gauge'
  className?: string
  badgeClassName?: string
  suffix?: string
  label?: string
  children?: React.ReactNode
}

/**
 * Componente helper para transformar qualquer exibição de OEE no sistema em um elemento clicável
 * com indicador visual discreto, tooltip e integração direta com o modal/drawer de Drilldown.
 */
export const OeeInteractiveValue: React.FC<OeeInteractiveValueProps> = ({
  value,
  context,
  showIcon = true,
  iconType = 'chevron',
  className,
  suffix = '%',
  label,
  children,
}) => {
  const { openDrilldown } = useOeeDrilldown()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    openDrilldown(context)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      openDrilldown(context)
    }
  }

  if (children) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title="Clique para detalhar o OEE"
        className={cn(
          'group relative cursor-pointer transition-all hover:ring-1 hover:ring-sky-400/50 rounded select-none',
          className,
        )}
      >
        {children}
        {showIcon && (
          <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-slate-900/80 rounded text-sky-400">
            <Info className="w-3 h-3" />
          </span>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title="Clique para detalhar o OEE"
      className={cn(
        'group inline-flex items-center gap-1 cursor-pointer font-mono font-bold transition-all hover:text-sky-300 hover:underline decoration-sky-400 underline-offset-2',
        className,
      )}
    >
      {label && <span className="font-sans text-xs font-normal text-slate-400">{label}</span>}
      <span>
        {typeof value === 'number' ? `${value.toFixed(1)}${suffix}` : `${value}${suffix}`}
      </span>
      {showIcon && (
        <span className="inline-flex items-center opacity-70 group-hover:opacity-100 text-sky-400 transition-opacity">
          {iconType === 'info' && <Info className="w-3 h-3" />}
          {iconType === 'chevron' && (
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          )}
          {iconType === 'gauge' && <Gauge className="w-3 h-3" />}
        </span>
      )}
    </button>
  )
}

export default OeeInteractiveValue
