import React, { useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AnalyticalModalSize = 'standard' | 'large' | 'analytical' | 'drilldown' | 'fullscreen'

export interface AnalyticalModalHeaderKpi {
  label: string
  value: React.ReactNode
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger'
}

export interface AnalyticalModalTab {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: React.ReactNode
}

export interface AnalyticalModalProps {
  isOpen: boolean
  onClose: () => void
  size?: AnalyticalModalSize
  badge?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  headerKpis?: AnalyticalModalHeaderKpi[]
  tabs?: {
    items: AnalyticalModalTab[]
    activeTab: string
    onTabChange: (tabId: string) => void
  }
  filters?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  scrollMode?: 'auto' | 'internal' | 'none'
  className?: string
  contentClassName?: string
}

const SIZE_CLASSES: Record<AnalyticalModalSize, string> = {
  // Modal padrão (formulários): ~700-800px
  standard: 'w-[min(92vw,760px)] max-w-[760px] h-auto max-h-[85vh]',
  // Modal grande (cadastros): ~1100px
  large: 'w-[min(94vw,1100px)] max-w-[1100px] h-[min(88vh,850px)] max-h-[88vh]',
  // Modal analítico (gráficos / ABC / Pareto): min(94vw, 1500px), max-height 90vh
  analytical: 'w-[min(94vw,1500px)] max-w-[1500px] h-[min(90vh,950px)] max-h-[90vh]',
  // Drill-down executivo: min(94vw, 1450px), max-height 90vh
  drilldown: 'w-[min(94vw,1450px)] max-w-[1450px] h-[min(90vh,920px)] max-h-[90vh]',
  // Fullscreen suave com margens 3-5%
  fullscreen: 'w-[94vw] max-w-[1600px] h-[92vh] max-h-[92vh]',
}

export const AnalyticalModal: React.FC<AnalyticalModalProps> = ({
  isOpen,
  onClose,
  size = 'analytical',
  badge,
  title,
  subtitle,
  headerKpis,
  tabs,
  filters,
  children,
  footer,
  scrollMode = 'auto',
  className,
  contentClassName,
}) => {
  // Bloqueio de scroll no body ao abrir modal (body.modal-open)
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('analytical-modal-open')

    // Suporte ao ESC
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.classList.remove('analytical-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          // Estrutura flex-column obrigatória com margens seguras (3-5% horizontal, 4-6% vertical)
          'flex flex-col p-0 overflow-hidden bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl transition-all duration-200',
          // Modais sem width fixo pequeno: usa classes padronizadas com clamp/min
          SIZE_CLASSES[size],
          // Reset default close button styling do shadcn porque colocamos um customizado e acessível
          '[&>button:last-child]:hidden',
          className,
        )}
      >
        {/* ZONA 1: CABEÇALHO INSTITUCIONAL CIAFAL (flex: 0 0 auto) */}
        <header className="flex-none px-5 py-3.5 bg-gradient-to-r from-[#003870] via-[#004C97] to-[#0A2540] text-white border-b border-blue-900/60 shadow-xs relative">
          <div className="flex items-center justify-between gap-3">
            {/* Título, Badges e Descrição */}
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                {badge && (
                  <div className="shrink-0 inline-flex items-center">
                    {typeof badge === 'string' ? (
                      <Badge className="bg-white/15 text-white border-white/20 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                        {badge}
                      </Badge>
                    ) : (
                      badge
                    )}
                  </div>
                )}
                <DialogTitle className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white m-0 truncate">
                  {title}
                </DialogTitle>
              </div>

              {subtitle && (
                <DialogDescription className="text-xs text-blue-100/90 mt-1 line-clamp-2 leading-relaxed m-0">
                  {subtitle}
                </DialogDescription>
              )}
            </div>

            {/* KPIs Contextuais à Direita */}
            {headerKpis && headerKpis.length > 0 && (
              <div className="hidden md:flex items-center gap-2.5 shrink-0 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/15">
                {headerKpis.map((kpi, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex flex-col items-end pl-2.5 first:pl-0 border-l border-white/15 first:border-l-0 leading-tight',
                    )}
                  >
                    <span className="text-[10px] uppercase font-semibold text-blue-200 tracking-wider">
                      {kpi.label}
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-sans text-white">
                      {kpi.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Botão Fechar X Padronizado: min 40x40px, sempre visível, sem sobrepor texto */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Fechar modal"
              className="w-10 h-10 rounded-xl text-white/80 hover:text-white hover:bg-white/15 active:bg-white/25 shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* KPIs Contextuais em telas móveis/pequenas */}
          {headerKpis && headerKpis.length > 0 && (
            <div className="flex md:hidden items-center gap-2 mt-2 pt-2 border-t border-white/15 overflow-x-auto text-xs pb-0.5">
              {headerKpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className="shrink-0 bg-white/10 px-2 py-0.5 rounded text-[11px] font-medium text-white"
                >
                  <span className="text-blue-200 mr-1">{kpi.label}:</span>
                  <span className="font-bold">{kpi.value}</span>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* ZONA 2: ÁREA DE NAVEGAÇÃO E FILTROS (flex: 0 0 auto) */}
        {(tabs || filters) && (
          <div className="flex-none bg-slate-50 border-b border-slate-200 px-5 py-2.5 space-y-2">
            {/* Barra de Abas (se houver) */}
            {tabs && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
                {tabs.items.map((tab) => {
                  const isActive = tabs.activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => tabs.onTabChange(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 border select-none',
                        isActive
                          ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100/80',
                      )}
                    >
                      {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span
                          className={cn(
                            'ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold',
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700',
                          )}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Barra de Filtros adicionais (se houver) */}
            {filters && <div className="pt-0.5">{filters}</div>}
          </div>
        )}

        {/* ZONA 3: CONTEÚDO ANALÍTICO (flex: 1 1 auto com min-height: 0 e scroll interno único) */}
        <main
          className={cn(
            'flex-1 min-h-0 bg-slate-50/50 p-4 sm:p-5',
            scrollMode === 'auto' &&
              'overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400',
            scrollMode === 'none' && 'overflow-hidden flex flex-col',
            contentClassName,
          )}
        >
          {children}
        </main>

        {/* ZONA 4: RODAPÉ INSTITUCIONAL (flex: 0 0 auto quando aplicável) */}
        {footer && (
          <footer className="flex-none px-5 py-2.5 bg-white border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2 shadow-xs">
            {footer}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AnalyticalModal
