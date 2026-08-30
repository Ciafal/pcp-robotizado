import React, { useState } from 'react'
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Layers,
  Send,
  PlusCircle,
  FileCheck,
  AlertCircle,
  Trash2,
  MoreHorizontal,
  ShieldCheck,
  Users,
  Search,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { CiafalStatus } from './CiafalDesignSystem'
import { Can } from '@/components/auth/Can'
import { useToast } from '@/hooks/use-toast'

export type ActionPriority = 'ALTA' | 'MEDIA' | 'BAIXA'
export type ActionOrigin =
  | 'Integrações'
  | 'Industrialização'
  | 'PCP'
  | 'Qualidade'
  | 'Estoque'
  | 'IA Prescritiva'

export type StepStatus = 'PENDENTE' | 'EM_ANALISE' | 'CONCLUIDA' | 'IGNORADA'

export interface SuggestedNextStep {
  id: string
  priority: ActionPriority
  action: string
  origin: ActionOrigin
  responsible: string
  deadline: string
  status: StepStatus
  primaryButtonLabel?: string
  decisionRationale?: string
  suggestedActionType?: string
}

const initialSuggestedSteps: SuggestedNextStep[] = [
  {
    id: 'step-1',
    priority: 'ALTA',
    action: 'Integrar SAP ECC, WMS e TMS',
    origin: 'Integrações',
    responsible: 'A definir',
    deadline: '—',
    status: 'PENDENTE',
    primaryButtonLabel: 'Analisar',
    decisionRationale:
      'Necessário para que os cálculos de trânsito e disponibilidade de carretas utilizem dados reais em tempo de execução.',
    suggestedActionType: 'INTEGRACAO',
  },
  {
    id: 'step-2',
    priority: 'MEDIA',
    action: 'Homologar rotina Arcelor',
    origin: 'Industrialização',
    responsible: 'A definir',
    deadline: '—',
    status: 'PENDENTE',
    primaryButtonLabel: 'Homologar',
    decisionRationale:
      'Garantir aderência ao rendimento contratual de 93,0% e segregação dimensional de tarugos 130x130 e 150x150.',
    suggestedActionType: 'HOMOLOGACAO',
  },
  {
    id: 'step-3',
    priority: 'MEDIA',
    action: 'Validar parâmetros com PCP',
    origin: 'PCP',
    responsible: 'A definir',
    deadline: '—',
    status: 'PENDENTE',
    primaryButtonLabel: 'Validar',
    decisionRationale:
      'Revisão dos fatores de produtividade (18 t/h) e lote mínimo por bitola na Linha 1 e Linha 2.',
    suggestedActionType: 'PARAMETRO',
  },
]

interface SuggestedNextStepsSectionProps {
  initialSteps?: SuggestedNextStep[]
  title?: string
  subtitle?: string
  showAddButton?: boolean
}

