import React, { useState } from 'react'
import {
  FileText,
  Printer,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Building,
  Calendar,
  User,
  ShieldCheck,
  Ban,
  Layers,
  Edit3,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  ChecklistFechamentoItem,
  FechamentoAnaliseIaResultado,
  FechamentoComunicacao,
} from '@/types/checklist-fechamento'
import { formatPtBrNumber } from '@/lib/number-format'

interface Props {
  open: boolean
  onClose: () => void
  execucao: ChecklistFechamentoExecucao | null
  itens: ChecklistFechamentoItem[]
  analiseIa: FechamentoAnaliseIaResultado | null
  onConfirmarFechamento: () => Promise<void>
  onAbrirEnvioEmail: (grupo: 'Contabilidade' | 'Produção') => void
  onSalvarResumoIa: (texto: string) => Promise<void>
  comunicacoes?: FechamentoComunicacao[]
  podeConfirmar: boolean
}

export const FormularioFinalFechamentoModal: React.FC<Props> = ({
  open,
  onClose,
  execucao,
  itens,
  analiseIa,
  onConfirmarFechamento,
  onAbrirEnvioEmail,
  onSalvarResumoIa,
  comunicacoes = [],
  podeConfirmar,
}) => {
  const [resumoEditavel, setResumoEditavel] = useState<string>(
    execucao?.analise_ia_resumo || analiseIa?.texto_resumo_editavel || '',
  )
  const [salvandoResumo, setSalvandoResumo] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  // Atualizar quando mudar analiseIa
  React.useEffect(() => {
    if (execucao?.analise_ia_resumo) {
      setResumoEditavel(execucao.analise_ia_resumo)
    } else if (analiseIa?.texto_resumo_editavel && !resumoEditavel) {
      setResumoEditavel(analiseIa.texto_resumo_editavel)
    }
  }, [execucao?.analise_ia_resumo, analiseIa?.texto_resumo_editavel])

  const totalAnalisado = itens.length
  const totalOk = itens.filter((i) => i.status === 'OK').length
  const totalErro = itens.filter((i) => i.status === 'ERRO').length
  const totalPendente = itens.filter((i) => i.status === 'PENDENTE').length

  const itensObrigatoriosNaoConcluidos = itens.filter(
    (i) => i.obrigatoria && (i.status === 'ERRO' || i.status === 'PENDENTE'),
  )

  const temBloqueioObrigatorio = itensObrigatoriosNaoConcluidos.length > 0
  const isFechado = execucao?.status_geral === 'Fechado'

  const pendenciasLista = itens.filter((i) => i.status === 'ERRO' || i.status === 'PENDENTE')

  // Checagem de comunicações já realizadas
  const envioContabilidadeFeito = comunicacoes.some(
    (c) => c.grupo_destinatario === 'Contabilidade' && c.sucesso,
  )
  const envioProducaoFeito = comunicacoes.some(
    (c) => c.grupo_destinatario === 'Produção' && c.sucesso,
  )

  const handlePrint = () => {
    window.print()
  }

  const handleSalvarTextoIa = async () => {
    setSalvandoResumo(true)
    try {
      await onSalvarResumoIa(resumoEditavel)
    } finally {
      setSalvandoResumo(false)
    }
  }

  const handleConfirmar = async () => {
    setConfirmando(true)
    try {
      await onConfirmarFechamento()
    } finally {
      setConfirmando(false)
    }
  }

  const dataHoraGeracao = new Date().toLocaleString('pt-BR')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho do Formulário */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-[#004C97] text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Formulário Oficial de Fechamento do Controle de Produção
                  {isFechado ? (
                    <Badge className="bg-emerald-500 text-white border-0 text-[11px]">
                      Fechado & Validado
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-400 text-amber-950 border-0 text-[11px]">
                      Em Emissão
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-blue-100">
                  CIAFAL — Relatório consolidado para liberação contábil e operacional
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/30 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Formulário */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-800 flex-1">
          {/* 1. IDENTIFICAÇÃO FORMAL DO FECHAMENTO */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] block">
              1. Identificação do Fechamento
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px]">Competência</span>
                <span className="font-bold text-slate-900 text-sm">
                  {execucao?.competencia || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Empresa</span>
                <span className="font-bold text-slate-900">{execucao?.empresa || 'CIAFAL'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Período</span>
                <span className="font-semibold text-slate-800">
                  {execucao?.mes ? `Mês ${execucao.mes} / ${execucao.ano}` : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Responsável Emissão</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {execucao?.responsavel || 'Controle de Produção'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Data/Hora Geração</span>
                <span className="font-semibold text-slate-800">{dataHoraGeracao}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Data Limite (2º dia útil)</span>
                <span className="font-bold text-[#004C97]">{execucao?.data_limite || '-'}</span>
              </div>
            </div>
          </div>

          {/* 2. RESULTADO DAS ORDENS E ATIVIDADES */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] block">
              2. Resultado das Ordens e Balanço das Atividades
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <span className="text-slate-500 block text-[11px]">Total Analisado</span>
                <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                  {totalAnalisado} atividades
                </span>
                <span className="text-[10px] text-slate-400">
                  {execucao?.total_obrigatorias || 24} obrigatórias
                </span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs">
                <span className="text-emerald-700 block text-[11px] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Fechadas / Concluídas
                </span>
                <span className="text-xl font-bold text-emerald-800 mt-0.5 block">
                  {totalOk} OK ({execucao?.percentual_concluido || 0}%)
                </span>
                <span className="text-[10px] text-emerald-600">
                  Ordens: {execucao?.ordens_fechadas || 0} TECO
                </span>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg shadow-2xs">
                <span className="text-rose-700 block text-[11px] font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Com Erro / Divergência
                </span>
                <span className="text-xl font-bold text-rose-800 mt-0.5 block">{totalErro}</span>
                <span className="text-[10px] text-rose-600">Exige tratamento prévio</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg shadow-2xs">
                <span className="text-amber-700 block text-[11px] font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Pendentes de Conclusão
                </span>
                <span className="text-xl font-bold text-amber-800 mt-0.5 block">
                  {totalPendente}
                </span>
                <span className="text-[10px] text-amber-600">
                  Ordens: {execucao?.ordens_pendentes || 0} abertas
                </span>
              </div>
            </div>
          </div>

          {/* 3. TABELA DE ATIVIDADES DO FECHAMENTO */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] block">
              3. Tabela Consolidada de Atividades
            </span>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-16">Código</th>
                      <th className="p-2">Atividade</th>
                      <th className="p-2 w-24">Status</th>
                      <th className="p-2 w-28">Responsável</th>
                      <th className="p-2 w-24">Data</th>
                      <th className="p-2 w-24">Divergências</th>
                      <th className="p-2">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map((it) => (
                      <tr
                        key={it.id}
                        className={
                          it.status === 'ERRO'
                            ? 'bg-rose-50/40'
                            : it.status === 'PENDENTE'
                              ? 'bg-amber-50/20'
                              : 'hover:bg-slate-50/60'
                        }
                      >
                        <td className="p-2 font-mono font-bold text-slate-800">{it.codigo}</td>
                        <td className="p-2">
                          <span className="font-medium text-slate-900">{it.titulo}</span>
                          {it.obrigatoria && (
                            <span className="ml-1.5 text-[9px] text-rose-600 font-semibold uppercase">
                              [Obrigatória]
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${
                              it.status === 'OK'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : it.status === 'ERRO'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {it.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-slate-600 truncate max-w-[120px]">
                          {it.executado_por || it.responsavel_padrao}
                        </td>
                        <td className="p-2 text-slate-500 text-[10px]">
                          {it.data_hora_execucao
                            ? new Date(it.data_hora_execucao).toLocaleDateString('pt-BR')
                            : '-'}
                        </td>
                        <td className="p-2 text-slate-700">
                          {it.quantidade_divergencias && it.quantidade_divergencias > 0 ? (
                            <span className="text-rose-700 font-bold">
                              {it.quantidade_divergencias}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-2 text-slate-600 text-[11px] truncate max-w-[180px]">
                          {it.observacao || it.acao_corretiva || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. LISTA AUTOMÁTICA DE PENDÊNCIAS (ERRO E PENDENTE) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                4. Lista Automática de Pendências e Erros ({pendenciasLista.length})
              </span>
            </div>

            {pendenciasLista.length === 0 ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Nenhuma pendência ou erro detectado no fechamento da competência.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {pendenciasLista.map((it) => (
                  <div
                    key={it.id}
                    className={`p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                      it.status === 'ERRO'
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-slate-900">{it.codigo}</span>
                      <span className="font-semibold text-slate-900">{it.titulo}</span>
                      {it.obrigatoria && (
                        <Badge className="bg-rose-600 text-white text-[9px] px-1 py-0">
                          Obrigatória
                        </Badge>
                      )}
                      <span className="text-slate-500 text-[11px]">
                        Área: <strong>{it.area_responsavel}</strong> | SAP:{' '}
                        <strong>{it.transacao_sap}</strong>
                      </span>
                    </div>
                    <Badge
                      className={
                        it.status === 'ERRO'
                          ? 'bg-rose-200 text-rose-900 border-rose-300'
                          : 'bg-amber-200 text-amber-900 border-amber-300'
                      }
                    >
                      {it.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. ANÁLISE IA — RESUMO EXECUTIVO EDITÁVEL */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#004C97]" />
                5. Análise IA — Resumo Executivo (Editável antes do Envio)
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSalvarTextoIa}
                disabled={salvandoResumo}
                className="h-7 text-xs border-blue-300 text-[#004C97] hover:bg-blue-100 gap-1"
              >
                <Edit3 className="w-3 h-3" />
                {salvandoResumo ? 'Salvando...' : 'Salvar Edição do Resumo'}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              O responsável pelo fechamento pode ajustar o texto abaixo antes de disparar o
              comunicado oficial para Contabilidade e Produção.
            </p>
            <Textarea
              value={resumoEditavel}
              onChange={(e) => setResumoEditavel(e.target.value)}
              rows={6}
              className="font-mono text-xs bg-white text-slate-900 border-slate-300 focus:border-[#004C97] leading-relaxed"
              placeholder="Resumo executivo do fechamento gerado pela IA..."
            />
          </div>

          {/* 6. DECLARAÇÃO FORMAL OU BLOQUEIO DE FECHAMENTO */}
          {temBloqueioObrigatorio ? (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-start gap-3 text-rose-950 shadow-xs">
              <Ban className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-rose-900">
                  Bloqueio Estrito de Fechamento Ativo
                </h4>
                <p className="text-xs text-rose-800 font-medium leading-relaxed">
                  Existem atividades obrigatórias ainda não concluídas. Regularize as pendências
                  antes de confirmar o fechamento.
                </p>
                <p className="text-[11px] text-rose-700">
                  É permitido gerar o Relatório de Pendências para regularização operacional, mas
                  não a liberação definitiva para a Contabilidade.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-start gap-3 text-emerald-950 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-emerald-900">
                  Declaração Oficial de Conclusão do Fechamento
                </h4>
                <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                  &ldquo;Todos os itens obrigatórios do Check-list de Fechamento foram concluídos e
                  validados. O Controle de Produção concluiu o fechamento da competência e a
                  Contabilidade pode prosseguir com as etapas subsequentes.&rdquo;
                </p>
                <p className="text-[11px] text-emerald-700">
                  Confirmado por:{' '}
                  {execucao?.fechado_por || execucao?.responsavel || 'Controle de Produção'} em{' '}
                  {execucao?.data_fechamento
                    ? new Date(execucao.data_fechamento).toLocaleString('pt-BR')
                    : 'Aguardando confirmação'}
                </p>
              </div>
            </div>
          )}

          {/* 7. ETAPAS DE ENVIO POR GRUPO (CONTABILIDADE E PRODUÇÃO) */}
          {isFechado && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                Etapas de Disparo do Comunicado
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Grupo 1: Contabilidade */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      1º Envio — Grupo Contabilidade
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Liberação oficial para custos, estoques e fechamento contábil
                    </span>
                    <div className="mt-1">
                      {envioContabilidadeFeito ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                          Enviado com sucesso
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700 text-[10px]">Pendente</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onAbrirEnvioEmail('Contabilidade')}
                    className="h-8 text-xs bg-[#004C97] text-white hover:bg-[#003870] gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {envioContabilidadeFeito ? 'Reenviar' : 'Enviar Fechamento'}
                  </Button>
                </div>

                {/* Grupo 2: Produção */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      2º Envio — Grupo Produção
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Aviso de bloqueio de apontamentos e ajustes no período fechado
                    </span>
                    <div className="mt-1">
                      {envioProducaoFeito ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                          Enviado com sucesso
                        </Badge>
                      ) : !envioContabilidadeFeito ? (
                        <Badge className="bg-slate-100 text-slate-500 text-[10px]">
                          Aguardando envio Contabilidade
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-[#004C97] text-[10px]">Disponível</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={envioContabilidadeFeito ? 'default' : 'outline'}
                    disabled={!envioContabilidadeFeito}
                    onClick={() => onAbrirEnvioEmail('Produção')}
                    className={`h-8 text-xs gap-1.5 ${
                      envioContabilidadeFeito
                        ? 'bg-slate-800 text-white hover:bg-slate-900'
                        : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {envioProducaoFeito ? 'Reenviar' : 'Avisar Produção'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações de Confirmação */}
        <DialogFooter className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs"
          >
            Voltar
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {!isFechado && (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmar}
                disabled={temBloqueioObrigatorio || !podeConfirmar || confirmando}
                className={`h-8 text-xs font-semibold gap-1.5 ${
                  temBloqueioObrigatorio
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {confirmando ? 'Confirmando...' : 'Confirmar Fechamento'}
              </Button>
            )}

            {isFechado && (
              <Button
                type="button"
                size="sm"
                onClick={() => onAbrirEnvioEmail('Contabilidade')}
                className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-medium"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar Fechamento
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default FormularioFinalFechamentoModal
