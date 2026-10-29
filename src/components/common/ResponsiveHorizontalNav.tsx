import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ResponsiveHorizontalNavItem {
  id: string
  label: React.ReactNode
  badge?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  active?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
  activeItemClassName?: string
  ariaLabel?: string
}

export interface ResponsiveHorizontalNavProps {
  items: ResponsiveHorizontalNavItem[]
  activeId?: string
  onSelect?: (id: string) => void
  storageKey?: string
  className?: string
  containerClassName?: string
  itemClassName?: string
  activeItemClassName?: string
  inactiveItemClassName?: string
  ariaLabel?: string
  rightContent?: React.ReactNode
}

export const ResponsiveHorizontalNav: React.FC<ResponsiveHorizontalNavProps> = ({
  items,
  activeId,
  onSelect,
  storageKey,
  className = '',
  containerClassName = '',
  itemClassName = '',
  activeItemClassName = 'bg-[#004C97] text-white shadow-xs',
  inactiveItemClassName = 'text-slate-700 hover:text-slate-900 hover:bg-slate-100',
  ariaLabel = 'Navegação horizontal',
  rightContent,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Verifica estado de overflow e limites do scroll
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const tolerance = 4 // tolerância para subpixels
    setCanScrollLeft(scrollLeft > tolerance)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - tolerance)
  }, [])

  // Preservação de posição ao carregar e scroll no container
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    if (storageKey) {
      try {
        const saved = sessionStorage.getItem(`rh_nav_pos_${storageKey}`)
        if (saved !== null) {
          el.scrollLeft = Number(saved)
        }
      } catch {
        // ignora se sessionStorage indisponível
      }
    }

    updateScrollState()

    const handleScroll = () => {
      updateScrollState()
      if (storageKey && el) {
        try {
          sessionStorage.setItem(`rh_nav_pos_${storageKey}`, String(el.scrollLeft))
        } catch {
          // ignora
        }
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [storageKey, updateScrollState])

  // Scroll automático para a aba selecionada
  useEffect(() => {
    if (!activeId) return
    const itemEl = itemRefs.current.get(activeId)
    const container = scrollRef.current
    if (!itemEl || !container) return

    const itemRect = itemEl.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // Se o item estiver fora da área visível (parcial ou total)
    if (itemRect.left < containerRect.left || itemRect.right > containerRect.right) {
      const targetScroll = itemEl.offsetLeft - container.clientWidth / 2 + itemEl.clientWidth / 2

      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      })
    }
  }, [activeId])

  const scrollByAmount = (delta: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <div
      className={`relative w-full max-w-full min-w-0 box-border flex items-center gap-1.5 ${containerClassName}`}
      role="navigation"
      aria-label={ariaLabel}
    >
      {/* Botão de rolagem à esquerda */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pr-2 bg-gradient-to-r from-white via-white/90 to-transparent">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => scrollByAmount(-220)}
            className="h-8 w-8 p-0 rounded-full bg-white/95 shadow-md border-slate-300 text-slate-700 hover:text-[#004C97] hover:bg-slate-50 focus:ring-2 focus:ring-[#004C97]"
            title="Rolar para esquerda"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Container rolável com suporte a mouse, touch, touchpad e teclado */}
      <div
        ref={scrollRef}
        tabIndex={0}
        role="tablist"
        aria-label={ariaLabel}
        className={`w-full max-w-full min-w-0 box-border overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 py-1 px-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#004C97] ${className}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item) => {
          const isActive = item.active ?? (activeId ? activeId === item.id : false)
          const Icon = item.icon

          return (
            <button
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el)
                else itemRefs.current.delete(item.id)
              }}
              role="tab"
              aria-selected={isActive}
              aria-label={item.ariaLabel}
              disabled={item.disabled}
              onClick={() => {
                item.onClick?.()
                onSelect?.(item.id)
              }}
              className={`shrink-0 inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004C97] disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive ? item.activeItemClassName || activeItemClassName : inactiveItemClassName
              } ${itemClassName} ${item.className || ''}`}
            >
              {Icon && <Icon className="w-4 h-4 shrink-0" />}
              <span>{item.label}</span>
              {item.badge}
            </button>
          )
        })}
      </div>

      {/* Botão de rolagem à direita */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pl-2 bg-gradient-to-l from-white via-white/90 to-transparent">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => scrollByAmount(220)}
            className="h-8 w-8 p-0 rounded-full bg-white/95 shadow-md border-slate-300 text-slate-700 hover:text-[#004C97] hover:bg-slate-50 focus:ring-2 focus:ring-[#004C97]"
            title="Rolar para direita"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Conteúdo complementar à direita se fornecido */}
      {rightContent && (
        <div className="shrink-0 ml-2 hidden sm:flex items-center">{rightContent}</div>
      )}
    </div>
  )
}
