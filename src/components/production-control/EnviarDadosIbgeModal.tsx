/**
 * Modal de Confirmação do Envio de Dados IBGE para a Contabilidade
 * Título exato: "Enviar Dados IBGE para Contabilidade"
 * Botões exatos: "Cancelar" e "Confirmar Envio"
 *
 * Suporta:
 * - Envio Individual: exibe Empresa, Linha, Centro, Tipo de Material, Material,
 *   Descrição, Período, Quantidade Produzida, Unidade de Medida, e o usuário que realizará o envio.
 * - Envio em Lote: exibe resumo dos itens selecionados, centros, materiais distintos, total em toneladas.
 * - Detecção de reenvio: alerta claro e confirmação de reenvio sem bloqueio.
 * - Destinatários automáticos obtidos da estrutura do HUB (Grupo Contabilidade — Dados IBGE).
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { LinhaConsolidadaIbge, DadosIbgeFiltros, DadosIbgeDestinatario } from '@/types/dados-ibge'
import { dadosIbgeEnvioService, EnvioIbgeResultado } from '@/services/dados-ibge-envio-service'
import { pb } from '@/lib/pocketbase/client'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'
import {
  Send,
  Loader2,
  AlertTriangle,
  Mail,
  Building2,
  Layers,
  MapPin,
  Package,
  Calendar,
  Scale,
  UserCheck,
  CheckCircle2,
  Users,
  Info,
} from 'lucide-react'

interface EnviarDadosIbgeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  linhas: LinhaConsolidadaIbge[]
  filtros: DadosIbgeFiltros
  onSuccess: (resultado?: EnvioIbgeResultado) => void
  onError: (mensagem: string) => void
}

export const EnviarDadosIbgeModal: React.FC<EnviarDadosIbgeModalProps> = ({
  open,
  onOpenChange,
  linhas,
  filtros,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false)
  const [carregandoDestinatarios, setCarregandoDestinatarios] = useState(false)
  const [destinatarios, setDestinatarios] = useState<DadosIbgeDestinatario[]>([])
  const [detectouReenvio, setDetectouReenvio] = useState(false)
  const [ultimoEnvioData, setUltimoEnvioData] = useState<string | null>(null)
  const [ultimoEnvioId, setUltimoEnvioId] = useState<string | null>(null)

  // Estado de feedback para modais de resultado (Sucesso, Sem Integração, Sem Destinatários, Erro)
  const [feedbackState, setFeedbackState] = useState<{
    ativo: boolean
    tipo: 'SUCESSO' | 'SEM_INTEGRACAO' | 'SEM_DESTINATARIOS' | 'ERRO'
    titulo: string
    mensagem: string
    detalhes?: string
    resultado?: EnvioIbgeResultado
  } | null>(null)

  const user = pb.authStore.record
  const usuarioNome = user?.name || user?.email || 'Controle de Produção CIAFAL'
  const usuarioEmail = user?.email || 'pcp@ciafal.com.br'

  const isLote = linhas.length > 1
  const linhaIndividual = linhas.length === 1 ? linhas[0] : null
  const competencia = linhas[0]?.competencia || `${filtros.mes}/${filtros.ano}`
  const empresaNome = linhas[0]?.empresa_nome || 'CIAFAL'
  const linhaCode = linhas[0]?.linha_code || filtros.linha || 'Geral'

  useEffect(() => {
    if (open) {
      setFeedbackState(null)
    }
  }, [open])

  // Carrega destinatários e verifica envio anterior ao abrir modal
  useEffect(() => {
    if (!open || linhas.length === 0) return

    let isMounted = true

    const carregarDadosModal = async () => {
      setCarregandoDestinatarios(true)
      try {
        const dests = await dadosIbgeEnvioService.obterDestinatariosContabilidade()
        if (isMounted) setDestinatarios(dests)

        // Verifica se qualquer linha já foi enviada anteriormente
        const chaves = linhas.map(
          (l) =>
            `${l.empresa_code}_${l.linha_code}_${l.centro_code}_${l.material_code}_${l.tipo_material}_${l.unidade_medida}_${l.competencia}`,
        )

        // Checa no estado local da linha ou no backend
        const jaEnviadaLocal = linhas.some(
          (l) =>
            l.status_fechamento === 'Enviada à Contabilidade' || Boolean(l.data_envio_formatada),
        )

        if (jaEnviadaLocal) {
          const lEnviada = linhas.find((l) => Boolean(l.data_envio_formatada))
          if (isMounted) {
            setDetectouReenvio(true)
            setUltimoEnvioData(lEnviada?.data_envio_formatada || null)
            setUltimoEnvioId(lEnviada?.ultimo_envio_id || null)
          }
        } else {
          const verif = await dadosIbgeEnvioService.verificarEnvioAnterior(chaves)
          if (isMounted && verif.jaEnviado) {
            setDetectouReenvio(true)
            setUltimoEnvioData(verif.ultimoEnvio?.data_envio_formatada || null)
            setUltimoEnvioId(verif.ultimoEnvio?.id || null)
          } else if (isMounted) {
            setDetectouReenvio(false)
            setUltimoEnvioData(null)
            setUltimoEnvioId(null)
          }
        }
      } catch (err) {
        console.warn('Falha ao verificar pré-requisitos do envio:', err)
      } finally {
        if (isMounted) setCarregandoDestinatarios(false)
      }
    }

    carregarDadosModal()

    return () => {
      isMounted = false
    }
  }, [open, linhas])

  // Totalizadores para lote
  const totalToneladas = linhas.reduce((acc, cur) => acc + cur.quantidade_produzida, 0)
  const centrosDistintos = Array.from(new Set(linhas.map((l) => l.centro_code)))
  const materiaisDistintos = Array.from(new Set(linhas.map((l) => l.material_code)))

  const handleConfirmarEnvio = async () => {
    if (loading) return
    setLoading(true)
    try {
      const resultado = await dadosIbgeEnvioService.enviarParaContabilidade({
        linhas,
        filtros,
        ehReenvio: detectouReenvio,
        envioOriginalId: ultimoEnvioId || undefined,
        tipoLote: isLote,
      })

      if (resultado.sucesso) {
        setFeedbackState({
          ativo: true,
          tipo: 'SUCESSO',
          titulo: resultado.titulo,
          mensagem: resultado.mensagem,
          resultado,
        })
      } else if (resultado.categoria === 'SEM_INTEGRACAO') {
        setFeedbackState({
          ativo: true,
          tipo: 'SEM_INTEGRACAO',
          titulo: resultado.titulo,
          mensagem: resultado.mensagem,
          detalhes: resultado.erroDetalhe,
          resultado,
        })
      } else if (resultado.categoria === 'SEM_DESTINATARIOS') {
        setFeedbackState({
          ativo: true,
          tipo: 'SEM_DESTINATARIOS',
          titulo: resultado.titulo,
          mensagem: resultado.mensagem,
          detalhes: resultado.erroDetalhe,
          resultado,
        })
      } else {
        setFeedbackState({
          ativo: true,
          tipo: 'ERRO',
          titulo: resultado.titulo,
          mensagem: resultado.mensagem,
          detalhes: resultado.erroDetalhe,
          resultado,
        })
      }
    } catch (err: any) {
      console.error('Erro no envio de dados IBGE:', err)
      setFeedbackState({
        ativo: true,
        tipo: 'ERRO',
        titulo: 'Não foi possível enviar',
        mensagem: 'Ocorreu um erro ao enviar os Dados IBGE para a Contabilidade.',
        detalhes: err?.message || 'Falha de comunicação com o servidor de e-mail.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConcluirSucesso = () => {
    if (feedbackState?.resultado) {
      onSuccess(feedbackState.resultado)
    }
    setFeedbackState(null)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (loading) return
        if (!v && feedbackState?.tipo === 'SUCESSO') {
          handleConcluirSucesso()
          return
        }
        setFeedbackState(null)
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* TELA DE FEEDBACK: SUCESSO REAL (CENÁRIO 1) */}
        {feedbackState?.tipo === 'SUCESSO' && (
          <div className="space-y-4 py-2">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <DialogTitle className="text-slate-900 text-lg">{feedbackState.titulo}</DialogTitle>
              </div>
              <DialogDescription className="text-slate-700 text-sm mt-1">
                {feedbackState.mensagem}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block text-[11px]">Competência:</span>
                  <span className="font-semibold text-slate-800">{competencia}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Empresa:</span>
                  <span className="font-semibold text-slate-800">{empresaNome}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Linha:</span>
                  <span className="font-semibold text-slate-800">{linhaCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Data/Hora do Envio:</span>
                  <span className="font-semibold text-emerald-800">
                    {feedbackState.resultado?.dataEnvioFormatada || 'Registrado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Responsável:</span>
                  <span className="font-semibold text-slate-800">
                    {feedbackState.resultado?.responsavelNome || usuarioNome}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Qtd. Destinatários:</span>
                  <span className="font-semibold text-slate-800">
                    {feedbackState.resultado?.destinatarios.length || 0} pessoa(s)
                  </span>
                </div>
              </div>

              {feedbackState.resultado?.destinatarios &&
                feedbackState.resultado.destinatarios.length > 0 && (
                  <div className="pt-2 border-t border-emerald-200">
                    <span className="text-slate-600 font-medium block mb-1">Destinatários:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {feedbackState.resultado.destinatarios.map((d) => (
                        <Badge
                          key={d.id}
                          variant="outline"
                          className="bg-white text-emerald-800 border-emerald-300 text-[10px]"
                        >
                          {d.nome} ({d.email})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                size="sm"
                onClick={handleConcluirSucesso}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Concluir
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* TELA DE FEEDBACK: SEM INTEGRAÇÃO (CENÁRIO 2) */}
        {feedbackState?.tipo === 'SEM_INTEGRACAO' && (
          <div className="space-y-4 py-2">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                <DialogTitle className="text-slate-900 text-lg">{feedbackState.titulo}</DialogTitle>
              </div>
              <DialogDescription className="text-slate-700 text-sm mt-1 leading-relaxed">
                {feedbackState.mensagem}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs text-amber-900">
              <p className="font-semibold flex items-center gap-1.5">
                <Info className="h-4 w-4 text-amber-600" />
                Integração de e-mail corporativo pendente no servidor
              </p>
              <p className="text-[11px] text-amber-800 leading-normal">
                Nenhum e-mail foi disparado e o status dos dados não foi alterado para "Enviado à
                Contabilidade". Quando a integração corporativa de e-mail (SMTP/HUB) estiver
                configurada no backend, o envio ocorrerá automaticamente sem necessidade de
                alteração de código.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeedbackState(null)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarEnvio}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Tentar novamente'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* TELA DE FEEDBACK: SEM DESTINATÁRIOS (REGRA 4) */}
        {feedbackState?.tipo === 'SEM_DESTINATARIOS' && (
          <div className="space-y-4 py-2">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-rose-600" />
                <DialogTitle className="text-slate-900 text-lg">{feedbackState.titulo}</DialogTitle>
              </div>
              <DialogDescription className="text-slate-700 text-sm mt-1">
                {feedbackState.mensagem}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
              <p className="font-semibold">Nenhum destinatário ativo configurado</p>
              <p className="text-[11px] text-rose-800 mt-1">
                Para enviar os Dados IBGE, acesse a gestão de destinatários e cadastre ao menos um
                contato ativo para o grupo "Contabilidade — Dados IBGE". O status permanecerá
                inalterado.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeedbackState(null)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* TELA DE FEEDBACK: ERRO DE DISPARO (REGRA 5) */}
        {feedbackState?.tipo === 'ERRO' && (
          <div className="space-y-4 py-2">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
                <DialogTitle className="text-slate-900 text-lg">{feedbackState.titulo}</DialogTitle>
              </div>
              <DialogDescription className="text-slate-700 text-sm mt-1">
                {feedbackState.mensagem}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-2">
              <p className="font-semibold">Falha na comunicação com o servidor de e-mail</p>
              {feedbackState.detalhes && (
                <p className="text-[11px] text-rose-800 font-mono bg-rose-100/60 p-2 rounded">
                  {feedbackState.detalhes}
                </p>
              )}
              <p className="text-[11px] text-rose-700">
                Os dados selecionados não foram perdidos e o status permanece inalterado.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeedbackState(null)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarEnvio}
                disabled={loading}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Tentar novamente'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL DO MODAL */}
        {!feedbackState && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Enviar Dados IBGE para Contabilidade
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Confirme as informações consolidadas da produção que serão enviadas por e-mail
                    estruturado à Contabilidade.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Alerta de reenvio */}
              {detectouReenvio && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs">
                    <strong>Atenção:</strong> Estes dados já foram enviados à Contabilidade{' '}
                    {ultimoEnvioData ? `(${ultimoEnvioData})` : ''}. Deseja realizar um reenvio? O
                    novo envio será registrado com histórico completo no HUB.
                  </AlertDescription>
                </Alert>
              )}

              {/* Dados do envio: Individual ou Lote */}
              {linhaIndividual ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Resumo do Registro de Produção</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      Competência {linhaIndividual.competencia}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-500 block">Empresa:</span>
                        <span className="font-semibold text-slate-800">
                          {linhaIndividual.empresa_code} — {linhaIndividual.empresa_nome}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-500 block">Linha de Produção:</span>
                        <span className="font-semibold text-slate-800">
                          {linhaIndividual.linha_code} — {linhaIndividual.linha_nome}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-500 block">Centro:</span>
                        <span className="font-semibold text-slate-800">
                          {linhaIndividual.centro_code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-500 block">Tipo de Material (MTART):</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {linhaIndividual.tipo_material} —{' '}
                          {linhaIndividual.tipo_material_descricao}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 md:col-span-2">
                      <Package className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-slate-500 block">Material:</span>
                        <span className="font-mono font-bold text-slate-900 block">
                          {linhaIndividual.material_code}
                        </span>
                        <span className="text-slate-600">{linhaIndividual.material_descricao}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-500 block">Período (Competência):</span>
                        <span className="font-semibold text-slate-800">
                          {linhaIndividual.competencia}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-500 block">Quantidade Produzida:</span>
                        <span className="font-bold text-blue-700 text-sm">
                          {formatNumberPTBR(linhaIndividual.quantidade_produzida, 3)}{' '}
                          {linhaIndividual.unidade_medida.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-500 block">Unidade de Medida:</span>
                        <span className="font-semibold text-slate-800">
                          {linhaIndividual.unidade_medida.toUpperCase()} (Toneladas)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-500 block">Total de Registros de Origem:</span>
                        <span className="font-semibold text-slate-800">
                          {linhaIndividual.total_registros} apontamento(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Resumo da Consolidação em Lote</span>
                    <Badge className="bg-blue-600 text-white font-mono text-xs">
                      {linhas.length} linhas selecionadas
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">Competência:</span>
                      <span className="font-bold text-slate-800">
                        {linhas[0]?.competencia || `${filtros.mes}/${filtros.ano}`}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">Centros Envolvidos:</span>
                      <span className="font-bold text-slate-800">
                        {centrosDistintos.length} centro(s)
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">Materiais Distintos:</span>
                      <span className="font-bold text-slate-800">
                        {materiaisDistintos.length} materiais
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">Volume Total:</span>
                      <span className="font-bold text-blue-700">
                        {formatNumberPTBR(totalToneladas, 3)} t
                      </span>
                    </div>
                  </div>

                  {/* Tabela miniatura com as primeiras 4 linhas */}
                  <div className="max-h-40 overflow-y-auto rounded border border-slate-200 bg-white text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-600 sticky top-0 font-medium">
                        <tr>
                          <th className="p-1.5">Centro</th>
                          <th className="p-1.5">MTART</th>
                          <th className="p-1.5">Material</th>
                          <th className="p-1.5 text-right">Qtd (t)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {linhas.map((l) => (
                          <tr key={l.id}>
                            <td className="p-1.5 font-medium">{l.centro_code}</td>
                            <td className="p-1.5">{l.tipo_material}</td>
                            <td
                              className="p-1.5 truncate max-w-[200px]"
                              title={l.material_descricao}
                            >
                              <span className="font-mono text-slate-700">{l.material_code}</span>{' '}
                              <span className="text-slate-500">({l.material_descricao})</span>
                            </td>
                            <td className="p-1.5 text-right font-mono font-medium">
                              {formatNumberPTBR(l.quantidade_produzida, 3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Usuário Responsável pelo Envio */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-slate-500 block">Usuário Responsável pelo Envio:</span>
                    <span className="font-semibold text-slate-900">
                      {usuarioNome} ({usuarioEmail})
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-slate-600 text-xs">
                  Módulo PCP Controle de Produção
                </Badge>
              </div>

              <Separator />

              {/* Destinatários do Grupo Contabilidade */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    Destinatários (Grupo: Contabilidade — Dados IBGE):
                  </span>
                  {carregandoDestinatarios && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                  {destinatarios.map((d) => (
                    <Badge
                      key={d.id}
                      variant="secondary"
                      className="bg-white border border-slate-200 text-slate-700 font-normal py-0.5"
                    >
                      <span className="font-medium">{d.nome}</span>
                      <span className="text-slate-400 ml-1">({d.email})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
                onClick={handleConfirmarEnvio}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirmar Envio
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default EnviarDadosIbgeModal
