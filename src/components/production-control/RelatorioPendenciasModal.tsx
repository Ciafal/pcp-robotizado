import React, { useState, useEffect } from 'react'
import {
  FileText,
  Printer,
  AlertTriangle,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ChecklistFechamentoExecucao, ChecklistFechamentoItem } from '@/types/checklist-fechamento'
import {
  relatorioPendenciasService,
  RelatorioPendenciasEnriquecidoResult,
} from '@/services/relatorio-pendencias-service'

interface Props {
  open: boolean
  onClose: () => void
  execucao: ChecklistFechamentoExecucao | null
  itens: ChecklistFechamentoItem[]
}

export const RelatorioPendenciasModal: React.FC<Props> = ({ open, onClose, execucao, itens }) => {
  const [relatorioEnriquecido, setRelatorioEnriquecido] =
    useState<RelatorioPendenciasEnriquecidoResult | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (open && itens.length > 0) {
      setCarregando(true)
      relatorioPendenciasService
        .gerarRelatorioPendencias(itens, execucao?.competencia || '')
        .then((res) => {
          setRelatorioEnriquecido(res)
        })
        .catch(() => {
          setRelatorioEnriquecido(null)
        })
        .finally(() => setCarregando(false))
    }
  }, [open, itens, execucao?.competencia])

  const itensPendentesOuErro = itens.filter((i) => i.status === 'ERRO' || i.status === 'PENDENTE')

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Relatório de Pendências do Fechamento
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Competência {execucao?.competencia || '-'} — CIAFAL Controle de Produção
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Salvar
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Resumo da Competência */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-slate-400 block text-[10px]">Total de Itens</span>
              <span className="font-bold text-slate-800 text-sm">{itens.length}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Pendências Totais</span>
              <span className="font-bold text-amber-700 text-sm">
                {itensPendentesOuErro.length}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Itens com ERRO</span>
              <span className="font-bold text-rose-700 text-sm">
                {itens.filter((i) => i.status === 'ERRO').length}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Obrigatórias em Aberto</span>
              <span className="font-bold text-rose-800 text-sm">
                {itensPendentesOuErro.filter((i) => i.obrigatoria).length}
              </span>
            </div>
          </div>

          {/* Listagem de Pendências */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-800 block text-xs">
              Atividades Pendentes de Regularização:
            </span>

            {itensPendentesOuErro.length === 0 ? (
              <div className="p-8 text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg font-medium">
                Parabéns! Nenhuma pendência ou erro em aberto para a competência selecionada.
              </div>
            ) : (
              itensPendentesOuErro.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-slate-200 rounded-lg bg-white space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{item.codigo}</span>
                      <span className="font-semibold text-slate-900">{item.titulo}</span>
                      {item.obrigatoria && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                          Obrigatória
                        </Badge>
                      )}
                    </div>
                    <Badge
                      className={
                        item.status === 'ERRO'
                          ? 'bg-rose-100 text-rose-800 border-rose-300 text-[10px]'
                          : 'bg-amber-100 text-amber-800 border-amber-300 text-[10px]'
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {item.descricao_detalhada}
                  </p>

                  {/* Bloco Enriquecido: Ajuste Operacional e Meu Dia */}
                  {(() => {
                    const info = relatorioEnriquecido?.itensEnriquecidos.find(
                      (x) => x.item.id === item.id,
                    )
                    if (!info) return null

                    return (
                      <div className="p-2 mt-1 rounded bg-slate-50 border border-slate-200/70 text-[10px] space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">
                              Ajuste Operacional:
                            </span>
                            {info.possuiAjuste ? (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-mono font-bold"
                              >
                                {info.ajusteNumero}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-800 border-amber-300 text-[9px] font-medium"
                              >
                                Ajuste Operacional não aberto
                              </Badge>
                            )}
                          </div>

                          {info.possuiAjuste && (
                            <div className="flex items-center gap-2">
                              {info.prioridade && (
                                <Badge
                                  className={`text-[9px] ${
                                    info.prioridade === 'Crítica' || info.prioridade === 'Alta'
                                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  Prioridade: {info.prioridade}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="bg-purple-50 text-purple-700 border-purple-200 text-[9px]"
                              >
                                Meu Dia: {info.statusMeuDia}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {info.possuiAjuste && (
                          <div className="flex flex-wrap items-center gap-3 text-slate-600 pt-0.5">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              Resp: <strong>{info.responsavelNome || '-'}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Prazo: <strong>{info.prazoFormatado || '-'}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>
                      Área: <strong>{item.area_responsavel}</strong>
                    </span>
                    <span>
                      SAP: <strong>{item.transacao_sap}</strong>
                    </span>
                    {item.deposito_sap && (
                      <span>
                        Depósito: <strong>{item.deposito_sap}</strong>
                      </span>
                    )}
                    {item.ordem_material_lote && (
                      <span className="text-rose-700 font-semibold">
                        Ref: {item.ordem_material_lote}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50">
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs bg-[#004C97] text-white"
          >
            Fechar Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
