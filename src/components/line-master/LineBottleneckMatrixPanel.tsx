import React, { useState, useEffect } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Database,
  Flame,
  Layers,
  Maximize2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Workflow,
  Zap,
  Info,
  Clock,
  FileSpreadsheet,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  LineBottleneckMatrixRecord,
  LineProcessConstraint,
  DynamicBottleneckCalculationResult,
} from '@/types/bottleneck-matrix'
import { BottleneckRulesEngine, bottleneckMatrixService } from '@/services/bottleneck-rules-engine'

interface LineBottleneckMatrixPanelProps {
  lineCode: string
  lineName?: string
}

export const LineBottleneckMatrixPanel: React.FC<LineBottleneckMatrixPanelProps> = ({
  lineCode = 'L1',
  lineName = 'Linha 1 — Laminação',
}) => {
  const [matrices, setMatrices] = useState<LineBottleneckMatrixRecord[]>([])
  const [constraints, setConstraints] = useState<LineProcessConstraint[]>([])
  const [selectedMatrixId, setSelectedMatrixId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Parâmetros de Simulação Rápida na Matriz
  const [simSection, setSimSection] = useState<number>(130)
  const [simLength, setSimLength] = useState<number>(6.0)
  const [simWeight, setSimWeight] = useState<number>(795)
  const [simPasses, setSimPasses] = useState<number>(6)
  const [simVeins, setSimVeins] = useState<number>(1)

  useEffect(() => {
    loadData()
  }, [lineCode])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mList, cList] = await Promise.all([
        bottleneckMatrixService.listMatrices(lineCode),
        bottleneckMatrixService.listConstraints(lineCode),
      ])
      setMatrices(mList)
      setConstraints(cList)
      if (mList.length > 0) {
        setSelectedMatrixId(mList[0].id)
        setSimSection(mList[0].billet_section_mm || 130)
        setSimLength(mList[0].billet_length_m || 6.0)
        setSimWeight(mList[0].billet_weight_kg || 795)
        setSimPasses(mList[0].passes_count || 6)
        setSimVeins(mList[0].veins_count || 1)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const selectedMatrix = matrices.find((m) => m.id === selectedMatrixId) || matrices[0]

  // Recálculo Dinâmico em tempo real
  const dynamicCalc: DynamicBottleneckCalculationResult =
    BottleneckRulesEngine.calculateDynamicBottleneck({
      line_code: lineCode,
      billet_section_mm: simSection,
      billet_length_m: simLength,
      billet_weight_kg: simWeight,
      passes_count: simPasses,
      veins_count: simVeins,
      matrix_ref: selectedMatrix,
    })

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Matriz de Gargalos */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#004C97]/10 text-[#004C97]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Matriz de Gargalos Produtivos & Restrições da {lineCode}
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                    VIGENTE Rev.{selectedMatrix?.version || 1}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Cálculo dinâmico baseado nas matrizes homologadas (QUAD 130 mm, 150 mm, CISAM e
                  Supervisório).
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Seletor de Ficha / Bitola Homologada */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Matriz de Referência:</span>
            <select
              value={selectedMatrixId}
              onChange={(e) => {
                const mid = e.target.value
                setSelectedMatrixId(mid)
                const targetM = matrices.find((m) => m.id === mid)
                if (targetM) {
                  setSimSection(targetM.billet_section_mm || 130)
                  setSimLength(targetM.billet_length_m || 6.0)
                  setSimWeight(targetM.billet_weight_kg || 795)
                  setSimPasses(targetM.passes_count || 6)
                  setSimVeins(targetM.veins_count || 1)
                }
              }}
              aria-label="Matriz de Referência Técnica"
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-[#004C97] focus:ring-1 focus:ring-[#004C97]"
            >
              {matrices.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.gauge_dimension} • {m.steel_grade} ({m.product_family})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              className="h-8 text-xs border-slate-200 text-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
            </Button>
          </div>
        </CardHeader>

        {/* Governança e Metadados Técnicos */}
        <CardContent className="p-4 bg-slate-50/70 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Documento de Referência
              </span>
              <span className="font-semibold text-slate-800">
                {selectedMatrix?.reference_doc || 'Matriz de Gargalos Oficial CIAFAL'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Autoridade / Engenharia
              </span>
              <span className="font-semibold text-slate-800">
                {selectedMatrix?.source_authority || 'Engenharia de Processos CIAFAL'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Responsável / Aprovador
              </span>
              <span className="font-semibold text-slate-800">
                {selectedMatrix?.responsible_name || 'Eng. Rodolfo Castro'} •{' '}
                {selectedMatrix?.approver_name || 'Ger. Fabrício Menezes'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Vigência Técnica
              </span>
              <span className="font-semibold text-emerald-700">
                {selectedMatrix?.valid_from
                  ? new Date(selectedMatrix.valid_from).toLocaleDateString('pt-BR')
                  : '01/01/2026'}{' '}
                até{' '}
                {selectedMatrix?.valid_until
                  ? new Date(selectedMatrix.valid_until).toLocaleDateString('pt-BR')
                  : '31/12/2026'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo Executivo TOC / DBR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Gargalo Primário (DRUM) */}
        <Card className="bg-white border-l-4 border-l-rose-500 border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-rose-700 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> GARGALO PRIMÁRIO (DRUM)
              </span>
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                Restrição Ativa
              </Badge>
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-1">
              {dynamicCalc.primary_bottleneck.stageName}
            </div>
            <div className="text-2xl font-black font-mono text-rose-600 mt-1">
              {dynamicCalc.primary_bottleneck.capacity_th}{' '}
              <span className="text-xs font-normal text-slate-500">t/h</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Dita o ritmo global de produção da Linha {lineCode}.
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Gargalo Secundário & Gap */}
        <Card className="bg-white border-l-4 border-l-amber-500 border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> GARGALO SECUNDÁRIO
              </span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                Gap: +{dynamicCalc.gap_to_secondary_th} t/h
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-800 mt-1 truncate">
              {dynamicCalc.secondary_bottleneck.stageName}
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 mt-1">
              {dynamicCalc.secondary_bottleneck.capacity_th}{' '}
              <span className="text-xs font-normal text-slate-500">t/h</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Próxima restrição caso o gargalo primário seja elevado.
            </div>
          </CardContent>
        </Card>

        {/* Card 3: TOC Drum-Buffer-Rope */}
        <Card className="bg-white border-l-4 border-l-[#004C97] border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-[#004C97] flex items-center gap-1">
                <Workflow className="w-3.5 h-3.5" /> TOC / CADÊNCIA (ROPE)
              </span>
              <span className="text-[10px] font-mono text-slate-600">Buffer: 1.5 h</span>
            </div>
            <div className="text-base font-bold text-slate-800 mt-1">
              Alimentação de MP Subordinada
            </div>
            <div className="text-2xl font-black font-mono text-[#004C97] mt-1">
              {dynamicCalc.rope_cadence_th}{' '}
              <span className="text-xs font-normal text-slate-500">t/h autorizada</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Evita excesso de WIP e saturação do leito TCC.
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Robustez Operacional */}
        <Card className="bg-white border-l-4 border-l-emerald-500 border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> ROBUSTEZ OPERACIONAL
              </span>
              <Badge
                className={`text-[10px] font-bold ${
                  dynamicCalc.operational_robustness === 'ALTA'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : dynamicCalc.operational_robustness === 'MEDIA'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                {dynamicCalc.operational_robustness}
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-800 mt-1">Sensibilidade da Linha</div>
            <div className="text-xs text-slate-600 mt-1 line-clamp-2">
              {dynamicCalc.robustness_details}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>
                Risco Starvation:{' '}
                <strong className="text-slate-800">{dynamicCalc.starvation_risk}</strong>
              </span>{' '}
              •
              <span>
                Risco Blocking:{' '}
                <strong className="text-slate-800">{dynamicCalc.blocking_risk}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Interativa de Capacidade por Etapa Produtiva */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" />
              Capacidades Calculadas por Etapa do Fluxo Produtivo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              MP &rarr; Forno &rarr; Desbaste &rarr; Trem Contínuo &rarr; Tesoura TR2 &rarr; TCC
              Leito &rarr; Endireitamento &rarr; Empacotamento
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Etapa Produtiva</th>
                  <th className="p-3 text-right">Capacidade Teórica</th>
                  <th className="p-3 text-right">Capacidade Operacional</th>
                  <th className="p-3 text-right">Capacidade Líquida (TOC)</th>
                  <th className="p-3 text-center">Tempo de Ciclo</th>
                  <th className="p-3">Utilização %</th>
                  <th className="p-3">Fatores Limitantes / Fórmulas</th>
                  <th className="p-3 text-center">Papel TOC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dynamicCalc.stages.map((st) => (
                  <tr
                    key={st.stage}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      st.is_bottleneck
                        ? 'bg-rose-50/60 font-semibold'
                        : st.is_secondary_bottleneck
                          ? 'bg-amber-50/40'
                          : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {st.is_bottleneck && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        )}
                        {st.is_secondary_bottleneck && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                        <span className="font-bold text-slate-900">{st.stageName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {st.theoretical_capacity_th} t/h
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {st.operational_capacity_th} t/h
                    </td>
                    <td className="p-3 text-right font-mono font-black">
                      <span
                        className={
                          st.is_bottleneck
                            ? 'text-rose-600'
                            : st.is_secondary_bottleneck
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }
                      >
                        {st.effective_capacity_th} t/h
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {st.cycle_time_seconds} s
                    </td>
                    <td className="p-3 w-36">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-600">
                          <span>{st.utilization_pct}%</span>
                        </div>
                        <Progress
                          value={st.utilization_pct}
                          className={`h-1.5 ${
                            st.is_bottleneck
                              ? 'bg-rose-100 [&>div]:bg-rose-500'
                              : st.is_secondary_bottleneck
                                ? 'bg-amber-100 [&>div]:bg-amber-500'
                                : 'bg-slate-100 [&>div]:bg-[#004C97]'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-[11px] text-slate-600">
                      <div className="space-y-0.5">
                        {(st.limiting_factors || []).map((f, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="text-slate-400">•</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {st.is_bottleneck ? (
                        <Badge className="bg-rose-600 text-white font-bold text-[10px]">
                          GARGALO (DRUM)
                        </Badge>
                      ) : st.is_secondary_bottleneck ? (
                        <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                          2º GARGALO
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-500 border-slate-200 text-[10px]"
                        >
                          SUBORDINADO
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Regras e Restrições Cadastradas (Hard, Soft e Segurança) */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Catálogo de Restrições Técnicas & Condições Operacionais
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Regras soberanas que governam a aprovação automática dos Planos de Corte e
            Sequenciamento PCP.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Código Regra</th>
                  <th className="p-3">Descrição da Restrição</th>
                  <th className="p-3">Etapa</th>
                  <th className="p-3">Nível da Restrição</th>
                  <th className="p-3">Limite Permitido</th>
                  <th className="p-3">Admite Bypass?</th>
                  <th className="p-3">Fonte / Norma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {constraints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">{c.rule_code}</td>
                    <td className="p-3 font-medium text-slate-800">{c.title}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] border-slate-300">
                        {c.stage}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {c.constraint_level === 'HARD_CONSTRAINT' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                          HARD CONSTRAINT (Soberana)
                        </Badge>
                      ) : c.constraint_level === 'SAFETY_CONSTRAINT' ? (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-[10px]">
                          SEGURANÇA (Inviolável)
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                          SOFT CONSTRAINT (Ressalva)
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {c.max_limit !== undefined && `≤ ${c.max_limit} ${c.unit}`}
                      {c.min_limit !== undefined && `≥ ${c.min_limit} ${c.unit}`}
                    </td>
                    <td className="p-3">
                      {c.bypass_allowed ? (
                        <span className="text-amber-700 font-medium">
                          Sim ({c.bypass_authority_required || 'PCP'})
                        </span>
                      ) : (
                        <span className="text-rose-700 font-bold">NÃO (Bloqueio Total)</span>
                      )}
                    </td>
                    <td className="p-3 text-[11px] text-slate-500">{c.source_doc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
