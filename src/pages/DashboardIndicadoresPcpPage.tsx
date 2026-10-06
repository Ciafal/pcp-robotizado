import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import {
  IndicadorMatrizLinha,
  Acao5W2HRecord,
  pcpIndicadoresService,
  formatarValorPtBr,
  MESES_ANO,
} from '@/services/pcp-indicadores-service'
import { IndicadorDetailModal } from '@/components/pcp-indicadores/IndicadorDetailModal'
import {
  LayoutDashboard,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ListChecks,
  Clock,
  ShieldCheck,
  RefreshCw,
  Bell,
  Layers,
  ChevronRight,
} from 'lucide-react'

export const DashboardIndicadoresPcpPage: React.FC = () => {
  // Filtros Globais
  const [exercicio, setExercicio] = useState<number>(2026)
  const [empresa, setEmpresa] = useState<string>('TODAS')
  const [linhaFiltro, setLinhaFiltro] = useState<string>('TODAS')
  const [centroFiltro, setCentroFiltro] = useState<string>('TODOS')
  const [tipoIndicador, setTipoIndicador] = useState<string>('TODOS')
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS')
  const [responsavelFiltro, setResponsavelFiltro] = useState<string>('TODOS')

  // Estado dos Dados
  const [linhas, setLinhas] = useState<IndicadorMatrizLinha[]>([])
  const [acoes, setAcoes] = useState<Acao5W2HRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Modal de Detalhe Individual do Indicador
  const [linhaSelecionada, setLinhaSelecionada] = useState<IndicadorMatrizLinha | null>(null)
  const [modalDetalheAberto, setModalDetalheAberto] = useState<boolean>(false)

  // Carregar dados reais consolidados
  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [matriz, listaAcoes] = await Promise.all([
        pcpIndicadoresService.calcularMatrizAnual({
          ano: exercicio,
          empresa: empresa !== 'TODAS' ? empresa : '',
          linha: linhaFiltro !== 'TODAS' ? linhaFiltro : '',
          centro: centroFiltro !== 'TODOS' ? centroFiltro : '',
          tipoIndicador: tipoIndicador !== 'TODOS' ? tipoIndicador : '',
          status: 'TODOS',
        }),
        pcpIndicadoresService.listarTodasAcoes({
          exercicio,
          linha: linhaFiltro !== 'TODAS' ? linhaFiltro : undefined,
          centro: centroFiltro !== 'TODOS' ? centroFiltro : undefined,
        }),
      ])

      // Filtro em memória de status se necessário
      let matrizFiltrada = matriz
      if (statusFiltro === 'ATINGIDA') {
        matrizFiltrada = matriz.filter((m) => m.statusConsolidadoAno === 'ATINGIDA')
      } else if (statusFiltro === 'FORA_DA_META') {
        matrizFiltrada = matriz.filter((m) => m.statusConsolidadoAno === 'FORA_DA_META')
      } else if (statusFiltro === 'SEM_DADOS') {
        matrizFiltrada = matriz.filter((m) => m.statusConsolidadoAno === 'PENDENTE_SEM_DADOS')
      }

      setLinhas(matrizFiltrada)
      setAcoes(listaAcoes)
    } finally {
      setLoading(false)
    }
  }, [exercicio, empresa, linhaFiltro, centroFiltro, tipoIndicador, statusFiltro])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Métricas Executivas dos Cards Superiores
  const metricasExecutivas = useMemo(() => {
    const totalMonitorados = linhas.length
    let naMeta = 0
    let foraMeta = 0
    let tendenciaNegativa = 0

    linhas.forEach((l) => {
      if (l.statusConsolidadoAno === 'ATINGIDA') naMeta++
      if (l.statusConsolidadoAno === 'FORA_DA_META') foraMeta++
      if (l.tendencia === 'PIORANDO') tendenciaNegativa++
    })

    const percNaMeta = totalMonitorados > 0 ? ((naMeta / totalMonitorados) * 100).toFixed(1) : '0,0'
    const percForaMeta =
      totalMonitorados > 0 ? ((foraMeta / totalMonitorados) * 100).toFixed(1) : '0,0'

    // Ações
    const acoesAbertas = acoes.filter(
      (a) => a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA',
    ).length
    const acoesAtrasadas = acoes.filter((a) => a.status === 'ATRASADA' || a.isAtrasada).length
    const acoesConcluidas = acoes.filter((a) => a.status === 'CONCLUIDA')
    const acoesEficazes = acoes.filter((a) => a.situacao_eficacia === 'EFICAZ').length
    const percEficacia =
      acoesConcluidas.length > 0 ? ((acoesEficazes / acoesConcluidas.length) * 100).toFixed(1) : '—'

    return {
      totalMonitorados,
      naMeta,
      percNaMeta,
      foraMeta,
      percForaMeta,
      tendenciaNegativa,
      acoesAbertas,
      acoesAtrasadas,
      percEficacia,
    }
  }, [linhas, acoes])

  // Gráfico 1: Indicadores por Status (Donut)
  const chartStatusData = useMemo(() => {
    let atingida = 0
    let fora = 0
    let semDados = 0

    linhas.forEach((l) => {
      if (l.statusConsolidadoAno === 'ATINGIDA') atingida++
      else if (l.statusConsolidadoAno === 'FORA_DA_META') fora++
      else semDados++
    })

    return [
      { name: 'Na Meta', value: atingida, color: '#10b981' },
      { name: 'Fora da Meta', value: fora, color: '#ef4444' },
      { name: 'Sem Dados', value: semDados, color: '#94a3b8' },
    ]
  }, [linhas])

  // Gráfico 2: Ranking de Desvios respeitando sentido do indicador
  const chartDesviosData = useMemo(() => {
    return linhas
      .filter((l) => l.desvioAtual !== null)
      .map((l) => {
        let desvioSeveridade = l.desvioAtual || 0
        // Se maior é melhor e desvio negativo => abaixo da meta
        // Se menor é melhor e desvio positivo => acima da meta (pior)
        let isDesfavoravel = false
        if (l.indicador.sentido_indicador === 'MENOR_MELHOR') {
          isDesfavoravel = desvioSeveridade > 0
        } else {
          isDesfavoravel = desvioSeveridade < 0
        }
        return {
          nome: l.indicador.nome.slice(0, 22),
          desvio: Number(desvioSeveridade.toFixed(1)),
          isDesfavoravel,
        }
      })
      .sort((a, b) => (a.isDesfavoravel === b.isDesfavoravel ? 0 : a.isDesfavoravel ? -1 : 1))
      .slice(0, 8)
  }, [linhas])

  // Gráfico 3: Evolução Geral Mensal (% Indicadores na Meta de Jan a Dez)
  const chartEvolucaoMensal = useMemo(() => {
    return MESES_ANO.map((mes) => {
      let totalComDados = 0
      let totalNaMeta = 0
      linhas.forEach((l) => {
        const m = l.meses[mes.index]
        if (m && m.temDados) {
          totalComDados++
          if (m.status === 'ATINGIDA') totalNaMeta++
        }
      })

      const percAtingimento =
        totalComDados > 0 ? Number(((totalNaMeta / totalComDados) * 100).toFixed(1)) : null

      return {
        mes: mes.curto,
        atingimento: percAtingimento,
        totalComDados,
      }
    })
  }, [linhas])

  // Gráfico 5: Tendências (Melhorando / Estáveis / Piorando)
  const chartTendenciasData = useMemo(() => {
    let melhorando = 0
    let estavel = 0
    let piorando = 0

    linhas.forEach((l) => {
      if (l.tendencia === 'MELHORANDO') melhorando++
      else if (l.tendencia === 'PIORANDO') piorando++
      else estavel++
    })

    return [
      { name: 'Melhorando', total: melhorando, fill: '#10b981' },
      { name: 'Estável', total: estavel, fill: '#f59e0b' },
      { name: 'Piorando', total: piorando, fill: '#ef4444' },
    ]
  }, [linhas])

  // Gráfico 6: Ações por Status
  const chartAcoesStatusData = useMemo(() => {
    let naoIniciadas = 0
    let emAndamento = 0
    let atrasadas = 0
    let concluidas = 0

    acoes.forEach((a) => {
      if (a.status === 'CONCLUIDA') concluidas++
      else if (a.status === 'ATRASADA' || a.isAtrasada) atrasadas++
      else if (a.status === 'EM_ANDAMENTO') emAndamento++
      else naoIniciadas++
    })

    return [
      { name: 'Não Iniciadas', total: naoIniciadas, fill: '#64748b' },
      { name: 'Em Andamento', total: emAndamento, fill: '#3b82f6' },
      { name: 'Atrasadas', total: atrasadas, fill: '#ef4444' },
      { name: 'Concluídas', total: concluidas, fill: '#10b981' },
    ]
  }, [acoes])

  // Alertas Automáticos Explicativos e Específicos
  const alertasExplicativos = useMemo(() => {
    const list: Array<{ id: string; tipo: 'CRITICO' | 'ALERTA' | 'INFO'; mensagem: string }> = []

    linhas.forEach((l) => {
      // 1. Fora da meta e projeção abaixo
      if (l.statusConsolidadoAno === 'FORA_DA_META') {
        const acoesInd = acoes.filter((a) => a.indicador_codigo === l.indicador.codigo)
        const atrasadas = acoesInd.filter((a) => a.status === 'ATRASADA' || a.isAtrasada).length

        let texto = `${l.indicador.nome} apresenta desvio acumulado no exercício de ${exercicio}.`
        if (l.projecaoDezembro !== null) {
          texto += ` Projeção de fechamento em ${formatarValorPtBr(l.projecaoDezembro, l.indicador.unidade)} (Meta: ${formatarValorPtBr(l.indicador.meta, l.indicador.unidade)}).`
        }
        if (acoesInd.length > 0) {
          texto += ` Existem ${acoesInd.length} ação(ões) vinculada(s)${atrasadas > 0 ? `, sendo ${atrasadas} atrasada(s)` : ''}.`
        } else {
          texto += ` Nenhuma ação corretiva 5W2H foi aberta ainda.`
        }

        list.push({
          id: `alerta-${l.indicador.codigo}-meta`,
          tipo: atrasadas > 0 || acoesInd.length === 0 ? 'CRITICO' : 'ALERTA',
          mensagem: texto,
        })
      }

      // 2. Tendência Deteriorando
      if (l.tendencia === 'PIORANDO' && l.statusConsolidadoAno !== 'FORA_DA_META') {
        list.push({
          id: `alerta-${l.indicador.codigo}-tendencia`,
          tipo: 'ALERTA',
          mensagem: `${l.indicador.nome} registrou inflexão negativa no desempenho dos últimos meses, exigindo monitoramento preventivo.`,
        })
      }
    })

    // 3. Ações Concluídas aguardando eficácia
    const aguardandoEficacia = acoes.filter(
      (a) =>
        a.status === 'CONCLUIDA' &&
        (!a.situacao_eficacia || a.situacao_eficacia === 'AGUARDANDO_AVALIACAO'),
    )
    if (aguardandoEficacia.length > 0) {
      list.push({
        id: 'alerta-eficacia',
        tipo: 'INFO',
        mensagem: `Existem ${aguardandoEficacia.length} ações concluídas aguardando verificação de eficácia após o período de maturação operacional.`,
      })
    }

    return list
  }, [linhas, acoes, exercicio])

  // Abrir detalhamento do indicador
  const handleAbrirDetalhe = (linha: IndicadorMatrizLinha) => {
    setLinhaSelecionada(linha)
    setModalDetalheAberto(true)
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-[#004C97] dark:bg-blue-950 dark:text-blue-300">
              PCP Robotizado • Performance Industrial
            </span>
            <Badge variant="outline" className="text-xs">
              Exercício {exercicio}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#004C97] dark:text-blue-400" />
            Dashboard de Indicadores PCP
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visão executiva integrada com 100% dos dados reais do chão de fábrica, tendências,
            ranking de desvios e governança de eficácia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recarregar Dados
          </Button>
        </div>
      </div>

      {/* Filtros Superiores Executivos */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            <div>
              <Label className="text-[11px] text-slate-500">Exercício</Label>
              <Select value={exercicio.toString()} onValueChange={(v) => setExercicio(Number(v))}>
                <SelectTrigger className="mt-1 h-8 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Linha de Produção</Label>
              <Select value={linhaFiltro} onValueChange={setLinhaFiltro}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as Linhas</SelectItem>
                  <SelectItem value="L1">L1 — Laminação 1</SelectItem>
                  <SelectItem value="L2">L2 — Laminação 2</SelectItem>
                  <SelectItem value="TCC">TCC — Tratamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Centro de Trabalho</Label>
              <Select value={centroFiltro} onValueChange={setCentroFiltro}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Centros</SelectItem>
                  <SelectItem value="LAM">LAM — Laminação</SelectItem>
                  <SelectItem value="PREP">PREP — Preparação</SelectItem>
                  <SelectItem value="ACAB">ACAB — Acabamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Tipo de Indicador</Label>
              <Select value={tipoIndicador} onValueChange={setTipoIndicador}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Tipos</SelectItem>
                  <SelectItem value="PROGRAMACAO">Programação</SelectItem>
                  <SelectItem value="EFICIENCIA">Eficiência</SelectItem>
                  <SelectItem value="CARTEIRA">Carteira</SelectItem>
                  <SelectItem value="CAPACIDADE">Capacidade</SelectItem>
                  <SelectItem value="MATERIA_PRIMA">Matéria-Prima</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Status Consolidado</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="ATINGIDA">Na Meta</SelectItem>
                  <SelectItem value="FORA_DA_META">Fora da Meta</SelectItem>
                  <SelectItem value="SEM_DADOS">Sem Dados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2 flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLinhaFiltro('TODAS')
                  setCentroFiltro('TODOS')
                  setTipoIndicador('TODOS')
                  setStatusFiltro('TODOS')
                }}
                className="w-full h-8 text-xs text-slate-600"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards Executivos Superiores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Indicadores Monitorados */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            Monitorados
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {metricasExecutivas.totalMonitorados}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Indicadores oficiais</div>
        </div>

        {/* 2. Na Meta */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/10 shadow-2xs">
          <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Na Meta
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {metricasExecutivas.naMeta}{' '}
            <span className="text-xs font-normal text-emerald-700">
              ({metricasExecutivas.percNaMeta} %)
            </span>
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Dentro da regra</div>
        </div>

        {/* 3. Fora da Meta */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/10 shadow-2xs">
          <div className="text-[11px] font-medium text-rose-700 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Fora da Meta
          </div>
          <div className="text-xl font-bold text-rose-600 mt-1">
            {metricasExecutivas.foraMeta}{' '}
            <span className="text-xs font-normal text-rose-700">
              ({metricasExecutivas.percForaMeta} %)
            </span>
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">Exigem ação corretiva</div>
        </div>

        {/* 4. Tendência Negativa */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/10 shadow-2xs">
          <div className="text-[11px] font-medium text-amber-700 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
            Tendência Negativa
          </div>
          <div className="text-xl font-bold text-amber-600 mt-1">
            {metricasExecutivas.tendenciaNegativa}
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">Em deterioração</div>
        </div>

        {/* 5. Ações Abertas */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-medium text-blue-600 flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5" />
            Ações Abertas
          </div>
          <div className="text-xl font-bold text-blue-600 mt-1">
            {metricasExecutivas.acoesAbertas}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Em andamento / plano</div>
        </div>

        {/* 6. Ações Atrasadas */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/10 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Ações Atrasadas
          </div>
          <div className="text-xl font-bold text-rose-600 mt-1">
            {metricasExecutivas.acoesAtrasadas}
          </div>
          <div className="text-[10px] text-rose-500 mt-0.5">Prazo vencido</div>
        </div>

        {/* 7. Eficácia das Ações */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Eficácia Ações
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {metricasExecutivas.percEficacia} {metricasExecutivas.percEficacia !== '—' && '%'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ações eficazes</div>
        </div>
      </div>

      {/* Alertas Automáticos Explicativos */}
      {alertasExplicativos.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            <Bell className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Alertas Automáticos Explicativos de Performance
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alertasExplicativos.map((alerta) => (
              <div
                key={alerta.id}
                className={`p-2.5 rounded text-xs flex items-start gap-2 border ${
                  alerta.tipo === 'CRITICO'
                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                    : alerta.tipo === 'ALERTA'
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                      : 'bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{alerta.mensagem}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Gráficos Executivos (6 Módulos Visuais) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Indicadores por Status (Donut) */}
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader className="p-3.5 pb-0">
            <CardTitle className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
              (1) Indicadores por Status Consolidado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {chartStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={30} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico 2: Ranking de Desvios */}
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader className="p-3.5 pb-0">
            <CardTitle className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
              (2) Ranking de Desvios vs Meta Oficial
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDesviosData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={10} tickFormatter={(v) => `${v}`} />
                <YAxis dataKey="nome" type="category" width={110} fontSize={10} />
                <Tooltip />
                <Bar
                  dataKey="desvio"
                  name="Desvio"
                  fill="#ef4444"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                >
                  {chartDesviosData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.isDesfavoravel ? '#ef4444' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico 3: Evolução Geral Mensal (% Na Meta Jan-Dez) */}
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader className="p-3.5 pb-0">
            <CardTitle className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
              (3) Evolução Mensal (% Indicadores na Meta)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartEvolucaoMensal}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes" fontSize={10} />
                <YAxis domain={[0, 100]} fontSize={10} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v} %`, '% Na Meta']} />
                <Line
                  type="monotone"
                  dataKey="atingimento"
                  name="% Na Meta"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico 4: Heatmap Indicadores x Meses (Tabela Visual Interativa) */}
        <Card className="border border-slate-200 dark:border-slate-800 lg:col-span-2">
          <CardHeader className="p-3.5 pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                (4) Heatmap: Indicadores x Meses ({exercicio}) — Clique na Célula para Detalhar
              </CardTitle>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Na Meta
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Fora da Meta
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-200" /> Sem Dados
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3.5 overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="p-1.5 text-left font-medium">Indicador</th>
                  {MESES_ANO.map((m) => (
                    <th key={m.index} className="p-1.5 text-center font-medium w-12">
                      {m.curto}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {linhas.map((l) => (
                  <tr key={l.indicador.id} className="hover:bg-slate-50/50">
                    <td className="p-1.5 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                      {l.indicador.nome}
                    </td>
                    {l.meses.map((m) => {
                      const bgClass =
                        m.status === 'ATINGIDA'
                          ? 'bg-emerald-500 text-white font-bold hover:bg-emerald-600'
                          : m.status === 'FORA_DA_META'
                            ? 'bg-rose-500 text-white font-bold hover:bg-rose-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'

                      return (
                        <td key={m.mesIndex} className="p-1 text-center">
                          <button
                            onClick={() => handleAbrirDetalhe(l)}
                            title={`${l.indicador.nome} - ${m.mesNomeLongo}: ${formatarValorPtBr(m.realizado, l.indicador.unidade)}`}
                            className={`w-full py-1 rounded text-[10px] transition-all cursor-pointer ${bgClass}`}
                          >
                            {m.realizado !== null ? Number(m.realizado).toFixed(0) : '—'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Gráfico 5 e 6: Tendências e Ações por Status */}
        <div className="space-y-4">
          {/* Tendências */}
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                (5) Tendências dos Indicadores
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 h-[90px]">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {chartTendenciasData.map((t) => (
                  <div key={t.name} className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-500 text-[10px] block">{t.name}</span>
                    <span className="text-lg font-bold" style={{ color: t.fill }}>
                      {t.total}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ações por Status */}
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                (6) Ações 5W2H por Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 h-[90px]">
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                {chartAcoesStatusData.map((a) => (
                  <div key={a.name} className="p-1.5 rounded bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-500 text-[9px] block truncate">{a.name}</span>
                    <span className="text-base font-bold" style={{ color: a.fill }}>
                      {a.total}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabela Executiva Inferior */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            Matriz Executiva Consolidada de Performance ({linhas.length} Indicadores)
          </span>
          <span className="text-xs text-slate-500">
            Clique em qualquer indicador para abrir a análise diagnóstica individual
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Indicador</th>
                <th className="p-3 text-right">Meta Vigente</th>
                <th className="p-3 text-right">Último Realizado</th>
                <th className="p-3 text-right">Média Ano</th>
                <th className="p-3 text-center">Tendência</th>
                <th className="p-3 text-right">Projeção Dezembro</th>
                <th className="p-3 text-center">Status Consolidado</th>
                <th className="p-3 text-center">Ações Abertas</th>
                <th className="p-3 text-center">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {linhas.map((l) => {
                const acoesDoInd = acoes.filter(
                  (a) =>
                    a.indicador_codigo === l.indicador.codigo &&
                    a.status !== 'CONCLUIDA' &&
                    a.status !== 'CANCELADA',
                )
                return (
                  <tr
                    key={l.indicador.id}
                    onClick={() => handleAbrirDetalhe(l)}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {l.indicador.codigo}
                      </span>
                      {l.indicador.nome}
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                      {l.metaFormatada}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatarValorPtBr(l.ultimoResultado, l.indicador.unidade)}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {formatarValorPtBr(l.mediaOuAcumuladoAno, l.indicador.unidade)}
                    </td>
                    <td className="p-3 text-center">
                      {l.tendencia === 'MELHORANDO' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                          <TrendingUp className="w-3.5 h-3.5" /> Melhorando
                        </span>
                      ) : l.tendencia === 'PIORANDO' ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-[11px]">
                          <TrendingDown className="w-3.5 h-3.5" /> Piorando
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-[11px]">
                          <Minus className="w-3.5 h-3.5" /> Estável
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-600">
                      {l.projecaoFechamentoFormatada}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        className={`text-[10px] ${
                          l.statusConsolidadoAno === 'ATINGIDA'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : l.statusConsolidadoAno === 'FORA_DA_META'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {l.statusConsolidadoAno === 'ATINGIDA'
                          ? 'Na Meta'
                          : l.statusConsolidadoAno === 'FORA_DA_META'
                            ? 'Fora da Meta'
                            : 'Sem Dados'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-mono ${
                          acoesDoInd.length > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {acoesDoInd.length}
                      </Badge>
                    </td>
                    <td className="p-3 text-center text-slate-400">
                      <ChevronRight className="w-4 h-4 mx-auto" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhamento Individual Existente */}
      {linhaSelecionada && (
        <IndicadorDetailModal
          open={modalDetalheAberto}
          onClose={() => setModalDetalheAberto(false)}
          linha={linhaSelecionada}
          ano={exercicio}
          linhaFiltro={linhaFiltro !== 'TODAS' ? linhaFiltro : undefined}
          centroFiltro={centroFiltro !== 'TODOS' ? centroFiltro : undefined}
          onSalvarMeta={carregarDados}
        />
      )}
    </div>
  )
}
export default DashboardIndicadoresPcpPage
