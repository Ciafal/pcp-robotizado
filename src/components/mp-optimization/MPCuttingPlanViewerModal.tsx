import React, { useState, useEffect } from 'react'
import {
  X,
  FileText,
  History,
  GitCompare,
  Download,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Ruler,
  Scissors,
  User,
  ShieldCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatNumberPtBr } from '@/lib/number-format'
import {
  mpMultipleCuttingPlansService,
  MPMultipleCuttingPlanRecord,
} from '@/services/mp-dimensional-notes-service'

interface MPCuttingPlanViewerModalProps {
  isOpen: boolean
  onClose: () => void
  plan: MPMultipleCuttingPlanRecord
  onSelectVersion?: (versionPlan: MPMultipleCuttingPlanRecord) => void
}

export const MPCuttingPlanViewerModal: React.FC<MPCuttingPlanViewerModalProps> = ({
  isOpen,
  onClose,
  plan,
  onSelectVersion,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'versions' | 'compare'>('details')
  const [versionHistory, setVersionHistory] = useState<MPMultipleCuttingPlanRecord[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [compareTarget, setCompareTarget] = useState<MPMultipleCuttingPlanRecord | null>(null)

  useEffect(() => {
    if (isOpen && plan?.plan_code) {
      setIsLoadingVersions(true)
      mpMultipleCuttingPlansService
        .getVersionsByPlanCode(plan.plan_code)
        .then((list) => {
          setVersionHistory(list)
          if (list.length > 1) {
            // Define o anterior como alvo de comparação padrão se disponível
            const prior = list.find((v) => v.id !== plan.id)
            if (prior) setCompareTarget(prior)
          }
        })
        .finally(() => setIsLoadingVersions(false))
    }
  }, [isOpen, plan?.plan_code, plan?.id])

  if (!plan) return null

  // Gera visualização simplificada de impressão/PDF da versão consultada
  const handlePrintPdf = () => {
    window.print()
  }

  const cutsDistribution = Array.isArray(plan.distribution_cuts_json)
    ? plan.distribution_cuts_json
    : Array.isArray(plan.allocated_applications_json)
      ? plan.allocated_applications_json
      : []

  const auditHistory = Array.isArray(plan.audit_history_json) ? plan.audit_history_json : []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white border border-slate-200 shadow-2xl rounded-2xl">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-[#004C97] rounded-lg">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {plan.plan_code}
                    </DialogTitle>
                    <Badge className="bg-blue-100 text-[#004C97] border-blue-300 font-mono text-xs">
                      v0{plan.version || 1}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        plan.status === 'APROVADO'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {plan.status || 'RASCUNHO'}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-slate-500">
                    Tipo: <strong>{plan.plan_type || 'MÚLTIPLO'}</strong> &bull; Responsável:{' '}
                    <strong>
                      {plan.responsible_user_name || plan.created_by_user_name || 'Engenharia'}
                    </strong>{' '}
                    &bull; Criação:{' '}
                    {plan.created ? new Date(plan.created).toLocaleString('pt-BR') : '-'}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintPdf}
                className="text-xs font-semibold gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#004C97]" />
                Gerar PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* NAVEGAÇÃO INTERNA DO MODAL */}
        <div className="pt-2">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="bg-slate-100 p-1 rounded-lg text-xs">
              <TabsTrigger value="details" className="text-xs font-semibold">
                Detalhes do Plano
              </TabsTrigger>
              <TabsTrigger value="versions" className="text-xs font-semibold gap-1.5">
                <History className="w-3.5 h-3.5" />
                Consultar Versões ({versionHistory.length})
              </TabsTrigger>
              {versionHistory.length > 1 && (
                <TabsTrigger value="compare" className="text-xs font-semibold gap-1.5">
                  <GitCompare className="w-3.5 h-3.5" />
                  Comparar Versões
                </TabsTrigger>
              )}
            </TabsList>

            {/* ABA: DETALHES DO PLANO */}
            <TabsContent value="details" className="space-y-4 pt-3">
              {/* INDICADORES DO PLANO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-900 font-bold uppercase">
                    Rendimento Metálico
                  </span>
                  <div className="text-xl font-black font-mono text-emerald-950 mt-1">
                    {formatNumberPtBr(plan.cutting_yield_pct || 0, 2)}%
                  </div>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-blue-900 font-bold uppercase">
                    Peças Geradas
                  </span>
                  <div className="text-xl font-black font-mono text-blue-950 mt-1">
                    {plan.pieces_count || 0} un
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-600 font-bold uppercase">
                    Peso do Bloco
                  </span>
                  <div className="text-base font-black font-mono text-slate-900 mt-1">
                    {formatNumberPtBr(plan.block_weight_tons || 0, 3)} t
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-600 font-bold uppercase">
                    Comp. Laminado Previsto
                  </span>
                  <div className="text-base font-black font-mono text-[#004C97] mt-1">
                    {formatNumberPtBr(plan.projected_rolled_length_m || 0, 2)} m
                  </div>
                </div>
              </div>

              {/* DETALHAMENTO TÉCNICO DE MATERIAL E DIMENSÕES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-bold uppercase text-[11px] text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#004C97]" />
                    Matéria-Prima e Rastreabilidade
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cód. Material:</span>
                      <strong className="font-mono">{plan.material_code}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Aço / Bitola:</span>
                      <strong>{plan.steel_grade || '-'}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Descrição:</span>
                      <span>{plan.material_description || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lote:</span>
                      <span className="font-mono">{plan.batch_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Corrida:</span>
                      <span className="font-mono">{plan.heat_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Centro / Linha:</span>
                      <span>
                        {plan.center_code || '1020'} {plan.line_code ? `/ ${plan.line_code}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Fornecedor:</span>
                      <span>{plan.supplier_name || plan.supplier_code || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-bold uppercase text-[11px] text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-[#004C97]" />
                    Dimensões e Parâmetros de Perda
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Dimensões do Bloco:</span>
                      <span>
                        {plan.thickness_mm || 130} × {plan.width_mm || 130} ×{' '}
                        {plan.length_mm || 6000} mm
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Massa Linear:</span>
                      <strong className="font-mono">
                        {formatNumberPtBr(plan.linear_mass_kg_m || 0, 1)} kg/m
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Sobra Reutilizável:</span>
                      <strong className="text-slate-900">
                        {formatNumberPtBr(plan.leftover_length_m || 0, 2)} m (
                        {formatNumberPtBr(plan.leftover_weight_tons || 0, 3)} t)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Perdas (Kerf/Refile):
                      </span>
                      <strong className="text-amber-800">
                        {formatNumberPtBr(plan.scrap_length_m || 0, 2)} m (
                        {formatNumberPtBr(plan.scrap_weight_tons || 0, 3)} t)
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* JUSTIFICATIVA DA IA */}
              {plan.ai_technical_justification && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#004C97]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Justificativa Técnica do Motor:</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    {plan.ai_technical_justification}
                  </p>
                </div>
              )}

              {/* DISTRIBUIÇÃO DOS CORTES */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Distribuição dos Cortes e Peças Alocadas
                </h4>
                {cutsDistribution.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-slate-500 text-xs italic text-center">
                    Nenhuma distribuição de cortes detalhada registrada para esta versão.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left font-mono">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Sequência</th>
                          <th className="p-2.5">Aplicação</th>
                          <th className="p-2.5">Comp. Unitário (m)</th>
                          <th className="p-2.5 text-center">Qtd.</th>
                          <th className="p-2.5">Comp. Total (m)</th>
                          <th className="p-2.5">Peso Calculado (t)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {cutsDistribution.map((c: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 text-slate-800">
                            <td className="p-2.5 font-mono font-bold text-slate-900">
                              # {idx + 1}
                            </td>
                            <td className="p-2.5 font-medium text-[#004C97]">
                              {c.application_code || c.code} &bull;{' '}
                              {c.application_name || c.name || 'Aplicação Industrial'}
                            </td>
                            <td className="p-2.5 font-mono">
                              {formatNumberPtBr((c.length_mm || 0) / 1000, 2)} m
                            </td>
                            <td className="p-2.5 font-mono font-bold text-center text-emerald-800">
                              {c.quantity || c.qty || 1} un
                            </td>
                            <td className="p-2.5 font-mono">
                              {formatNumberPtBr(
                                (c.used_length_mm || (c.length_mm || 0) * (c.quantity || 1)) / 1000,
                                2,
                              )}{' '}
                              m
                            </td>
                            <td className="p-2.5 font-mono font-bold">
                              {formatNumberPtBr((c.estimated_weight_kg || 0) / 1000, 3)} t
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ABA: CONSULTAR VERSÕES */}
            <TabsContent value="versions" className="space-y-3 pt-3">
              <div className="text-xs text-slate-600 flex justify-between items-center">
                <span>
                  Versões imutáveis registradas para o código <strong>{plan.plan_code}</strong>:
                </span>
                <Badge variant="outline" className="font-mono">
                  {versionHistory.length} versões
                </Badge>
              </div>

              {isLoadingVersions ? (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  Carregando versões históricas...
                </div>
              ) : (
                <div className="space-y-2">
                  {versionHistory.map((ver) => {
                    const isSelected = ver.id === plan.id
                    return (
                      <div
                        key={ver.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-50/70 border-[#004C97]'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#004C97] text-white font-mono text-[10px]">
                              v0{ver.version || 1}
                            </Badge>
                            {ver.is_latest && (
                              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px]">
                                Versão Atual
                              </Badge>
                            )}
                            <span className="font-bold text-slate-900">
                              {ver.version_notes || 'Revisão Técnica'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Criada em{' '}
                            {ver.created ? new Date(ver.created).toLocaleString('pt-BR') : '-'} por{' '}
                            <strong>
                              {ver.responsible_user_name ||
                                ver.created_by_user_name ||
                                'Engenharia'}
                            </strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right font-mono text-[11px]">
                            <div className="font-bold text-emerald-700">
                              {formatNumberPtBr(ver.cutting_yield_pct || 0, 2)}% rendimento
                            </div>
                            <div className="text-slate-500">{ver.pieces_count || 0} peças</div>
                          </div>

                          {!isSelected && onSelectVersion && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onSelectVersion(ver)}
                              className="h-7 text-xs font-semibold"
                            >
                              Carregar Esta Versão
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* ABA: COMPARAR VERSÕES LADO A LADO */}
            {versionHistory.length > 1 && (
              <TabsContent value="compare" className="space-y-3 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span>Comparando Versão Atual com versão de referência:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Alvo:</span>
                    <select
                      value={compareTarget?.id || ''}
                      onChange={(e) => {
                        const target = versionHistory.find((v) => v.id === e.target.value)
                        if (target) setCompareTarget(target)
                      }}
                      className="h-7 text-xs border border-slate-300 rounded px-2 bg-white"
                    >
                      {versionHistory.map((v) => (
                        <option key={v.id} value={v.id}>
                          v0{v.version || 1} -{' '}
                          {v.created ? new Date(v.created).toLocaleDateString('pt-BR') : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {compareTarget && (
                  <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-50 border-r border-slate-200 space-y-2">
                      <div className="flex items-center justify-between border-b pb-1">
                        <strong className="text-slate-900">
                          Versão v0{plan.version || 1} (Em tela)
                        </strong>
                        <Badge className="bg-[#004C97] text-white text-[10px]">Atual</Badge>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-700">
                        <div>
                          Rendimento:{' '}
                          <strong>{formatNumberPtBr(plan.cutting_yield_pct || 0, 2)}%</strong>
                        </div>
                        <div>
                          Peças geradas: <strong>{plan.pieces_count || 0} un</strong>
                        </div>
                        <div>
                          Sobra aproveitável:{' '}
                          <strong>{formatNumberPtBr(plan.leftover_length_m || 0, 2)} m</strong>
                        </div>
                        <div>
                          Perdas totais:{' '}
                          <strong>{formatNumberPtBr(plan.scrap_length_m || 0, 2)} m</strong>
                        </div>
                        <div>
                          Status: <strong>{plan.status || 'RASCUNHO'}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white space-y-2">
                      <div className="flex items-center justify-between border-b pb-1">
                        <strong className="text-slate-900">
                          Versão v0{compareTarget.version || 1} (Referência)
                        </strong>
                        <Badge variant="outline" className="text-[10px]">
                          Histórica
                        </Badge>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-700">
                        <div>
                          Rendimento:{' '}
                          <strong>
                            {formatNumberPtBr(compareTarget.cutting_yield_pct || 0, 2)}%
                          </strong>
                        </div>
                        <div>
                          Peças geradas: <strong>{compareTarget.pieces_count || 0} un</strong>
                        </div>
                        <div>
                          Sobra aproveitável:{' '}
                          <strong>
                            {formatNumberPtBr(compareTarget.leftover_length_m || 0, 2)} m
                          </strong>
                        </div>
                        <div>
                          Perdas totais:{' '}
                          <strong>
                            {formatNumberPtBr(compareTarget.scrap_length_m || 0, 2)} m
                          </strong>
                        </div>
                        <div>
                          Status: <strong>{compareTarget.status || 'RASCUNHO'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
