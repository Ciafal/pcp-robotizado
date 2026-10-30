import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  Warehouse,
  Boxes,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatNumberPtBr, formatPercentStandard, formatTonsSdc } from '@/lib/number-format'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { LowStockBadge, getLowStockStatus, LowStockStatus } from './LowStockBadge'

export interface LowStockAlertItem {
  id: string
  code: string // Código do material (ex: 'AC', 'Classe A', '1045' ou SAP Material Code)
  description: string // Descrição (ex: 'Comercial', 'Estrutural A', 'SAE 1045 Tratado')
  currentStockTons: number | null // Peso atual em toneladas
  minStockTons: number | null // Estoque mínimo em toneladas
  plantCenter?: string // Centro (ex: 'SDC1', 'CFPL')
  storageDeposit?: string // Depósito (ex: 'DS03', 'DP04', 'KS_DEP')
  coverageDays?: number // Cobertura em dias
  coverageDate?: string // Data estimada
  hasSapData?: boolean // Indicador de sincronização oficial SAP
  poolCode?: string // Código de Pool se vinculado
  rawRowData?: any // Objeto original para repassar ao callback de detalhe
}

interface LowStockAlertPanelProps {
  items: LowStockAlertItem[]
  onSelectMaterial?: (item: LowStockAlertItem) => void
  onRefreshSap?: () => void
  lastSapSyncAttempt?: string
  title?: string
  compact?: boolean
  className?: string
}

