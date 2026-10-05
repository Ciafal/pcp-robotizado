import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Send,
  Sparkles,
  Eye,
  FileCheck,
  AlertTriangle,
  History,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  ProgramacaoParadaRegistro,
  CentroParadaInput,
  programacaoParadaService,
} from '@/services/programacao-parada-service'

interface SendCommunicationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parada: ProgramacaoParadaRegistro
  centros: CentroParadaInput[]
  onSuccessSend: () => void
}

export const SendCommunicationModal: React.FC<SendCommunicationModalProps> = ({
  open,
  onOpenChange,
  parada,
  centros,
  onSuccessSend,
}) => {
  // Lista de destinatários do sistema
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<any[]>([])
  const [gruposDisponiveis, setGruposDisponiveis] = useState<any[]>([])

  // Seleções
  const [destinatarios, setDestinatarios] = useState<string[]>([])
  const [copia, setCopia] = useState<string[]>([])
  const [assunto, setAssunto] = useState<string>('')
  const [corpo, setCorpo] = useState<string>('')
  const [impactos, setImpactos] = useState<string>('')
  const [previsaoRetorno, setPrevisaoRetorno] = useState<string>('')

  // Estados de controle
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null)
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null)
  const [historicoList, setHistoricoList] = useState<any[]>([])
  const [showHistorico, setShowHistorico] = useState<boolean>(false)

  // Carregar usuários e gerar texto inicial ao abrir
  useEffect(() => {
    if (!open) {
      setIsPreviewMode(false)
      setIsConfirmDialogOpen(false)
      setSendSuccessMessage(null)
      setSendErrorMessage(null)
      setShowHistorico(false)
      return
    }

    const initData = async () => {
      // 1. Carregar destinatários reais
      const { usuarios, grupos } = await programacaoParadaService.getDestinatariosDisponiveis()
      setUsuariosDisponiveis(usuarios)
      setGruposDisponiveis(grupos)

      // 2. Se já tem comunicado prévio e houve alteração, sugere formato de ATUALIZAÇÃO
      const isAtualizacao =
        parada.houve_alteracao_pos_comunicado || (parada.comunicado_disparado && parada.versao > 1)

      const gerado = programacaoParadaService.gerarCorpoComunicadoPadrao(
        parada,
        centros,
        isAtualizacao,
      )
      setAssunto(gerado.assunto)
      setCorpo(gerado.corpo)
      setImpactos(gerado.impactos)
      setPrevisaoRetorno(gerado.previsaoRetorno)

      // Pré-seleciona equipe PCP e Supervisores por padrão
      const emailsDefault = [
        'programador.pcp@ciafal.com.br',
        'ciafal@ciafal.com.br',
        'supervisor.l1@ciafal.com.br',
      ]
      setDestinatarios(emailsDefault)
      setCopia(['gerencia.industrial@ciafal.com.br'])

      // Carregar histórico append-only
      if (parada.id) {
        const hists = await programacaoParadaService.listarComunicados(parada.id)
        setHistoricoList(hists)
      }
    }

    initData()
  }, [open, parada, centros])

  // Aplicar Lista Padrão de Comunicação PCP
  const handleApplyDefaultList = () => {
    const defaultList = [
      'programador.pcp@ciafal.com.br',
      'ciafal@ciafal.com.br',
      'supervisor.l1@ciafal.com.br',
      'gestor.l1@ciafal.com.br',
      'manutencao.preventiva@ciafal.com.br',
    ]
    setDestinatarios(Array.from(new Set([...destinatarios, ...defaultList])))
    setCopia(['comercial.vendas@ciafal.com.br', 'qualidade.inspecao@ciafal.com.br'])
  }

  // Alternar Destinatário
  const toggleDestinatario = (email: string) => {
    setDestinatarios((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    )
  }

  // Alternar CC
  const toggleCopia = (email: string) => {
    setCopia((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]))
  }

  // Adicionar todos os membros de um grupo
  const addGrupoToDestinatarios = (emails: string[]) => {
    setDestinatarios((prev) => Array.from(new Set([...prev, ...emails])))
  }

  // Gerar novamente com IA / template inteligente
  const handleRegenerateIA = () => {
    const isAtualizacao =
      parada.houve_alteracao_pos_comunicado || (parada.comunicado_disparado && parada.versao > 1)
    const gerado = programacaoParadaService.gerarCorpoComunicadoPadrao(
      parada,
      centros,
      isAtualizacao,
    )
    setAssunto(gerado.assunto)
    setCorpo(gerado.corpo)
    setImpactos(gerado.impactos)
    setPrevisaoRetorno(gerado.previsaoRetorno)
  }

  // Corpo final consolidado para envio / preview
  const corpoFinalMontado = `Boa tarde!\n\nPara conhecimento e alinhamento dos setores envolvidos, informamos a programação de parada abaixo:\n\n${corpo}\n\nIMPACTOS PREVISTOS:\n${impactos || '- Reorganização do sequenciamento produtivo do período.'}\n\nPREVISÃO DE RETORNO:\n${previsaoRetorno || '- Retorno conforme liberação técnica do Centro.'}\n\nAtenciosamente,\nPCP — Ciafal`

  // Disparo oficial com persistência
  const handleExecuteSend = async () => {
    setIsSending(true)
    setSendSuccessMessage(null)
    setSendErrorMessage(null)

    try {
      const res = await programacaoParadaService.dispararComunicado({
        parada_id: parada.id,
        parada_codigo: parada.codigo,
        destinatarios,
        copia,
        assunto,
        corpo: corpoFinalMontado,
        versao: parada.versao,
        houve_alteracao_pos_comunicado: Boolean(parada.houve_alteracao_pos_comunicado),
      })

      if (res.sucesso) {
        setSendSuccessMessage(
          `Comunicado da Parada Programada ${parada.codigo} enviado com sucesso para ${destinatarios.length} destinatários.`,
        )
        // Atualiza histórico local
        const hists = await programacaoParadaService.listarComunicados(parada.id)
        setHistoricoList(hists)
        onSuccessSend()
      } else {
        setSendErrorMessage(
          res.erro ||
            'Não foi possível disparar o comunicado por e-mail. Verifique o servidor SMTP.',
        )
      }
    } catch (e: any) {
      setSendErrorMessage(e?.message || 'Falha na comunicação com o backend ao enviar comunicado.')
    } finally {
      setIsSending(false)
      setIsConfirmDialogOpen(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white p-0 border border-slate-200 rounded-2xl shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-white to-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#004C97]/10 text-[#004C97] flex items-center justify-center shadow-xs">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Comunicado Oficial de Parada Programada
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#004C97]">
                      {parada.codigo}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Alinhamento corporativo com Manutenção, Produção, Qualidade, Comercial e
                    Diretoria.
                  </DialogDescription>
                </div>
              </div>

              {/* Botão de Histórico */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistorico(!showHistorico)}
                  className="text-xs text-slate-700 h-8 gap-1"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  {showHistorico ? 'Ocultar Histórico' : `Histórico (${historicoList.length})`}
                </Button>
              </div>
            </div>

            {/* Aviso de Programação Alterada */}
            {parada.houve_alteracao_pos_comunicado && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Atenção:</strong> A programação foi alterada após o último comunicado
                  enviado. O texto foi formatado automaticamente como{' '}
                  <strong className="underline">ATUALIZAÇÃO</strong> destacando as alterações.
                </span>
              </div>
            )}
          </DialogHeader>

          <div className="p-6 space-y-5">
            {/* Mensagens de Sucesso ou Erro */}
            {sendSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{sendSuccessMessage}</span>
              </div>
            )}
            {sendErrorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2 shadow-xs">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{sendErrorMessage}</span>
              </div>
            )}

            {/* Painel do Histórico de Comunicados (se aberto) */}
            {showHistorico && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#004C97]" />
                  Histórico de Disparos Desta Parada ({historicoList.length})
                </h4>
                {historicoList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhum comunicado oficial disparado até o momento.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {historicoList.map((h, i) => (
                      <div
                        key={h.id || i}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-800 font-semibold">{h.assunto}</strong>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              h.resultado_envio === 'ENVIADO'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-rose-50 text-rose-700 border-rose-300'
                            }`}
                          >
                            {h.resultado_envio}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4">
                          <span>
                            Data/Hora:{' '}
                            <strong className="text-slate-700">
                              {new Date(h.created || h.disparado_em).toLocaleString('pt-BR')}
                            </strong>
                          </span>
                          <span>
                            Versão:{' '}
                            <strong className="text-slate-700">V{h.versao_programacao}</strong>
                          </span>
                          <span>
                            Para:{' '}
                            <strong className="text-slate-700">
                              {(h.destinatarios || []).join(', ')}
                            </strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Seletor de Destinatários e CC com Grupos Oficiais */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#004C97]" />
                  Destinatários da Comunicação (Para e CC)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyDefaultList}
                  className="text-xs font-semibold text-[#004C97] border-blue-200 hover:bg-blue-50 h-7"
                >
                  + Usar lista padrão de comunicação PCP
                </Button>
              </div>

              {/* Atalhos para Grupos */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">
                  Adicionar Grupo:
                </span>
                {gruposDisponiveis.map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => addGrupoToDestinatarios(grp.emails)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-300 hover:border-[#004C97] hover:text-[#004C97] text-slate-700 transition-colors shadow-2xs font-medium"
                  >
                    + {grp.nome}
                  </button>
                ))}
              </div>

              {/* Campo Para (Emails) */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">
                  Para (Destinatários Principais):
                </Label>
                <Input
                  type="text"
                  value={destinatarios.join(', ')}
                  onChange={(e) =>
                    setDestinatarios(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  className="text-xs bg-white h-8"
                  placeholder="exemplo1@ciafal.com.br, exemplo2@ciafal.com.br"
                />
              </div>

              {/* Campo CC (Cópia) */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">
                  Cc (Cópia Informativa):
                </Label>
                <Input
                  type="text"
                  value={copia.join(', ')}
                  onChange={(e) =>
                    setCopia(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  className="text-xs bg-white h-8"
                  placeholder="diretoria@ciafal.com.br, comercial@ciafal.com.br"
                />
              </div>

              {/* Usuários para seleção rápida via checkbox */}
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Seleção Rápida de Usuários Cadastrados:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                  {usuariosDisponiveis.map((u) => {
                    const isPara = destinatarios.includes(u.email)
                    const isCc = copia.includes(u.email)
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between text-xs py-1 px-1.5 hover:bg-slate-50 rounded"
                      >
                        <span className="truncate text-slate-700 font-medium mr-2" title={u.email}>
                          {u.name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="flex items-center gap-1 cursor-pointer text-[10px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={isPara}
                              onChange={() => toggleDestinatario(u.email)}
                              className="rounded text-[#004C97] focus:ring-0"
                            />
                            Para
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-[10px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={isCc}
                              onChange={() => toggleCopia(u.email)}
                              className="rounded text-purple-600 focus:ring-0"
                            />
                            Cc
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Alternador de Modo: Edição vs Pré-visualização */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={!isPreviewMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsPreviewMode(false)}
                  className={`text-xs h-7 ${
                    !isPreviewMode ? 'bg-[#004C97] text-white' : 'text-slate-700'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5 mr-1" />
                  Editar Campos
                </Button>
                <Button
                  type="button"
                  variant={isPreviewMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsPreviewMode(true)}
                  className={`text-xs h-7 ${
                    isPreviewMode ? 'bg-[#004C97] text-white' : 'text-slate-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Pré-visualizar E-mail Corporativo
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRegenerateIA}
                className="text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50 h-7 gap-1 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Gerar novamente com IA
              </Button>
            </div>

            {/* Conteúdo: Modo Edição ou Modo Preview */}
            {!isPreviewMode ? (
              <div className="space-y-4">
                {/* Assunto */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Assunto do E-mail</Label>
                  <Input
                    type="text"
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    className="text-xs bg-white font-medium"
                  />
                </div>

                {/* Corpo Corporativo */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Corpo da Mensagem (Consolidação dos Centros)
                  </Label>
                  <Textarea
                    rows={7}
                    value={corpo}
                    onChange={(e) => setCorpo(e.target.value)}
                    className="text-xs bg-white resize-y font-mono"
                  />
                </div>

                {/* Impactos Previstos e Previsão de Retorno */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Impactos Previstos
                    </Label>
                    <Textarea
                      rows={3}
                      value={impactos}
                      onChange={(e) => setImpactos(e.target.value)}
                      className="text-xs bg-white resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Previsão de Retorno
                    </Label>
                    <Textarea
                      rows={3}
                      value={previsaoRetorno}
                      onChange={(e) => setPrevisaoRetorno(e.target.value)}
                      className="text-xs bg-white resize-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Modo Pré-visualização corporativa estilo Ciafal */
              <div className="p-5 bg-white border border-slate-300 rounded-xl shadow-xs space-y-4 font-sans">
                <div className="border-b border-slate-200 pb-3 text-xs space-y-1">
                  <div>
                    <span className="font-bold text-slate-600">De:</span>{' '}
                    <span className="text-slate-800">pcp.programacao@ciafal.com.br</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600">Para:</span>{' '}
                    <span className="text-slate-800">{destinatarios.join('; ')}</span>
                  </div>
                  {copia.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-600">Cc:</span>{' '}
                      <span className="text-slate-800">{copia.join('; ')}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-600">Assunto:</span>{' '}
                    <span className="text-[#004C97] font-bold">{assunto}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                  {corpoFinalMontado}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs text-slate-700"
              >
                Salvar Rascunho
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setIsConfirmDialogOpen(true)}
                disabled={destinatarios.length === 0 || isSending}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                Disparar Comunicado ({destinatarios.length} destinatários)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação Rigorosa de Envio */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#004C97]" />
              Confirmar Envio de Comunicado
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 font-medium">
              Deseja enviar o comunicado de Parada Programada{' '}
              <strong className="text-slate-900">{parada.codigo}</strong> para{' '}
              <strong className="text-slate-900">{destinatarios.length} destinatários</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700">
            <div>
              <strong>Assunto:</strong> {assunto}
            </div>
            <div>
              <strong>Versão:</strong> V{String(parada.versao).padStart(2, '0')}
            </div>
            <div className="truncate">
              <strong>Destinatários:</strong> {destinatarios.join(', ')}
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isSending}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleExecuteSend}
              disabled={isSending}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSending ? 'Enviando...' : 'Confirmar Envio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
export default SendCommunicationModal
