import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Send,
  Sparkles,
  Calendar,
  AlertTriangle,
  Info,
  Users,
  CheckSquare,
  Square,
  Clock,
  Layers,
  HelpCircle,
  FileText,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { CarteiraMinimaItem } from '@/types/carteira-minima'
import {
  DestinatarioHub,
  DestinoComunicado,
  EnvioComunicadoResult,
  ItemComercialStatus,
  PrioridadeComunicado,
} from '@/types/comercial-comunicado'
import { comercialComunicadoService } from '@/services/comercial-comunicado-service'
import { formatNumberPTBR } from '@/lib/number-format'

interface EnviarComunicadoComercialModalProps {
  isOpen: boolean
  onClose: () => void
  itens: CarteiraMinimaItem[]
  onSucessoEnvio: (resultado: EnvioComunicadoResult) => void
}

function formatarDataPtBr(dataIso?: string): string {
  if (!dataIso) return '—'
  const clean = dataIso.split('T')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dataIso
}

function getDataAtualPtBr(): string {
  const d = new Date()
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

function getDataAtualIso(): string {
  const d = new Date()
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${ano}-${mes}-${dia}`
}

export const EnviarComunicadoComercialModal: React.FC<EnviarComunicadoComercialModalProps> = ({
  isOpen,
  onClose,
  itens,
  onSucessoEnvio,
}) => {
  // Estado dos formulários
  const [assunto, setAssunto] = useState<string>('')
  const [mensagem, setMensagem] = useState<string>('')
  const [mensagemOriginal, setMensagemOriginal] = useState<string>('')
  const [prioridade, setPrioridade] = useState<PrioridadeComunicado>('Normal')
  const [destinos, setDestinos] = useState<DestinoComunicado[]>(['COMERCIAL_HUB', 'MEU_DIA'])
  const [dataMeuDiaIso, setDataMeuDiaIso] = useState<string>(getDataAtualIso())

  // Destinatários
  const [todosDestinatarios, setTodosDestinatarios] = useState<DestinatarioHub[]>([])
  const [destinatariosSelecionados, setDestinatariosSelecionados] = useState<DestinatarioHub[]>([])
  const [carregandoDestinatarios, setCarregandoDestinatarios] = useState<boolean>(true)

  // Status de envio e validação
  const [enviando, setEnviando] = useState<boolean>(false)
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  const [foiAprimoradoIa, setFoiAprimoradoIa] = useState<boolean>(false)
  const [textoIaOriginal, setTextoIaOriginal] = useState<string | null>(null)

  // Confirmação de descarte de alterações
  const [mostrarConfirmacaoDescarte, setMostrarConfirmacaoDescarte] = useState<boolean>(false)

  // Verificação de itens já enviados (duplicidade)
  const [itensJaEnviados, setItensJaEnviados] = useState<ItemComercialStatus[]>([])
  const [mostrarModalDuplicidade, setMostrarModalDuplicidade] = useState<boolean>(false)

  // Modal de sucesso pós-envio
  const [sucessoResultado, setSucessoResultado] = useState<EnvioComunicadoResult | null>(null)

  // Inicialização ao abrir com os itens selecionados
  useEffect(() => {
    if (!isOpen || itens.length === 0) return

    // Assunto automático padrão
    const ass = comercialComunicadoService.gerarAssuntoPadrao(itens.length)
    setAssunto(ass)

    // Prioridade sugerida automaticamente
    const prio = comercialComunicadoService.sugerirPrioridade(itens)
    setPrioridade(prio)

    // Mensagem consolidada com dados reais
    const msg = comercialComunicadoService.gerarMensagemConsolidada(itens)
    setMensagem(msg)
    setMensagemOriginal(msg)
    setTextoIaOriginal(null)
    setFoiAprimoradoIa(false)
    setErroValidacao(null)
    setDestinos(['COMERCIAL_HUB', 'MEU_DIA'])
    setDataMeuDiaIso(getDataAtualIso())
    setMostrarConfirmacaoDescarte(false)
    setMostrarModalDuplicidade(false)
    setSucessoResultado(null)

    // Carregar destinatários e sugerir
    let isMounted = true
    setCarregandoDestinatarios(true)

    comercialComunicadoService
      .listarDestinatariosHub()
      .then((destList) => {
        if (!isMounted) return
        setTodosDestinatarios(destList)
        const sugeridos = comercialComunicadoService.sugerirDestinatarios(itens, destList)
        setDestinatariosSelecionados(sugeridos)
      })
      .finally(() => {
        if (isMounted) setCarregandoDestinatarios(false)
      })

    // Verificar se algum item já foi enviado anteriormente
    Promise.all(itens.map((it) => comercialComunicadoService.verificarItemJaEnviado(it))).then(
      (resultados) => {
        if (!isMounted) return
        const jaEnviados = resultados.filter(
          (r): r is ItemComercialStatus => r !== null && r.total_envios > 0,
        )
        setItensJaEnviados(jaEnviados)
      },
    )

    return () => {
      isMounted = false
    }
  }, [isOpen, itens])

  // Checagem se o texto foi alterado pelo usuário para alertar no cancelamento
  const textoFoiAlterado = useMemo(() => {
    return (
      mensagem.trim() !== mensagemOriginal.trim() ||
      assunto.trim() !== comercialComunicadoService.gerarAssuntoPadrao(itens.length)
    )
  }, [mensagem, mensagemOriginal, assunto, itens.length])

  // Tratamento do fechamento
  const handleTentarFechar = () => {
    if (textoFoiAlterado) {
      setMostrarConfirmacaoDescarte(true)
    } else {
      onClose()
    }
  }

  const handleConfirmarDescarte = () => {
    setMostrarConfirmacaoDescarte(false)
    onClose()
  }

  // Toggle destinos
  const handleToggleDestino = (dest: DestinoComunicado) => {
    setDestinos((prev) => {
      const existe = prev.includes(dest)
      if (existe) {
        // Pelo menos um deve permanecer selecionado
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== dest)
      } else {
        return [...prev, dest]
      }
    })
  }

  // Toggle destinatários
  const handleToggleDestinatario = (dest: DestinatarioHub) => {
    setDestinatariosSelecionados((prev) => {
      const existe = prev.some((d) => d.id === dest.id)
      if (existe) {
        return prev.filter((d) => d.id !== dest.id)
      } else {
        return [...prev, dest]
      }
    })
  }

  // Aprimorar texto com IA
  const handleMelhorarComIa = () => {
    if (!textoIaOriginal) {
      setTextoIaOriginal(mensagem)
    }
    const novoTexto = comercialComunicadoService.melhorarTextoComIa(mensagem, itens, prioridade)
    setMensagem(novoTexto)
    setFoiAprimoradoIa(true)
  }

  const handleRestaurarOriginal = () => {
    if (textoIaOriginal) {
      setMensagem(textoIaOriginal)
      setFoiAprimoradoIa(false)
    }
  }

  // Data formatada para o Meu Dia
  const dataMeuDiaFormatada = useMemo(() => {
    if (!dataMeuDiaIso) return getDataAtualPtBr()
    const [ano, mes, dia] = dataMeuDiaIso.split('-')
    if (dia && mes && ano) {
      return `${dia}/${mes}/${ano}`
    }
    return getDataAtualPtBr()
  }, [dataMeuDiaIso])

  // Processo de envio
  const handleExecutarEnvio = async (ehReenvioConfirmado = false) => {
    setErroValidacao(null)

    // Validações locais antes da chamada
    if (itens.length === 0) {
      setErroValidacao('Selecione pelo menos 1 item.')
      return
    }
    if (destinatariosSelecionados.length === 0) {
      setErroValidacao('Selecione pelo menos 1 destinatário do HUB.')
      return
    }
    if (destinos.length === 0) {
      setErroValidacao('Selecione pelo menos 1 destino.')
      return
    }
    if (!assunto.trim()) {
      setErroValidacao('O assunto do comunicado deve ser preenchido.')
      return
    }
    if (!mensagem.trim()) {
      setErroValidacao('A mensagem do comunicado deve ser preenchida.')
      return
    }
    if (destinos.includes('MEU_DIA') && !dataMeuDiaFormatada) {
      setErroValidacao('Informe uma data válida para o Meu Dia.')
      return
    }

    // Se houver item já enviado e não for confirmação explícita de reenvio, abrir aviso
    if (itensJaEnviados.length > 0 && !ehReenvioConfirmado) {
      setMostrarModalDuplicidade(true)
      return
    }

    setEnviando(true)

    try {
      const res = await comercialComunicadoService.enviarComunicadoAoComercial({
        itens,
        assunto,
        mensagem,
        mensagemOriginal,
        prioridade,
        destinos,
        dataMeuDia: dataMeuDiaFormatada,
        destinatarios: destinatariosSelecionados,
        foiAprimoradoIa,
        ehReenvioConfirmado,
      })

      setSucessoResultado(res)
      setMostrarModalDuplicidade(false)
      onSucessoEnvio(res)
    } catch (err: any) {
      console.error('[EnviarComunicadoComercialModal] Erro ao enviar comunicado:', err)
      setErroValidacao(err?.message || 'Falha ao processar o envio do comunicado.')
    } finally {
      setEnviando(false)
    }
  }

  // Se o envio teve sucesso, exibe popup de confirmação com dados detalhados
  if (sucessoResultado) {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">
                Comunicado enviado com sucesso para o Comercial!
              </h3>
              <p className="text-xs font-mono font-bold text-[#004C97]">
                {sucessoResultado.numeroSequencial}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5 text-left">
              <div className="flex items-center justify-between font-semibold">
                <span>Resumo da Operação:</span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-300"
                >
                  Status: Enviado
                </Badge>
              </div>
              <p className="font-medium text-slate-800">{sucessoResultado.mensagemRetorno}</p>
              {destinos.includes('MEU_DIA') && (
                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Data agendada no Meu Dia: <strong>{dataMeuDiaFormatada}</strong>
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="default"
              className="w-full bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold text-xs h-9"
              onClick={() => {
                setSucessoResultado(null)
                onClose()
              }}
            >
              Concluir e Atualizar Tabela
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      {/* 1. MODAL PRINCIPAL: REVISÃO DO COMUNICADO AO COMERCIAL */}
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleTentarFechar() : null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-[#004C97] uppercase">
                  PCP Robotizado • Comercial HUB
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100/70 text-[#004C97]">
                  {itens.length} {itens.length === 1 ? 'item selecionado' : 'itens selecionados'}
                </span>
              </div>
              <DialogTitle className="text-xl font-extrabold text-slate-900 tracking-tight">
                Enviar comunicado ao Comercial
              </DialogTitle>
              <p className="text-xs text-slate-600">
                Revise os itens, os canais de entrega, os destinatários corporativos e a mensagem
                consolidada antes da emissão.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTentarFechar}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo rolável */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-slate-800">
            {/* Aviso de erro de validação */}
            {erroValidacao && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold text-xs leading-relaxed">{erroValidacao}</span>
              </div>
            )}

            {/* Aviso se houver itens que já foram enviados anteriormente */}
            {itensJaEnviados.length > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-xs block">Aviso de Reenvio Detectado</span>
                  <p className="text-[11px] leading-relaxed">
                    {itensJaEnviados.length}{' '}
                    {itensJaEnviados.length === 1
                      ? 'item já possui comunicado enviado anteriormente.'
                      : 'itens já possuem comunicado enviado anteriormente.'}{' '}
                    Ao enviar, você poderá confirmar a emissão de um novo comunicado sem bloqueio.
                  </p>
                </div>
              </div>
            )}

            {/* SEÇÃO 1: TABELA / RESUMO DOS ITENS SELECIONADOS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#004C97]" />
                  Itens Selecionados para Avaliação Comercial ({itens.length})
                </Label>
                <span className="text-[11px] text-slate-500">Saldo = Carteira − Estoque livre</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5 whitespace-nowrap">Material</th>
                      <th className="py-2 px-2.5 min-w-[150px]">Texto breve</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">Pedido / item</th>
                      <th className="py-2 px-2.5 text-right whitespace-nowrap">Carteira (t)</th>
                      <th className="py-2 px-2.5 text-right whitespace-nowrap">
                        Estoque livre (t)
                      </th>
                      <th className="py-2 px-2.5 text-right whitespace-nowrap bg-amber-50/70">
                        Saldo a produzir (t)
                      </th>
                      <th className="py-2 px-2.5 text-right whitespace-nowrap">
                        Carteira mínima (t)
                      </th>
                      <th className="py-2 px-2.5 text-center whitespace-nowrap">Data desejada</th>
                      <th className="py-2 px-2.5 text-center whitespace-nowrap">Centro/Linha</th>
                      <th className="py-2 px-2.5 text-center whitespace-nowrap">Criticidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {itens.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {it.material}
                        </td>
                        <td
                          className="py-2 px-2.5 truncate max-w-[180px]"
                          title={it.descricao_material}
                        >
                          {it.descricao_material}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-semibold text-[#004C97] whitespace-nowrap">
                          {it.pedido_formatado}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                          {formatNumberPTBR(it.carteira_tons, 3)} t
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-emerald-700 whitespace-nowrap">
                          {formatNumberPTBR(it.estoque_livre_tons, 3)} t
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-800 bg-amber-50/50 whitespace-nowrap">
                          {formatNumberPTBR(it.saldo_produzir_tons, 3)} t
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                          {formatNumberPTBR(it.producao_minima_tons, 3)} t
                        </td>
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          {formatarDataPtBr(it.data_desejada)}
                        </td>
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          {it.centro} / {it.linha || 'L1'}
                        </td>
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              it.criticidade === 'Crítico'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : it.criticidade === 'Atenção'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {it.criticidade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS DO COMUNICADO (Tipo, Assunto, Destinos, Prioridade, Data Meu Dia) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/70 border border-slate-200 rounded-xl">
              {/* Tipo (Fixo / Automático) */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Tipo de Comunicado</Label>
                <Input
                  type="text"
                  value="Carteira mínima não atingida"
                  disabled
                  className="bg-slate-100 border-slate-300 text-slate-700 font-semibold text-xs h-8 cursor-not-allowed"
                />
              </div>

              {/* Prioridade */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  Prioridade do Comunicado
                </Label>
                <select
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value as PrioridadeComunicado)}
                  className="w-full text-xs h-8 rounded-md border border-slate-300 bg-white px-2.5 text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
                >
                  <option value="Normal">Normal</option>
                  <option value="Atenção">Atenção</option>
                  <option value="Crítica">Crítica</option>
                </select>
                <span className="text-[10px] text-slate-500 block">
                  Sugerida pela maior criticidade dos itens selecionados.
                </span>
              </div>

              {/* Assunto (Automático, editável) */}
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[11px] font-bold text-slate-700">Assunto</Label>
                <Input
                  type="text"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Assunto do comunicado..."
                  className="text-xs h-8 border-slate-300 bg-white font-medium"
                />
              </div>

              {/* Destinos */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">Canais de Destino</Label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={destinos.includes('COMERCIAL_HUB')}
                      onChange={() => handleToggleDestino('COMERCIAL_HUB')}
                      className="w-4 h-4 text-[#004C97] rounded border-slate-300 focus:ring-[#004C97]"
                    />
                    <span className="text-xs font-semibold text-slate-800">Comercial – HUB</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={destinos.includes('MEU_DIA')}
                      onChange={() => handleToggleDestino('MEU_DIA')}
                      className="w-4 h-4 text-[#004C97] rounded border-slate-300 focus:ring-[#004C97]"
                    />
                    <span className="text-xs font-semibold text-slate-800">Meu Dia</span>
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Pelo menos um destino deve permanecer selecionado.
                </span>
              </div>

              {/* Data para o Meu Dia (exibida quando Meu Dia estiver marcado) */}
              {destinos.includes('MEU_DIA') ? (
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#004C97]" />
                    Data para o "Meu Dia" (dd/mm/aaaa)
                  </Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dataMeuDiaIso}
                      min={getDataAtualIso()}
                      onChange={(e) => setDataMeuDiaIso(e.target.value)}
                      className="text-xs h-8 border-slate-300 bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Padrão: hoje ({getDataAtualPtBr()}). O card aparecerá na data definida.
                  </span>
                </div>
              ) : (
                <div className="flex items-center text-[11px] text-slate-400 italic pt-6">
                  Canal "Meu Dia" desmarcado para este comunicado.
                </div>
              )}
            </div>

            {/* SEÇÃO 3: DESTINATÁRIOS CORPORATIVOS DO HUB */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#004C97]" />
                  Destinatários Corporativos ({destinatariosSelecionados.length} selecionados)
                </Label>
                <span className="text-[10px] text-slate-500">
                  Usa cadastro corporativo / AD já integrado ao HUB
                </span>
              </div>

              {carregandoDestinatarios ? (
                <div className="p-3 bg-slate-50 rounded-xl text-center text-slate-500 text-xs">
                  Carregando usuários corporativos...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/40">
                  {todosDestinatarios.map((dest) => {
                    const selecionado = destinatariosSelecionados.some((d) => d.id === dest.id)
                    return (
                      <div
                        key={dest.id}
                        onClick={() => handleToggleDestinatario(dest)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-start gap-2 ${
                          selecionado
                            ? 'bg-blue-50/80 border-[#004C97] text-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selecionado}
                          readOnly
                          className="mt-0.5 rounded text-[#004C97]"
                        />
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <span className="font-semibold text-[11px] truncate block">
                            {dest.name}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {dest.email}
                          </span>
                          <div className="flex items-center gap-1 pt-0.5">
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                              {dest.grupo || dest.role || 'HUB'}
                            </span>
                            {dest.isVendedorResponsavel && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                                Vendedor
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 4: MENSAGEM CONSOLIDADA E IA */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#004C97]" />
                  Mensagem Consolidada
                </Label>

                <div className="flex items-center gap-2">
                  {foiAprimoradoIa && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRestaurarOriginal}
                      className="text-[11px] h-7 text-slate-500 hover:text-slate-800"
                    >
                      Restaurar texto original
                    </Button>
                  )}

                  {/* Botão de IA integrada: melhora clareza sem alterar dados de negócio */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMelhorarComIa}
                    className="text-xs h-7 gap-1.5 border-blue-300 bg-blue-50 text-[#004C97] hover:bg-blue-100 font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
                    Melhorar texto com IA
                  </Button>
                </div>
              </div>

              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={9}
                placeholder="Escreva a mensagem do comunicado..."
                className="font-mono text-xs leading-relaxed border-slate-300 bg-white"
              />

              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  O texto permanece totalmente editável. A IA preserva todos os dados reais
                  (materiais, pedidos, prazos e tonelagens).
                </span>
                <span>{mensagem.length} caracteres</span>
              </div>
            </div>
          </div>

          {/* Footer com botões de ação */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-500">
              {destinos.length} destino(s) • {destinatariosSelecionados.length} destinatário(s)
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTentarFechar}
                disabled={enviando}
                className="text-xs h-9 font-medium border-slate-300 w-full sm:w-auto"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => handleExecutarEnvio(false)}
                disabled={enviando || itens.length === 0 || destinatariosSelecionados.length === 0}
                className="text-xs h-9 font-semibold bg-[#004C97] hover:bg-[#003d7a] text-white shadow-xs gap-1.5 w-full sm:w-auto"
              >
                {enviando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Enviando comunicado...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Enviar comunicado
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. POPUP DE CONFIRMAÇÃO: DESCARTE DE ALTERAÇÕES */}
      <Dialog
        open={mostrarConfirmacaoDescarte}
        onOpenChange={(open) => (!open ? setMostrarConfirmacaoDescarte(false) : null)}
      >
        <DialogContent className="max-w-sm bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h4 className="font-bold text-sm text-slate-900">Descartar alterações?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              O texto ou o assunto do comunicado foram alterados. Deseja realmente descartar as
              alterações do comunicado e fechar o popup?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMostrarConfirmacaoDescarte(false)}
                className="text-xs h-8"
              >
                Continuar Editando
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmarDescarte}
                className="text-xs h-8"
              >
                Descartar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. POPUP DE CONFIRMAÇÃO: REENVIO COM DUPLICIDADE */}
      <Dialog
        open={mostrarModalDuplicidade}
        onOpenChange={(open) => (!open ? setMostrarModalDuplicidade(false) : null)}
      >
        <DialogContent className="max-w-md bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h4 className="font-bold text-sm text-slate-900">
                Comunicado já enviado para este item
              </h4>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              {itensJaEnviados.map((itemStatus) => (
                <div
                  key={itemStatus.item_chave}
                  className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1"
                >
                  <span className="font-bold text-slate-900 block">
                    Material: {itemStatus.material} | Pedido: {itemStatus.pedido_venda} /{' '}
                    {itemStatus.item_pedido}
                  </span>
                  <p className="text-[11px] text-amber-900">
                    Este item já possui comunicado enviado ao Comercial em{' '}
                    <strong>{itemStatus.ultimo_envio_em || 'data anterior'}</strong> por{' '}
                    <strong>{itemStatus.ultimo_envio_por || 'usuário do PCP'}</strong> (nº{' '}
                    {itemStatus.ultimo_comunicado_numero || 'COM'}).
                  </p>
                </div>
              ))}

              <p className="font-medium text-slate-800 pt-1">Deseja realizar um novo envio?</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMostrarModalDuplicidade(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => handleExecutarEnvio(true)}
                className="text-xs h-8 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold"
              >
                Enviar novamente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EnviarComunicadoComercialModal
