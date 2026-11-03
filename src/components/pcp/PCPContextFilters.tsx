import React from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface FilterOptionItem {
  code: string
  name: string
  companyCode?: string
  plantCode?: string
  lineCode?: string
  status?: string
}

export interface PCPContextFiltersProps {
  // Valores atuais
  companyCode: string
  plantCode: string
  lineCode: string
  centerCode?: string

  // Opções de catálogo
  companies: FilterOptionItem[]
  plants: FilterOptionItem[]
  lines: FilterOptionItem[]
  centers?: FilterOptionItem[]

  // Callbacks de alteração
  onCompanyChange: (companyCode: string) => void
  onPlantChange: (plantCode: string) => void
  onLineChange: (lineCode: string) => void
  onCenterChange?: (centerCode: string) => void

  // Flags de controle de exibição
  showCompany?: boolean
  showPlant?: boolean
  showLine?: boolean
  showCenter?: boolean

  // Labels personalizados
  companyLabel?: string
  plantLabel?: string
  lineLabel?: string
  centerLabel?: string

  // Placeholders / Consolidado
  allowConsolidatedCompany?: boolean
  allowConsolidatedPlant?: boolean
  allowConsolidatedLine?: boolean
  allowConsolidatedCenter?: boolean

  companyAllText?: string
  plantAllText?: string
  lineAllText?: string
  centerAllText?: string

  // Estados de carregamento e desabilitação
  isLoading?: boolean
  disabled?: boolean

  // Zona de Ações (Linha 2 dedicada)
  actions?: React.ReactNode

  // Identificador de escopo para ids/htmlFor acessíveis
  idPrefix?: string
  className?: string
}

/**
 * Componente global reutilizável PCPContextFilters.
 *
 * Estrutura:
 * - Linha 1: Grade de selects independentes com label individual acima (Empresa, Planta, Linha, Centro),
 *   grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 com minmax(0,1fr).
 * - Linha 2: Zona própria de botões de ação (Atualizar, Camadas, Analisar com IA, Alertas, etc.),
 *   NUNCA na mesma linha disputando largura com os selects.
 *
 * Selects: altura 40px (h-10), rounded-md, borda cinza suave, hover discreto, focus ring azul CIAFAL #004C97,
 * disabled claro, loading indicado, nomes longos truncados com reticências + tooltip (title) sem deformar o layout.
 *
 * Acessibilidade: labels com htmlFor/id, navegação por teclado, foco visível, contraste AA.
 */
