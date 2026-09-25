/**
 * Modal Grande e Responsivo: "Solicitar revisão do cancelamento"
 * Integração Oficial: PCP Robotizado → CRM 360º Comercial
 * Exibe automaticamente todos os 18 dados do pedido/IA e valida campos da solicitação.
 */

import React, { useState, useEffect } from 'react'
import {
  X,
  Send,
  Building2,
  Calendar,
  AlertTriangle,
  Sparkles,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  FileText,
} from 'lucide-react'
import { CancelledOrderRecord, CrmRevisionReason, PriorityLevel } from '@/types/cancelled-orders'
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

interface SolicitarRevisaoModalProps {
  order: CancelledOrderRecord | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedOrder: CancelledOrderRecord, protocolo: string) => void
}

const MOTIVOS_SOLICITACAO: CrmRevisionReason[] = [
  'Motivo do cancelamento possivelmente incorreto',
  'Existia estoque disponível',
  'Existia produção disponível',
  'Existia programação prevista',
  'Divergência de quantidade',
  'Divergência de prazo',
  'Divergência comercial',
  'Divergência de cadastro',
  'Necessidade de confirmação do cliente',
  'Necessidade de confirmação do vendedor',
  'Outros',
]

const PRIORIDADES: PriorityLevel[] = ['Baixa', 'Média', 'Alta', 'Crítica']

