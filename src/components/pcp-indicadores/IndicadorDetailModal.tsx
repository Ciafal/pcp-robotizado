import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bot,
  TrendingUp,
  AlertTriangle,
  History,
  Settings2,
  Calendar,
  Building2,
  Layers,
  Database,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
} from 'lucide-react'
import {
  IndicadorMatrizLinha,
  ComparacaoRegra,
  SentidoIndicador,
  formatarValorPtBr,
  pcpIndicadoresService,
  IndicadorHistoricoLog,
  AnaliseDesvioRecord,
  Acao5W2HRecord,
} from '@/services/pcp-indicadores-service'
import { GraficoIndividualModal } from './GraficoIndividualModal'
import { GerarAnaliseAcaoModal } from './GerarAnaliseAcaoModal'
import { toast } from '@/hooks/use-toast'

interface IndicadorDetailModalProps {
  open: boolean
  onClose: () => void
  linha: IndicadorMatrizLinha | null
  ano: number
  empresaFiltro?: string
  linhaFiltro?: string
  centroFiltro?: string
  onSalvarMeta?: () => void
}

export const IndicadorDetailModal: React.FC<IndicadorDetailModalProps> = ({
  open,
  onClose,
  linha,
  ano,
  empresaFiltro,
  linhaFiltro,
  centroFiltro,
  onSalvarMeta,
}) => {
  const [activeTab, setActiveTab] = useState<
    'visao' | 'grafico' | 'ia' | 'analise_acoes' | 'metas' | 'historico'
  >('visao')
  const [salvandoMeta, setSalvandoMeta] = useState(false)
  const [novaMeta, setNovaMeta] = useState<number>(0)
  const [novaRegra, setNovaRegra] = useState<ComparacaoRegra>('>=')
  const [novoSentido, setNovoSentido] = useState<SentidoIndicador>('MAIOR_MELHOR')
  const [justificativa, setJustificativa] = useState('')
  const [historicoLogs, setHistoricoLogs] = useState<IndicadorHistoricoLog[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Modais de Ação Avançada
  const [openGraficoIndividual, setOpenGraficoIndividual] = useState(false)
  const [openWorkflowAnalise, setOpenWorkflowAnalise] = useState(false)

  // Lista de análises e ações do indicador para a aba "Análise de Causa & Ações"
  const [analisesDoIndicador, setAnalisesDoIndicador] = useState<AnaliseDesvioRecord[]>([])
  const [acoesDoIndicador, setAcoesDoIndicador] = useState<Acao5W2HRecord[]>([])
  const [carregandoAcoes, setCarregandoAcoes] = useState(false)

  // Ao abrir ou alterar indicador selecionado, carrega estado de edição e histórico
  React.useEffect(() => {
    if (linha && open) {
      setNovaMeta(linha.indicador.meta)
      setNovaRegra(linha.indicador.regra_comparacao)
      setNovoSentido(linha.indicador.sentido_indicador || 'MAIOR_MELHOR')
      setJustificativa('')
      carregarHistorico(linha.indicador.codigo)
      carregarAnalisesEAcoes(linha.indicador.codigo)
    }
  }, [linha, open])

  const carregarAnalisesEAcoes = async (codigo: string) => {
    setCarregandoAcoes(true)
    try {
      const [analises, acoes] = await Promise.all([
        pcpIndicadoresService.listarAnalisesPorIndicador(codigo, ano),
        pcpIndicadoresService.listarTodasAcoes({ indicadorCodigo: codigo, exercicio: ano }),
      ])
      setAnalisesDoIndicador(analises)
      setAcoesDoIndicador(acoes)
    } finally {
      setCarregandoAcoes(false)
    }
  }

  const carregarHistorico = async (codigo: string) => {
    setCarregandoHistorico(true)
    try {
      const logs = await pcpIndicadoresService.listarHistoricoMetas(codigo)
      setHistoricoLogs(logs)
    } finally {
      setCarregandoHistorico(false)
    }
  }

  if (!linha) return null

  const ind = linha.indicador
  const mesesComDados = linha.meses.filter((m) => m.temDados)
  const mesesFora = linha.meses.filter((m) => m.status === 'FORA_DA_META')
  const mesesAtingidos = linha.meses.filter((m) => m.status === 'ATINGIDA')

  // Gera a análise de IA baseada nos dados calculados reais
  const analiseIA = pcpIndicadoresService.gerarAnaliseIA(linha, ano, empresaFiltro, linhaFiltro)

  const handleSalvarNovaMeta = async () => {
    if (!justificativa.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Informe a justificativa técnica para alteração de meta na governança PCP.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSalvandoMeta(true)
      await pcpIndicadoresService.atualizarMetaIndicador({
        indicadorId: ind.id,
        metaNova: Number(novaMeta),
        regraNova: novaRegra,
        sentidoNovo: novoSentido,
        justificativa: justificativa.trim(),
      })
      toast({
        title: 'Meta atualizada com sucesso',
        description: `Nova meta ${novaRegra} ${novaMeta} ${ind.unidade} registrada no pcp_audit_logs.`,
      })

      await carregarHistorico(ind.codigo)
      if (onSalvarMeta) onSalvarMeta()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar meta',
        description: err.message || 'Falha na comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoMeta(false)
    }
  }

  // Encontra valor máximo para escala do gráfico CSS Meta x Realizado
  const valoresValidos = [
    ind.meta,
    ...linha.meses.filter((m) => m.realizado !== null).map((m) => m.realizado as number),
  ]
  const maxVal = Math.max(...valoresValidos, 1)

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xl">
        {/* Cabeçalho Institucional Ciafal */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-[#004C97] border border-blue-200">
                  {ind.codigo}
                </span>
                <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-300">
                  {ind.tipo_indicador}
                </Badge>
                <span className="text-xs text-slate-500 font-mono">Exercício {ano}</span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {ind.nome}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                {ind.descricao ||
                  'Detalhamento mensal, rastreabilidade de metas e inteligência operacional PCP.'}
              </DialogDescription>
            </div>

            {/* Resumo da Regra & Meta + Botões Principais */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setOpenGraficoIndividual(true)}
                  className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-semibold shadow-xs gap-1.5 h-8"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Gráfico Individual
                </Button>
                <Button
                  size="sm"
                  onClick={() => setOpenWorkflowAnalise(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs gap-1.5 h-8"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Gerar Análise e Ação
                </Button>
              </div>

              <div className="flex items-center gap-2 text-right">
                <div className="bg-white border border-slate-200 rounded p-2 px-3 shadow-2xs">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Meta Vigente
                  </div>
                  <div className="text-sm font-bold text-[#004C97]">
                    {ind.regra_comparacao} {formatarValorPtBr(ind.meta, ind.unidade)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2 px-3 shadow-2xs">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Média / Acumulado
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {formatarValorPtBr(linha.mediaOuAcumuladoAno, ind.unidade)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Abas do Modal */}
        <Tabs
          value={activeTab}
          onValueChange={(v: any) => setActiveTab(v)}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="px-4 border-b border-slate-200 bg-white shrink-0">
            <TabsList className="bg-transparent h-10 p-0 gap-4 border-b-0">
              <TabsTrigger
                value="visao"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#004C97] data-[state=active]:text-[#004C97] rounded-none px-2 py-2 text-xs font-semibold"
              >
                Visão & Contexto
              </TabsTrigger>
              <TabsTrigger
                value="grafico"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#004C97] data-[state=active]:text-[#004C97] rounded-none px-2 py-2 text-xs font-semibold"
              >
                Gráfico Meta x Realizado
              </TabsTrigger>
              <TabsTrigger
                value="ia"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#004C97] data-[state=active]:text-[#004C97] rounded-none px-2 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5 text-[#004C97]" />
                Análise IA PCP
              </TabsTrigger>
              <TabsTrigger
                value="analise_acoes"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#004C97] data-[state=active]:text-[#004C97] rounded-none px-2 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Análise de Causa & Ações ({acoesDoIndicador.length})
              </TabsTrigger>
              <TabsTrigger
                value="metas"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#004C97] data-[state=active]:text-[#004C97] rounded-none px-2 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Editar Metas & Regras
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#004C97] data-[state=active]:text-[#004C97] rounded-none px-2 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                Histórico de Metas
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* ABA 1: Visão & Contexto */}
            <TabsContent value="visao" className="mt-0 space-y-4">
              {/* Cards de Métricas do Exercício */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border border-slate-200 shadow-2xs">
                  <CardContent className="p-3">
                    <span className="text-[11px] text-slate-500 font-medium">Meses com Dados</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {mesesComDados.length} / 12
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                  <CardContent className="p-3">
                    <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Meses na Meta
                    </span>
                    <div className="text-lg font-bold text-emerald-700 mt-1">
                      {mesesAtingidos.length}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-rose-200 bg-rose-50/40 shadow-2xs">
                  <CardContent className="p-3">
                    <span className="text-[11px] text-rose-800 font-medium flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Meses Fora da Meta
                    </span>
                    <div className="text-lg font-bold text-rose-700 mt-1">{mesesFora.length}</div>
                  </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-2xs">
                  <CardContent className="p-3">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Status Consolidado
                    </span>
                    <div className="mt-1">
                      {linha.statusConsolidadoAno === 'ATINGIDA' && (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[11px]">
                          Meta Atingida
                        </Badge>
                      )}
                      {linha.statusConsolidadoAno === 'FORA_DA_META' && (
                        <Badge className="bg-rose-600 text-white hover:bg-rose-600 text-[11px]">
                          Fora da Meta
                        </Badge>
                      )}
                      {linha.statusConsolidadoAno === 'PENDENTE_SEM_DADOS' && (
                        <Badge variant="outline" className="text-slate-600 text-[11px]">
                          Sem dados
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela do Histórico Mensal Jan-Dez com Desvios */}
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Consolidação Mensal — Jan a Dez/{ano}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Regra: {ind.regra_comparacao} {formatarValorPtBr(ind.meta, ind.unidade)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-semibold">
                        <th className="p-2.5">Mês</th>
                        <th className="p-2.5 text-right">Meta</th>
                        <th className="p-2.5 text-right">Realizado</th>
                        <th className="p-2.5 text-right">Desvio Absoluto</th>
                        <th className="p-2.5 text-right">Desvio %</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linha.meses.map((m) => (
                        <tr
                          key={m.mesIndex}
                          className={
                            m.status === 'ATINGIDA'
                              ? 'bg-emerald-50/20'
                              : m.status === 'FORA_DA_META'
                                ? 'bg-rose-50/20'
                                : ''
                          }
                        >
                          <td className="p-2.5 font-medium text-slate-900">{m.mesNomeLongo}</td>
                          <td className="p-2.5 text-right font-mono text-slate-600">
                            {formatarValorPtBr(ind.meta, ind.unidade)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {formatarValorPtBr(m.realizado, ind.unidade)}
                          </td>
                          <td
                            className={`p-2.5 text-right font-mono ${
                              (m.desvioAbsoluto || 0) < 0
                                ? ind.regra_comparacao === '>='
                                  ? 'text-rose-600 font-bold'
                                  : 'text-emerald-700 font-bold'
                                : (m.desvioAbsoluto || 0) > 0
                                  ? ind.regra_comparacao === '<='
                                    ? 'text-rose-600 font-bold'
                                    : 'text-emerald-700 font-bold'
                                  : 'text-slate-500'
                            }`}
                          >
                            {m.desvioAbsoluto !== null
                              ? `${m.desvioAbsoluto > 0 ? '+' : ''}${formatarValorPtBr(m.desvioAbsoluto, ind.unidade)}`
                              : '—'}
                          </td>
                          <td
                            className={`p-2.5 text-right font-mono ${
                              (m.desvioPercentual || 0) < 0
                                ? ind.regra_comparacao === '>='
                                  ? 'text-rose-600'
                                  : 'text-emerald-700'
                                : (m.desvioPercentual || 0) > 0
                                  ? ind.regra_comparacao === '<='
                                    ? 'text-rose-600'
                                    : 'text-emerald-700'
                                  : 'text-slate-500'
                            }`}
                          >
                            {m.desvioPercentual !== null
                              ? `${m.desvioPercentual > 0 ? '+' : ''}${formatarValorPtBr(m.desvioPercentual, '%')}`
                              : '—'}
                          </td>
                          <td className="p-2.5 text-center">
                            {m.status === 'ATINGIDA' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Atingida
                              </span>
                            )}
                            {m.status === 'FORA_DA_META' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                Fora da Meta
                              </span>
                            )}
                            {m.status === 'PENDENTE_SEM_DADOS' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Sem dados
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Metadados e Rastreabilidade do Indicador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Database className="w-3.5 h-3.5 text-[#004C97]" />
                    <span className="font-semibold">Fonte dos Dados:</span>
                    <span className="text-slate-600">
                      {ind.fonte_dados_descricao || ind.fonte_dados_tipo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-[#004C97]" />
                    <span className="font-semibold">Empresa / Centro:</span>
                    <span className="text-slate-600">
                      {empresaFiltro || ind.empresa || 'Todas'} •{' '}
                      {centroFiltro || ind.centro || 'Todos'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Layers className="w-3.5 h-3.5 text-[#004C97]" />
                    <span className="font-semibold">Linha Relacionada:</span>
                    <span className="text-slate-600">{linhaFiltro || ind.linha || 'Todas'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-[#004C97]" />
                    <span className="font-semibold">Última Atualização:</span>
                    <span className="text-slate-600">
                      {ind.updated
                        ? new Date(ind.updated).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recente'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: Gráfico Meta x Realizado */}
            <TabsContent value="grafico" className="mt-0 space-y-4">
              <Card className="border border-slate-200 bg-white">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase">
                        Comparativo Visual — Meta x Realizado Mensal
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Linha pontilhada azul indica a meta (
                        {formatarValorPtBr(ind.meta, ind.unidade)}).
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-xs bg-[#004C97]" />
                        <span className="text-slate-600">Meta</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                        <span className="text-slate-600">Dentro da Meta</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-xs bg-rose-500" />
                        <span className="text-slate-600">Fora da Meta</span>
                      </div>
                    </div>
                  </div>

                  {/* Barras Horizontais por Mês */}
                  <div className="space-y-2.5">
                    {linha.meses.map((m) => {
                      const percMeta = Math.min(100, (ind.meta / maxVal) * 100)
                      const percReal =
                        m.realizado !== null ? Math.min(100, (m.realizado / maxVal) * 100) : 0

                      return (
                        <div key={m.mesIndex} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 w-10">
                              {m.mesNomeCurto}
                            </span>
                            <span className="font-mono text-slate-900 font-semibold">
                              {formatarValorPtBr(m.realizado, ind.unidade)}
                            </span>
                          </div>

                          <div className="relative w-full h-4 bg-slate-100 rounded overflow-hidden">
                            {/* Linha de referência da meta */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-[#004C97] z-10"
                              style={{ left: `${percMeta}%` }}
                              title={`Meta: ${ind.meta}`}
                            />

                            {/* Barra do Realizado */}
                            {m.temDados && (
                              <div
                                className={`h-full rounded transition-all duration-300 ${
                                  m.status === 'ATINGIDA' ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${percReal}%` }}
                              />
                            )}

                            {!m.temDados && (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 italic">
                                Sem dados
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 3: Análise de IA */}
            <TabsContent value="ia" className="mt-0 space-y-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-md text-xs text-blue-900 flex items-start gap-2.5">
                <Bot className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Diretriz de IA do PCP Robotizado:</span> A IA apoia a
                  análise operacional diagnóstica a partir dos dados reais calculados e consolidados
                  no sistema. Ela não altera valores oficiais, metas contratuais ou regras de
                  programação.
                </div>
              </div>

              <div className="space-y-3">
                {/* 1. Situação Atual */}
                <Card className="border border-slate-200">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#004C97]" />
                      <span>1. Situação Atual Consolidada</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {analiseIA.situacaoAtual}
                    </p>
                  </CardContent>
                </Card>

                {/* 2. Principais Desvios */}
                <Card className="border border-slate-200">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>2. Principais Desvios Identificados</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {analiseIA.principaisDesvios}
                    </p>
                  </CardContent>
                </Card>

                {/* 3. Tendência */}
                <Card className="border border-slate-200">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                      <span>3. Trajetória & Tendência Recente</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{analiseIA.tendencia}</p>
                  </CardContent>
                </Card>

                {/* 4. Possíveis Causas */}
                <Card className="border border-slate-200">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                      <span>4. Possíveis Causas Operacionais</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {analiseIA.possiveisCausas}
                    </p>
                  </CardContent>
                </Card>

                {/* 5. Pontos que Exigem Atenção do PCP */}
                <Card className="border border-rose-200 bg-rose-50/30">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>5. Pontos que Exigem Atenção Imediata do PCP</span>
                    </div>
                    <p className="text-xs text-rose-950 leading-relaxed font-medium">
                      {analiseIA.pontosAtencaoPcp}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ABA NOVA: Análise de Causa & Ações */}
            <TabsContent value="analise_acoes" className="mt-0 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Planos de Ação 5W2H e Análises Vinculadas
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Rastreabilidade completa de causas raízes investigadas e eficácia apurada.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setOpenWorkflowAnalise(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5" />+ Nova Análise / Ação
                </Button>
              </div>

              {carregandoAcoes ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Carregando ações e análises...
                </div>
              ) : acoesDoIndicador.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-md">
                  Nenhuma ação corretiva registrada para este indicador no exercício {ano}. Clique
                  em &quot;+ Nova Análise / Ação&quot; para iniciar o fluxo de resolução de desvio.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Código / Ação (What)</th>
                        <th className="p-2.5">Causa Raiz</th>
                        <th className="p-2.5">Responsável</th>
                        <th className="p-2.5">Prazo</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Eficácia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {acoesDoIndicador.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-medium">
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {act.codigo}
                            </span>
                            {act.what_acao}
                          </td>
                          <td className="p-2.5 text-slate-600 max-w-[200px] truncate">
                            {act.causa_raiz_vinculada || '—'}
                          </td>
                          <td className="p-2.5 text-slate-700">{act.who_responsavel_nome}</td>
                          <td className="p-2.5 font-mono">
                            {act.when_prazo
                              ? new Date(act.when_prazo).toLocaleDateString('pt-BR')
                              : '—'}
                          </td>
                          <td className="p-2.5">
                            <Badge
                              className={`text-[10px] ${
                                act.status === 'CONCLUIDA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : act.status === 'ATRASADA'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {act.status}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                act.situacao_eficacia === 'EFICAZ'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : act.situacao_eficacia === 'INEFICAZ'
                                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                                    : 'bg-slate-50 text-slate-600'
                              }`}
                            >
                              {act.situacao_eficacia || 'Aguardando'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ABA 4: Editar Metas & Regras (Governança & Auditoria) */}
            <TabsContent value="metas" className="mt-0 space-y-4">
              <Card className="border border-slate-200">
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase">
                      Alteração de Meta Oficial & Regra de Comparação
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Toda alteração de meta é auditada e gravada no log de governança com usuário,
                      data/hora e justificativa.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Sentido Operacional
                      </Label>
                      <Select value={novoSentido} onValueChange={(val: any) => setNovoSentido(val)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Sentido" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAIOR_MELHOR" className="text-xs">
                            Maior é melhor (ex: Cumprimento, OEE)
                          </SelectItem>
                          <SelectItem value="MENOR_MELHOR" className="text-xs">
                            Menor é melhor (ex: Setup, Falta MP)
                          </SelectItem>
                          <SelectItem value="FAIXA_ACEITAVEL" className="text-xs">
                            Faixa aceitável (tolerância mínima/máxima)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Regra de Comparação
                      </Label>
                      <Select value={novaRegra} onValueChange={(val: any) => setNovaRegra(val)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Selecione a regra" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">=" className="text-xs">
                            &gt;= (Maior ou Igual)
                          </SelectItem>
                          <SelectItem value="<=" className="text-xs">
                            &lt;= (Menor ou Igual)
                          </SelectItem>
                          <SelectItem value="=" className="text-xs">
                            = (Igual / Faixa)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Novo Valor de Meta ({ind.unidade})
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={novaMeta}
                        onChange={(e) => setNovaMeta(Number(e.target.value))}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Justificativa Técnica da Alteração <span className="text-rose-500">*</span>
                    </Label>
                    <textarea
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      placeholder="Ex: Revisão de meta aprovada no comitê operacional S&OP de Outubro/2026..."
                      rows={3}
                      className="w-full text-xs p-2.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSalvarNovaMeta}
                      disabled={salvandoMeta}
                      className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-semibold h-9 px-4"
                    >
                      {salvandoMeta ? 'Gravando no Log...' : 'Salvar Alteração de Meta'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 5: Histórico de Alterações de Metas */}
            <TabsContent value="historico" className="mt-0 space-y-4">
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Trilha de Auditoria Imutável — Metas de {ind.codigo}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {historicoLogs.length} alterações registradas
                  </span>
                </div>

                {carregandoHistorico ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Carregando histórico do servidor...
                  </div>
                ) : historicoLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 italic">
                    Nenhuma alteração de meta registrada até o momento. A meta inicial foi
                    cadastrada na inicialização do sistema.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {historicoLogs.map((log) => (
                      <div key={log.id} className="p-3.5 hover:bg-slate-50/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {log.usuario_nome || 'Programador PCP'} ({log.usuario_email || '—'})
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {new Date(log.created).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="text-slate-700">
                          Meta:{' '}
                          <span className="font-mono">
                            {log.regra_anterior} {log.meta_anterior}
                          </span>{' '}
                          &rarr;{' '}
                          <span className="font-mono font-bold text-[#004C97]">
                            {log.regra_nova} {log.meta_nova} {ind.unidade}
                          </span>
                        </div>
                        {log.justificativa && (
                          <div className="text-slate-500 text-[11px] italic">
                            Motivo: {log.justificativa}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Rodapé do Modal */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs text-slate-700">
            Fechar Detalhamento
          </Button>
        </div>
      </DialogContent>

      {/* Modal Gráfico Individual (90-95% da tela) */}
      <GraficoIndividualModal
        isOpen={openGraficoIndividual}
        onClose={() => setOpenGraficoIndividual(false)}
        linha={linha}
        anoExercicio={ano}
      />

      {/* Modal Workflow Gerar Análise e Ação (8 etapas) */}
      <GerarAnaliseAcaoModal
        isOpen={openWorkflowAnalise}
        onClose={() => setOpenWorkflowAnalise(false)}
        linha={linha}
        anoExercicio={ano}
        onSuccess={() => {
          if (linha) carregarAnalisesEAcoes(linha.indicador.codigo)
        }}
      />
    </Dialog>
  )
}
export default IndicadorDetailModal
