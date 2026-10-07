import React from 'react'
import {
  Building2,
  Calendar,
  Filter,
  RotateCcw,
  Search,
  Sparkles,
  Info,
  Layers,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IndustrializadorEntity,
  IndustrializerFilterParams,
} from '@/services/gestao-industrializador-service'

interface IndustrializerHeaderFilterProps {
  title: string
  subtitle: string
  activeSubtopic: 'mp' | 'carteira' | 'sequenciamento' | 'estoque'
  industrializadores: IndustrializadorEntity[]
  filters: IndustrializerFilterParams
  onFiltersChange: (newFilters: IndustrializerFilterParams) => void
  onRefresh: () => void
  onOpenSettings?: () => void
  officialSource: string
  lastSyncAt: string
}

export const IndustrializerHeaderFilter: React.FC<IndustrializerHeaderFilterProps> = ({
  title,
  subtitle,
  activeSubtopic,
  industrializadores,
  filters,
  onFiltersChange,
  onRefresh,
  onOpenSettings,
  officialSource,
  lastSyncAt,
}) => {
  const handleInputChange = (field: keyof IndustrializerFilterParams, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    })
  }

  const handleReset = () => {
    onFiltersChange({
      industrializerCode: 'ALL',
      materialCode: '',
      description: '',
      steelGrade: '',
      dimension: '',
      centerLine: '',
      status: '',
      programmingMonth: '',
      sapOrder: '',
      productionOrder: '',
      clientName: '',
      storageDeposit: '',
    })
  }

  const formattedSync = React.useMemo(() => {
    if (!lastSyncAt) return 'N/D'
    try {
      const d = new Date(lastSyncAt)
      if (isNaN(d.getTime())) return lastSyncAt
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return lastSyncAt
    }
  }, [lastSyncAt])

  return (
    <div className="space-y-3">
      {/* Faixa Superior: Título, Metadados Oficiais e Ações */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004C97]/10 border border-[#004C97]/20 flex items-center justify-center text-[#004C97] shrink-0 mt-0.5">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                PCP ROBOTIZADO &bull; GESTÃO INDUSTRIALIZADOR
              </span>
              <Badge className="bg-[#004C97] text-white text-[10px] px-2 py-0.2">
                Camada Integradora
              </Badge>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">{title}</h1>
            <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Informações Oficiais e Botões */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 text-xs">
          <div className="flex flex-col sm:items-end text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Database className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Fonte oficial:</span>
              <span className="font-semibold text-slate-900">{officialSource}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Última sincronização:{' '}
              <span className="font-mono text-slate-700">{formattedSync}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="text-xs gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Sincronizar com SAP e bases PCP"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            Atualizar
          </Button>

          {onOpenSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              className="text-xs gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
              Parâmetros
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros Unificados e Estruturais */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-[#004C97]" />
            <span>Filtros Estruturais Compartilhados</span>
            <span className="text-[10px] text-slate-500 font-normal">
              (Industrializador é dimensão primária mandatória)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900"
          >
            Limpar filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
          {/* 1. INDUSTRIALIZADOR (OBRIGATÓRIO / MULTI-INDUSTRIALIZADOR) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-700 flex items-center gap-1">
              <span>Industrializador</span>
              <span className="text-red-500">*</span>
            </label>
            <select
              aria-label="Selecionar Industrializador"
              value={filters.industrializerCode || 'ALL'}
              onChange={(e) => handleInputChange('industrializerCode', e.target.value)}
              className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="ALL">Todos os Industrializadores</option>
              {industrializadores.map((ind) => (
                <option key={ind.code} value={ind.code}>
                  {ind.name} ({ind.code})
                </option>
              ))}
            </select>
          </div>

          {/* 2. CÓDIGO DO MATERIAL / MP */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-600">Material / MP</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: TAR-130X130 ou BAR-RED"
                value={filters.materialCode || ''}
                onChange={(e) => handleInputChange('materialCode', e.target.value)}
                className="w-full h-8 pl-7 pr-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 3. AÇO / QUALIDADE */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-600">Aço / Norma</label>
            <input
              type="text"
              placeholder="Ex: 1020 AI, 1045, ST52"
              value={filters.steelGrade || ''}
              onChange={(e) => handleInputChange('steelGrade', e.target.value)}
              className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            />
          </div>

          {/* 4. FORMA / DIMENSÃO */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-600">Forma / Dimensão</label>
            <input
              type="text"
              placeholder='Ex: 130x130, Ø 3/8", 150x150'
              value={filters.dimension || ''}
              onChange={(e) => handleInputChange('dimension', e.target.value)}
              className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            />
          </div>

          {/* 5. CENTRO / LINHA */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-600">Centro / Linha</label>
            <select
              aria-label="Selecionar Centro ou Linha"
              value={filters.centerLine || ''}
              onChange={(e) => handleInputChange('centerLine', e.target.value)}
              className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="">Todos os Centros/Linhas</option>
              <option value="L1">L1 — Laminação 1 (CFPL)</option>
              <option value="L2">L2 — Laminação 2</option>
              <option value="CFPL">CFPL — Centro Fabril Ciafal</option>
              <option value="SDPL">SDPL — Sidercentro</option>
            </select>
          </div>

          {/* 6. STATUS OPERACIONAL */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-600">Status</label>
            <select
              aria-label="Selecionar Status"
              value={filters.status || ''}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="">Todos os Status</option>
              <option value="VERDE">Verde (Normal / No Prazo)</option>
              <option value="AMARELO">Amarelo (Atenção / Parcial)</option>
              <option value="VERMELHO">Vermelho (Crítico / Atrasado)</option>
              <option value="AZUL">Azul (Programação Futura)</option>
            </select>
          </div>

          {/* Filtros complementares por subtópico quando aplicável */}
          {activeSubtopic === 'carteira' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600">Pedido SAP</label>
                <input
                  type="text"
                  placeholder="Ex: 45008912"
                  value={filters.sapOrder || ''}
                  onChange={(e) => handleInputChange('sapOrder', e.target.value)}
                  className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600">Cliente</label>
                <input
                  type="text"
                  placeholder="Filtrar cliente..."
                  value={filters.clientName || ''}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                />
              </div>
            </>
          )}

          {activeSubtopic === 'sequenciamento' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600">Mês Programação</label>
                <select
                  aria-label="Selecionar Mês de Programação"
                  value={filters.programmingMonth || ''}
                  onChange={(e) => handleInputChange('programmingMonth', e.target.value)}
                  className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                >
                  <option value="">Todos os Meses</option>
                  <option value="2026-03">Março/2026</option>
                  <option value="2026-04">Abril/2026</option>
                  <option value="2026-05">Maio/2026</option>
                  <option value="2026-09">Setembro/2026</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600">
                  Ordem Produção (OP)
                </label>
                <input
                  type="text"
                  placeholder="Ex: OP-88201"
                  value={filters.productionOrder || ''}
                  onChange={(e) => handleInputChange('productionOrder', e.target.value)}
                  className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                />
              </div>
            </>
          )}

          {activeSubtopic === 'estoque' && (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-600">Depósito SAP</label>
              <select
                aria-label="Selecionar Depósito SAP"
                value={filters.storageDeposit || ''}
                onChange={(e) => handleInputChange('storageDeposit', e.target.value)}
                className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="">Todos os Depósitos</option>
                <option value="DP18">DP18 — Tarugos Inteiros Pátio</option>
                <option value="DP07">DP07 — Preparação & Tarugos Cortados</option>
                <option value="DP09">DP09 — Semiacabado Laminação</option>
                <option value="DP08">DP08 — Semiacabado Intermediário</option>
                <option value="DP24">DP24 — Produto Acabado</option>
                <option value="DP30">DP30 — Expedição de Acabados</option>
                <option value="TRANSITO">Em Trânsito (TMS/Transporte)</option>
                <option value="EXTERNO">Externo (No Industrializador)</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default IndustrializerHeaderFilter
