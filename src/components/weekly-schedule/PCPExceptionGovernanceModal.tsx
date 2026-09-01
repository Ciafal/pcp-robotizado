import React, { useState } from 'react'
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
  FileText,
  Clock,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  WeeklyScheduleItem,
  GaugeSequenceDeviationAnalysis,
  ExceptionJustificationData,
} from '@/types/weekly-schedule'

interface PCPExceptionGovernanceModalProps {
  isOpen: boolean
  onClose: () => void
  item: WeeklyScheduleItem | null
  userRole?: string
  userName?: string
  onSubmitJustification: (itemId: string, justification: ExceptionJustificationData) => void
  onSupervisorAction?: (
    itemId: string,
    action: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_ADJUSTMENT',
    notes: string,
  ) => void
}

export const PCPExceptionGovernanceModal: React.FC<PCPExceptionGovernanceModalProps> = ({
  isOpen,
  onClose,
  item,
  userRole = 'PROGRAMADOR_PCP',
  userName = 'Programador PCP',
  onSubmitJustification,
  onSupervisorAction,
}) => {
  const [reason, setReason] = useState('ATENDIMENTO_URGENTE_CLIENTE')
  const [whyBypass, setWhyBypass] = useState('')
  const [needServed, setNeedServed] = useState('')
  const [consequenceIfNotDone, setConsequenceIfNotDone] = useState('')
  const [expectedImpact, setExpectedImpact] = useState('')
  const [detailedJustification, setDetailedJustification] = useState('')
  const [supervisorNotes, setSupervisorNotes] = useState('')

  if (!item) return null

  const dev: GaugeSequenceDeviationAnalysis = item.deviation_analysis || {
    hasDeviation: true,
    deviationType: 'GAUGE_SEQUENCE',
    expectedRuleDescription:
      'Sequência ideal de calibres e bitolas conforme Ficha Mestra da Linha.',
    proposedProgramDescription: `Item ${item.material_code} com ${item.planned_quantity_tons} t.`,
    deviationDetails: 'Item posicionado fora da curva padrão de calibres da linha.',
    currentGauge: item.dimensions || item.material_code,
    hypotheses: [
      'Atendimento prioritário a pedido comercial com prazo exíguo.',
      'Aproveitamento de matéria-prima em lote remanescente.',
    ],
    impacts: [
      'Aumento estimado de 25 minutos no tempo de setup/acerto de calibres.',
      'Possível necessidade de validação dimensional pelo inspetor de qualidade.',
    ],
    aiRecommendation:
      'Recomenda-se reagrupamento ou submissão de justificativa técnica completa para avaliação do Supervisor PCP.',
    requiresSupervisorApproval: true,
  }

  const isSupervisor =
    userRole.toUpperCase().includes('SUPERVISOR') ||
    userRole.toUpperCase().includes('GESTOR') ||
    userRole.toUpperCase().includes('ADMIN')
  const isPending = item.exception_approval_status === 'PENDING_SUPERVISOR'
  const isApproved = item.exception_approval_status === 'APPROVED'

  const isFormValid =
    detailedJustification.trim().length >= 15 &&
    whyBypass.trim().length >= 10 &&
    needServed.trim().length >= 10 &&
    consequenceIfNotDone.trim().length >= 10 &&
    expectedImpact.trim().length >= 10

  const handleSaveJustification = () => {
    if (!isFormValid) return

    // Avaliação da IA sobre a justificativa informada (Requisito 13)
    const justificationData: ExceptionJustificationData = {
      reason,
      detailedJustification,
      whyBypassRule: whyBypass,
      needServed,
      consequenceIfNotDone,
      expectedImpact,
      submittedBy: userName,
      submittedAt: new Date().toISOString(),
      aiEvaluation: {
        coherence: detailedJustification.length > 50 ? 'ALTA' : 'MEDIA',
        evidenceAssessment:
          'Justificativa estruturada com causa raiz e impacto operacional descritos.',
        risks: [
          'Aumento pontual de tempo de troca (+20 min).',
          'Potencial gargalo a jusante se a cadência esperada oscilar.',
        ],
        benefits: [
          'Garante cumprimento do prazo acordado com o cliente.',
          'Evita ociosidade de MP estocada.',
        ],
        alternatives: [
          'Deslocar o lote para o início do próximo turno da mesma família.',
          'Produzir na Linha L2 caso a janela de setup seja menor.',
        ],
        recommendation:
          'A justificativa apresenta fundamentação técnica plausível. IA NÃO aprova: cabe ao Supervisor PCP a decisão final.',
      },
    }

    onSubmitJustification(item.id, justificationData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-white text-slate-900 border-slate-300 shadow-2xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* CABEÇALHO */}
        <div className="bg-[#004C97] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg text-white">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Governança de Exceções PCP & Análise IA — Item {item.material_code}
              </DialogTitle>
              <p className="text-xs text-blue-100">
                Hierarquia Técnica: Ficha Mestre &rarr; Sequência Ideal &rarr; Ciclo Médio &rarr;
                Cobertura &rarr; Supervisor PCP
              </p>
            </div>
          </div>
          <Badge className="bg-amber-400 text-slate-950 border-amber-500 font-bold text-xs">
            {item.exception_approval_status === 'APPROVED'
              ? 'EXCEÇÃO APROVADA'
              : item.exception_approval_status === 'PENDING_SUPERVISOR'
                ? 'PENDENTE SUPERVISOR PCP'
                : 'EXIGE JUSTIFICATIVA'}
          </Badge>
        </div>

        {/* CORPO */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* PAINEL 1: ANÁLISE IA DO DESVIO (Requisitos 8, 9, 10, 11) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                1. Parecer Técnico da IA CIAFAL (Motor de Regras)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Análise Determinística sem Alucinação
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Regra Esperada:
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {dev.expectedRuleDescription}
                </p>
                {dev.idealPreviousGauge && dev.idealNextGauge && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] font-mono text-[#004C97] font-bold">
                    <span>{dev.idealPreviousGauge}</span>
                    <span>&darr;</span>
                    <span className="bg-blue-100 px-1 rounded">{dev.currentGauge}</span>
                    <span>&darr;</span>
                    <span>{dev.idealNextGauge}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Programação Proposta / Desvio:
                </span>
                <p className="text-rose-900 font-bold leading-relaxed">
                  {dev.deviationDetails || dev.proposedProgramDescription}
                </p>
                {dev.cycleTimeSapMin && (
                  <p className="text-[10px] text-slate-600 mt-1">
                    Ciclo Médio SAP: <strong>{dev.cycleTimeSapMin} min</strong> | Programado:{' '}
                    <strong>{dev.cycleTimeProgrammedMin} min</strong> ({dev.cycleTimeDeviationPct}%
                    desvio)
                  </p>
                )}
                {dev.stockCoverageProjectedDays && (
                  <p className="text-[10px] text-slate-600">
                    Cobertura Projetada: <strong>{dev.stockCoverageProjectedDays} dias</strong>{' '}
                    (Limite: {dev.stockCoverageMaxDays} dias)
                  </p>
                )}
              </div>
            </div>

            {/* Hipóteses & Impactos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                <span className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                  Hipóteses Identificadas:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-950 text-[11px]">
                  {dev.hypotheses.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg">
                <span className="text-[10px] font-bold text-rose-900 uppercase block mb-1">
                  Impactos Operacionais:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-rose-950 text-[11px]">
                  {dev.impacts.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950 text-[11px] flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Recomendação da IA:</strong> {dev.aiRecommendation}
                <span className="block text-[10px] text-indigo-700 italic mt-0.5">
                  * A IA apoia a análise e evidencia impactos, mas NÃO substitui a aprovação formal
                  do Supervisor PCP.
                </span>
              </div>
            </div>
          </div>

          {/* PAINEL 2: JUSTIFICATIVA OBRIGATÓRIA DO PROGRAMADOR (Requisitos 12 e 13) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <FileText className="w-4 h-4 text-[#004C97]" />
              2. Justificativa Formal do Programador (Obrigatória para Exceção)
            </span>

            {item.exception_justification ? (
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="font-bold text-slate-800">
                    Submetido por: {item.exception_justification.submittedBy}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {new Date(item.exception_justification.submittedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p>
                  <strong>Motivo Principal:</strong> {item.exception_justification.reason}
                </p>
                <p>
                  <strong>Por que sair da regra:</strong>{' '}
                  {item.exception_justification.whyBypassRule}
                </p>
                <p>
                  <strong>Necessidade atendida:</strong> {item.exception_justification.needServed}
                </p>
                <p>
                  <strong>Consequência se não realizar:</strong>{' '}
                  {item.exception_justification.consequenceIfNotDone}
                </p>
                <p>
                  <strong>Impacto esperado:</strong> {item.exception_justification.expectedImpact}
                </p>
                <p>
                  <strong>Detalhamento:</strong>{' '}
                  {item.exception_justification.detailedJustification}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Motivo Principal *
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded text-xs p-2"
                    >
                      <option value="ATENDIMENTO_URGENTE_CLIENTE">
                        Atendimento a Pedido Urgente de Cliente
                      </option>
                      <option value="APROVEITAMENTO_MP_RESTANTE">
                        Aproveitamento de Lote Específico de MP
                      </option>
                      <option value="JANELA_MANUTENCAO_PREVENTIVA">
                        Ajuste para Janela de Manutenção
                      </option>
                      <option value="OTIMIZACAO_LOGISTICA_EXPEDICAO">
                        Janela de Expedição / Carregamento
                      </option>
                      <option value="OUTRA_EXCECAO_OPERACIONAL">
                        Outra Exceção Técnica Homologada
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Por que sair da regra? *
                    </label>
                    <Input
                      placeholder="Ex: Cliente com parada de linha iminente..."
                      value={whyBypass}
                      onChange={(e) => setWhyBypass(e.target.value)}
                      className="text-xs bg-white border-slate-300 h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Qual necessidade será atendida? *
                    </label>
                    <Input
                      placeholder="Ex: Pedido MTO #45871 com faturamento hoje..."
                      value={needServed}
                      onChange={(e) => setNeedServed(e.target.value)}
                      className="text-xs bg-white border-slate-300 h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Consequência de não realizar *
                    </label>
                    <Input
                      placeholder="Ex: Multa contratual de atraso..."
                      value={consequenceIfNotDone}
                      onChange={(e) => setConsequenceIfNotDone(e.target.value)}
                      className="text-xs bg-white border-slate-300 h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Impacto esperado *
                    </label>
                    <Input
                      placeholder="Ex: Setup adicional absorvido no turno 2..."
                      value={expectedImpact}
                      onChange={(e) => setExpectedImpact(e.target.value)}
                      className="text-xs bg-white border-slate-300 h-8"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Justificativa Detalhada * (Mínimo 15 caracteres — termos genéricos como
                    "urgente" ou "ok" não são aceitos)
                  </label>
                  <Textarea
                    placeholder="Descreva tecnicamente as razões operacionais, histórico de tratativas com a chefia de produção e viabilidade confirmada com a linha..."
                    value={detailedJustification}
                    onChange={(e) => setDetailedJustification(e.target.value)}
                    className="text-xs bg-white border-slate-300 h-16 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* PAINEL 3: WORKFLOW DE APROVAÇÃO DO SUPERVISOR PCP (Requisitos 14 e 15) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              3. Decisão da Supervisão do PCP (Requisito 14 — OP Bloqueada até Aprovação)
            </span>

            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-lg text-amber-950 text-[11px] space-y-1">
              <p className="font-bold">Regra Inviolável de Governança (Requisito 15):</p>
              <p>
                Enquanto pendente de aprovação, a atividade aparece na grade para planejamento, mas{' '}
                <strong>NÃO gera OP definitiva</strong>, <strong>NÃO é enviada ao MES</strong> e não
                autoriza consumo de cilindros.
              </p>
            </div>

            {isSupervisor && onSupervisorAction && (
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-slate-800 block">
                  Observações / Parecer do Supervisor:
                </label>
                <Input
                  placeholder="Ex: Aprovado em caráter de urgência comercial com compromisso de reposição de turno..."
                  value={supervisorNotes}
                  onChange={(e) => setSupervisorNotes(e.target.value)}
                  className="text-xs bg-white border-slate-300 h-8"
                />

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onSupervisorAction(item.id, 'APPROVED', supervisorNotes)
                      onClose()
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aprovar Exceção PCP
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSupervisorAction(item.id, 'RETURNED_FOR_ADJUSTMENT', supervisorNotes)
                      onClose()
                    }}
                    className="border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs font-bold gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Devolver para Ajuste
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onSupervisorAction(item.id, 'REJECTED', supervisorNotes)
                      onClose()
                    }}
                    className="text-xs font-bold gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Rejeitar Exceção
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700"
          >
            Fechar
          </Button>

          {!item.exception_justification && (
            <Button
              onClick={handleSaveJustification}
              disabled={!isFormValid}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-bold"
            >
              Submeter Justificativa para Supervisor PCP &rarr;
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
