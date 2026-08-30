import React, { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Flame,
  Info,
  Layers,
  RotateCcw,
  Scale,
  Scissors,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Workflow,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScenarioDetail } from '@/types/mp-optimization'
import { CuttingPlanBottleneckImpact, ConstraintValidationResult } from '@/types/bottleneck-matrix'
import { bottleneckMatrixService } from '@/services/bottleneck-rules-engine'
import { useToast } from '@/hooks/use-toast'

interface CuttingPlanBottleneckValidationSectionProps {
  scenario: ScenarioDetail
  scenariosMap?: Record<string, ScenarioDetail>
  lineCode?: string
  plateInfo?: {
    blockNumber: string
    steelGrade: string
    dimensions: string
    weightKg: number
  }
  onSelectScenario?: (key: string) => void
  onApproveSuccess?: () => void
}

export const CuttingPlanBottleneckValidationSection: React.FC<
  CuttingPlanBottleneckValidationSectionProps
> = ({
  scenario,
  scenariosMap,
  lineCode = 'L1',
  plateInfo,
  onSelectScenario,
  onApproveSuccess,
}) => {
  const { toast } = useToast()
  const impact: CuttingPlanBottleneckImpact | undefined = scenario.bottleneck_impact
  const [isTestRequestModalOpen, setIsTestRequestModalOpen] = useState(false)
  const [isBypassModalOpen, setIsBypassModalOpen] = useState(false)
  const [bypassReason, setBypassReason] = useState('')
  const [bypassUser, setBypassUser] = useState('Gestor de Linha / PCP Master')

  if (!impact) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
        Validação da Matriz de Gargalos em processamento para este cenário...
      </div>
    )
  }

  const isBlocked = impact.classification === 'VERMELHO_INVIAVEL'
  const isWarning = impact.classification === 'AMARELO_POSSIVEL_COM_RESSALVA'
  const isApproved = impact.classification === 'VERDE_RECOMENDADO'

  const handleCreateTestRequest = async () => {
    try {
      await bottleneckMatrixService.createTestRequest({
        request_code: `TEST-PCP-${Date.now().toString().slice(-6)}`,
        line_code: lineCode,
        material_code: plateInfo?.steelGrade || 'SAE 1020',
        product_description: `Solicitação de teste piloto para plano ${scenario.name}`,
        mp_block_number: plateInfo?.blockNumber || 'BL-SAP',
        proposed_application: 'Teste de Viabilidade Produtiva e Deslocamento de Gargalo',
        test_quantity_tons: 25.0,
        estimated_test_hours: 1.2,
        expected_throughput_gain_pct: impact.throughput_delta_th > 0 ? 8.5 : 0,
        technical_risks: impact.ai_choice_reasoning.operational_risks,
        justification: `Plano com alta eficiência dimensional (${scenario.yield_pct}%), porém com ressalva na Matriz de Gargalos.`,
        status: 'SOLICITADO',
        requester_name: 'PCP Robotizado CIAFAL',
      })

      toast({
        title: 'Solicitação de Teste PCP Enviada!',
        description:
          'A demanda foi pré-preenchida e enviada para homologação da Engenharia de Processos e Gestão de Linha.',
      })
      setIsTestRequestModalOpen(false)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao solicitar teste',
        description: e.message,
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Banner Principal de Status da Matriz de Gargalos */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
          isBlocked
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : isWarning
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg mt-0.5 ${
              isBlocked
                ? 'bg-rose-200 text-rose-800'
                : isWarning
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-emerald-200 text-emerald-800'
            }`}
          >
            {isBlocked ? (
              <ShieldAlert className="w-6 h-6" />
            ) : isWarning ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/80 border border-slate-300">
                Linha {lineCode} &bull; Matriz de Gargalos Integrada
              </span>
              <Badge
                className={`text-[10px] font-bold ${
                  isBlocked
                    ? 'bg-rose-600 text-white'
                    : isWarning
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                }`}
              >
                {impact.classification_label}
              </Badge>
            </div>
            <h3 className="text-base font-extrabold mt-1 tracking-tight">
              {scenario.name} &bull; Score Global: {impact.score_global}/100
            </h3>
            <p className="text-xs opacity-90 mt-0.5 max-w-2xl">
              {impact.ai_choice_reasoning.why_chosen}
            </p>
          </div>
        </div>

        {/* Ações de Bloqueio, Bypass ou Solicitação de Teste */}
        <div className="flex flex-wrap items-center gap-2">
          {isBlocked && (
            <Button
              size="sm"
              onClick={() => setIsTestRequestModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 shadow-xs"
            >
              <Workflow className="w-3.5 h-3.5 text-amber-400" />
              Solicitar Teste PCP
            </Button>
          )}

          {isWarning && (
            <Button
              size="sm"
              onClick={() => setIsBypassModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Registrar Bypass Controlado
            </Button>
          )}
        </div>
      </div>

      {/* 2. Grid de Comparação do Gargalo (Antes x Depois) e Throughput Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card: Gargalo Antes x Depois e Migração */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
              <span>MIGRAÇÃO DE GARGALO</span>
              <Activity className="w-3.5 h-3.5 text-[#004C97]" />
            </div>
            <div className="flex items-center justify-between font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block">Antes do Corte:</span>
                <span className="font-bold text-slate-800">
                  {impact.bottleneck_before.stageName}
                </span>
                <span className="text-xs text-slate-500 block">
                  {impact.bottleneck_before.capacity_th} t/h
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Com o Corte Proposto:</span>
                <span className="font-black text-[#004C97]">
                  {impact.bottleneck_after.stageName}
                </span>
                <span className="text-xs font-bold text-emerald-700 block">
                  {impact.bottleneck_after.capacity_th} t/h
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              {impact.migration_explanation}
            </div>
          </CardContent>
        </Card>

        {/* Card: Throughput e Tempo para 500t */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
              <span>IMPACTO NO THROUGHPUT</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-slate-900">
                  {impact.throughput_after_th}{' '}
                  <span className="text-xs font-normal text-slate-500">t/h</span>
                </span>
                <span
                  className={`text-[11px] font-bold block ${
                    impact.throughput_delta_th >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {impact.throughput_delta_th >= 0 ? '+' : ''}
                  {impact.throughput_delta_th} t/h em relação ao nominal
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-400 block">Lote 500 t:</span>
                <span className="text-base font-bold text-[#004C97]">
                  {impact.hours_for_batch_500t} h
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              {impact.ai_choice_reasoning.trade_off_analysis}
            </div>
          </CardContent>
        </Card>

        {/* Card: Decomposição Transparente do Score Global */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
              <span>COMPOSIÇÃO DO SCORE GLOBAL</span>
              <Scale className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-slate-600">Rendimento MP ({scenario.yield_pct}%):</span>
                <span className="font-bold text-slate-800">
                  +{impact.score_components.yield_component.contribution} pts
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Throughput da Linha:</span>
                <span className="font-bold text-slate-800">
                  +{impact.score_components.throughput_component.contribution} pts
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Segurança Leito TCC:</span>
                <span className="font-bold text-slate-800">
                  +{impact.score_components.tcc_safety_margin.contribution} pts
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Atendimento à Carteira:</span>
                <span className="font-bold text-slate-800">
                  +{impact.score_components.demand_fulfillment.contribution} pts
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tabela de Validação de Restrições Técnicas (Hard, Soft e Segurança) */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#004C97]" />
              Validação Produtiva na Matriz de Gargalos da {lineCode}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Confronto das dimensões, cadências e cargas geradas pelo corte contra as restrições da
              linha.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-emerald-800 border-emerald-300">
              {impact.constraints_validations.filter((v) => v.status === 'APPROVED').length}{' '}
              Aprovadas
            </Badge>
            {impact.hard_constraints_violated_count > 0 && (
              <Badge className="bg-rose-600 text-white text-xs font-bold">
                {impact.hard_constraints_violated_count} Hard Violada
              </Badge>
            )}
            {impact.soft_constraints_warning_count > 0 && (
              <Badge className="bg-amber-500 text-white text-xs font-bold">
                {impact.soft_constraints_warning_count} Ressalvas
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Regra Técnica</th>
                  <th className="p-3">Etapa</th>
                  <th className="p-3">Nível Restrição</th>
                  <th className="p-3">Valor Permitido</th>
                  <th className="p-3">Valor no Plano</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Fonte / Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {impact.constraints_validations.map((v, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      v.is_hard_violation || v.is_safety_violation
                        ? 'bg-rose-50/50'
                        : v.status === 'WARNING'
                          ? 'bg-amber-50/40'
                          : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{v.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{v.rule_code}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] border-slate-300">
                        {v.stage}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {v.constraint_level === 'HARD_CONSTRAINT' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                          HARD
                        </Badge>
                      ) : v.constraint_level === 'SAFETY_CONSTRAINT' ? (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-[10px]">
                          SEGURANÇA
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                          SOFT
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-700">
                      {v.permitted_range_display}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {v.actual_value}
                      {v.difference_display && (
                        <span
                          className={`ml-1.5 text-[10px] ${
                            v.status === 'VIOLATED' ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        >
                          ({v.difference_display})
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {v.status === 'APPROVED' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                          CONFORME
                        </Badge>
                      ) : v.status === 'VIOLATED' ? (
                        <Badge className="bg-rose-600 text-white font-bold text-[10px]">
                          VIOLADO
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                          RESSALVA
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-[11px] text-slate-500 max-w-xs">{v.source_doc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Comparador de Cenários A / B / C (Quando disponível) */}
      {scenariosMap && (
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#004C97]" />
              Comparador Multicritério de Cenários de Corte (Trade-Off Global)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Avaliação de rendimento da MP vs throughput da linha vs ocupação da TCC e tempo de
              linha.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Cenário</th>
                    <th className="p-3 text-center">Rendimento MP</th>
                    <th className="p-3 text-center">Sucata</th>
                    <th className="p-3 text-center">Throughput Linha</th>
                    <th className="p-3">Gargalo Resultante</th>
                    <th className="p-3 text-center">Tempo (500 t)</th>
                    <th className="p-3 text-center">Score Global</th>
                    <th className="p-3 text-center">Viabilidade Matriz</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(scenariosMap)
                    .filter(([k]) => k !== 'PERSONALIZADO_HUMANO')
                    .map(([scenKey, sc]) => {
                      const scImp: CuttingPlanBottleneckImpact | undefined = sc.bottleneck_impact
                      const isCurrent = scenario.scenario_type === scenKey
                      return (
                        <tr
                          key={scenKey}
                          className={`hover:bg-slate-50 transition-colors ${
                            isCurrent ? 'bg-blue-50/70 font-semibold' : ''
                          }`}
                        >
                          <td className="p-3 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              {scenKey === 'RECOMENDADO_IA' && (
                                <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
                              )}
                              <span>{sc.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-800">
                            {sc.yield_pct}%
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600">
                            {sc.scrap_pct}%
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-[#004C97]">
                            {scImp?.throughput_after_th || 24.8} t/h
                          </td>
                          <td className="p-3 text-slate-700">
                            {scImp?.bottleneck_after.stageName || 'TREM_CONTINUO'}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-800">
                            {scImp?.hours_for_batch_500t || 20.2} h
                          </td>
                          <td className="p-3 text-center font-mono font-black text-slate-900">
                            {scImp?.score_global || sc.score_ia}/100
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              className={`text-[9px] font-bold ${
                                scImp?.classification === 'VERMELHO_INVIAVEL'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : scImp?.classification === 'AMARELO_POSSIVEL_COM_RESSALVA'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              {scImp?.classification_label.split(' ')[0] || 'RECOMENDADO'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            {onSelectScenario && !isCurrent && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onSelectScenario(scenKey)}
                                className="h-6 text-[10px] font-bold border-slate-200 text-[#004C97]"
                              >
                                Selecionar
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Solicitação de Teste PCP */}
      <Dialog open={isTestRequestModalOpen} onOpenChange={setIsTestRequestModalOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-[#004C97]" />
              Solicitar Teste Piloto PCP para a Engenharia
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pré-preenchimento automático dos dados do Plano de Corte e Matriz de Gargalos para
              homologação técnica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 font-mono">
              <div>
                Linha Alvo: <strong>{lineCode}</strong> &bull; Bloco MP:{' '}
                <strong>{plateInfo?.blockNumber || 'BL-01'}</strong>
              </div>
              <div>
                Plano: <strong>{scenario.name}</strong> &bull; Rendimento:{' '}
                <strong>{scenario.yield_pct}%</strong>
              </div>
              <div className="text-rose-700 font-bold">
                Restrição Bloqueante:{' '}
                {impact.constraints_validations.find((v) => v.status === 'VIOLATED')?.title}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Justificativa Operacional do Teste:
              </label>
              <textarea
                value={`Solicitamos teste assistido para avaliar a estabilidade do leito TCC sob cadência de ${impact.throughput_after_th} t/h com barras de 68m.`}
                readOnly
                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 h-16 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTestRequestModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTestRequest}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold"
            >
              Enviar Solicitação para Engenharia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Bypass Controlado de Soft Constraint */}
      <Dialog open={isBypassModalOpen} onOpenChange={setIsBypassModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Registro de Bypass Controlado (Soft Constraint)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Liberação excepcional mediante justificativa e registro de auditoria no HUB CIAFAL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-amber-900">
              <strong>Atenção:</strong> Restrições de SEGURANÇA e Limites Físicos Absolutos NÃO
              admitem bypass. Apenas Soft Constraints operacionais podem ser liberadas.
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Alçada de Autorização:
              </label>
              <input
                type="text"
                value={bypassUser}
                onChange={(e) => setBypassUser(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Justificativa Técnica do Bypass:
              </label>
              <textarea
                value={bypassReason}
                onChange={(e) => setBypassReason(e.target.value)}
                placeholder="Informe a razão operacional para operar com cadência reduzida ou setup adicional..."
                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white h-20 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBypassModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!bypassReason.trim()}
              onClick={() => {
                toast({
                  title: 'Bypass Registrado com Sucesso',
                  description: `Autorização registrada por ${bypassUser} para o plano ${scenario.name}.`,
                })
                setIsBypassModalOpen(false)
                onApproveSuccess?.()
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              Confirmar Bypass & Homologar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
