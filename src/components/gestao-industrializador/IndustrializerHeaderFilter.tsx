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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  IndustrializadorEntity,
  IndustrializerFilterParams,
} from '@/services/gestao-industrializador-service'

export interface CompanyOption {
  code: string
  name: string
  werks?: string
  displayLabel: string
}

export interface LineOption {
  code: string
  name: string
  companyCode?: string
  sapWorkCenter?: string
}

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
  availableCompanies?: CompanyOption[]
  availableLines?: LineOption[]
  headerControls?: React.ReactNode
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
  availableCompanies = [],
  availableLines = [],
  headerControls,
}) => {
  const handleInputChange = (field: keyof IndustrializerFilterParams, value: string) => {
    // Cascata especial para Empresa -> reseta Linha se a linha atual não pertencer à nova empresa
    if (field === 'companyCode') {
      const newCompany = value
      let newLine = filters.lineCode || ''
      if (newCompany && newCompany !== 'ALL') {
        const lineStillValid = availableLines.some(
          (l) => l.code === newLine && (!l.companyCode || l.companyCode === newCompany),
        )
        if (!lineStillValid) {
          newLine = ''
        }
      }
      onFiltersChange({
        ...filters,
        companyCode: newCompany,
        lineCode: newLine,
        centerLine: newLine,
      })
      return
    }

    if (field === 'lineCode') {
      onFiltersChange({
        ...filters,
        lineCode: value,
        centerLine: value,
      })
      return
    }

    onFiltersChange({
      ...filters,
      [field]: value,
    })
  }

  const handleReset = () => {
    onFiltersChange({
      companyCode: 'ALL',
      industrializerCode: 'ALL',
      lineCode: '',
      centerLine: '',
      materialCode: '',
      description: '',
      steelGrade: '',
      dimension: '',
      status: '',
      programmingMonth: '',
      sapOrder: '',
      productionOrder: '',
      clientName: '',
      storageDeposit: '',
    })
  }

  // Linhas filtradas em cascata pela Empresa selecionada
  const filteredLines = React.useMemo(() => {
    if (!filters.companyCode || filters.companyCode === 'ALL') {
      return availableLines
    }
    return availableLines.filter(
      (l) => !l.companyCode || l.companyCode.toUpperCase() === filters.companyCode?.toUpperCase(),
    )
  }, [availableLines, filters.companyCode])

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
    <div className="space-y-2.5">
      {/* Cabeçalho Compacto Padrão HUB Ciafal (sem faixas gigantes, sem badge, tipografia padronizada) */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-[#004C97]/10 border border-[#004C97]/20 flex items-center justify-center text-[#004C97] shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-bold text-slate-900 tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[13px] text-slate-600 truncate leading-snug">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* À Direita: Rastreabilidade discreta via tooltip + Controles adicionais + Ações [Atualizar] [Parâmetros] */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {headerControls}

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  data-testid="last-sync-badge"
                  onClick={onOpenSettings}
                  role="button"
                  tabIndex={0}
                >
                  <Info className="w-3.5 h-3.5 text-[#004C97]" />
                  <span>
                    Atualizado <span className="font-semibold text-slate-800">{formattedSync}</span>
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-slate-900 text-white max-w-xs p-2.5">
                <p className="font-bold text-[11px] text-blue-200 mb-0.5">Rastreabilidade Oficial</p>
                <p className="text-[11px]">Fonte: {officialSource || 'SAP ECC (MB52 / MD04 / ZSD28C / RFC) & PocketBase PCP'}</p>
                <p className="text-[10px] text-slate-300 mt-1">Clique para abrir Parâmetros e detalhes da integração.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-8 text-xs gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            title="Atualizar dados oficiais"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            Atualizar
          </Button>

          {onOpenSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              className="h-8 text-xs gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
              title="Ajustar parâmetros de semáforo e ver integração"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
              Parâmetros
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros Compacta e Responsiva */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-[#004C97]" />
            <span>Filtros</span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-pointer text-slate-400 hover:text-slate-600">
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs bg-slate-900 text-white">
                  Industrializador é dimensão primária mandatória de recorte.
                </TooltipContent>
              </TooltipProvider>
            </Tooltip>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 font-medium"
          >
            Limpar filtros
          </Button>
        </div>

        {activeSubtopic === 'sequenciamento' ? (
          /* GRID OBRIGATÓRIO UNIFICADO DO SEQUENCIAMENTO P x R:
             Ordem exata: Empresa, Industrializador, Linha, Material / MP, Aço / Norma, Forma / Dimensão, Mês de Programação, Ordem de Produção, Status
             Responsividade: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9
             Alturas uniformes h-9, sem campos espremidos nem rolagem horizontal. */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-2.5 text-xs">
            {/* 1. EMPRESA */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Empresa
              </label>
              <select
                aria-label="Selecionar Empresa"
                value={filters.companyCode || 'ALL'}
                onChange={(e) => handleInputChange('companyCode', e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97] truncate"
              >
                <option value="ALL">Todas as Empresas</option>
                {availableCompanies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.displayLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. INDUSTRIALIZADOR */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Industrializador
              </label>
              <select
                aria-label="Selecionar Industrializador"
                value={filters.industrializerCode || 'ALL'}
                onChange={(e) => handleInputChange('industrializerCode', e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97] truncate"
              >
                <option value="ALL">Todos os Ind.</option>
                {industrializadores.map((ind) => (
                  <option key={ind.code} value={ind.code}>
                    {ind.name} ({ind.code})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. LINHA */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Linha
              </label>
              <select
                aria-label="Selecionar Linha"
                value={filters.lineCode || ''}
                onChange={(e) => handleInputChange('lineCode', e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97] truncate"
              >
                <option value="">Todas as Linhas</option>
                {filteredLines.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. MATERIAL / MP */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Material / MP
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Código..."
                  value={filters.materialCode || ''}
                  onChange={(e) => handleInputChange('materialCode', e.target.value)}
                  className="w-full h-9 pl-7 pr-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 5. AÇO / NORMA */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Aço / Norma
              </label>
              <input
                type="text"
                placeholder="Ex: 1020, 1045..."
                value={filters.steelGrade || ''}
                onChange={(e) => handleInputChange('steelGrade', e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              />
            </div>

            {/* 6. FORMA / DIMENSÃO */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Forma / Dimensão
              </label>
              <input
                type="text"
                placeholder='Ex: 130x130, Ø 3/8"'
                value={filters.dimension || ''}
                onChange={(e) => handleInputChange('dimension', e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              />
            </div>

            {/* 7. MÊS DE PROGRAMAÇÃO */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Mês Programação
              </label>
              <select
                aria-label="Selecionar Mês de Programação"
                value={filters.programmingMonth || ''}
                onChange={(e) => handleInputChange('programmingMonth', e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97] truncate"
              >
                <option value="">Todos os Meses</option>
                <option value="2026-03">Março/2026</option>
                <option value="2026-04">Abril/2026</option>
                <option value="2026-05">Maio/2026</option>
                <option value="2026-09">Setembro/2026</option>
              </select>
            </div>

            {/* 8. ORDEM DE PRODUÇÃO */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Ordem Produção
              </label>
              <input
                type="text"
                placeholder="Ex: OP-88201"
                value={filters.productionOrder || ''}
                onChange={(e) => handleInputChange('productionOrder', e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              />
            </div>

            {/* 9. STATUS */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Status
              </label>
              <select
                aria-label="Selecionar Status"
                value={filters.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97] truncate"
              >
                <option value="">Todos</option>
                <option value="VERDE">No Prazo</option>
                <option value="AMARELO">Parcial</option>
                <option value="VERMELHO">Atrasado</option>
                <option value="AZUL">Futura</option>
              </select>
            </div>
          </div>
        ) : (
          /* Grid padrão para as outras abas (carteira, estoque, mp):
             Responsivo padronizado: 1 col mobile, 2 tablet pequeno, 3-4 notebook, até 6 desktop largo.
             Alturas uniformes h-9, labels alinhados, cantos consistentes */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 text-xs">
            {/* 1. INDUSTRIALIZADOR */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 flex items-center gap-1 truncate block">
                <span>Industrializador</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                aria-label="Selecionar Industrializador"
                value={filters.industrializerCode || 'ALL'}
                onChange={(e) => handleInputChange('industrializerCode', e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97] truncate"
              >
                <option value="ALL">Todos os Ind.</option>
                {industrializadores.map((ind) => (
                  <option key={ind.code} value={ind.code}>
                    {ind.name} ({ind.code})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. CÓDIGO DO MATERIAL / MP */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Material / MP
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Código..."
                  value={filters.materialCode || ''}
                  onChange={(e) => handleInputChange('materialCode', e.target.value)}
                  className="w-full h-9 pl-7 pr-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 3. AÇO / QUALIDADE */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Aço / Norma
              </label>
              <input
                type="text"
                placeholder="Ex: 1020, 1045..."
                value={filters.steelGrade || ''}
                onChange={(e) => handleInputChange('steelGrade', e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              />
            </div>

            {/* 4. FORMA / DIMENSÃO */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Forma / Dimensão
              </label>
              <input
                type="text"
                placeholder='Ex: 130x130, Ø 3/8"'
                value={filters.dimension || ''}
                onChange={(e) => handleInputChange('dimension', e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              />
            </div>

            {/* 5. CENTRO / LINHA */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Centro / Linha
              </label>
              <select
                aria-label="Selecionar Centro ou Linha"
                value={filters.centerLine || ''}
                onChange={(e) => handleInputChange('centerLine', e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97] truncate"
              >
                <option value="">Todos Centros/Linhas</option>
                <option value="L1">L1 — Laminação 1 (CFPL)</option>
                <option value="L2">L2 — Laminação 2</option>
                <option value="CFPL">CFPL — Centro Fabril Ciafal</option>
                <option value="SDPL">SDPL — Sidercentro</option>
              </select>
            </div>

            {/* 6. STATUS OPERACIONAL */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                Status
              </label>
              <select
                aria-label="Selecionar Status"
                value={filters.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97] truncate"
              >
                <option value="">Todos</option>
                <option value="VERDE">No Prazo / Normal</option>
                <option value="AMARELO">Atenção / Parcial</option>
                <option value="VERMELHO">Crítico / Atrasado</option>
                <option value="AZUL">Futura</option>
              </select>
            </div>

            {activeSubtopic === 'carteira' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                    Pedido SAP
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 45008912"
                    value={filters.sapOrder || ''}
                    onChange={(e) => handleInputChange('sapOrder', e.target.value)}
                    className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                    Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Filtrar cliente..."
                    value={filters.clientName || ''}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                  />
                </div>
              </>
            )}

            {activeSubtopic === 'estoque' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-700 truncate block">
                  Depósito SAP
                </label>
                <select
                  aria-label="Selecionar Depósito SAP"
                  value={filters.storageDeposit || ''}
                  onChange={(e) => handleInputChange('storageDeposit', e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97] truncate"
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
        )}
      </div>
    </div>
  )
}
export default IndustrializerHeaderFilter
