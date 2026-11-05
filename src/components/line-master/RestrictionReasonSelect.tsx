import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  RestrictionType,
  RESTRICTION_REASONS_CATALOG,
  getPrioritizedReasonsForType,
  getReasonCategory,
  ReasonItem,
} from '@/types/restriction-reasons-catalog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, ChevronDown, Check, Sparkles, X } from 'lucide-react'

interface RestrictionReasonSelectProps {
  value: string
  onChange: (reason: string, category: string) => void
  restrictionType: RestrictionType
  hasError?: boolean
  disabled?: boolean
  id?: string
}

export const RestrictionReasonSelect: React.FC<RestrictionReasonSelectProps> = ({
  value,
  onChange,
  restrictionType,
  hasError = false,
  disabled = false,
  id = 'motivo-restricao-input',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Foco no input de busca ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  // Obtém lista ordenada com motivos priorizados no topo de acordo com o Tipo
  const { prioritized, others, prioritizedCount } = useMemo(() => {
    return getPrioritizedReasonsForType(restrictionType)
  }, [restrictionType])

  // Filtra por termo de busca
  const queryNormalized = searchQuery.trim().toLowerCase()

  const filteredPrioritized = useMemo(() => {
    if (!queryNormalized) return prioritized
    return prioritized.filter(
      (item) =>
        item.label.toLowerCase().includes(queryNormalized) ||
        item.category.toLowerCase().includes(queryNormalized),
    )
  }, [prioritized, queryNormalized])

  const filteredOthers = useMemo(() => {
    if (!queryNormalized) return others
    return others.filter(
      (item) =>
        item.label.toLowerCase().includes(queryNormalized) ||
        item.category.toLowerCase().includes(queryNormalized),
    )
  }, [others, queryNormalized])

  const totalResults = filteredPrioritized.length + filteredOthers.length

  const handleSelect = (item: ReasonItem) => {
    onChange(item.label, item.category)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', '')
  }

  const selectedCategory = value ? getReasonCategory(value) : ''

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Botão de disparo do seletor */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between text-left px-2.5 h-8 rounded text-xs transition-colors border ${
          hasError
            ? 'border-rose-500 bg-rose-50/40 text-slate-900 focus:ring-1 focus:ring-rose-500'
            : isOpen
              ? 'border-[#004C97] bg-white ring-1 ring-[#004C97]'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 text-slate-800'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 mr-1">
          {value ? (
            <>
              <span className="font-semibold text-slate-900 truncate" title={value}>
                {value}
              </span>
              {selectedCategory && (
                <span className="text-[10px] font-normal text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded shrink-0">
                  {selectedCategory}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 font-normal">
              Selecione ou pesquise o motivo obrigatório...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChange('', '')
                }
              }}
              title="Limpar motivo"
              className="p-0.5 hover:text-rose-600 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-[#004C97]' : ''
            }`}
          />
        </div>
      </button>

      {/* Painel Dropdown com pesquisa e rolagem vertical limitada (sem rolagem horizontal) */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-lg overflow-hidden text-xs animate-in fade-in-50 duration-100"
          style={{ minWidth: '100%', maxWidth: '100%' }}
        >
          {/* Campo de Busca interno */}
          <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar motivo por palavra-chave ou categoria..."
              className="h-7 text-xs bg-white border-slate-300 focus-visible:ring-1 focus-visible:ring-[#004C97]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dica da priorização pelo Tipo */}
          <div className="px-2.5 py-1 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-[10px] text-blue-900">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-[#004C97]" />
              Priorizados para <strong>{restrictionType}</strong>
            </span>
            <span className="text-slate-500 font-mono">
              {RESTRICTION_REASONS_CATALOG.length} motivos disponíveis
            </span>
          </div>

          {/* Lista com rolagem estritamente vertical */}
          <div
            tabIndex={0}
            aria-label="Lista de motivos da restrição"
            className="max-h-60 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 focus:outline-none"
          >
            {totalResults === 0 ? (
              <div className="p-4 text-center text-slate-500 text-[11px]">
                Nenhum motivo encontrado para &quot;{searchQuery}&quot;.
              </div>
            ) : (
              <>
                {/* 1. Motivos Priorizados para o Tipo selecionado */}
                {filteredPrioritized.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-slate-100/95 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-[#004C97] uppercase tracking-wider flex items-center justify-between z-10 border-b border-slate-200">
                      <span>★ Mais relacionados ({filteredPrioritized.length})</span>
                      <span className="text-[9px] font-normal lowercase text-slate-500">
                        tipo {restrictionType}
                      </span>
                    </div>
                    {filteredPrioritized.map((item) => {
                      const isSelected = value === item.label
                      return (
                        <button
                          type="button"
                          key={`prio-${item.label}`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(item)}
                          title={`${item.label} (${item.category})`}
                          className={`w-full text-left px-2.5 py-1.5 flex items-start justify-between gap-2 transition-colors hover:bg-blue-50/70 ${
                            isSelected
                              ? 'bg-blue-100/60 font-semibold text-[#004C97]'
                              : 'text-slate-800'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="truncate text-xs leading-tight" title={item.label}>
                              {item.label}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {item.category}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4 bg-blue-50 text-[#004C97] border-blue-200 font-normal"
                            >
                              Sugerido
                            </Badge>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#004C97]" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* 2. Demais Motivos (todos continuam selecionáveis) */}
                {filteredOthers.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-slate-100/95 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between z-10 border-b border-slate-200">
                      <span>Demais motivos ({filteredOthers.length})</span>
                      <span className="text-[9px] font-normal lowercase text-slate-400">
                        todos selecionáveis
                      </span>
                    </div>
                    {filteredOthers.map((item) => {
                      const isSelected = value === item.label
                      return (
                        <button
                          type="button"
                          key={`other-${item.label}`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(item)}
                          title={`${item.label} (${item.category})`}
                          className={`w-full text-left px-2.5 py-1.5 flex items-start justify-between gap-2 transition-colors hover:bg-slate-50 ${
                            isSelected
                              ? 'bg-blue-100/60 font-semibold text-[#004C97]'
                              : 'text-slate-800'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="truncate text-xs leading-tight" title={item.label}>
                              {item.label}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {item.category}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            <span className="text-[9px] text-slate-400">
                              {item.category.split('/')[0].trim()}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#004C97]" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