export const LowStockAlertPanel: React.FC<LowStockAlertPanelProps> = ({
  items,
  onSelectMaterial,
  onRefreshSap,
  lastSapSyncAttempt = 'Hoje às ' +
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  title = 'Alertas de Estoque Baixo & Atenção',
  compact = false,
  className = '',
}) => {
  const [filterText, setFilterText] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'TODOS' | 'CRITICO' | 'ATENCAO'>('TODOS')

  // Derivação estrita: materiais sem dados SAP ou sem mínimo > 0 NÃO entram no alerta
  const validItemsWithStatus = useMemo(() => {
    return (
      items
        .filter((it) => {
          // Regra permanente: sem dados SAP ou sem estoque mínimo cadastrado não entra no alerta
          if (it.hasSapData === false) return false
          if (it.currentStockTons == null || it.minStockTons == null) return false
          if (isNaN(it.currentStockTons) || isNaN(it.minStockTons)) return false
          if (it.minStockTons <= 0) return false
          return true
        })
        .map((it) => {
          const status = getLowStockStatus(
            it.currentStockTons,
            it.minStockTons,
            it.hasSapData ?? true,
          )
          const pctOfMin = (it.currentStockTons! / it.minStockTons!) * 100
          const deficitTons = Math.max(0, it.minStockTons! - it.currentStockTons!)
          return {
            ...it,
            status,
            pctOfMin,
            deficitTons,
          }
        })
        // Mantém apenas os que estão em alerta (CRÍTICO: < 100% ou ATENÇÃO: <= 110%)
        .filter((it) => it.status === 'CRITICO' || it.status === 'ATENCAO')
        // Ordenação determinística do mais crítico para o menos crítico:
        // 1º: Menor % do mínimo (mais profundo o déficit)
        // 2º: Maior déficit em toneladas
        .sort((a, b) => {
          if (a.pctOfMin !== b.pctOfMin) {
            return a.pctOfMin - b.pctOfMin
          }
          return b.deficitTons - a.deficitTons
        })
    )
  }, [items])

  const filteredItems = useMemo(() => {
    return validItemsWithStatus.filter((it) => {
      const matchText =
        !filterText ||
        it.code.toLowerCase().includes(filterText.toLowerCase()) ||
        it.description.toLowerCase().includes(filterText.toLowerCase()) ||
        (it.storageDeposit && it.storageDeposit.toLowerCase().includes(filterText.toLowerCase()))

      const matchSeverity =
        severityFilter === 'TODOS' ||
        (severityFilter === 'CRITICO' && it.status === 'CRITICO') ||
        (severityFilter === 'ATENCAO' && it.status === 'ATENCAO')

      return matchText && matchSeverity
    })
  }, [validItemsWithStatus, filterText, severityFilter])

  const counts = useMemo(() => {
    const crit = validItemsWithStatus.filter((i) => i.status === 'CRITICO').length
    const aten = validItemsWithStatus.filter((i) => i.status === 'ATENCAO').length
    return { crit, aten, total: crit + aten }
  }, [validItemsWithStatus])

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3 ${className}`}
      data-testid="low-stock-alert-panel"
    >
      {/* Cabeçalho do Painel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">{title}</h3>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                {counts.total} em alerta
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Classificação determinística: Crítico (&lt;100% do mínimo) &bull; Atenção (&le;110% do
              mínimo). Ordenado por criticidade.
            </p>
          </div>
        </div>

        {/* Badges de Contagem Resumo & Filtro Rápido */}
        <div className="flex items-center gap-1.5 flex-wrap self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={() => setSeverityFilter(severityFilter === 'CRITICO' ? 'TODOS' : 'CRITICO')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all flex items-center gap-1 ${
              severityFilter === 'CRITICO'
                ? 'bg-rose-700 text-white border-rose-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>{counts.crit} Crítico</span>
          </button>

          <button
            type="button"
            onClick={() => setSeverityFilter(severityFilter === 'ATENCAO' ? 'TODOS' : 'ATENCAO')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all flex items-center gap-1 ${
              severityFilter === 'ATENCAO'
                ? 'bg-amber-700 text-white border-amber-800'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>{counts.aten} Atenção</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Internos quando há itens */}
      {validItemsWithStatus.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-0.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Buscar por código, descrição ou depósito..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>

          <div className="text-[11px] text-slate-500 font-mono self-end sm:self-auto">
            Mostrando {filteredItems.length} de {validItemsWithStatus.length} itens
          </div>
        </div>
      )}

      {/* Estado Vazio SAP: quando não há dados válidos ou a lista está vazia */}
      {validItemsWithStatus.length === 0 ? (
        <SapEmptyState
          title="NENHUM MATERIAL EM ESTOQUE BAIXO OU AGUARDANDO INTEGRAÇÃO SAP"
          description={`Todos os materiais com mínimo cadastrado encontram-se dentro da margem de segurança (>110% do mínimo) ou estão aguardando sincronização oficial da RFC SAP (ZPP86/MB52). Última checagem: ${lastSapSyncAttempt}.`}
          sapTransaction="RFC ZPP86 / MB52"
          onRefresh={onRefreshSap}
        />
      ) : filteredItems.length === 0 ? (
        <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs">
          Nenhum material encontrado para o filtro aplicado.
        </div>
      ) : (
        /* Lista Compacta de Materiais Críticos / Em Atenção com rolagem interna própria */
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[780px] border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th
                    scope="col"
                    className="py-2.5 px-3 min-w-[200px] text-left text-[10px] uppercase tracking-wider"
                  >
                    Material / Descrição
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3 w-32 text-right text-[10px] uppercase tracking-wider whitespace-nowrap"
                  >
                    Estoque Atual
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3 w-32 text-right text-[10px] uppercase tracking-wider whitespace-nowrap"
                  >
                    Estoque Mínimo
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3 w-28 text-center text-[10px] uppercase tracking-wider whitespace-nowrap"
                  >
                    % Mínimo
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3 w-32 text-center text-[10px] uppercase tracking-wider whitespace-nowrap"
                  >
                    Centro / Dep.
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3 min-w-[220px] text-right text-[10px] uppercase tracking-wider whitespace-nowrap"
                  >
                    Status / Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.map((item, idx) => {
                  return (
                    <tr
                      key={item.id || item.code}
                      data-testid={`low-stock-item-${item.code}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Coluna 1: Material e Descrição */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold font-mono flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-slate-900 truncate">
                            {item.code}
                          </span>
                          {item.poolCode && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono px-1 py-0 h-4 bg-blue-50 text-[#004C97] border-blue-200 shrink-0"
                            >
                              {item.poolCode}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate ml-7 max-w-xs">
                          {item.description}
                        </p>
                      </td>

                      {/* Coluna 2: Estoque Atual (t, 3 casas pt-BR) */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap align-middle">
                        {formatTonsSdc(item.currentStockTons)}
                      </td>

                      {/* Coluna 3: Estoque Mínimo (t, 3 casas pt-BR) */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap align-middle">
                        {formatTonsSdc(item.minStockTons)}
                      </td>

                      {/* Coluna 4: % do Mínimo */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap align-middle">
                        <span
                          className={`font-mono font-extrabold text-[11px] px-2 py-0.5 rounded inline-block ${
                            item.pctOfMin < 100
                              ? 'text-rose-700 bg-rose-50 border border-rose-200'
                              : 'text-amber-700 bg-amber-50 border border-amber-200'
                          }`}
                        >
                          {formatPercentStandard(item.pctOfMin)}
                        </span>
                      </td>

                      {/* Coluna 5: Centro / Depósito (com largura garantida e legível) */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 text-xs whitespace-nowrap align-middle">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px]">
                          {item.plantCenter || item.storageDeposit
                            ? `${item.plantCenter || '-'}/${item.storageDeposit || '-'}`
                            : '—'}
                        </span>
                      </td>

                      {/* Coluna 6: Status / Ação (com largura suficiente, sem sobreposição, botão separado) */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap align-middle">
                        <div className="inline-flex items-center justify-end gap-2.5">
                          <LowStockBadge
                            currentStockTons={item.currentStockTons}
                            minStockTons={item.minStockTons}
                            hasSapData={item.hasSapData ?? true}
                            size="sm"
                          />

                          {onSelectMaterial && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectMaterial(item)}
                              className="h-7 px-2.5 text-xs font-semibold text-[#004C97] bg-white border-blue-200 hover:bg-blue-50 hover:text-[#003870] gap-1 shrink-0 shadow-2xs"
                              title={`Abrir detalhe do material ${item.code}`}
                            >
                              <span>Detalhar</span>
                              <ArrowRight className="w-3 h-3 text-[#004C97]" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default LowStockAlertPanel