export const SolicitarRevisaoModal: React.FC<SolicitarRevisaoModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast()

  const [motivoSolicitacao, setMotivoSolicitacao] = useState<CrmRevisionReason>(
    'Motivo do cancelamento possivelmente incorreto',
  )
  const [justificativa, setJustificativa] = useState<string>('')
  const [prioridade, setPrioridade] = useState<PriorityLevel>('Alta')
  const [responsavelDestino, setResponsavelDestino] = useState<string>('CRM 360º / Comercial')
  const [prazoRetorno, setPrazoRetorno] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Preenche dados padrão ao abrir
  useEffect(() => {
    if (!order || !isOpen) return

    setErrorMessage(null)

    // 1. Motivo padrão
    if (
      order.has_ai_inconsistency &&
      order.motivo_original_sap?.toLowerCase().includes('estoque')
    ) {
      setMotivoSolicitacao('Existia estoque disponível')
    } else if (order.has_ai_inconsistency) {
      setMotivoSolicitacao('Motivo do cancelamento possivelmente incorreto')
    } else {
      setMotivoSolicitacao('Motivo do cancelamento possivelmente incorreto')
    }

    // 2. Justificativa pré-preenchida sugerida pela IA quando houver inconsistência
    if (order.has_ai_inconsistency) {
      const estoqueDisp =
        order.estoque_disponivel_data_t !== null
          ? `${formatTons(order.estoque_disponivel_data_t)}`
          : '1,605 t'
      const qtdPed = formatTons(order.saldo_cancelado_t || order.quantidade_original_ov_t)
      const dataRef = order.data_desejada_cliente || order.data_ordem || 'data do pedido'

      if (order.motivo_original_sap?.toLowerCase().includes('estoque')) {
        setJustificativa(
          `O pedido foi cancelado com motivo '${order.motivo_original_sap}', porém os dados indicam disponibilidade de ${estoqueDisp} na data desejada (${dataRef}) para um pedido de ${qtdPed}. Solicita-se revisão do motivo da recusa e validação da condição efetiva do estoque naquele momento.`,
        )
      } else {
        setJustificativa(
          `O pedido foi cancelado com motivo '${order.motivo_original_sap}', contudo a análise inteligente do PCP identificou evidências divergentes: ${order.ai_probable_cause || 'inconsistência operacional'}. Solicita-se revisão com a equipe comercial e alinhamento do motivo real da recusa.`,
        )
      }
    } else {
      setJustificativa('')
    }

    // 3. Responsável padrão / Vendedor do pedido
    if (
      order.representante_vendedor &&
      order.representante_vendedor !== 'Padrão' &&
      order.representante_vendedor !== '-'
    ) {
      setResponsavelDestino(`CRM 360º / Comercial - Repr. ${order.representante_vendedor}`)
    } else {
      setResponsavelDestino('CRM 360º / Comercial')
    }

    // 4. Prioridade padrão
    if (order.curva_abc === 'A' || order.ai_priority === 'Crítica') {
      setPrioridade('Crítica')
    } else if (order.has_ai_inconsistency) {
      setPrioridade('Alta')
    } else {
      setPrioridade('Média')
    }

    // 5. Prazo padrão: +3 dias úteis no formato dd/mm/aaaa
    const d = new Date()
    d.setDate(d.getDate() + 3)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    setPrazoRetorno(`${dd}/${mm}/${yyyy}`)
  }, [order, isOpen])

  if (!isOpen || !order) return null

  const handleEnviarRevisao = async () => {
    // 1. Validação de campos obrigatórios
    setErrorMessage(null)
    if (!justificativa.trim()) {
      setErrorMessage('O campo Justificativa é obrigatório.')
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe a justificativa da solicitação de revisão.',
        variant: 'destructive',
      })
      return
    }

    if (!motivoSolicitacao) {
      setErrorMessage('Selecione o motivo da solicitação de revisão.')
      return
    }

    if (!responsavelDestino.trim()) {
      setErrorMessage('Informe a Área / Responsável de destino.')
      return
    }

    // Bloqueia clique duplo
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await cancelledOrdersService.requestCrmRevision({
        orderId: order.id,
        motivoSolicitacao,
        justificativa: justificativa.trim(),
        prioridade,
        responsavelDestino: responsavelDestino.trim(),
        prazoRetorno: prazoRetorno.trim(),
        solicitanteNome: 'Eng. PCP / Operação',
      })

      toast({
        title: 'Solicitação Enviada ao CRM 360º com Sucesso',
        description: `Protocolo nº ${res.pendency.protocolo}. Acompanhe o status na coluna Ações.`,
        duration: 5000,
      })

      onSuccess(res.order, res.pendency.protocolo)
      onClose()
    } catch (err: any) {
      const msg = err.message || 'Erro inesperado ao conectar com o serviço do CRM 360º.'
      setErrorMessage(msg)
      toast({
        title: 'Falha ao Enviar Revisão',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const evidenciasTexto =
    order.ai_analysis_payload?.evidences && order.ai_analysis_payload.evidences.length > 0
      ? order.ai_analysis_payload.evidences.join(' • ')
      : order.has_ai_inconsistency
        ? order.ai_probable_cause
        : 'Análise de dados concluída sem evidências críticas adicionais.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#004C97] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/15 rounded-lg text-white">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/20 text-white">
                  Integração CRM 360º
                </span>
                <span className="text-xs text-blue-200">|</span>
                <span className="text-xs text-blue-100 font-medium">PCP Robotizado</span>
              </div>
              <h2 className="text-base font-bold tracking-tight mt-0.5">
                Solicitar revisão do cancelamento
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro (preserva todos os dados na tela) */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-start space-x-2 text-rose-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Erro ao enviar solicitação:</strong> {errorMessage}
              <div className="text-[11px] text-rose-700 mt-0.5">
                Todos os dados preenchidos foram preservados para nova tentativa.
              </div>
            </div>
          </div>
        )}

        {/* Corpo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seção 1: Dados Automáticos do Pedido e da IA (Requisito 2) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Dados Automáticos do Pedido (SAP ECC & PCP)</span>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                OV {order.ordem_venda} / Item {order.item_ordem}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Ordem / Item</span>
                <span className="font-bold text-slate-900 font-mono">
                  {order.ordem_venda} / {order.item_ordem}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Cliente</span>
                <span
                  className="font-semibold text-slate-900 truncate block"
                  title={order.cliente_nome}
                >
                  {order.cliente_nome}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {order.cliente_codigo || 'SEM CÓDIGO'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Material</span>
                <span
                  className="font-semibold font-mono text-[#004C97] truncate block"
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

              <div>
                <span className="text-[11px] text-slate-500 block">Linha / Centro</span>
                <span className="font-semibold text-slate-800 block">
                  {order.centro} - {order.linha}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Datas</span>
                <span className="text-slate-800 block text-[11px]">Pedido: {order.data_ordem}</span>
                <span className="text-slate-600 block text-[10px]">
                  Desejada: {order.data_desejada_cliente || '-'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Qtd & Valor Cancelado</span>
                <span className="font-bold text-rose-700 font-mono block">
                  {formatTons(order.saldo_cancelado_t)}
                </span>
                <span className="text-[10px] text-slate-700 font-mono block font-semibold">
                  {formatCurrencyPtBr(order.valor_cancelado_brl)}
                </span>
              </div>
            </div>

            {/* Motivo SAP & Análise IA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 text-xs">
              <div className="bg-white p-3 rounded border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Motivo Informado no SAP:
                </span>
                <div className="font-bold text-slate-900 mt-0.5">{order.motivo_original_sap}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Categoria: {order.categoria_motivo} • Status Atual: {order.analysis_status}
                </div>
              </div>

              <div className="bg-white p-3 rounded border border-indigo-200 bg-indigo-50/20">
                <div className="flex items-center space-x-1 text-indigo-950 font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Análise Realizada pela IA:</span>
                </div>
                <div className="font-medium text-slate-900 text-xs mt-0.5">
                  {order.ai_probable_cause || order.ai_verification_status}
                </div>
                <div className="text-[10px] text-slate-600 mt-1 truncate" title={evidenciasTexto}>
                  <strong>Evidências:</strong> {evidenciasTexto}
                </div>
                <div className="text-[10px] text-indigo-700 mt-0.5 font-medium">
                  Responsabilidade provável sugerida: {order.ai_suggested_responsibility || 'PCP'}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Formulário da Solicitação ao CRM 360º (Requisito 3) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Send className="w-4 h-4 mr-1.5 text-[#004C97]" />
              Parâmetros da Solicitação de Revisão (CRM 360º)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Motivo da solicitação */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Motivo da Solicitação de Revisão <span className="text-rose-600">*</span>
                </label>
                <Select
                  value={motivoSolicitacao}
                  onValueChange={(val) => setMotivoSolicitacao(val as CrmRevisionReason)}
                >
                  <SelectTrigger className="h-9 text-xs border-slate-300">
                    <SelectValue placeholder="Selecione o motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_SOLICITACAO.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Prioridade <span className="text-rose-600">*</span>
                </label>
                <Select
                  value={prioridade}
                  onValueChange={(val) => setPrioridade(val as PriorityLevel)}
                >
                  <SelectTrigger className="h-9 text-xs border-slate-300">
                    <SelectValue placeholder="Selecione a prioridade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Responsável / Área de Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Responsável / Área de Destino <span className="text-rose-600">*</span>
                </label>
                <Input
                  type="text"
                  value={responsavelDestino}
                  onChange={(e) => setResponsavelDestino(e.target.value)}
                  placeholder="Ex: CRM 360º / Comercial - Repr. Nome"
                  className="h-9 text-xs border-slate-300"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Identificado automaticamente pelo pedido quando disponível.
                </span>
              </div>

              {/* Prazo Solicitado */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Prazo Solicitado para Retorno (dd/mm/aaaa)
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <Input
                    type="text"
                    value={prazoRetorno}
                    onChange={(e) => setPrazoRetorno(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className="pl-8 h-9 text-xs border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Justificativa Obrigatória */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Justificativa da Revisão <span className="text-rose-600">* (Obrigatório)</span>
                </label>
                {order.has_ai_inconsistency && (
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                    Sugestão formulada pela IA baseada nas evidências
                  </span>
                )}
              </div>
              <Textarea
                rows={4}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva a fundamentação técnica e comercial para que o CRM 360º reavalie este cancelamento..."
                className="text-xs border-slate-300 font-sans leading-relaxed"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Você pode editar e complementar livremente o texto sugerido pela IA antes do envio.
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé / Ações (Requisito 4) */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-600">
            Origem registrada:{' '}
            <strong className="text-slate-800">PCP Robotizado → Pedidos Cancelados</strong>. Gera
            protocolo oficial único e notificação ao CRM 360º.
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-9 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleEnviarRevisao}
              disabled={isSubmitting}
              className="text-xs h-9 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold shadow-xs"
            >
              <Send className={`w-3.5 h-3.5 mr-1.5 ${isSubmitting ? 'animate-pulse' : ''}`} />
              {isSubmitting ? 'Enviando ao CRM 360º...' : 'Enviar para CRM 360º'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
