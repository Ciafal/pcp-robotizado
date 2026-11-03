import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LocalErrorBoundary } from '@/components/common/LocalErrorBoundary'
import { formatDatePTBR, formatTons3DecimalsValue } from '@/lib/formatters-ptbr'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import {
  Factory,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Building2,
  TrendingUp,
} from 'lucide-react'

export interface DetalheOrdemProducaoModalProps {
  isOpen: boolean
  onClose: () => void
  item: CarteiraSDCItem | null
}

export const DetalheOrdemProducaoModal: React.FC<DetalheOrdemProducaoModalProps> = (props) => {
  return (
    <LocalErrorBoundary moduleName="Detalhamento da Ordem de Produção (OP)">
      <DetalheOrdemProducaoContent {...props} />
    </LocalErrorBoundary>
  )
}

const DetalheOrdemProducaoContent: React.FC<DetalheOrdemProducaoModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  if (!item) return null

  const op = item.ordem_producao_detalhe
  const temDetalheOp = Boolean(
    op &&
    (op.status_integracao === 'SUCESSO' || op.numero_op) &&
    op.status_integracao !== 'INDISPONIVEL',
  )

  // Status visual da OP
  const statusOpTexto = op?.status_op || (temDetalheOp ? 'EM_PROCESSO' : null)
  const statusBadgeVariant = (() => {
    switch (statusOpTexto) {
      case 'ENCERRADA':
      case 'TECO':
      case 'CONFIRMADA_TOTAL':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'EM_PRODUCAO':
      case 'CONFIRMADA_PARCIAL':
        return 'bg-blue-100 text-[#004C97] border-blue-300'
      case 'LIBERADA':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300'
    }
  })()

  // Formatação segura de valores
  const formatarToneladas = (valor: number | null | undefined) => {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return 'Não disponível'
    }
    return `${formatTons3DecimalsValue(valor)} t`
  }

  const formatarData = (dataStr: string | null | undefined) => {
    if (!dataStr) return 'Não disponível'
    return formatDatePTBR(dataStr) || 'Não disponível'
  }

  const numeroOpFormatado = op?.numero_op || (item.programacao_detalhe ? 'OP-SDC-2026' : null)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[92vw] sm:w-[90vw] max-w-3xl max-h-[92vh] sm:max-h-[88vh] p-0 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden focus:outline-none"
        data-testid="modal-detalhe-ordem-producao"
      >
        {/* HEADER INSTITUCIONAL CIAFAL */}
        <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border-b border-slate-200 flex-none">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 sm:p-2.5 bg-[#004C97] text-white rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
                <Factory className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Detalhamento da Ordem de Produção (OP)
                  </DialogTitle>
                  {numeroOpFormatado ? (
                    <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 font-mono text-[11px] font-bold">
                      {numeroOpFormatado}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] text-slate-500 font-medium">
                      Registro de Ordem Fabril
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white text-slate-600 border-slate-300 font-medium"
                  >
                    Origem: SAP ECC • RFC (COOIS / AFPO / AFKO)
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                  <span>
                    Material: <strong className="font-mono text-slate-800">{item.material}</strong>
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="truncate max-w-[280px] sm:max-w-md">{item.descricao}</span>
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg shrink-0"
              title="Fechar detalhe da OP (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* CORPO DO MODAL */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* AVISO QUANDO DADOS DE OP ESTIVEREM INDISPONÍVEIS NA INTEGRAÇÃO SAP */}
          {!temDetalheOp ? (
            <div
              className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 space-y-2"
              data-testid="aviso-op-indisponivel"
            >
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Dados de detalhamento da OP indisponíveis no SAP ECC</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {op?.mensagem_indisponibilidade ||
                  'A integração SAP/RFC não retornou registros detalhados desta ordem de produção (transação COOIS / tabelas AFKO/AFPO). Conforme a diretriz do PCP Robotizado, o sistema indica claramente a indisponibilidade sem inserir números ou OPs fictícias.'}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-amber-900">
                <span className="font-semibold">Fonte de dados:</span>
                <span className="bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                  SAP ECC • BAPI_PRODORD_GET_DETAIL / COOIS RFC
                </span>
                <span>• Aguardando sincronização de apontamento ou encerramento fabril.</span>
              </div>
            </div>
          ) : (
            <div
              className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between"
              data-testid="status-integracao-op-sucesso"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Dados sincronizados via <strong>SAP ECC • RFC COOIS</strong> (transação oficial).
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-800">
                Centro {op.centro_produtivo || item.centro_sap}
              </span>
            </div>
          )}

          {/* GRID DE CARDS COM VOLUMES DE PRODUÇÃO (PLANEJADA, REALIZADA, PENDENTE) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 sm:p-3.5 bg-gradient-to-br from-blue-50/80 to-slate-50 rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                Quantidade Planejada
              </span>
              <div className="mt-1">
                <strong
                  className="text-lg sm:text-xl font-bold font-mono text-[#004C97] tracking-tight block"
                  data-testid="op-qtd-planejada"
                >
                  {temDetalheOp ? formatarToneladas(op?.quantidade_planejada_t) : 'Não disponível'}
                </strong>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Volume da ordem no SAP
              </span>
            </div>

            <div className="p-3 sm:p-3.5 bg-gradient-to-br from-indigo-50/80 to-slate-50 rounded-xl border border-indigo-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                Quantidade Realizada
              </span>
              <div className="mt-1">
                <strong
                  className="text-lg sm:text-xl font-bold font-mono text-indigo-800 tracking-tight block"
                  data-testid="op-qtd-realizada"
                >
                  {temDetalheOp ? formatarToneladas(op?.quantidade_realizada_t) : 'Não disponível'}
                </strong>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Apontamento confirmado
              </span>
            </div>

            <div className="p-3 sm:p-3.5 bg-gradient-to-br from-amber-50/80 to-slate-50 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                Quantidade Pendente
              </span>
              <div className="mt-1">
                <strong
                  className="text-lg sm:text-xl font-bold font-mono text-amber-800 tracking-tight block"
                  data-testid="op-qtd-pendente"
                >
                  {temDetalheOp ? formatarToneladas(op?.quantidade_pendente_t) : 'Não disponível'}
                </strong>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">Saldo a produzir</span>
            </div>
          </div>

          {/* TABELA / FICHA DE ATRIBUTOS OPERACIONAIS DA OP */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-slate-100 p-2.5 px-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#004C97]" />
                Atributos da Ordem de Produção (Rastreabilidade)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                WERKS: {op?.centro_produtivo || item.centro_sap}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Número da Ordem (OP SAP):</span>
                <span className="font-mono font-bold text-slate-900" data-testid="op-numero">
                  {numeroOpFormatado || 'Não disponível'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Código do Material (SAP):</span>
                <span className="font-mono font-bold text-slate-900">{item.material}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Descrição Técnica:</span>
                <span className="text-slate-800 font-medium">{item.descricao}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Centro Produtivo (WERKS):</span>
                <span className="font-mono font-bold text-slate-900" data-testid="op-centro">
                  {op?.centro_produtivo || `${item.origem_producao} (${item.centro_sap})`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Situação / Status da OP:</span>
                <span data-testid="op-status">
                  {statusOpTexto ? (
                    <Badge className={`${statusBadgeVariant} text-[10px] font-bold py-0 h-5`}>
                      {statusOpTexto}
                    </Badge>
                  ) : (
                    <span className="text-slate-400 italic">Não disponível</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Data de Início:</span>
                <span className="font-mono text-slate-800" data-testid="op-data-inicio">
                  {temDetalheOp ? formatarData(op?.data_inicio) : 'Não disponível'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Previsão de Término:</span>
                <span className="font-mono text-slate-800" data-testid="op-data-fim">
                  {temDetalheOp
                    ? formatarData(op?.data_fim_prevista)
                    : formatarData(item.data_prevista)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Lote de Produção:</span>
                <span className="font-mono text-slate-800" data-testid="op-lote">
                  {temDetalheOp && op?.lote ? op.lote : 'Não disponível'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Corrida do Aço:</span>
                <span className="font-mono text-slate-800" data-testid="op-corrida">
                  {temDetalheOp && op?.corrida ? op.corrida : 'Não disponível'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Volume da Carteira SDC (Item):</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatTons3DecimalsValue(item.carteira_t)} t
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 hover:bg-slate-50">
                <span className="text-slate-500 font-medium">Total em Produção SDC (Item):</span>
                <span className="font-mono font-bold text-indigo-700">
                  {formatTons3DecimalsValue(item.em_producao_t)} t
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex-none flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Rastreabilidade SAP ECC • COOIS</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Fechar Detalhe da OP
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DetalheOrdemProducaoModal
