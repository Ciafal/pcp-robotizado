/**
 * Modal Detalhado de Análise do Cancelamento (Quase tela cheia)
 * Requisitos 6, 7, 8, 9, 10, 11, 12, 13, 21, 22, 25, 26, 27
 * Título exato: "Análise do Cancelamento"
 * Separação estrita: Motivo informado original (SAP) | Análise IA | Causa provável | Causa validada
 * Feedback humano: Confirmar, Discordar, Corrigir, Salvar 5W2H, Auditoria com "+/−/~"
 */

import React, { useState } from 'react'
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  FileText,
  Clock,
  UserCheck,
  History,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  Send,
} from 'lucide-react'
import {
  CancelledOrderRecord,
  AnalysisStatus,
  ProbableResponsibility,
  ActionPlan5W2H,
} from '@/types/cancelled-orders'
import { formatTons, formatCurrencyPtBr } from '@/lib/formatters-ptbr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cancelledOrdersService } from '@/services/cancelled-orders-service'

interface ModalProps {
  order: CancelledOrderRecord | null
  isOpen: boolean
  onClose: () => void
  onOrderUpdated: (updated: CancelledOrderRecord) => void
  onRequestRevision?: (order: CancelledOrderRecord) => void
  onViewRevisionHistory?: (order: CancelledOrderRecord) => void
}

const RESPONSABILIDADES: ProbableResponsibility[] = [
  'PCP',
  'Comercial',
  'Cliente',
  'Crédito/Financeiro',
  'Logística',
  'Qualidade',
  'Indústria',
  'Suprimentos',
  'Cadastro',
  'Sistema',
  'Externo',
  'Indefinido',
]

