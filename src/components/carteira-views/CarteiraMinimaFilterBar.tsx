import React from 'react'
import { Search, Filter, RefreshCw, X, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CarteiraMinimaFilterParams, CriticidadeCarteiraMinima } from '@/types/carteira-minima'

interface CarteiraMinimaFilterBarProps {
  filtros: CarteiraMinimaFilterParams
  aoMudarFiltro?: (novos: Partial<CarteiraMinimaFilterParams>) => void
  onFiltroChange?: (filtros: any) => void
  aoLimparFiltros?: () => void
  onLimparFiltros?: () => void
  aoAtualizarSap?: () => void
  aoGerarPdf?: () => void
  carregandoAtualizacao?: boolean
  totalFiltrado?: number
  totalOriginal?: number
  totalItens?: number
  totalFiltrados?: number
}

export const CarteiraMinimaFilterBar: React.FC<CarteiraMinimaFilterBarProps> = ({
  filtros,
  aoMudarFiltro: aoMudarFiltroProp,
  onFiltroChange,
  aoLimparFiltros: aoLimparFiltrosProp,
  onLimparFiltros,
  aoAtualizarSap = () => {},
  aoGerarPdf = () => {},
  carregandoAtualizacao = false,
  totalFiltrado: totalFiltradoProp,
  totalOriginal: totalOriginalProp,
  totalItens,
  totalFiltrados,
}) => {
  const aoMudarFiltro = (novos: Partial<CarteiraMinimaFilterParams>) => {
    if (aoMudarFiltroProp) aoMudarFiltroProp(novos)
    if (onFiltroChange) {
      onFiltroChange((prev: any) => ({ ...prev, ...novos }))
    }
  }

  const handleLimpar = () => {
    if (aoLimparFiltrosProp) aoLimparFiltrosProp()
    if (onLimparFiltros) onLimparFiltros()
  }

  const totalFiltrado = totalFiltradoProp ?? totalFiltrados ?? 0
  const totalOriginal = totalOriginalProp ?? totalItens ?? 0
  const temFiltroAtivo = Boolean(
    filtros.empresa ||
    filtros.centro ||
    filtros.linha ||
    filtros.material ||
    filtros.pedido ||
    (filtros.criticidade && filtros.criticidade !== 'TODAS') ||
    filtros.dataDesejadaInicio ||
    filtros.dataDesejadaFim,
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-[#004C97] rounded-lg">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Filtros Estruturados
            </h3>
            <p className="text-[11px] text-slate-500">
              Refine por Empresa, Linha/Centro, Material, Pedido, Período e Criticidade
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {temFiltroAtivo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLimpar}
              className="text-xs h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtros
            </Button>
          )}

          {/* Botão com texto exato exigido pela especificação: "Gerar relatório PDF" */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={aoGerarPdf}
            className="text-xs h-8 font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-[#004C97]" />
            Gerar relatório PDF
          </Button>

          {/* Botão com texto exato exigido pela especificação: "Atualizar dados SAP" */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={aoAtualizarSap}
            disabled={carregandoAtualizacao}
            className="text-xs h-8 font-semibold bg-[#004C97] hover:bg-[#003d7a] text-white shadow-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregandoAtualizacao ? 'animate-spin' : ''}`} />
            Atualizar dados SAP
          </Button>
        </div>
      </div>

      {/* Grid de Inputs e Selects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        {/* Empresa */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 block">Empresa</label>
          <select
            value={filtros.empresa || ''}
            onChange={(e) => aoMudarFiltro({ empresa: e.target.value || undefined })}
            className="w-full text-xs h-8 rounded-md border border-slate-300 bg-white px-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="">Todas as Empresas</option>
            <option value="CIAFAL">CIAFAL</option>
            <option value="SIDERCENTRO">SIDERCENTRO</option>
          </select>
        </div>

        {/* Linha / Centro */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 block">Linha / Centro</label>
          <select
            value={filtros.linha || filtros.centro || ''}
            onChange={(e) => {
              const val = e.target.value
              if (!val) {
                aoMudarFiltro({ linha: undefined, centro: undefined })
              } else if (val.startsWith('L') || val.startsWith('LAM')) {
                aoMudarFiltro({ linha: val, centro: undefined })
              } else {
                aoMudarFiltro({ centro: val, linha: undefined })
              }
            }}
            className="w-full text-xs h-8 rounded-md border border-slate-300 bg-white px-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="">Todas as Linhas / Centros</option>
            <option value="L1">Linha 1 (L1)</option>
            <option value="L2">Linha 2 (L2)</option>
            <option value="1100">Centro 1100 (Divinópolis)</option>
            <option value="SDPL">Centro SDPL (Sidercentro)</option>
          </select>
        </div>

        {/* Material */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 block">Material</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Código ou descrição..."
              value={filtros.material || ''}
              onChange={(e) => aoMudarFiltro({ material: e.target.value || undefined })}
              className="pl-8 text-xs h-8 border-slate-300"
            />
          </div>
        </div>

        {/* Pedido */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 block">Pedido</label>
          <Input
            type="text"
            placeholder="Nº Pedido SAP..."
            value={filtros.pedido || ''}
            onChange={(e) => aoMudarFiltro({ pedido: e.target.value || undefined })}
            className="text-xs h-8 border-slate-300"
          />
        </div>

        {/* Período da Data Desejada (Início e Fim) */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 block">
            Data Desejada (De)
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <Input
              type="date"
              value={filtros.dataDesejadaInicio || ''}
              onChange={(e) => aoMudarFiltro({ dataDesejadaInicio: e.target.value || undefined })}
              className="pl-8 text-xs h-8 border-slate-300"
            />
          </div>
        </div>

        {/* Situação / Criticidade */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 block">
            Situação / Criticidade
          </label>
          <select
            value={filtros.criticidade || 'TODAS'}
            onChange={(e) =>
              aoMudarFiltro({
                criticidade: e.target.value as CriticidadeCarteiraMinima | 'TODAS',
              })
            }
            className="w-full text-xs h-8 rounded-md border border-slate-300 bg-white px-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="TODAS">Todas as Situações</option>
            <option value="Crítico">Crítico (Prazo curto / vencido)</option>
            <option value="Atenção">Atenção (Tratamento hábil)</option>
            <option value="Monitoramento">Monitoramento (Perto do mínimo)</option>
          </select>
        </div>
      </div>

      {/* Indicador de resultados filtrados */}
      {totalOriginal > 0 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Exibindo <strong>{totalFiltrado}</strong> de <strong>{totalOriginal}</strong>{' '}
            registro(s)
          </span>
          {temFiltroAtivo && (
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
              Filtros ativos aplicados
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default CarteiraMinimaFilterBar
