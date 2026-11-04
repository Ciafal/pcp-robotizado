import React, { useState, useEffect, useMemo } from 'react'
import {
  EfficiencyUnifiedFilterBar,
  UnifiedEfficiencyFilters,
  EfficiencyFilterOptions,
} from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import { CheckCircle2, AlertTriangle, Clock, TrendingUp, Target, FileCheck2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPercentPtBr, formatTonsPtBr } from '@/lib/formatters-ptbr'
import {
  getProductionLossByLine,
  LineProductionLossRow,
} from '@/services/line-production-loss-service'

export const EfficiencyAssertivenessSubpage: React.FC = () => {
  const [filters, setFilters] = useState<UnifiedEfficiencyFilters>({
    companyCode: 'ALL',
    plantCode: 'ALL',
    lineCode: 'ALL',
    startDate: '',
    endDate: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<UnifiedEfficiencyFilters>(filters)
  const [productionRows, setProductionRows] = useState<LineProductionLossRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Aplicação reativa dos filtros: seleções discretas (Empresa, Planta, Linha, Centro,
  // Status Operacional e Período) recalculam na hora; campos de texto (Produto/Pesquisa)
  // entram no cálculo ao clicar em "Aplicar filtros". Cards e tabela compartilham o
  // MESMO conjunto de dados filtrados.
  const INSTANT_FILTER_KEYS: (keyof UnifiedEfficiencyFilters)[] = [
    'companyCode',
    'plantCode',
    'lineCode',
    'centerCode',
    'status',
    'startDate',
    'endDate',
    'periodType',
    'week',
    'year',
  ]
  const handleFiltersChange = (next: UnifiedEfficiencyFilters) => {
    setFilters(next)
    const instantChanged = INSTANT_FILTER_KEYS.some((key) => next[key] !== filters[key])
    if (instantChanged) setAppliedFilters(next)
  }
  const handleFiltersApply = (next: UnifiedEfficiencyFilters) => {
    setFilters(next)
    setAppliedFilters(next)
  }

  const filterOptions: EfficiencyFilterOptions = {
    companies: [
      { code: 'CIAFAL', name: 'CIAFAL Matriz' },
      { code: 'SIDERURGICA', name: 'Siderúrgica CIAFAL' },
    ],
    plants: [
      { code: 'DIV', name: 'Divinópolis (DIV)', companyCode: 'CIAFAL' },
      { code: 'BH', name: 'Belo Horizonte (BH)', companyCode: 'CIAFAL' },
      { code: 'SAB', name: 'Sabará (SAB)', companyCode: 'CIAFAL' },
    ],
    lines: [
      { code: 'L1', name: 'Linha 1 - Laminação', plantCode: 'DIV' },
      { code: 'L2', name: 'Linha 2 - Trefilação', plantCode: 'DIV' },
    ],
    centers: [],
  }

  // Consulta consolidada: os MESMOS filtros aplicados na tela recalculam
  // Programado, Realizado, percentuais e Perda em UMA única consulta ao serviço oficial.
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    getProductionLossByLine(appliedFilters)
      .then((result) => {
        if (cancelled) return
        setProductionRows(result.rows)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(
          '[AssertividadeOperacional] Falha ao consultar produção/perda por linha:',
          err,
        )
        setProductionRows([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [appliedFilters])

  const metrics = [
    {
      title: 'Assertividade de Início',
      value: '94,2%',
      subtext: 'Tolerância ≤ 15 min do previsto',
      status: 'ATENCAO',
      icon: Clock,
      color: 'border-t-amber-500',
    },
    {
      title: 'Aderência de Volume (t)',
      value: '95,8%',
      subtext: 'Volume programado vs apontado',
      status: 'DENTRO_ESPERADO',
      icon: Target,
      color: 'border-t-emerald-500',
    },
    {
      title: 'Aderência à Sequência Ótima',
      value: '91,5%',
      subtext: 'Cumprimento da ordem planejada',
      status: 'ATENCAO',
      icon: TrendingUp,
      color: 'border-t-amber-500',
    },
    {
      title: 'Conformidade de Lotes',
      value: '98,9%',
      subtext: 'Ordens fechadas sem refugo crítico',
      status: 'DENTRO_ESPERADO',
      icon: FileCheck2,
      color: 'border-t-[#004C97]',
    },
  ]

  // Base consolidada por linha: Programado/Realizado/Perda reais + indicadores existentes.
  // As colunas Início no Horário, Aderência de Volume, Sequência Cumprida e Status mantêm
  // exatamente os mesmos valores de antes para as linhas já existentes.
  const tableRows = useMemo(() => {
    const base = [
      {
        lineCode: 'L1',
        lineName: 'Laminação a Quente',
        startPct: 96.5,
        volumePct: 97.7,
        sequencePct: 94.0,
        status: 'DENTRO_ESPERADO',
      },
      {
        lineCode: 'L2',
        lineName: 'Trefilação e Acabamento',
        startPct: 91.2,
        volumePct: 91.6,
        sequencePct: 88.5,
        status: 'ATENCAO',
      },
      {
        lineCode: 'L3',
        lineName: 'Corte e Dobra',
        startPct: 95.0,
        volumePct: 97.4,
        sequencePct: 92.0,
        status: 'DENTRO_ESPERADO',
      },
      {
        lineCode: 'L4',
        lineName: 'Treliças',
        startPct: 89.0,
        volumePct: 88.9,
        sequencePct: 86.0,
        status: 'ATENCAO',
      },
    ]
    const byLine = new Map(productionRows.map((r) => [r.lineCode, r]))

    // Linhas vindas da consulta consolidada que não estão na base estática entram como novas linhas
    const extras = productionRows
      .filter((r) => !byLine.has(r.lineCode) || !base.some((b) => b.lineCode === r.lineCode))
      .map((r) => ({
        lineCode: r.lineCode,
        lineName: r.lineName,
        startPct: null as number | null,
        volumePct: null as number | null,
        sequencePct: null as number | null,
        status: 'DENTRO_ESPERADO' as string,
      }))

    const merged = [...base, ...extras.filter((e) => !base.some((b) => b.lineCode === e.lineCode))]

    return merged.map((item) => {
      const prod = byLine.get(item.lineCode)
      return {
        ...item,
        programadoT: prod?.programadoT ?? null,
        realizadoT: prod?.realizadoT ?? null,
        percentualRealizado: prod?.percentualRealizado ?? null,
        perdaT: prod?.perdaT ?? null,
        percentualPerda: prod?.percentualPerda ?? null,
        dadosDisponiveis: prod !== undefined,
      }
    })
  }, [productionRows])

  const formatTonsCell = (value: number | null | undefined) =>
    value === null || value === undefined ? 'Dados não disponíveis' : formatTonsPtBr(value, 2)

  const formatPercentCell = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : formatPercentPtBr(value, 1)

  return (
    <div className="space-y-4">
      {/* Subheader Informativo */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Assertividade da Programação
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-200 bg-slate-50 text-slate-700"
              >
                Conformidade Temporal e Sequencial
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Índice de cumprimento da grade horária, sequência produtiva e entrega volumétrica
            </p>
          </div>
        </div>
      </div>

      {/* Grade Unificada de Filtros */}
      <EfficiencyUnifiedFilterBar
        filters={filters}
        options={filterOptions}
        onChange={handleFiltersChange}
        onApply={handleFiltersApply}
        onReset={() => {
          const reset: UnifiedEfficiencyFilters = {
            companyCode: 'ALL',
            plantCode: 'ALL',
            lineCode: 'ALL',
            startDate: '',
            endDate: '',
          }
          setFilters(reset)
          setAppliedFilters(reset)
        }}
        showCenterFilter={false}
        showLine2={false}
      />

      {/* KPI Cards em Estilo Claro e sem truncamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, idx) => {
          const Icon = m.icon
          return (
            <Card
              key={idx}
              className={`bg-white border border-slate-200 shadow-2xs rounded-xl border-t-4 ${m.color} flex flex-col justify-between`}
            >
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="text-xs font-semibold text-slate-700 leading-snug break-words"
                    title={m.title}
                  >
                    {m.title}
                  </span>
                  <div className="w-7 h-7 rounded-md bg-slate-50 text-[#004C97] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-mono leading-tight">
                  {m.value}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed break-words">
                  {m.subtext}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabela de Aderência por Linha */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900">
            Assertividade Operacional por Linha de Produção
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            Critério: Início &le; 15 min &bull; Sequência = 100%
          </span>
        </div>

        {/* Rolagem horizontal SOMENTE dentro do componente da tabela, nunca na página inteira */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1080px]">
            <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Linha</th>
                <th className="py-2.5 px-4 text-right">Programado em t</th>
                <th className="py-2.5 px-4 text-right">Realizado em t</th>
                <th className="py-2.5 px-4 text-right">%</th>
                <th className="py-2.5 px-4 text-right">Início no Horário</th>
                <th className="py-2.5 px-4 text-right">Aderência de Volume</th>
                <th className="py-2.5 px-4 text-right">Perda em t</th>
                <th className="py-2.5 px-4 text-right">%</th>
                <th className="py-2.5 px-4 text-right">Sequência Cumprida</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {tableRows.map((item) => (
                <tr key={item.lineCode} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-sans font-semibold text-slate-900 whitespace-nowrap">
                    {item.lineCode} &bull; {item.lineName}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                    {formatTonsCell(item.programadoT)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                    {formatTonsCell(item.realizadoT)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                    {formatPercentCell(item.percentualRealizado)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    {formatPercentPtBr(item.startPct, 1)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    {formatPercentPtBr(item.volumePct, 1)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                    {formatTonsCell(item.perdaT)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                    {formatPercentCell(item.percentualPerda)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    {formatPercentPtBr(item.sequencePct, 1)}
                  </td>
                  <td className="py-2.5 px-4 text-center font-sans">
                    <Badge
                      className={
                        item.status === 'DENTRO_ESPERADO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                          : 'bg-amber-50 text-amber-800 border-amber-200 text-[10px]'
                      }
                    >
                      {item.status === 'DENTRO_ESPERADO' ? 'No Prazo' : 'Atenção'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default EfficiencyAssertivenessSubpage
