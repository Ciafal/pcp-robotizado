import React, { useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AnalyticalModalSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'standard'
  | 'large'
  | 'analytical'
  | 'drilldown'
  | 'fullscreen'

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

/**
 * Dimensionamento estrutural obrigatório:
 * - Desktop padrão (1366x768, 1920x1080): min(96vw, 1800px) x 94vh
 * - Monitores grandes (2560x1440): min(96vw, 1800px) x min(94vh, 1100px)
 * - Telas menores / mobile: 98vw x 96vh
 * - Altura controlada explicitamente pelo container (flex flex-col overflow-hidden)
 */
const SIZE_CLASSES: Record<AnalyticalModalSize, string> = {
  sm: 'w-[min(90vw,600px)] max-w-[min(90vw,600px)] h-auto max-h-[85vh]',
  md: 'w-[min(92vw,800px)] max-w-[min(92vw,800px)] h-auto max-h-[88vh]',
  standard: 'w-[min(94vw,900px)] max-w-[min(94vw,900px)] h-auto max-h-[90vh]',
  lg: 'w-[min(94vw,1100px)] max-w-[min(94vw,1100px)] h-[min(90vh,850px)] max-h-[90vh]',
  xl: 'w-[min(95vw,1350px)] max-w-[min(95vw,1350px)] h-[min(92vh,950px)] max-h-[92vh]',
  large: 'w-[min(95vw,1200px)] max-w-[min(95vw,1200px)] h-[min(92vh,900px)] max-h-[92vh]',
  // Drill-down executivo de materiais (1450px)
  drilldown:
    'modal-analitico-drilldown w-[min(94vw,1450px)] max-w-[min(94vw,1450px)] h-[90vh] max-h-[90vh]',
  // Modal analítico principal (quase fullscreen expandido): min(96vw, 1800px) x 94vh
  analytical:
    'w-[min(96vw,1800px)] max-w-[min(96vw,1800px)] h-[94vh] max-h-[94vh] 2xl:h-[min(94vh,1100px)] 2xl:max-h-[min(94vh,1100px)]',
  // Fullscreen suave
  fullscreen: 'w-[min(98vw,1900px)] max-w-[min(98vw,1900px)] h-[96vh] max-h-[96vh]',
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
  // Bloqueio mandatário de scroll no body ao abrir o modal (sem scroll de fundo)
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('analytical-modal-open')
    document.body.classList.add('modal-open')

    // Suporte ao ESC e Page Up / Page Down para rolar o modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.classList.remove('analytical-modal-open')
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          // Estrutura base de 4 zonas flex-col, overflow-hidden no container pai
          'modal-analitico flex flex-col p-0 overflow-hidden bg-white text-slate-900 border border-slate-200/90 rounded-2xl shadow-2xl transition-all duration-200',
          SIZE_CLASSES[size],
          // Reset default close button styling do shadcn porque usamos um botão X acessível dentro do cabeçalho
          '[&>button:last-child]:hidden',
          className,
        )}
      >
        {/* =========================================================================
            ZONA 1: CABEÇALHO FIXO INSTITUCIONAL CIAFAL (flex: 0 0 auto; 120-180px)
            Paleta institucional CIAFAL: Azul escuro (#003870 -> #004C97 -> #0A2540)
            Contém: Badge da análise, Título, Descrição, KPIs contextuais em grade,
            e botão X no canto superior direito com área clicável mínima 40x40px
           ========================================================================= */}
        <header className="flex-none px-5 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-[#003870] via-[#004C97] to-[#0A2540] text-white border-b border-blue-900/60 shadow-xs relative">
          <div className="flex items-start justify-between gap-4">
            {/* Título, Badges e Descrição */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {badge && (
                  <div className="shrink-0 inline-flex items-center">
                    {typeof badge === 'string' ? (
                      <Badge className="bg-white/15 hover:bg-white/20 text-white border-white/25 text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-md">
                        {badge}
                      </Badge>
                    ) : (
                      badge
                    )}
                  </div>
                )}
                <DialogTitle className="modal-analitico-title font-bold tracking-tight text-white m-0 truncate">
                  {title}
                </DialogTitle>
              </div>

              {subtitle && (
                <DialogDescription className="modal-analitico-text text-blue-100/90 mt-0.5 line-clamp-2 leading-relaxed m-0 font-normal">
                  {subtitle}
                </DialogDescription>
              )}
            </div>

            {/* KPIs Contextuais à Direita em grade responsiva */}
            {headerKpis && headerKpis.length > 0 && (
              <div className="hidden lg:grid grid-flow-col auto-cols-fr gap-2 shrink-0 bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/15">
                {headerKpis.map((kpi, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-end px-3 first:pl-0 border-l border-white/15 first:border-l-0 leading-tight min-w-[110px]"
                  >
                    <span className="text-[10px] uppercase font-semibold text-blue-200 tracking-wider truncate w-full text-right">
                      {kpi.label}
                    </span>
                    <span className="text-sm sm:text-base font-bold font-sans text-white whitespace-nowrap mt-0.5 modal-analitico-kpi-val">
                      {kpi.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Botão X de Fechamento Padronizado: min 40x40px, sempre dentro do cabeçalho, canto superior direito */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Fechar modal"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25 shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-white flex items-center justify-center -mr-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* KPIs Contextuais em telas intermediárias / menores (< 1024px) */}
          {headerKpis && headerKpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:hidden gap-2 mt-2.5 pt-2 border-t border-white/15 text-xs">
              {headerKpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white flex flex-col items-start leading-tight"
                >
                  <span className="text-blue-200 text-[10px] uppercase font-semibold truncate w-full">
                    {kpi.label}
                  </span>
                  <span className="font-bold whitespace-nowrap text-white font-sans mt-0.5 text-xs sm:text-sm">
                    {kpi.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* =========================================================================
            ZONA 2: BARRA DE NAVEGAÇÃO E FILTROS / ABAS (flex: 0 0 auto)
           ========================================================================= */}
        {(tabs || filters) && (
          <div className="flex-none bg-slate-50/90 border-b border-slate-200 px-5 py-2.5 sm:px-6 space-y-2">
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
                        'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 border select-none cursor-pointer',
                        isActive
                          ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:text-slate-900 hover:bg-slate-100/90',
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

        {/* =========================================================================
            ZONA 3: CORPO PRINCIPAL ROLÁVEL (flex: 1 1 auto; min-height: 0; overflow-y: auto)
            EXATAMENTE UM scroll vertical principal = modal-body
            overflow-x: hidden para evitar scroll horizontal na raiz do modal
           ========================================================================= */}
        <main
          className={cn(
            'flex-1 min-h-0 bg-slate-50/40 p-4 sm:p-5 lg:p-6',
            scrollMode === 'auto' &&
              'overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400',
            scrollMode === 'internal' && 'overflow-hidden flex flex-col',
            scrollMode === 'none' && 'overflow-hidden flex flex-col',
            contentClassName,
          )}
        >
          {children}
        </main>

        {/* =========================================================================
            ZONA 4: RODAPÉ FIXO OU COMPACTO (flex: 0 0 auto; ~60-80px; sem position fixed)
            Em fluxo natural para nunca sobrepor o conteúdo final
           ========================================================================= */}
        {footer && (
          <footer className="flex-none px-5 py-3 sm:px-6 bg-white border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2 shadow-xs min-h-[56px]">
            {footer}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AnalyticalModal
