/**
 * Modal de Consulta do Histórico da Solicitação ao CRM 360º
 * Exibe dados da solicitação, protocolo, status atual, auditoria
 * e permite simulação de retorno do CRM pelo responsável (fluxo bidirecional).
 */

import React, { useState } from 'react'
import {
  X,
  FileText,
  Clock,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react'
import { CancelledOrderRecord, CrmRevisionStatus } from '@/types/cancelled-orders'
import { formatTons, formatCurrencyPtBr } from '@/lib/formatters-ptbr'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cancelledOrdersService } from '@/services/cancelled-orders-service'

interface ConsultarRevisaoCrmModalProps {
  order: CancelledOrderRecord | null
  isOpen: boolean
  onClose: () => void
  onOrderUpdated: (updatedOrder: CancelledOrderRecord) => void
}

export const ConsultarRevisaoCrmModal: React.FC<ConsultarRevisaoCrmModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  const { toast } = useToast()

  const [novoStatusCrm, setNovoStatusCrm] = useState<CrmRevisionStatus>('Motivo corrigido')
  const [motivoCorrigido, setMotivoCorrigido] = useState<string>(
    'Divergência de prazo alinhada com cliente',
  )
  const [observacaoCrm, setObservacaoCrm] = useState<string>(
    'Cliente aceitou novo prazo de expedição. Motivo SAP anterior improcedente.',
  )
  const [responsavelValidacao, setResponsavelValidacao] = useState<string>('Gerência Comercial CRM')
  const [isSaving, setIsSaving] = useState<boolean>(false)

  if (!isOpen || !order) return null

  const handleSalvarRetornoCrm = async () => {
    if (!order.crm_protocolo) return

    if (novoStatusCrm === 'Motivo corrigido' && !motivoCorrigido.trim()) {
      toast({
        title: 'Motivo Corrigido Obrigatório',
        description: 'Informe o motivo correto validado após a revisão.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await cancelledOrdersService.respondCrmRevision({
        protocolo: order.crm_protocolo,
        statusCrm: novoStatusCrm,
        motivoValidadoAposRevisao:
          novoStatusCrm === 'Motivo corrigido' ? motivoCorrigido.trim() : undefined,
        observacaoCrm: observacaoCrm.trim(),
        responsavelValidacaoCrm: responsavelValidacao.trim(),
      })

      toast({
        title: 'Retorno CRM Registrado com Sucesso',
        description: `Status atualizado para '${novoStatusCrm}'. Pedido atualizado no PCP.`,
      })

      if (res.order) {
        onOrderUpdated(res.order)
      }
      onClose()
    } catch (err: any) {
      toast({
        title: 'Falha ao Registrar Retorno',
        description: err.message || 'Erro ao comunicar com o CRM.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const statusColorMap: Record<string, string> = {
    'Em análise': 'bg-amber-100 text-amber-800 border-amber-300',
    'Motivo confirmado': 'bg-blue-100 text-blue-800 border-blue-300',
    'Motivo corrigido': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    Improcedente: 'bg-slate-100 text-slate-800 border-slate-300',
    Concluído: 'bg-purple-100 text-purple-800 border-purple-300',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#004C97] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/15 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/20 text-white">
                  Protocolo Oficial
                </span>
                <span className="text-xs font-mono font-bold text-blue-100">
                  {order.crm_protocolo || 'SEM PROTOCOLO'}
                </span>
              </div>
              <h2 className="text-base font-bold tracking-tight mt-0.5">
                Histórico da Solicitação de Revisão (CRM 360º)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status Geral */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Status no CRM 360º</span>
                <span
                  className={`inline-block mt-1 font-semibold text-xs px-2.5 py-0.5 rounded-full border ${
                    statusColorMap[order.crm_status || 'Em análise'] ||
                    'bg-slate-100 text-slate-700'
                  }`}
                >
                  {order.crm_status || 'Em análise'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Data da Solicitação</span>
                <span className="font-semibold text-slate-900 block mt-1">
                  {order.crm_data_solicitacao || 'Recentemente'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Destino Comercial</span>
                <span
                  className="font-semibold text-slate-900 block mt-1 truncate"
                  title={order.crm_responsavel}
                >
                  {order.crm_responsavel || 'CRM 360º / Comercial'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Status PCP</span>
                <span className="font-semibold text-[#004C97] block mt-1">
                  {order.analysis_status}
                </span>
              </div>
            </div>
          </div>

          {/* Dados do Pedido */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Pedido Vinculado
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Ordem / Item:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {order.ordem_venda} / {order.item_ordem}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Cliente:</span>
                <span className="font-semibold text-slate-900 truncate block">
                  {order.cliente_nome} ({order.cliente_codigo})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Material:</span>
                <span className="font-semibold text-slate-900 truncate block">
                  {order.material_codigo} - {order.material_descricao}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Quantidade Cancelada:</span>
                <span className="font-bold text-rose-700 font-mono">
                  {formatTons(order.saldo_cancelado_t)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Valor Financeiro:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {formatCurrencyPtBr(order.valor_cancelado_brl)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Centro / Linha:</span>
                <span className="font-medium text-slate-800">
                  {order.centro} - {order.linha}
                </span>
              </div>
            </div>
          </div>

          {/* Motivo Original SAP vs Motivo Validado após Revisão (Requisito 6) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              <span className="text-[11px] font-bold text-slate-600 uppercase block">
                Motivo Original SAP (Imutável)
              </span>
              <p className="font-semibold text-slate-900 mt-1">{order.motivo_original_sap}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Gravado originalmente no SAP ECC na data do cancelamento.
              </span>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3 text-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                Motivo Validado após Revisão (CRM)
              </span>
              <p className="font-semibold text-emerald-950 mt-1">
                {order.motivo_validado_apos_revisao || 'Aguardando validação do CRM 360º'}
              </p>
              <span className="text-[10px] text-emerald-700 mt-1 block">
                {order.crm_responsavel_validacao
                  ? `Validado por: ${order.crm_responsavel_validacao}`
                  : 'Pendente de resposta da equipe comercial.'}
              </span>
            </div>
          </div>

          {/* Seção Bidirecional: Simular/Registrar Retorno do CRM */}
          <div className="bg-blue-50/40 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#004C97]" />
              <h4 className="text-xs font-bold text-[#004C97] uppercase tracking-wider">
                Fluxo Bidirecional — Resposta do CRM 360º
              </h4>
            </div>
            <p className="text-[11px] text-slate-600">
              Permite à equipe do CRM validar, corrigir ou concluir a análise da solicitação de
              revisão.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Status da Resposta CRM
                </label>
                <Select
                  value={novoStatusCrm}
                  onValueChange={(val) => setNovoStatusCrm(val as CrmRevisionStatus)}
                >
                  <SelectTrigger className="h-8 text-xs border-slate-300 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em análise" className="text-xs">
                      Em análise
                    </SelectItem>
                    <SelectItem value="Motivo confirmado" className="text-xs">
                      Motivo confirmado
                    </SelectItem>
                    <SelectItem value="Motivo corrigido" className="text-xs">
                      Motivo corrigido
                    </SelectItem>
                    <SelectItem value="Improcedente" className="text-xs">
                      Improcedente
                    </SelectItem>
                    <SelectItem value="Concluído" className="text-xs">
                      Concluído
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Responsável pela Validação
                </label>
                <Input
                  type="text"
                  value={responsavelValidacao}
                  onChange={(e) => setResponsavelValidacao(e.target.value)}
                  className="h-8 text-xs border-slate-300 bg-white"
                />
              </div>

              {novoStatusCrm === 'Motivo corrigido' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Motivo Correto Validado
                  </label>
                  <Input
                    type="text"
                    value={motivoCorrigido}
                    onChange={(e) => setMotivoCorrigido(e.target.value)}
                    placeholder="Ex: Divergência comercial"
                    className="h-8 text-xs border-slate-300 bg-white"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Observação Comercial / Parecer
              </label>
              <Textarea
                rows={2}
                value={observacaoCrm}
                onChange={(e) => setObservacaoCrm(e.target.value)}
                placeholder="Parecer da gerência comercial ou vendedor responsável..."
                className="text-xs border-slate-300 bg-white"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleSalvarRetornoCrm}
                disabled={isSaving}
                className="text-xs h-8 bg-[#004C97] hover:bg-[#003d7a] text-white font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {isSaving ? 'Gravando retorno...' : 'Registrar Resposta do CRM 360º'}
              </Button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 border-slate-300"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