export const PCPContextFilters: React.FC<PCPContextFiltersProps> = ({
  companyCode,
  plantCode,
  lineCode,
  centerCode = 'ALL',
  companies = [],
  plants = [],
  lines = [],
  centers = [],
  onCompanyChange,
  onPlantChange,
  onLineChange,
  onCenterChange,
  showCompany = true,
  showPlant = true,
  showLine = true,
  showCenter = true,
  companyLabel = 'Empresa',
  plantLabel = 'Planta',
  lineLabel = 'Linha',
  centerLabel = 'Centro',
  allowConsolidatedCompany = false,
  allowConsolidatedPlant = true,
  allowConsolidatedLine = true,
  allowConsolidatedCenter = true,
  companyAllText = 'Todas as Empresas',
  plantAllText = 'Todas as Plantas',
  lineAllText = 'Todas as Linhas',
  centerAllText = 'Todos os Centros',
  isLoading = false,
  disabled = false,
  actions,
  idPrefix = 'pcp-ctx',
  className = '',
}) => {
  // Cascata reativa interna defensiva para opções disponíveis
  const availablePlants = React.useMemo(() => {
    if (!companyCode || companyCode === 'ALL') return plants
    return plants.filter((p) => !p.companyCode || p.companyCode === companyCode)
  }, [companyCode, plants])

  const availableLines = React.useMemo(() => {
    return lines.filter((l) => {
      if (companyCode && companyCode !== 'ALL' && l.companyCode && l.companyCode !== companyCode) {
        return false
      }
      if (plantCode && plantCode !== 'ALL' && l.plantCode && l.plantCode !== plantCode) {
        return false
      }
      return true
    })
  }, [companyCode, plantCode, lines])

  const availableCenters = React.useMemo(() => {
    if (!centers || centers.length === 0) return []
    return centers.filter((c) => {
      if (lineCode && lineCode !== 'ALL' && c.lineCode && c.lineCode !== lineCode) {
        return false
      }
      return true
    })
  }, [lineCode, centers])

  // Helpers para obter nomes selecionados com tooltip
  const selectedCompanyName = React.useMemo(() => {
    if (companyCode === 'ALL') return companyAllText
    const found = companies.find((c) => c.code === companyCode)
    return found ? `${found.code} (${found.name})` : companyCode
  }, [companyCode, companies, companyAllText])

  const selectedPlantName = React.useMemo(() => {
    if (plantCode === 'ALL') return plantAllText
    const found = availablePlants.find((p) => p.code === plantCode)
    return found ? found.name : plantCode
  }, [plantCode, availablePlants, plantAllText])

  const selectedLineName = React.useMemo(() => {
    if (lineCode === 'ALL') return lineAllText
    const found = availableLines.find((l) => l.code === lineCode)
    return found ? `${found.code} - ${found.name}` : lineCode
  }, [lineCode, availableLines, lineAllText])

  const selectedCenterName = React.useMemo(() => {
    if (centerCode === 'ALL') return centerAllText
    const found = availableCenters.find((c) => c.code === centerCode)
    return found ? `${found.code} - ${found.name}` : centerCode
  }, [centerCode, availableCenters, centerAllText])

  const companyInputId = `${idPrefix}-company`
  const plantInputId = `${idPrefix}-plant`
  const lineInputId = `${idPrefix}-line`
  const centerInputId = `${idPrefix}-center`

  // Contagem de colunas ativas para grid fluida
  const activeCount = [showCompany, showPlant, showLine, showCenter].filter(Boolean).length
  const gridColsClass =
    activeCount === 1
      ? 'grid-cols-1'
      : activeCount === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : activeCount === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'

  return (
    <div
      className={`w-full bg-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-3.5 shadow-2xs ${className}`}
      data-testid="pcp-context-filters"
    >
      {/* LINHA 1: Grade de selects independentes com label individual acima */}
      <div className={`grid ${gridColsClass} gap-3 sm:gap-4 items-end`}>
        {/* 1. Empresa */}
        {showCompany && (
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label
              htmlFor={companyInputId}
              className="text-xs font-bold text-slate-700 tracking-tight"
            >
              {companyLabel}
            </Label>
            <Select
              value={companyCode || 'ALL'}
              onValueChange={onCompanyChange}
              disabled={disabled || isLoading}
            >
              <SelectTrigger
                id={companyInputId}
                aria-label={companyLabel}
                title={selectedCompanyName}
                className="h-10 text-xs sm:text-sm bg-white border border-slate-300 rounded-md px-3 font-medium text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004C97] focus:border-[#004C97] transition-colors truncate"
              >
                <SelectValue placeholder={companyAllText} />
              </SelectTrigger>
              <SelectContent>
                {allowConsolidatedCompany && <SelectItem value="ALL">{companyAllText}</SelectItem>}
                {companies.map((c) => (
                  <SelectItem key={c.code} value={c.code} title={`${c.code} (${c.name})`}>
                    {c.code} ({c.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 2. Planta */}
        {showPlant && (
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label
              htmlFor={plantInputId}
              className="text-xs font-bold text-slate-700 tracking-tight"
            >
              {plantLabel}
            </Label>
            <Select
              value={plantCode || 'ALL'}
              onValueChange={onPlantChange}
              disabled={disabled || isLoading}
            >
              <SelectTrigger
                id={plantInputId}
                aria-label={plantLabel}
                title={selectedPlantName}
                className="h-10 text-xs sm:text-sm bg-white border border-slate-300 rounded-md px-3 font-medium text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004C97] focus:border-[#004C97] transition-colors truncate"
              >
                <SelectValue placeholder={plantAllText} />
              </SelectTrigger>
              <SelectContent>
                {allowConsolidatedPlant && <SelectItem value="ALL">{plantAllText}</SelectItem>}
                {availablePlants.map((p) => (
                  <SelectItem key={p.code} value={p.code} title={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 3. Linha */}
        {showLine && (
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label
              htmlFor={lineInputId}
              className="text-xs font-bold text-slate-700 tracking-tight"
            >
              {lineLabel}
            </Label>
            <Select
              value={lineCode || 'ALL'}
              onValueChange={onLineChange}
              disabled={disabled || isLoading}
            >
              <SelectTrigger
                id={lineInputId}
                aria-label={lineLabel}
                title={selectedLineName}
                className="h-10 text-xs sm:text-sm bg-white border border-slate-300 rounded-md px-3 font-medium text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004C97] focus:border-[#004C97] transition-colors truncate"
              >
                <SelectValue placeholder={lineAllText} />
              </SelectTrigger>
              <SelectContent>
                {allowConsolidatedLine && <SelectItem value="ALL">{lineAllText}</SelectItem>}
                {availableLines.map((l) => (
                  <SelectItem key={l.code} value={l.code} title={`${l.code} - ${l.name}`}>
                    {l.code} - {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 4. Centro */}
        {showCenter && (
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label
              htmlFor={centerInputId}
              className="text-xs font-bold text-slate-700 tracking-tight flex items-center justify-between"
            >
              <span>{centerLabel}</span>
              {availableCenters.length === 0 && lineCode !== 'ALL' && (
                <span className="text-[10px] text-amber-700 font-normal">
                  (Sem centro específico)
                </span>
              )}
            </Label>
            <Select
              value={availableCenters.length === 0 ? '' : centerCode || 'ALL'}
              onValueChange={onCenterChange || (() => {})}
              disabled={disabled || isLoading || availableCenters.length === 0}
            >
              <SelectTrigger
                id={centerInputId}
                aria-label={centerLabel}
                title={
                  availableCenters.length === 0
                    ? 'Nenhum centro disponível para a linha selecionada.'
                    : selectedCenterName
                }
                className="h-10 text-xs sm:text-sm bg-white border border-slate-300 rounded-md px-3 font-medium text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004C97] focus:border-[#004C97] transition-colors truncate disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <SelectValue
                  placeholder={
                    availableCenters.length === 0
                      ? 'Nenhum centro disponível para a linha selecionada.'
                      : centerAllText
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {allowConsolidatedCenter && availableCenters.length > 0 && (
                  <SelectItem value="ALL">{centerAllText}</SelectItem>
                )}
                {availableCenters.length === 0 ? (
                  <SelectItem value="NONE" disabled>
                    Nenhum centro disponível para a linha selecionada.
                  </SelectItem>
                ) : (
                  availableCenters.map((c) => (
                    <SelectItem key={c.code} value={c.code} title={`${c.code} - ${c.name}`}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* LINHA 2: Zona própria de botões de ação (NUNCA na mesma linha disputando largura) */}
      {actions && (
        <div
          className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5"
          data-testid="pcp-context-actions"
        >
          {actions}
        </div>
      )}
    </div>
  )
}

export default PCPContextFilters
