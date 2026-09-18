import React from 'react'
import { Sliders, RefreshCw, Plus, CheckCircle2, Layers, Clock } from 'lucide-react'
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type SetupAcertoActiveTab = 'SETUP' | 'ACERTO' | 'COMPATIBILITY'

export interface SetupAcertoHeaderProps {
  lineCode?: string
  lineName?: string
  activeTab: SetupAcertoActiveTab
  onSelectTab: (tab: SetupAcertoActiveTab) => void
  setupCount: number
  acertoCount: number
  loading?: boolean
  onRefresh?: () => void
  onOpenNewSetup?: () => void
  onOpenNewAcerto?: () => void
}

/**
 * Componente ÚNICO compartilhado para cabeçalho, subtítulo e abas
 * da Matriz Operacional de Setup & Acerto.
 *
 * Garante:
 * - Mesma estrutura em todas as abas
 * - [ Matriz de Setup (X) ] [ Matriz de Acerto (X) ] [ Setup × Acerto ] na mesma linha dentro do mesmo container
 * - Mesma altura, tipografia, raio, padding
 * - Botões padronizados [+ Setup] [+ Acerto]
 * - Sem sobreposição, sem deslocamento ao alternar
 */
export const SetupAcertoSharedHeader: React.FC<SetupAcertoHeaderProps> = ({
  lineCode,
  activeTab,
  onSelectTab,
  setupCount,
  acertoCount,
  loading = false,
  onRefresh,
  onOpenNewSetup,
  onOpenNewAcerto,
}) => {
  return (
    <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
      {/* 1. TÍTULO E SUBTÍTULO PADRÃO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-md bg-blue-100/70 text-[#004C97] shrink-0">
              <Sliders className="w-4 h-4" />
            </span>
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
              MATRIZ OPERACIONAL DE SETUP & ACERTO
            </CardTitle>
            {lineCode && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 text-xs font-bold px-2 py-0.5"
              >
                {lineCode}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1 leading-relaxed">
            Parametrização técnica de trocas de produto e tempos de acerto para sequenciamento
            robotizado CIAFAL.
          </CardDescription>
        </div>

        {/* BOTÃO ATUALIZAR GLOBAL */}
        {onRefresh && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        )}
      </div>

      {/* 2. BARRA DE ABAS UNIFICADA + BOTÕES DE AÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* CONTAINER ÚNICO COMPARTILHADO DAS ABAS */}
        <div
          role="tablist"
          aria-label="Navegação Matriz de Setup e Acerto"
          className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200 gap-1 w-full sm:w-auto overflow-x-auto"
        >
          {/* Aba 1: Matriz de Setup */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'SETUP'}
            onClick={() => onSelectTab('SETUP')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 gap-1.5 ${
              activeTab === 'SETUP'
                ? 'bg-[#004C97] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Matriz de Setup ({setupCount})</span>
          </button>

          {/* Aba 2: Matriz de Acerto */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ACERTO'}
            onClick={() => onSelectTab('ACERTO')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 gap-1.5 ${
              activeTab === 'ACERTO'
                ? 'bg-[#004C97] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Matriz de Acerto ({acertoCount})</span>
          </button>

          {/* Aba 3: Compatibilidade Setup × Acerto */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'COMPATIBILITY'}
            onClick={() => onSelectTab('COMPATIBILITY')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 gap-1.5 ${
              activeTab === 'COMPATIBILITY'
                ? 'bg-[#004C97] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === 'COMPATIBILITY' ? 'text-emerald-300' : 'text-emerald-600'
              }`}
            />
            <span>Compatibilidade Setup × Acerto</span>
          </button>
        </div>

        {/* BOTÕES DE CADASTRO PADRONIZADOS */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {activeTab === 'SETUP' && onOpenNewSetup && (
            <Button
              type="button"
              size="sm"
              onClick={onOpenNewSetup}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold shadow-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" />+ Setup
            </Button>
          )}

          {activeTab === 'ACERTO' && onOpenNewAcerto && (
            <Button
              type="button"
              size="sm"
              onClick={onOpenNewAcerto}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold shadow-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" />+ Acerto
            </Button>
          )}

          {activeTab === 'COMPATIBILITY' && (
            <div className="flex items-center gap-2">
              {onOpenNewSetup && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenNewSetup}
                  className="h-8 text-xs bg-white border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />+ Setup
                </Button>
              )}
              {onOpenNewAcerto && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onOpenNewAcerto}
                  className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold shadow-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />+ Acerto
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </CardHeader>
  )
}
export default SetupAcertoSharedHeader
