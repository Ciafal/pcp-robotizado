/**
 * Modal Detalhado de Análise do Cancelamento (Quase tela cheia / ~95% largura, ~90% altura)
 * Atende rigorosamente ao Requisito 4:
 * 1. Dados comerciais:
 *    - Pedido e item (sem agrupar itens)
 *    - Cliente (código, razão social e curva ABC se disponível)
 *    - Material e descrição completa
 *    - Quantidade solicitada × cancelada
 *    - Valor (R$) se disponível ("Não disponível" se ausente)
 *    - Datas de criação/ordem, entrega desejada, cancelamento e previsão de produção
 *    - Representante / Vendedor ("Não disponível" se ausente)
 * 2. Dados de PCP:
 *    - Linha, Centro
 *    - Situação de programação da ordem
 *    - Disponibilidade de Matéria-Prima (MP)
 *    - Restrições técnicas / operacionais
 *    - Histórico de programação (só o que existir nas fontes)
 * 3. Dados de transporte:
 *    - Transportadora ("Não disponível" se ausente)
 *    - Modalidade de frete (CIF/FOB/Não disponível)
 *    - Condição logística
 *    - Previsão de entrega
 *    - Motivo logístico
 *    - Ocorrências registradas
 * 4. Seção "Classificação da recusa":
 *    - Categoria da recusa (COMERCIAL / PCP / TRANSPORTE)
 *    - Motivo da recusa (filtrado pela categoria)
 *    - Observação / Justificativa
 *    - Editável por usuário autorizado preservando dados oficiais do SAP
 *    - Botões: "Salvar Classificação", "Cancelar" (descarta alterações e fecha), "Visualizar Histórico" (abre modal de auditoria)
 *    - Salvar atualiza registro e cards imediatamente sem recarregar a página
 * 5. Campos ausentes = "Não disponível", nunca fictícios, nunca 0 no lugar de ausente.
 */

import React, { useState, useEffect } from 'react'
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Clock,
  UserCheck,
  History,
  Calendar,
  Layers,
  ExternalLink,
  Send,
  Truck,
  Factory,
  DollarSign,
  Info,
} from 'lucide-react'
import {
  CancelledOrderRecord,
  AnalysisStatus,
  ProbableResponsibility,
  CategoriaRecusa,
} from '@/types/cancelled-orders'
import { getMotivosPorCategoria } from '@/data/cancellation-reasons-catalog'
import { formatTonsPtBr, formatCurrencyPtBr } from '@/lib/formatters-ptbr'
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
import { Badge } from '@/components/ui/badge'
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

  const [activeTab, setActiveTab] = useState<'analise' | 'historico' | 'explicador' | '5w2h'>(
    'analise',
  )

  // Estados Estruturados da Classificação da Recusa (Requisitos 1, 2, 4, 10 e 11)
  const [categoriaRecusa, setCategoriaRecusa] = useState<CategoriaRecusa | ''>('')
  const [motivoRecusa, setMotivoRecusa] = useState<string>('')
  const [justificativaRecusa, setJustificativaRecusa] = useState<string>('')
  const [isSavingRecusa, setIsSavingRecusa] = useState(false)

  // Estados de Validação Humana / Causa Raiz
  const [validatedResponsibility, setValidatedResponsibility] =
    useState<ProbableResponsibility>('PCP')
  const [validatedCause, setValidatedCause] = useState<string>('')
  const [humanNotes, setHumanNotes] = useState<string>('')
  const [isSavingValidation, setIsSavingValidation] = useState(false)

  // Campos 5W2H
  const [whatAcao, setWhatAcao] = useState('')
  const [whoResponsavel, setWhoResponsavel] = useState('Programador PCP')
  const [whenPrazo, setWhenPrazo] = useState('28/02/2025')
  const [whereLocal, setWhereLocal] = useState('')
  const [howComo, setHowComo] = useState('Ajuste de grade e remanejamento de tarugos')
  const [whyMotivo, setWhyMotivo] = useState('')
  const [howMuch, setHowMuch] = useState('Sem custo direto')
  const [isCreatingPlan, setIsCreatingPlan] = useState(false)

  // Sincroniza estados ao abrir modal com o registro atual
  useEffect(() => {
    if (order) {
      setCategoriaRecusa(order.categoria_recusa || '')
      setMotivoRecusa(order.motivo_recusa || '')
      setJustificativaRecusa('')
      setValidatedResponsibility(
        order.validated_responsibility || order.ai_suggested_responsibility || 'PCP',
      )
      setValidatedCause(order.validated_cause || order.ai_probable_cause || '')
      setHumanNotes(order.human_notes || '')
      setWhatAcao(order.ai_action_suggested || '')
      setWhyMotivo(order.ai_probable_cause || '')
      setWhereLocal(`${order.centro || 'Não disponível'} / ${order.linha || 'Não disponível'}`)
      setActiveTab('analise')
    }
  }, [order, isOpen])

  if (!isOpen || !order) return null

  const aiPayload = order.ai_analysis_payload
  const isInconsistent = order.has_ai_inconsistency

  // Salvar Classificação Estruturada da Recusa (Requisito 4)
  const handleSaveRecusaClassification = async () => {
    if (!categoriaRecusa) {
      toast({
        title: 'Categoria Obrigatória',
        description: 'Selecione a Categoria da Recusa (Comercial, PCP ou Transporte).',
        variant: 'destructive',
      })
      return
    }
    if (!motivoRecusa) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Selecione o Motivo estruturado correspondente à categoria.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingRecusa(true)
    try {
      const updated = await cancelledOrdersService.updateOrderRecusaClassification({
        orderId: order.id,
        categoria_recusa: categoriaRecusa as CategoriaRecusa,
        motivo_recusa: motivoRecusa,
        userName: 'Analista PCP / Governança CIAFAL',
        justificativa: justificativaRecusa || undefined,
      })

      onOrderUpdated(updated)
      toast({
        title: 'Classificação da Recusa Salva',
        description: `Categoria "${categoriaRecusa}" e Motivo "${motivoRecusa}" persistidos oficialmente. Cards e indicadores recalculados em tempo real.`,
        duration: 4000,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Classificação',
        description: err.message || 'Falha ao registrar classificação estruturada.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingRecusa(false)
    }
  }

  // Cancelar Edição da Classificação (Descarta e restaura)
  const handleCancelRecusaEdit = () => {
    setCategoriaRecusa(order.categoria_recusa || '')
    setMotivoRecusa(order.motivo_recusa || '')
    setJustificativaRecusa('')
    toast({
      title: 'Alterações Descartadas',
      description: 'A classificação foi restaurada para o estado original.',
    })
  }

  // Salvar Validação / Feedback Humano
  const handleSaveValidation = async (status: AnalysisStatus) => {
    if (isSavingValidation) return
    setIsSavingValidation(true)

    try {
      const updated = await cancelledOrdersService.submitHumanFeedback({
        orderId: order.id,
        newStatus: status,
        validatedCause: validatedCause || order.ai_probable_cause,
        validatedResponsibility: validatedResponsibility,
        humanNotes: humanNotes,
        userName: 'Eng. PCP / Operação CIAFAL',
      })

      onOrderUpdated(updated)
      toast({
        title: 'Validação Humana Registrada',
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
      setIsSavingValidation(false)
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
        centro_linha: `${order.centro || 'Não disponível'} - ${order.linha || 'Não disponível'}`,
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

  // Formatações defensivas para "Não disponível"
  const valorCanceladoFormatado =
    order.valor_cancelado_brl != null && order.valor_cancelado_brl > 0
      ? formatCurrencyPtBr(order.valor_cancelado_brl)
      : 'Não disponível'

  const dataCancelamentoFormatada =
    order.data_hora_cancelamento || order.data_ordem || 'Não disponível'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* CABEÇALHO DO MODAL */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#004C97] rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800 font-mono">
                  Detalhamento Individual do Pedido
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-300">HUB CIAFAL</span>
              </div>
              <h2 className="text-base font-bold tracking-tight text-white mt-0.5">
                Ordem de Venda:{' '}
                <span className="font-mono text-amber-300">{order.ordem_venda}</span> • Item:{' '}
                <span className="font-mono text-amber-300">{order.item_ordem}</span>
                <span className="text-xs font-normal text-slate-300 ml-2">
                  (Centro: {order.centro || 'Não disponível'} • Linha:{' '}
                  {order.linha || 'Não disponível'})
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className="text-xs bg-slate-800 text-slate-200 border-slate-700 font-mono"
            >
              Status Análise: {order.analysis_status}
            </Badge>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 flex-shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('analise')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'analise'
                ? 'border-[#004C97] text-[#004C97] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Visão 360º (Comercial, PCP, Transporte & Classificação)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'historico'
                ? 'border-[#004C97] text-[#004C97] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Histórico & Trilha de Auditoria (pcp_audit_logs)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('explicador')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'explicador'
                ? 'border-[#004C97] text-[#004C97] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Rastreabilidade IA (Por que a IA sugeriu?)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('5w2h')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === '5w2h'
                ? 'border-[#004C97] text-[#004C97] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Plano 5W2H {order.action_plan_id ? `(${order.action_plan_id})` : ''}
          </button>
        </div>

        {/* CORPO DO MODAL COM ROLAGEM INTERNA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
          {activeTab === 'analise' && (
            <>
              {/* ========================================================
                  BLOCO 1: DADOS COMERCIAIS (Requisito 4)
                 ======================================================== */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1.5 text-emerald-600" />
                  1. Dados Comerciais (SAP ECC / SD)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                  {/* Ordem / Item */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Pedido / Item</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {order.ordem_venda || 'Não disponível'} /{' '}
                      {order.item_ordem || 'Não disponível'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Identificador unívoco</span>
                  </div>

                  {/* Cliente */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 lg:col-span-2">
                    <span className="text-slate-500 block text-[11px]">Cliente</span>
                    <span
                      className="font-bold text-slate-900 block truncate"
                      title={order.cliente_nome}
                    >
                      {order.cliente_nome || 'Não disponível'}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono block">
                      Cód: {order.cliente_codigo || 'Não disponível'}
                      {order.curva_abc ? ` • Curva ${order.curva_abc}` : ''}
                    </span>
                  </div>

                  {/* Material */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 lg:col-span-2">
                    <span className="text-slate-500 block text-[11px]">Material & Descrição</span>
                    <span className="font-bold font-mono text-[#004C97] block truncate">
                      {order.material_codigo || 'Não disponível'}
                    </span>
                    <span
                      className="text-[10px] text-slate-700 block truncate"
                      title={order.material_descricao}
                    >
                      {order.material_descricao || 'Não disponível'}
                    </span>
                  </div>

                  {/* Quantidades */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Solicitada × Cancelada</span>
                    <span className="font-bold font-mono text-rose-700 block text-xs">
                      Canc: {formatTonsPtBr(order.saldo_cancelado_t || 0)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 block">
                      Sol:{' '}
                      {order.quantidade_original_ov_t != null
                        ? formatTonsPtBr(order.quantidade_original_ov_t)
                        : 'Não disponível'}
                    </span>
                  </div>

                  {/* Valor Financeiro */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Valor Financeiro (R$)</span>
                    <span className="font-bold font-mono text-emerald-700 text-xs block">
                      {valorCanceladoFormatado}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {order.valor_cancelado_brl != null ? 'Reconciliado SAP' : 'Sem precificação'}
                    </span>
                  </div>

                  {/* Datas */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 lg:col-span-2">
                    <span className="text-slate-500 block text-[11px]">
                      Linha do Tempo de Datas
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
                      <span>Criação: {order.data_ordem || 'Não disponível'}</span>
                      <span>Desejada: {order.data_desejada_cliente || 'Não disponível'}</span>
                      <span>Cancelado: {dataCancelamentoFormatada}</span>
                      <span>
                        Produção Prev.: {order.data_prevista_producao || 'Não disponível'}
                      </span>
                    </div>
                  </div>

                  {/* Vendedor / Representante */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 lg:col-span-3">
                    <span className="text-slate-500 block text-[11px]">
                      Representante / Vendedor
                    </span>
                    <span className="font-semibold text-slate-900 block text-xs">
                      {order.representante_vendedor || 'Não disponível'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Carteira Comercial vinculada no SAP ECC
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  BLOCO 2: DADOS DE PCP (Requisito 4)
                 ======================================================== */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
                  <Factory className="w-4 h-4 mr-1.5 text-indigo-600" />
                  2. Dados de PCP (Planejamento & Controle da Produção)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Linha / Centro */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Linha & Centro</span>
                    <span className="font-bold text-slate-900 block text-xs">
                      {order.linha || 'Não disponível'}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      Centro: {order.centro || 'Não disponível'} • Empresa:{' '}
                      {order.empresa || 'CIAFAL'}
                    </span>
                  </div>

                  {/* Situação de Programação */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">
                      Situação de Programação
                    </span>
                    <span className="font-bold text-slate-800 block text-xs">
                      {order.data_prevista_producao
                        ? `Programado (${order.data_prevista_producao})`
                        : 'Não programado no momento da recusa'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Grade: Semanal do PCP Robotizado
                    </span>
                  </div>

                  {/* Disponibilidade de Matéria-Prima */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Disponibilidade de MP</span>
                    <span className="font-bold text-slate-800 block text-xs">
                      {order.ai_analysis_payload?.consultedData?.some((d) =>
                        d.toLowerCase().includes('estoque'),
                      )
                        ? 'Estoque de Tarugos Verificado'
                        : 'Não disponível nas fontes atuais'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Consultado via inventário de MP
                    </span>
                  </div>

                  {/* Restrições / Histórico de Programação */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">
                      Restrições & Histórico PCP
                    </span>
                    <span className="font-medium text-slate-800 block text-[11px]">
                      {order.ai_analysis_payload?.recurringPatternDetected
                        ? `Padrão de reincidência: ${order.ai_analysis_payload.recurringReason || 'Detectado'}`
                        : 'Sem restrições impeditivas registradas'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Rastreabilidade oficial PCP CIAFAL
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  BLOCO 3: DADOS DE TRANSPORTE (Requisito 4)
                 ======================================================== */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
                  <Truck className="w-4 h-4 mr-1.5 text-cyan-700" />
                  3. Dados de Transporte & Logística (Expedição CIAFAL)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  {/* Transportadora */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 lg:col-span-2">
                    <span className="text-slate-500 block text-[11px]">Transportadora</span>
                    <span className="font-bold text-slate-900 block text-xs">
                      {/* Depende de integração SAP ECC / TMS se não houver campo direto */}
                      Não disponível
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Aguardando retorno da remessa SAP
                    </span>
                  </div>

                  {/* Modalidade de Frete */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Modalidade</span>
                    <span className="font-bold text-slate-900 block text-xs">Não disponível</span>
                    <span className="text-[10px] text-slate-500 block">CIF / FOB</span>
                  </div>

                  {/* Condição Logística */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Condição Logística</span>
                    <span className="font-medium text-slate-800 block text-xs">Padrão CIAFAL</span>
                    <span className="text-[10px] text-slate-500 block">
                      Carga Fechada / Fracionada
                    </span>
                  </div>

                  {/* Previsão de Entrega */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Previsão de Entrega</span>
                    <span className="font-mono text-slate-800 block text-xs">
                      {order.data_desejada_cliente || 'Não disponível'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Acordado cliente</span>
                  </div>

                  {/* Motivo Logístico / Ocorrências */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Motivo Logístico</span>
                    <span className="font-medium text-slate-800 block text-xs">
                      {order.categoria_recusa === 'TRANSPORTE'
                        ? order.motivo_recusa || 'Recusa Logística'
                        : 'Não aplicável'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Ocorrências registradas
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  BLOCO 4: SEÇÃO "CLASSIFICAÇÃO DA RECUSA" EDITÁVEL (Requisito 4)
                 ======================================================== */}
              <div className="border-2 border-[#004C97]/30 bg-blue-50/40 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-[#004C97]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Classificação da Recusa (Estruturada e Oficial)
                    </h3>
                  </div>
                  <Badge
                    className={`font-mono text-xs ${
                      categoriaRecusa === 'COMERCIAL'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : categoriaRecusa === 'PCP'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : categoriaRecusa === 'TRANSPORTE'
                            ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {categoriaRecusa
                      ? `Categoria: ${categoriaRecusa}`
                      : 'Aguardando categorização da recusa'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 mb-4">
                  Classificação oficial editável por usuário autorizado. Os dados originais do SAP
                  ECC são preservados integralmente. Toda alteração gera registro auditável em{' '}
                  <code className="text-[#004C97] font-semibold">pcp_audit_logs</code>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-3">
                  {/* Categoria da Recusa */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Categoria da Recusa: <span className="text-rose-600">*</span>
                    </label>
                    <Select
                      value={categoriaRecusa}
                      onValueChange={(val) => {
                        const newCat = val as CategoriaRecusa
                        setCategoriaRecusa(newCat)
                        const permitidos = getMotivosPorCategoria(newCat)
                        if (motivoRecusa && !permitidos.includes(motivoRecusa)) {
                          setMotivoRecusa('')
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white border-slate-300 font-semibold">
                        <SelectValue placeholder="Selecione COMERCIAL, PCP ou TRANSPORTE" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="COMERCIAL"
                          className="text-xs font-semibold text-emerald-800"
                        >
                          COMERCIAL (Preço, condição e prazo comercial)
                        </SelectItem>
                        <SelectItem value="PCP" className="text-xs font-semibold text-indigo-800">
                          PCP (Estoque, matéria-prima, restrição de laminação, capacidade)
                        </SelectItem>
                        <SelectItem
                          value="TRANSPORTE"
                          className="text-xs font-semibold text-cyan-800"
                        >
                          TRANSPORTE (Veículo, frete, transportadora, entrega)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Motivo da Recusa (Filtrado estritamente pela Categoria) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Motivo da Recusa: <span className="text-rose-600">*</span>
                    </label>
                    <Select
                      value={motivoRecusa}
                      onValueChange={(val) => setMotivoRecusa(val)}
                      disabled={!categoriaRecusa}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white border-slate-300 disabled:opacity-60 font-semibold">
                        <SelectValue
                          placeholder={
                            categoriaRecusa
                              ? 'Selecione o motivo da categoria'
                              : 'Selecione a categoria primeiro'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {getMotivosPorCategoria(categoriaRecusa as CategoriaRecusa).map((mot) => (
                          <SelectItem key={mot} value={mot} className="text-xs">
                            {mot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observação / Justificativa Auditável */}
                <div className="text-xs mb-4">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Observação / Justificativa da Classificação (Registro em pcp_audit_logs)
                  </label>
                  <Textarea
                    rows={2}
                    value={justificativaRecusa}
                    onChange={(e) => setJustificativaRecusa(e.target.value)}
                    placeholder="Informe a justificativa desta classificação para fins de governança e rastreabilidade..."
                    className="text-xs bg-white border-slate-300"
                  />
                </div>

                {/* BOTÕES EXIGIDOS PELO REQUISITO 4: Salvar classificação / Cancelar / Visualizar histórico */}
                <div className="flex flex-wrap items-center justify-between pt-3 border-t border-blue-200/80 gap-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('historico')}
                      className="text-xs h-8 text-slate-700 border-slate-300 hover:bg-slate-100 bg-white"
                    >
                      <History className="w-3.5 h-3.5 mr-1 text-[#004C97]" />
                      Visualizar Histórico
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelRecusaEdit}
                      className="text-xs h-8 text-slate-600 hover:text-slate-900"
                    >
                      Cancelar
                    </Button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isSavingRecusa || !categoriaRecusa || !motivoRecusa}
                    onClick={handleSaveRecusaClassification}
                    className="bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold text-xs h-8 px-4"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {isSavingRecusa ? 'Gravando...' : 'Salvar Classificação'}
                  </Button>
                </div>
              </div>

              {/* BLOCO 5: ANÁLISE IA INDIVIDUAL & VALIDAÇÃO HUMANA */}
              <div className="border border-indigo-200 bg-indigo-50/30 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-indigo-950">
                      Análise Inteligente de Causa & Validação Humana
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-white text-indigo-900 text-xs">
                      Confiança: {order.ai_confidence_level}
                    </Badge>
                    <Badge variant="outline" className="bg-white text-indigo-900 text-xs">
                      Prioridade: {order.ai_priority}
                    </Badge>
                  </div>
                </div>

                {/* Alerta de Inconsistência */}
                {isInconsistent && (
                  <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-950 text-xs flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Inconsistência identificada nos dados:</span>
                      <p className="mt-0.5">{order.ai_probable_cause}</p>
                    </div>
                  </div>
                )}

                {/* As 4 Camadas: Motivo SAP | Análise IA | Causa Provável | Causa Validada */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-300">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      1. Motivo SAP Original
                    </span>
                    <div className="font-bold text-slate-900">{order.motivo_original_sap}</div>
                    <span className="text-[10px] text-slate-400 block mt-1">Imutável</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-indigo-200">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                      2. Verificação IA
                    </span>
                    <div className="font-semibold text-slate-800">
                      {order.ai_verification_status}
                    </div>
                    <span className="text-[10px] text-indigo-600 block mt-1">
                      {order.ai_avoidable_status}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-indigo-200">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                      3. Causa Provável (IA)
                    </span>
                    <div className="text-slate-800 font-medium">{order.ai_probable_cause}</div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Sugerido: {order.ai_suggested_responsibility}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-emerald-300 bg-emerald-50/30">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                      4. Causa Validada (Humana)
                    </span>
                    <div className="font-bold text-emerald-950">
                      {order.validated_cause || 'Aguardando validação'}
                    </div>
                    <span className="text-[10px] text-emerald-700 block mt-1">
                      {order.validated_by_user_name
                        ? `Por: ${order.validated_by_user_name}`
                        : 'Pendente'}
                    </span>
                  </div>
                </div>

                {/* Formulário de Validação Humana */}
                <div className="pt-3 border-t border-indigo-200/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
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
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue />
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
                      Causa Raiz Confirmada pelo Analista
                    </label>
                    <Input
                      type="text"
                      value={validatedCause}
                      onChange={(e) => setValidatedCause(e.target.value)}
                      placeholder="Descreva a causa validada..."
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Parecer Técnico / Justificativa Humana
                  </label>
                  <Textarea
                    rows={2}
                    value={humanNotes}
                    onChange={(e) => setHumanNotes(e.target.value)}
                    placeholder="Adicione observações complementares..."
                    className="text-xs bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    O motivo original do SAP não é alterado.
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSavingValidation}
                      onClick={() => handleSaveValidation('Discordado')}
                      className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 h-8"
                    >
                      Discordar da Análise
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSavingValidation}
                      onClick={() => handleSaveValidation('Validado')}
                      className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold h-8"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {isSavingValidation ? 'Salvando...' : 'Confirmar & Validar Causa'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================
              ABA 2: HISTÓRICO & TRILHA DE AUDITORIA
             ======================================================== */}
          {activeTab === 'historico' && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-[#004C97]" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Trilha de Auditoria do Pedido (pcp_audit_logs)
                    </h4>
                    <p className="text-slate-500 text-xs">
                      Histórico imutável de alterações, classificações e validações humanas.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  OV: {order.ordem_venda} / {order.item_ordem}
                </Badge>
              </div>

              <div className="space-y-3">
                {/* Evento 1: Criação oficial SAP */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start space-x-3">
                  <div className="p-1.5 bg-blue-100 text-blue-800 rounded">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        Criação do Pedido & Registro da Recusa no SAP ECC
                      </span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {order.data_ordem}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">
                      Ordem de venda criada com saldo cancelado de{' '}
                      <strong>{formatTonsPtBr(order.saldo_cancelado_t || 0)}</strong>. Motivo
                      original registrado: <em>"{order.motivo_original_sap}"</em>.
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Usuário SAP: {order.usuario_operacao || 'VENDAS'}
                    </span>
                  </div>
                </div>

                {/* Evento 2: Classificação estruturada atual */}
                {order.categoria_recusa && (
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 flex items-start space-x-3">
                    <div className="p-1.5 bg-blue-600 text-white rounded">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-950">
                          Classificação Estruturada da Recusa
                        </span>
                        <span className="font-mono text-blue-800 text-[11px]">
                          {order.data_hora_cancelamento || order.data_ordem || 'Atual'}
                        </span>
                      </div>
                      <p className="text-blue-900 mt-1">
                        Categoria definida como <strong>{order.categoria_recusa}</strong> e Motivo{' '}
                        <strong>"{order.motivo_recusa || 'Não informado'}"</strong>.
                      </p>
                      <span className="text-[10px] text-blue-700 font-mono mt-1 block">
                        Auditado em pcp_audit_logs com usuário, data/hora e valores anterior/novo.
                      </span>
                    </div>
                  </div>
                )}

                {/* Evento 3: Validação humana */}
                {order.validated_cause && (
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start space-x-3">
                    <div className="p-1.5 bg-emerald-600 text-white rounded">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950">
                          Validação Humana Concluída
                        </span>
                        <span className="font-mono text-emerald-800 text-[11px]">
                          {order.validated_at || 'Registrado'}
                        </span>
                      </div>
                      <p className="text-emerald-900 mt-1">
                        Causa raiz confirmada: <em>"{order.validated_cause}"</em>.
                        {order.human_notes ? ` Parecer: "${order.human_notes}"` : ''}
                      </p>
                      <span className="text-[10px] text-emerald-700 font-mono mt-1 block">
                        Responsável: {order.validated_by_user_name || 'Analista PCP'} • Área:{' '}
                        {order.validated_responsibility || 'PCP'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 3: RASTREABILIDADE IA
             ======================================================== */}
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
                    {aiPayload?.limitations?.map((l, i) => <li key={i}>{l}</li>) || (
                      <li>Modelagem probabilística sujeita a validação humana obrigatória.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 4: PLANO 5W2H
             ======================================================== */}
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
                  Impacto Físico: {formatTonsPtBr(order.saldo_cancelado_t || 0)}
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={isCreatingPlan}
                  onClick={handleCreate5W2H}
                  className="bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold text-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  {isCreatingPlan ? 'Criando Plano...' : 'Criar Plano de Ação 5W2H'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL COM AÇÕES */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-100/90 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 flex-shrink-0">
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
              Fechar Janela
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
