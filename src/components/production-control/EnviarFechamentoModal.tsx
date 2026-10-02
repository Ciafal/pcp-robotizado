import React, { useState, useEffect } from 'react'
import {
  Send,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Mail,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ChecklistFechamentoExecucao,
  DestinatarioGrupo,
  FechamentoDestinatario,
  FechamentoComunicacao,
} from '@/types/checklist-fechamento'
import { fechamentoDestinatariosService } from '@/services/fechamento-destinatarios-service'
import { fechamentoEnvioService } from '@/services/fechamento-envio-service'

interface Props {
  open: boolean
  onClose: () => void
  execucao: ChecklistFechamentoExecucao | null
  grupoInicial?: DestinatarioGrupo
  resumoIaTexto?: string
  onEnvioSucesso: () => void
}

export const EnviarFechamentoModal: React.FC<Props> = ({
  open,
  onClose,
  execucao,
  grupoInicial = 'Contabilidade',
  resumoIaTexto = '',
  onEnvioSucesso,
}) => {
  const [grupo, setGrupo] = useState<DestinatarioGrupo>(grupoInicial)
  const [destinatarios, setDestinatarios] = useState<FechamentoDestinatario[]>([])
  const [destinatariosSelecionados, setDestinatariosSelecionados] = useState<string[]>([])
  const [carregandoDest, setCarregandoDest] = useState(false)

  const [assunto, setAssunto] = useState('')
  const [corpo, setCorpo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensagemFeedback, setMensagemFeedback] = useState<{
    tipo: 'sucesso' | 'erro'
    texto: string
  } | null>(null)

  const [historicoComms, setHistoricoComms] = useState<FechamentoComunicacao[]>([])
  const [carregandoComms, setCarregandoComms] = useState(false)

  useEffect(() => {
    setGrupo(grupoInicial)
  }, [grupoInicial, open])

  // Carregar destinatários e histórico ao abrir ou mudar grupo
  useEffect(() => {
    if (!open || !execucao) return

    const carregar = async () => {
      setCarregandoDest(true)
      try {
        const dests = await fechamentoDestinatariosService.listarAtivosPorGrupo(grupo)
        setDestinatarios(dests)
        // Selecionar todos os ativos por padrão
        setDestinatariosSelecionados(dests.map((d) => d.id))
      } finally {
        setCarregandoDest(false)
      }

      setCarregandoComms(true)
      try {
        const comms = await fechamentoEnvioService.listarComunicacoes(execucao.id)
        setHistoricoComms(comms)
      } finally {
        setCarregandoComms(false)
      }
    }

    carregar()
  }, [open, grupo, execucao])

  // Ajustar assunto e corpo padrão ao mudar grupo
  useEffect(() => {
    if (!execucao) return

    if (grupo === 'Contabilidade') {
      setAssunto(
        `[FECHAMENTO CONTROLE DE PRODUÇÃO] Conclusão Competência ${execucao.competencia} - CIAFAL`,
      )
      setCorpo(
        `Prezada Equipe de Fechamento Contábil e Controladoria,\n\n` +
          `Comunicamos formalmente que o Controle de Produção CIAFAL concluiu a validação do Check-list de Fechamento referente à competência ${execucao.competencia}.\n\n` +
          `Status do Fechamento: CONCLUÍDO E VALIDADO (${execucao.total_ok || 24} atividades OK)\n` +
          `Data Limite de Referência: ${execucao.data_limite || '2º dia útil'}\n` +
          `Responsável pelo Fechamento: ${execucao.fechado_por || execucao.responsavel}\n\n` +
          `Declaração Formal:\n` +
          `"Todos os itens obrigatórios do Check-list de Fechamento foram concluídos e validados. O Controle de Produção concluiu o fechamento da competência e a Contabilidade pode prosseguir com as etapas subsequentes."\n\n` +
          (resumoIaTexto ? `--- RESUMO EXECUTIVO DO FECHAMENTO ---\n${resumoIaTexto}\n\n` : '') +
          `Atenciosamente,\nControle de Produção CIAFAL\nSistema PCP Robotizado`,
      )
    } else {
      setAssunto(
        `[AVISO PRODUÇÃO] Período Fechado - Competência ${execucao.competencia} - CIAFAL (Ajustes Bloqueados)`,
      )
      setCorpo(
        `Prezada Equipe de Produção (Laminação L1, L2, Acabamento e Pátio),\n\n` +
          `Informamos que o período produtivo da competência ${execucao.competencia} foi formalmente encerrado pelo Controle de Produção.\n\n` +
          `A partir deste momento, o período NÃO deve mais receber apontamentos, cancelamentos de ordens ou ajustes retroativos sem procedimento formal de reabertura autorizado pela Controladoria e Gerência de Operações.\n\n` +
          `Quaisquer inconsistências tardias devem ser submetidas diretamente ao Controle de Produção.\n\n` +
          `Atenciosamente,\nControle de Produção CIAFAL\nSistema PCP Robotizado`,
      )
    }
  }, [grupo, execucao, resumoIaTexto])

  const handleToggleDestinatario = (id: string) => {
    setDestinatariosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id],
    )
  }

  const handleEnviar = async (ehReenvio = false, commOriginalId?: string) => {
    if (!execucao) return
    setEnviando(true)
    setMensagemFeedback(null)

    const destsParaEnviar = destinatarios.filter((d) => destinatariosSelecionados.includes(d.id))

    try {
      const res = await fechamentoEnvioService.enviarFechamentoGrupo({
        execucao,
        grupo,
        assuntoCustomizado: assunto,
        corpoMensagem: corpo,
        destinatariosSelecionados: destsParaEnviar,
        ehReenvio,
        comunicacaoOriginalId: commOriginalId,
      })

      if (res.sucesso) {
        setMensagemFeedback({ tipo: 'sucesso', texto: res.mensagem })
      } else {
        setMensagemFeedback({
          tipo: 'erro',
          texto: `${res.mensagem} Registro de auditoria foi gravado com sucesso.`,
        })
      }

      // Atualizar lista de comunicações
      const comms = await fechamentoEnvioService.listarComunicacoes(execucao.id)
      setHistoricoComms(comms)
      onEnvioSucesso()
    } catch (err: any) {
      setMensagemFeedback({
        tipo: 'erro',
        texto: err.message || 'Erro ao processar envio do fechamento.',
      })
    } finally {
      setEnviando(false)
    }
  }

  const handleReenviar = async (comm: FechamentoComunicacao) => {
    if (!execucao) return
    setEnviando(true)
    try {
      const res = await fechamentoEnvioService.reenviarComunicacao(comm, execucao)
      if (res.sucesso) {
        setMensagemFeedback({ tipo: 'sucesso', texto: `Reenvio concluído: ${res.mensagem}` })
      } else {
        setMensagemFeedback({ tipo: 'erro', texto: `Falha no reenvio: ${res.mensagem}` })
      }
      const comms = await fechamentoEnvioService.listarComunicacoes(execucao.id)
      setHistoricoComms(comms)
      onEnvioSucesso()
    } catch (err: any) {
      setMensagemFeedback({ tipo: 'erro', texto: err.message || 'Erro no reenvio' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-[#004C97] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-tight">
                Disparo do Fechamento — Competência {execucao?.competencia}
              </DialogTitle>
              <p className="text-xs text-blue-100">
                Integração corporativa de comunicação auditada em pcp_audit_logs
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-800 flex-1">
          {/* Alerta de Feedback se houver */}
          {mensagemFeedback && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                mensagemFeedback.tipo === 'sucesso'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              {mensagemFeedback.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold block">
                  {mensagemFeedback.tipo === 'sucesso' ? 'Operação Concluída' : 'Aviso do Envio'}
                </span>
                <span>{mensagemFeedback.texto}</span>
              </div>
            </div>
          )}

          {/* Seleção do Grupo de Destinatários */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              1. Selecionar Grupo de Destinatários
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGrupo('Contabilidade')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  grupo === 'Contabilidade'
                    ? 'border-[#004C97] bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Grupo 1: Contabilidade</span>
                  {grupo === 'Contabilidade' && (
                    <Badge className="bg-[#004C97] text-white text-[10px]">Ativo</Badge>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Controladoria, Custos e Fechamento Contábil
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGrupo('Produção')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  grupo === 'Produção'
                    ? 'border-[#004C97] bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Grupo 2: Produção</span>
                  {grupo === 'Produção' && (
                    <Badge className="bg-[#004C97] text-white text-[10px]">Ativo</Badge>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Supervisores e Líderes L1, L2, Acabamento
                </span>
              </button>
            </div>
          </div>

          {/* Lista de Destinatários Ativos do Banco de Dados */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                2. Destinatários Cadastrados ({destinatarios.length})
              </label>
              <span className="text-[10px] text-slate-400">
                Selecione quem receberá o comunicado
              </span>
            </div>

            {carregandoDest ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                Carregando destinatários...
              </div>
            ) : destinatarios.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                Nenhum destinatário ativo no Grupo {grupo}. Cadastre destinatários em
                &ldquo;Destinatários&rdquo;.
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                {destinatarios.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2.5 p-2 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={destinatariosSelecionados.includes(d.id)}
                      onChange={() => handleToggleDestinatario(d.id)}
                      className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-slate-800 block truncate">{d.nome}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate block">
                        {d.email}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-slate-600">
                      {d.grupo}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Assunto */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              3. Assunto da Notificação
            </label>
            <Input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className="text-xs font-medium"
              placeholder="Assunto da mensagem"
            />
          </div>

          {/* Corpo do E-mail */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              4. Mensagem Oficial
            </label>
            <Textarea
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              rows={8}
              className="font-mono text-xs bg-white text-slate-800 border-slate-300 leading-relaxed"
            />
          </div>

          {/* 5. Histórico de Comunicações da Competência e Botão Reenviar */}
          {historicoComms.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Histórico de Comunicações Anteriores ({historicoComms.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {historicoComms.map((comm) => (
                  <div
                    key={comm.id}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 truncate">
                          {comm.grupo_destinatario || 'Geral'}
                        </span>
                        {comm.eh_reenvio && (
                          <Badge className="bg-purple-100 text-purple-800 text-[9px] px-1 py-0">
                            Reenvio
                          </Badge>
                        )}
                        <Badge
                          className={`text-[9px] px-1 py-0 ${
                            comm.sucesso
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {comm.sucesso ? 'Enviado' : 'Falha'}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {new Date(comm.data_envio).toLocaleString('pt-BR')} • Por {comm.enviado_por}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleReenviar(comm)}
                      disabled={enviando}
                      className="h-7 text-[11px] text-[#004C97] border-blue-200 hover:bg-blue-50 gap-1 shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reenviar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleEnviar(false)}
            disabled={enviando || destinatariosSelecionados.length === 0}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-semibold"
          >
            <Send className="w-3.5 h-3.5" />
            {enviando ? 'Enviando...' : `Disparar para Grupo ${grupo}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EnviarFechamentoModal