export const CancelledOrderDetailModal: React.FC<ModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
  onRequestRevision,
  onViewRevisionHistory,
}) => {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'analise' | 'explicador' | '5w2h'>('analise')
  const [validatedResponsibility, setValidatedResponsibility] = useState<ProbableResponsibility>(
    order?.validated_responsibility || order?.ai_suggested_responsibility || 'PCP',
  )
  const [validatedCause, setValidatedCause] = useState<string>(
    order?.validated_cause || order?.ai_probable_cause || '',
  )
  const [humanNotes, setHumanNotes] = useState<string>(order?.human_notes || '')
  const [isSaving, setIsSaving] = useState(false)

  // Campos 5W2H
  const [whatAcao, setWhatAcao] = useState(order?.ai_action_suggested || '')
  const [whoResponsavel, setWhoResponsavel] = useState('Programador PCP')
  const [whenPrazo, setWhenPrazo] = useState('28/02/2025')
  const [whereLocal, setWhereLocal] = useState(`${order?.centro} / ${order?.linha}`)
  const [howComo, setHowComo] = useState('Ajuste de grade e remanejamento de tarugos')
  const [whyMotivo, setWhyMotivo] = useState(order?.ai_probable_cause || '')
  const [howMuch, setHowMuch] = useState('Sem custo direto')
  const [isCreatingPlan, setIsCreatingPlan] = useState(false)

  if (!isOpen || !order) return null

  const aiPayload = order.ai_analysis_payload
  const isInconsistent = order.has_ai_inconsistency

  // Salvar Validação / Feedback Humano
  const handleSaveValidation = async (status: AnalysisStatus) => {
    if (isSaving) return
    setIsSaving(true)

    try {
      const updated = await cancelledOrdersService.submitHumanFeedback({
        orderId: order.id,
        newStatus: status,
        validatedCause: validatedCause || order.ai_probable_cause,
        validatedResponsibility: validatedResponsibility,
        humanNotes: humanNotes,
        userName: 'Eng. PCP / Operação',
      })

      onOrderUpdated(updated)
      toast({
        title: 'Validação Humana Registrada com Sucesso',
        description: `Status do pedido atualizado para "${status}". Motivo SAP original integralmente preservado.`,
        duration: 4000,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Validação',
        description:
          err.message ||
          'Não foi possível salvar os dados. Os valores digitados foram preservados.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Criar Plano 5W2H
  const handleCreate5W2H = async () => {
    if (isCreatingPlan) return
    if (!whatAcao.trim() || !whoResponsavel.trim()) {
      toast({
        title: 'Campos Obrigatórios',
        description: 'Informe o que será feito (Ação) e o responsável pelo plano 5W2H.',
        variant: 'destructive',
      })
      return
    }

    setIsCreatingPlan(true)
    try {
      const plan = await cancelledOrdersService.createActionPlan({
        order_id: order.id,
        ordem_venda: order.ordem_venda,
        item_ordem: order.item_ordem,
        cliente_nome: order.cliente_nome,
        material_codigo: order.material_codigo,
        motivo_original: order.motivo_original_sap,
        causa_provavel: validatedCause || order.ai_probable_cause,
        evidencias: aiPayload?.evidences?.join('; ') || '',
        centro_linha: `${order.centro} - ${order.linha}`,
        impacto_toneladas: order.saldo_cancelado_t,
        impacto_financeiro_brl: order.valor_cancelado_brl,
        what_acao: whatAcao,
        why_motivo: whyMotivo,
        who_responsavel: whoResponsavel,
        when_prazo: whenPrazo,
        where_local: whereLocal,
        how_como: howComo,
        how_much_custo: howMuch,
        status: 'Aberto',
        created_by_name: 'Eng. PCP / Governança',
      })

      toast({
        title: 'Plano 5W2H Criado com Sucesso',
        description: `Plano ${plan.code} integrado à esteira de governança do PCP.`,
        duration: 4000,
      })

      const reloaded = await cancelledOrdersService.getOrderById(order.id)
      if (reloaded) onOrderUpdated(reloaded)
    } catch (err: any) {
      toast({
        title: 'Falha ao Criar Plano de Ação',
        description: err.message || 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingPlan(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Análise do Cancelamento</h2>
              <p className="text-xs text-slate-300">
                Ordem de Venda:{' '}
                <span className="font-mono font-bold text-amber-300">{order.ordem_venda}</span> •
                Item: {order.item_ordem} • Centro: {order.centro} ({order.linha})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Status: {order.analysis_status}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas Internas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('analise')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'analise'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Visão Geral & Validação
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('explicador')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'explicador'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Por que a IA chegou a esta análise? (Rastreabilidade)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('5w2h')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === '5w2h'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Plano de Ação 5W2H {order.action_plan_id ? `(${order.action_plan_id})` : ''}
          </button>
        </div>

        {/* Corpo do Modal com Rolagem Interna */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'analise' && (
            <>
              {/* Bloco: Dados do Pedido (Requisito 6) */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-1.5 text-slate-500" />
                  Dados do Pedido (SAP ECC)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                  {/* 1. Cliente */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Cliente</span>
                    <span
                      className="font-semibold text-slate-900 truncate block"
                      title={order.cliente_nome}
                    >
                      {order.cliente_nome}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {order.cliente_codigo} {order.curva_abc ? `• Curva ${order.curva_abc}` : ''}
                    </span>
                  </div>

                  {/* 2. Material */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Material</span>
                    <span
                      className="font-semibold font-mono text-indigo-900 truncate block"
                      title={order.material_codigo}
                    >
                      {order.material_codigo}
                    </span>
                    <span
                      className="text-[10px] text-slate-600 truncate block"
                      title={order.material_descricao}
                    >
                      {order.material_descricao}
                    </span>
                  </div>

                  {/* 3. Quantidade Cancelada */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Quantidade Cancelada</span>
                    <span className="font-bold text-rose-700 font-mono text-sm block">
                      {formatTons(order.saldo_cancelado_t)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      OV: {formatTons(order.quantidade_original_ov_t)}
                    </span>
                  </div>

                  {/* 4. Datas Relevantes */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Datas Relevantes</span>
                    <span className="text-slate-800 block font-mono text-xs">
                      Ordem: {order.data_ordem}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Desejada: {order.data_desejada_cliente || '-'}
                    </span>
                    {order.data_prevista_producao && (
                      <span className="text-[10px] text-slate-500 block">
                        Prev: {order.data_prevista_producao}
                      </span>
                    )}
                  </div>

                  {/* 5. Linha / Vendedor */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Linha / Vendedor</span>
                    <span className="font-semibold text-slate-800 block">
                      {order.centro} - {order.linha}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {order.representante_vendedor || 'Padrão'}
                    </span>
                  </div>
                </div>

                {/* Motivo e Observação Registrados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200 text-xs">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="text-slate-500 text-[11px] block mb-0.5">
                      Motivo Registrado no SAP (Original)
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {order.motivo_original_sap}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Categoria: {order.categoria_motivo}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="text-slate-500 text-[11px] block mb-0.5">
                      Observação do Cancelamento
                    </span>
                    <p className="text-slate-800 italic">
                      {order.observacao || 'Nenhuma observação informada no apontamento.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloco: Análise IA Individual (Requisitos 7, 8, 9, 11, 12, 13) */}
              <div className="border border-indigo-200 bg-indigo-50/30 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-indigo-950">
                      Análise Inteligente de Causa e Validação de Coerência
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2.5 py-1 rounded font-semibold bg-white border border-indigo-200 text-indigo-900">
                      Nível de Confiança: {order.ai_confidence_level}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded font-semibold bg-white border border-indigo-200 text-indigo-900">
                      Prioridade: {order.ai_priority}
                    </span>
                  </div>
                </div>

                {/* Alerta de Inconsistência ou Padrão Recorrente */}
                {isInconsistent && (
                  <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-950 text-xs mb-4 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        Atenção: Inconsistência encontrada nos dados históricos!
                      </span>
                      <p className="mt-0.5">{order.ai_probable_cause}</p>
                    </div>
                  </div>
                )}

                {aiPayload?.recurringPatternDetected && (
                  <div className="p-3 bg-purple-100 border border-purple-300 rounded-lg text-purple-950 text-xs mb-4 flex items-start space-x-2">
                    <History className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Padrão Recorrente Identificado:</span>
                      <p className="mt-0.5">{aiPayload.recurringReason}</p>
                    </div>
                  </div>
                )}

                {/* Grid das 4 Camadas Exigidas no Requisito 7: Motivo Original | Análise IA | Causa Provável | Causa Validada */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  {/* 1. Motivo Informado */}
                  <div className="bg-white p-3 rounded-lg border border-slate-300">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      1. Motivo Informado (SAP)
                    </span>
                    <div className="text-xs font-bold text-slate-900">
                      {order.motivo_original_sap}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Dado original imutável
                    </span>
                  </div>

                  {/* 2. Análise IA */}
                  <div className="bg-white p-3 rounded-lg border border-indigo-200">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                      2. Análise IA
                    </span>
                    <div className="text-xs font-semibold text-slate-800">
                      {order.ai_verification_status}
                    </div>
                    <span className="text-[10px] text-indigo-600 block mt-1">
                      {order.ai_avoidable_status}
                    </span>
                  </div>

                  {/* 3. Causa Provável */}
                  <div className="bg-white p-3 rounded-lg border border-indigo-200">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                      3. Causa Provável (Hipótese)
                    </span>
                    <div className="text-xs text-slate-800 font-medium">
                      {order.ai_probable_cause}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Sugerido: {order.ai_suggested_responsibility}
                    </span>
                  </div>

                  {/* 4. Causa Validada */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-300 bg-emerald-50/30">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                      4. Causa Validada (Humana)
                    </span>
                    <div className="text-xs font-bold text-emerald-950">
                      {order.validated_cause || 'Aguardando validação humana'}
                    </div>
                    <span className="text-[10px] text-emerald-700 block mt-1">
                      {order.validated_by_user_name
                        ? `Validado por: ${order.validated_by_user_name}`
                        : 'Pendente'}
                    </span>
                  </div>
                </div>

                {/* Evidências e Ação Sugerida */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-800 block mb-1">
                      Evidências Encontradas nos Dados:
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                      {aiPayload?.evidences && aiPayload.evidences.length > 0 ? (
                        aiPayload.evidences.map((ev, i) => <li key={i}>{ev}</li>)
                      ) : (
                        <li>Nenhuma evidência documental localizada.</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-800 block mb-1">
                      Ação Preventiva Sugerida pela IA:
                    </span>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      {order.ai_action_suggested}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloco: Validação Humana e Governança (Requisito 26, 27) */}
              <div className="border border-slate-200 rounded-lg p-5 bg-white">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center">
                  <UserCheck className="w-4 h-4 mr-1.5 text-slate-600" />
                  Governança & Validação Humana do Analista / Gestor PCP
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Responsabilidade Confirmada
                    </label>
                    <Select
                      value={validatedResponsibility}
                      onValueChange={(val) =>
                        setValidatedResponsibility(val as ProbableResponsibility)
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione a responsabilidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESPONSABILIDADES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Causa Raiz Confirmada pelo Usuário
                    </label>
                    <Input
                      type="text"
                      value={validatedCause}
                      onChange={(e) => setValidatedCause(e.target.value)}
                      placeholder="Descreva ou ajuste a causa confirmada..."
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="text-xs mb-4">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Parecer Técnico / Justificativa Humana
                  </label>
                  <Textarea
                    rows={2}
                    value={humanNotes}
                    onChange={(e) => setHumanNotes(e.target.value)}
                    placeholder="Adicione observações para registro na trilha de auditoria..."
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    O motivo original do SAP não é alterado. A validação humana gera logs imutáveis
                    (+/−/~).
                  </span>

                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => handleSaveValidation('Discordado')}
                      className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                    >
                      Discordar da Análise
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => handleSaveValidation('Validado')}
                      className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {isSaving ? 'Salvando...' : 'Confirmar & Validar Causa'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Aba: EXPLICADOR DA IA (Requisito 25) */}
          {activeTab === 'explicador' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  Rastreabilidade Analítica: Por que a IA chegou a esta análise?
                </h4>
                <p className="text-slate-600">
                  A IA do HUB CIAFAL cruza os registros da ordem com dados de estoques diários,
                  produção apontada, grade semanal e histórico de clientes/materiais.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <span className="font-semibold text-slate-800 block mb-2">
                    Dados Consultados no Modelo
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {aiPayload?.consultedData?.map((d, i) => <li key={i}>{d}</li>) || (
                      <li>Estoque na data e ordens no SAP</li>
                    )}
                  </ul>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    Período consultado: {aiPayload?.consultedPeriod || 'Data da ordem'}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <span className="font-semibold text-slate-800 block mb-2">
                    Hipóteses Consideradas
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {aiPayload?.hypotheses && aiPayload.hypotheses.length > 0 ? (
                      aiPayload.hypotheses.map((h, i) => <li key={i}>{h}</li>)
                    ) : (
                      <li>Hipótese única coerente com o apontamento.</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <span className="font-semibold text-slate-800 block mb-2">
                    Dados Faltantes (Quando houver)
                  </span>
                  {aiPayload?.missingData && aiPayload.missingData.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1 text-amber-800">
                      {aiPayload.missingData.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">
                      Todos os dados essenciais estavam disponíveis no repositório.
                    </p>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <span className="font-semibold text-slate-800 block mb-2">
                    Limitações do Algoritmo
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {aiPayload?.limitations?.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Aba: 5W2H (Requisito 22) */}
          {activeTab === '5w2h' && (
            <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Plano de Ação Corretiva 5W2H</h4>
                  <p className="text-slate-500">
                    Integração com a Esteira de Governança e Gestão de Performance do PCP.
                  </p>
                </div>
                {order.action_plan_id && (
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-mono font-bold text-xs">
                    Código: {order.action_plan_id}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    What (O que fazer?)
                  </label>
                  <Input
                    type="text"
                    value={whatAcao}
                    onChange={(e) => setWhatAcao(e.target.value)}
                    placeholder="Ação corretiva necessária..."
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Why (Por que fazer?)
                  </label>
                  <Input
                    type="text"
                    value={whyMotivo}
                    onChange={(e) => setWhyMotivo(e.target.value)}
                    placeholder="Justificativa da ação..."
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Who (Quem é o responsável?)
                  </label>
                  <Input
                    type="text"
                    value={whoResponsavel}
                    onChange={(e) => setWhoResponsavel(e.target.value)}
                    placeholder="Nome ou área responsável..."
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    When (Prazo de conclusão?)
                  </label>
                  <Input
                    type="text"
                    value={whenPrazo}
                    onChange={(e) => setWhenPrazo(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Where (Onde será implementado?)
                  </label>
                  <Input
                    type="text"
                    value={whereLocal}
                    onChange={(e) => setWhereLocal(e.target.value)}
                    placeholder="Linha ou centro produtivo..."
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    How (Como será feito?)
                  </label>
                  <Input
                    type="text"
                    value={howComo}
                    onChange={(e) => setHowComo(e.target.value)}
                    placeholder="Método operacional..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-slate-500 font-mono text-[11px]">
                  Impacto Físico: {formatTons(order.saldo_cancelado_t)}
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={isCreatingPlan}
                  onClick={handleCreate5W2H}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  {isCreatingPlan ? 'Criando Plano...' : 'Criar Plano de Ação 5W2H'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Ordem registrada em: <span className="font-mono">{order.data_ordem}</span> • Usuário do
            apontamento:{' '}
            <span className="font-semibold text-slate-800">
              {order.usuario_operacao || 'VENDAS'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {order.crm_protocolo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  onViewRevisionHistory?.(order)
                }}
                className="text-xs h-8 border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1 text-blue-700" />
                Ver Revisão CRM ({order.crm_protocolo})
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose()
                  onRequestRevision?.(order)
                }}
                className="text-xs h-8 bg-[#004C97] hover:bg-[#003d7a] text-white font-medium"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Solicitar revisão ao CRM 360º
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              Fechar Modal
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
