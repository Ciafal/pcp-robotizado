import React, { useState, useMemo, useRef, useEffect } from 'react'
import { SgqDocument } from '@/services/sgq-document-provider'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'

export interface SgqDocumentMultiSelectProps {
  availableDocs: SgqDocument[]
  selectedDocs: SgqDocument[]
  onChange: (docs: SgqDocument[]) => void
  disabled?: boolean
  maxVisibleChips?: number
  placeholder?: string
  id?: string
}

export const SgqDocumentMultiSelect: React.FC<SgqDocumentMultiSelectProps> = ({
  availableDocs,
  selectedDocs,
  onChange,
  disabled = false,
  maxVisibleChips = 4,
  placeholder = 'Selecione um ou mais documentos SGQ...',
  id = 'sgq-doc-multi-select',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isChipsExpanded, setIsChipsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtragem dos documentos da base SGQ
  const filteredDocs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return availableDocs

    return availableDocs.filter((doc) => {
      return (
        doc.code.toLowerCase().includes(term) ||
        doc.title.toLowerCase().includes(term) ||
        (doc.revision && doc.revision.toLowerCase().includes(term)) ||
        (doc.status && doc.status.toLowerCase().includes(term)) ||
        (doc.process && doc.process.toLowerCase().includes(term)) ||
        (doc.responsibleArea && doc.responsibleArea.toLowerCase().includes(term))
      )
    })
  }, [availableDocs, searchTerm])

  const selectedIds = useMemo(() => {
    return new Set(selectedDocs.map((d) => d.id))
  }, [selectedDocs])

  const handleToggleDoc = (doc: SgqDocument) => {
    if (disabled) return
    const isObsolete = doc.status === 'OBSOLETO' || doc.status === 'CANCELADO'
    if (isObsolete) return

    if (selectedIds.has(doc.id)) {
      onChange(selectedDocs.filter((d) => d.id !== doc.id))
    } else {
      onChange([...selectedDocs, doc])
    }
  }

  const handleRemoveDoc = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    if (disabled) return
    onChange(selectedDocs.filter((d) => d.id !== docId))
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onChange([])
  }

  const visibleChips = isChipsExpanded ? selectedDocs : selectedDocs.slice(0, maxVisibleChips)
  const hiddenCount = selectedDocs.length - visibleChips.length

  return (
    <div className="relative w-full space-y-2 text-xs" ref={containerRef} id={id}>
      {/* Box do Combobox / Trigger */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) setIsOpen((prev) => !prev)
          } else if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className={`w-full min-h-[42px] px-3 py-2 rounded-md border bg-white flex items-center justify-between gap-2 cursor-pointer transition-colors shadow-sm ${
          disabled
            ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
            : isOpen
              ? 'border-blue-600 ring-2 ring-blue-100'
              : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex-1 flex items-center flex-wrap gap-1.5 min-w-0">
          {selectedDocs.length === 0 ? (
            <span className="text-slate-400 text-xs truncate">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap w-full">
              <span className="font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px] shrink-0 flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-700" />
                {selectedDocs.length}{' '}
                {selectedDocs.length === 1 ? 'documento selecionado' : 'documentos selecionados'}
              </span>
              <span className="text-slate-400 text-[11px]">•</span>
              <span className="text-slate-600 text-[11px] truncate">
                {selectedDocs.map((d) => d.code).join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {selectedDocs.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Limpar seleção"
              className="p-1 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-700' : ''
            }`}
          />
        </div>
      </div>

      {/* CHIPS / TAGS DOS SELECIONADOS COM REMOÇÃO INDIVIDUAL */}
      {selectedDocs.length > 0 && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span className="flex items-center gap-1 text-blue-900">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              Documentos SGQ vinculados ({selectedDocs.length}):
            </span>
            {selectedDocs.length > maxVisibleChips && (
              <button
                type="button"
                onClick={() => setIsChipsExpanded((prev) => !prev)}
                className="text-blue-700 hover:text-blue-900 font-medium hover:underline flex items-center gap-0.5 text-[11px]"
              >
                {isChipsExpanded ? (
                  <>
                    Recolher chips <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Expandir todos (+{hiddenCount}) <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {visibleChips.map((doc) => (
              <span
                key={doc.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white text-slate-800 border border-slate-300 text-xs shadow-xs"
              >
                <span className="font-mono font-bold text-blue-900">{doc.code}</span>
                <span className="text-[10px] text-slate-500 font-mono">({doc.revision})</span>
                <span
                  className={`text-[9px] px-1 py-0 rounded ${
                    doc.status === 'VIGENTE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {doc.status}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveDoc(e, doc.id)}
                    aria-label={`Remover ${doc.code}`}
                    className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}

            {!isChipsExpanded && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setIsChipsExpanded(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs hover:bg-blue-100 font-medium cursor-pointer"
              >
                + {hiddenCount} documento(s)
              </button>
            )}
          </div>
        </div>
      )}

      {/* DROPDOWN FLUTUANTE COM PESQUISA, CHECKBOXES E SCROLL */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
          style={{ maxHeight: '380px' }}
        >
          {/* Header de Busca e Seleção Rápida */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                type="text"
                autoFocus
                placeholder="Buscar por código (PO, IT, NO), título, revisão, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-300 focus:border-blue-600"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
              <span>
                Exibindo {filteredDocs.length} de {availableDocs.length} documentos oficiais
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const validDocs = filteredDocs.filter(
                      (d) => d.status !== 'OBSOLETO' && d.status !== 'CANCELADO',
                    )
                    // União sem duplicatas
                    const map = new Map<string, SgqDocument>()
                    selectedDocs.forEach((d) => map.set(d.id, d))
                    validDocs.forEach((d) => map.set(d.id, d))
                    onChange(Array.from(map.values()))
                  }}
                  className="text-blue-700 hover:underline font-medium"
                >
                  Selecionar visíveis
                </button>
                {selectedDocs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="text-rose-600 hover:underline font-medium"
                  >
                    Desmarcar todos
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Lista com Scroll Interno */}
          <div
            role="listbox"
            aria-multiselectable="true"
            className="overflow-y-auto divide-y divide-slate-100 max-h-60"
          >
            {filteredDocs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs space-y-1">
                <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
                <p>Nenhum documento SGQ encontrado com o filtro informado.</p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = selectedIds.has(doc.id)
                const isObsolete = doc.status === 'OBSOLETO' || doc.status === 'CANCELADO'

                return (
                  <div
                    key={doc.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleToggleDoc(doc)}
                    className={`p-2.5 flex items-start gap-3 transition-colors ${
                      isObsolete
                        ? 'opacity-40 bg-slate-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-blue-50/70 border-l-4 border-l-blue-700 cursor-pointer'
                          : 'hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <div className="pt-0.5">
                      <Checkbox
                        checked={isSelected}
                        disabled={isObsolete}
                        onCheckedChange={() => handleToggleDoc(doc)}
                        className="data-[state=checked]:bg-blue-800 data-[state=checked]:border-blue-800"
                        id={`sgq-chk-${doc.id}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      {/* Código | Documento | Revisão | Status */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-blue-900 text-xs">
                          {doc.code}
                        </span>
                        <span className="text-slate-300">|</span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] px-1 py-0 border-slate-300"
                        >
                          {doc.revision}
                        </Badge>
                        <span className="text-slate-300">|</span>
                        <span
                          className={`text-[10px] px-1.5 py-0 rounded font-semibold ${
                            doc.status === 'VIGENTE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                        {doc.documentType && (
                          <span className="text-[10px] text-slate-500">• {doc.documentType}</span>
                        )}
                      </div>

                      <p className="font-medium text-slate-800 text-xs truncate" title={doc.title}>
                        {doc.title}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>Área: {doc.responsibleArea || 'PCP'}</span>
                        <span>•</span>
                        <span>Processo: {doc.process || 'Geral'}</span>
                        {doc.validityDateStart && (
                          <>
                            <span>•</span>
                            <span>Vigência: {doc.validityDateStart}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-blue-700 shrink-0 pt-0.5">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer do Dropdown */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              {selectedDocs.length}{' '}
              {selectedDocs.length === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 px-3 text-xs bg-blue-800 hover:bg-blue-900 text-white"
            >
              Concluir Seleção
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SgqDocumentMultiSelect