export const SuggestedNextStepsSection: React.FC<SuggestedNextStepsSectionProps> = ({
  initialSteps = initialSuggestedSteps,
  title = 'Próximos Passos Sugeridos & Plano de Ação',
  subtitle = 'Recomendações corporativas estruturadas para o PCP. A IA sugere; a decisão e execução respeitam a governança e permissões do usuário.',
  showAddButton = true,
}) => {
  const { toast } = useToast()
  const [steps, setSteps] = useState<SuggestedNextStep[]>(initialSteps)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('ALL')

  // Modal de conversão de ação / delegação
  const [selectedStepForModal, setSelectedStepForModal] = useState<SuggestedNextStep | null>(null)
  const [modalMode, setModalMode] = useState<
    'TASK' | 'DELEGATE' | 'VALIDATE' | 'AI_ANALYZE' | 'ACTION_PLAN' | 'CREATE_PENDENCY' | null
  >(null)
  const [modalResponsible, setModalResponsible] = useState('')
  const [modalDeadline, setModalDeadline] = useState('')
  const [modalNotes, setModalNotes] = useState('')

  const handleOpenModal = (
    step: SuggestedNextStep,
    mode: 'TASK' | 'DELEGATE' | 'VALIDATE' | 'AI_ANALYZE' | 'ACTION_PLAN' | 'CREATE_PENDENCY',
  ) => {
    setSelectedStepForModal(step)
    setModalMode(mode)
    setModalResponsible(step.responsible === 'A definir' ? '' : step.responsible)
    setModalDeadline(step.deadline === '—' ? '' : step.deadline)
    setModalNotes('')
  }

  const handleConfirmModalAction = () => {
    if (!selectedStepForModal) return

    let updatedStatus: StepStatus = selectedStepForModal.status
    let message = ''

    if (modalMode === 'TASK') {
      updatedStatus = 'EM_ANALISE'
      message = `Tarefa criada para "${selectedStepForModal.action}" sob responsabilidade de ${modalResponsible || 'PCP'}.`
    } else if (modalMode === 'DELEGATE') {
      updatedStatus = 'EM_ANALISE'
      message = `Recomendação enviada com sucesso ao responsável ${modalResponsible}.`
    } else if (modalMode === 'VALIDATE') {
      updatedStatus = 'EM_ANALISE'
      message = `Solicitação de validação formal despachada para o PCP.`
    } else if (modalMode === 'ACTION_PLAN') {
      updatedStatus = 'EM_ANALISE'
      message = `Plano de ação executivo registrado com prazo até ${modalDeadline || 'próxima semana'}.`
    } else if (modalMode === 'CREATE_PENDENCY') {
      updatedStatus = 'PENDENTE'
      message = `Pendência registrada na pauta da próxima Reunião Semanal de PCP.`
    } else if (modalMode === 'AI_ANALYZE') {
      message = `Análise preditiva por IA concluída: alta aderência operacional e baixo risco de ruptura.`
    }

    setSteps((prev) =>
      prev.map((s) =>
        s.id === selectedStepForModal.id
          ? {
              ...s,
              status: updatedStatus,
              responsible: modalResponsible || s.responsible,
              deadline: modalDeadline || s.deadline,
            }
          : s,
      ),
    )

    toast({
      title: 'Ação Processada com Sucesso',
      description: message,
    })

    setSelectedStepForModal(null)
    setModalMode(null)
  }

  const handleMarkAsCompleted = (id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'CONCLUIDA' } : s)))
    toast({
      title: 'Recomendação Concluída',
      description: 'O item foi arquivado como executado com sucesso.',
    })
  }

  const handleIgnore = (id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'IGNORADA' } : s)))
    toast({
      title: 'Recomendação Ignorada',
      description: 'A recomendação foi desconsiderada para este ciclo.',
    })
  }

  const filteredSteps = steps.filter((step) => {
    const matchesSearch =
      step.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      step.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      step.responsible.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPriority = filterPriority === 'ALL' || step.priority === filterPriority

    return matchesSearch && matchesPriority
  })

  return (
    <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
      {/* Cabeçalho Corporativo Limpo */}
      <CardHeader className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-white to-slate-50/80 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#004C97] text-white rounded-md shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {title}
              </CardTitle>
              <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[10px] font-bold">
                Decisão Assistida
              </Badge>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-500">
              {steps.filter((s) => s.status === 'PENDENTE').length} pendente(s)
            </span>
          </div>
        </div>

        {/* Barra de Filtros e Pesquisa */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              placeholder="Pesquisar ação, origem ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-white border-slate-200"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Prioridade:</span>
            {['ALL', 'ALTA', 'MEDIA', 'BAIXA'].map((prio) => (
              <button
                key={prio}
                type="button"
                onClick={() => setFilterPriority(prio)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  filterPriority === prio
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {prio === 'ALL' ? 'Todas' : prio}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      {/* Conteúdo em Tabela Estruturada de Alta Densidade Informacional */}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                <th className="py-3 px-4 w-28">Prioridade</th>
                <th className="py-3 px-4 min-w-[240px]">Ação Recomendada</th>
                <th className="py-3 px-4 w-36">Origem</th>
                <th className="py-3 px-4 w-40">Responsável</th>
                <th className="py-3 px-4 w-28">Prazo</th>
                <th className="py-3 px-4 w-32">Status</th>
                <th className="py-3 px-4 text-right w-44">Ações Disponíveis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSteps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    Nenhum passo sugerido localizado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSteps.map((step) => {
                  const isHigh = step.priority === 'ALTA'
                  const isMed = step.priority === 'MEDIA'

                  return (
                    <tr
                      key={step.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        step.status === 'CONCLUIDA' ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Prioridade */}
                      <td className="py-3 px-4 align-middle">
                        <Badge
                          className={`text-[9px] font-bold ${
                            isHigh
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : isMed
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {step.priority}
                        </Badge>
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-4 align-middle">
                        <div className="font-bold text-slate-900 leading-snug">{step.action}</div>
                        {step.decisionRationale && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {step.decisionRationale}
                          </div>
                        )}
                      </td>

                      {/* Origem */}
                      <td className="py-3 px-4 align-middle">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Layers className="w-3 h-3 text-[#004C97]" />
                          {step.origin}
                        </span>
                      </td>

                      {/* Responsável */}
                      <td className="py-3 px-4 align-middle">
                        <span
                          className={`text-[11px] ${
                            step.responsible === 'A definir'
                              ? 'text-slate-400 italic'
                              : 'text-slate-800 font-semibold'
                          }`}
                        >
                          {step.responsible}
                        </span>
                      </td>

                      {/* Prazo */}
                      <td className="py-3 px-4 align-middle font-mono text-[11px] text-slate-600">
                        {step.deadline}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-middle">
                        <CiafalStatus
                          status={
                            step.status === 'PENDENTE'
                              ? 'ATENCAO'
                              : step.status === 'CONCLUIDA'
                                ? 'SUCESSO'
                                : step.status === 'IGNORADA'
                                  ? 'SEM_DADO'
                                  : 'INFO'
                          }
                          label={
                            step.status === 'PENDENTE'
                              ? 'Pendente'
                              : step.status === 'EM_ANALISE'
                                ? 'Em Análise'
                                : step.status === 'CONCLUIDA'
                                  ? 'Concluído'
                                  : 'Ignorado'
                          }
                          size="sm"
                        />
                      </td>

                      {/* Ação / Menu de Governança */}
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {step.status !== 'CONCLUIDA' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleOpenModal(
                                  step,
                                  step.suggestedActionType === 'HOMOLOGACAO' ? 'VALIDATE' : 'TASK',
                                )
                              }
                              className="h-7 px-2.5 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold shadow-2xs gap-1"
                            >
                              <span>{step.primaryButtonLabel || 'Executar'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-slate-300 text-slate-700 hover:bg-slate-100"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-52 text-xs bg-white border-slate-200"
                            >
                              <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase font-mono">
                                Decisão & Governança
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleOpenModal(step, 'TASK')}
                                className="cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5 mr-2 text-[#004C97]" />
                                Converter em tarefa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenModal(step, 'DELEGATE')}
                                className="cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                Enviar ao responsável
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenModal(step, 'ACTION_PLAN')}
                                className="cursor-pointer"
                              >
                                <FileCheck className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                Criar plano de ação
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenModal(step, 'CREATE_PENDENCY')}
                                className="cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5 mr-2 text-amber-600" />
                                Criar pendência (Reunião)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenModal(step, 'VALIDATE')}
                                className="cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                                Solicitar validação
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenModal(step, 'AI_ANALYZE')}
                                className="cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-2 text-cyan-600" />
                                Abrir análise por IA
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {step.status !== 'CONCLUIDA' && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsCompleted(step.id)}
                                  className="cursor-pointer text-emerald-700"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                  Marcar como concluído
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleIgnore(step.id)}
                                className="cursor-pointer text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600" />
                                Ignorar recomendação
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Modal de Configuração / Despacho da Ação */}
      <Dialog
        open={!!selectedStepForModal}
        onOpenChange={(open) => !open && setSelectedStepForModal(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#004C97]" />
              {modalMode === 'TASK' && 'Converter Recomendação em Tarefa'}
              {modalMode === 'DELEGATE' && 'Enviar Recomendação ao Responsável'}
              {modalMode === 'VALIDATE' && 'Solicitar Validação Formal'}
              {modalMode === 'ACTION_PLAN' && 'Criar Plano de Ação Executivo'}
              {modalMode === 'CREATE_PENDENCY' && 'Criar Pendência de Reunião'}
              {modalMode === 'AI_ANALYZE' && 'Análise de Viabilidade por IA'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedStepForModal?.action}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {selectedStepForModal?.decisionRationale && (
              <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 text-[11px] text-slate-700">
                <span className="font-bold text-[#004C97] block">Justificativa da IA:</span>
                {selectedStepForModal.decisionRationale}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Responsável Designado</Label>
              <Input
                placeholder="Ex: Engenharia de Processos / PCP L1"
                value={modalResponsible}
                onChange={(e) => setModalResponsible(e.target.value)}
                className="h-8 text-xs bg-white border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Prazo Limite / Data de Entrega
              </Label>
              <Input
                type="date"
                value={modalDeadline}
                onChange={(e) => setModalDeadline(e.target.value)}
                className="h-8 text-xs bg-white border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Observações Operacionais (Opcional)
              </Label>
              <Input
                placeholder="Detalhes adicionais para o fluxo de governança..."
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                className="h-8 text-xs bg-white border-slate-300"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStepForModal(null)}
              className="border-slate-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmModalAction}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold shadow-2xs"
            >
              Confirmar e Despachar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default SuggestedNextStepsSection
