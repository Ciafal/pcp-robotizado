import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Acao5W2HRecord,
  pcpIndicadoresService,
  formatarDataPtBr,
  SituacaoEficacia,
} from '@/services/pcp-indicadores-service'
import {
  ListChecks,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  Eye,
  Edit,
  ShieldCheck,
  RefreshCw,
  XCircle,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const ControleAcoesIndicadoresPage: React.FC = () => {
  const { toast } = useToast()
  const [acoes, setAcoes] = useState<Acao5W2HRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Filtros
  const [anoFiltro, setAnoFiltro] = useState<number>(2026)
  const [indicadorFiltro, setIndicadorFiltro] = useState<string>('TODOS')
  const [linhaFiltro, setLinhaFiltro] = useState<string>('TODAS')
  const [centroFiltro, setCentroFiltro] = useState<string>('TODOS')
  const [responsavelFiltro, setResponsavelFiltro] = useState<string>('TODOS')
  const [supervisorFiltro, setSupervisorFiltro] = useState<string>('TODOS')
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS')
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>('TODOS')
  const [eficaciaFiltro, setEficaciaFiltro] = useState<string>('TODOS')
  const [buscaTexto, setBuscaTexto] = useState<string>('')

  // Modais de Ação Rápida
  const [acaoVisualizando, setAcaoVisualizando] = useState<Acao5W2HRecord | null>(null)
  const [acaoEditando, setAcaoEditando] = useState<Acao5W2HRecord | null>(null)
  const [acaoAvaliandoEficacia, setAcaoAvaliandoEficacia] = useState<Acao5W2HRecord | null>(null)

  // Formulário de Avaliação de Eficácia no Modal
  const [situacaoEficaciaModal, setSituacaoEficaciaModal] =
    useState<SituacaoEficacia>('AGUARDANDO_AVALIACAO')
  const [dataAvaliacaoModal, setDataAvaliacaoModal] = useState<string>(
    new Date().toISOString().split('T')[0],
  )
  const [indicadorAntesModal, setIndicadorAntesModal] = useState<number>(0)
  const [indicadorAposModal, setIndicadorAposModal] = useState<number>(0)
  const [evidenciasModal, setEvidenciasModal] = useState<string>('')
  const [comentarioModal, setComentarioModal] = useState<string>('')
  const [responsavelEficaciaModal, setResponsavelEficaciaModal] = useState<string>('')
  const [salvandoEficacia, setSalvandoEficacia] = useState<boolean>(false)

  // Carregar dados
  const carregarAcoes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await pcpIndicadoresService.listarTodasAcoes({
        exercicio: anoFiltro,
        indicadorCodigo: indicadorFiltro !== 'TODOS' ? indicadorFiltro : undefined,
        linha: linhaFiltro !== 'TODAS' ? linhaFiltro : undefined,
        centro: centroFiltro !== 'TODOS' ? centroFiltro : undefined,
        status: statusFiltro,
        prioridade: prioridadeFiltro,
        situacaoEficacia: eficaciaFiltro,
        buscaTexto: buscaTexto.trim() || undefined,
      })
      setAcoes(data)
    } finally {
      setLoading(false)
    }
  }, [
    anoFiltro,
    indicadorFiltro,
    linhaFiltro,
    centroFiltro,
    statusFiltro,
    prioridadeFiltro,
    eficaciaFiltro,
    buscaTexto,
  ])

  useEffect(() => {
    carregarAcoes()
  }, [carregarAcoes])

  // Contagens dos Cards de Topo
  const metricas = useMemo(() => {
    let abertas = 0
    let naoIniciadas = 0
    let emAndamento = 0
    let atrasadas = 0
    let concluidas = 0
    let aguardandoEficacia = 0
    let eficazes = 0
    let ineficazes = 0

    for (const a of acoes) {
      if (a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA') {
        abertas++
      }
      if (a.status === 'NAO_INICIADA') naoIniciadas++
      if (a.status === 'EM_ANDAMENTO') emAndamento++
      if (a.status === 'ATRASADA' || a.isAtrasada) atrasadas++
      if (a.status === 'CONCLUIDA') {
        concluidas++
        if (a.situacao_eficacia === 'AGUARDANDO_AVALIACAO' || !a.situacao_eficacia) {
          aguardandoEficacia++
        }
      }
      if (a.situacao_eficacia === 'EFICAZ') eficazes++
      if (a.situacao_eficacia === 'INEFICAZ') ineficazes++
    }

    return {
      abertas,
      naoIniciadas,
      emAndamento,
      atrasadas,
      concluidas,
      aguardandoEficacia,
      eficazes,
      ineficazes,
    }
  }, [acoes])

  // Salvar avaliação de eficácia
  const handleSalvarEficacia = async () => {
    if (!acaoAvaliandoEficacia) return
    setSalvandoEficacia(true)
    try {
      await pcpIndicadoresService.avaliarEficaciaAcao({
        acaoId: acaoAvaliandoEficacia.id,
        situacaoEficacia: situacaoEficaciaModal,
        dataAvaliacao: dataAvaliacaoModal,
        indicadorAntes: indicadorAntesModal,
        indicadorApos: indicadorAposModal,
        evidencias: evidenciasModal,
        comentario: comentarioModal,
        responsavel: responsavelEficaciaModal || 'Programador PCP',
      })

      toast({
        title: 'Eficácia Registrada com Sucesso',
        description: `Situação: ${situacaoEficaciaModal}. Registro auditado no backend.`,
      })
      setAcaoAvaliandoEficacia(null)
      carregarAcoes()
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Eficácia',
        description: err?.message || 'Falha na comunicação.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoEficacia(false)
    }
  }

  // Atualizar rápido percentual ou status
  const handleAtualizarAndamentoRapido = async (
    acao: Acao5W2HRecord,
    novoStatus: any,
    novoPerc: number,
  ) => {
    try {
      await pcpIndicadoresService.salvarAcao5W2H({
        id: acao.id,
        status: novoStatus,
        percentual_concluido: novoPerc,
        data_real_conclusao:
          novoStatus === 'CONCLUIDA' ? new Date().toISOString().split('T')[0] : undefined,
      })
      toast({
        title: 'Ação Atualizada',
        description: `${acao.codigo}: status ${novoStatus} (${novoPerc}%).`,
      })
      carregarAcoes()
    } catch (err: any) {
      toast({
        title: 'Erro ao Atualizar',
        description: err?.message || 'Falha ao gravar.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-[#004C97] dark:bg-blue-950 dark:text-blue-300">
              PCP Robotizado • Relatórios
            </span>
            <Badge variant="outline" className="text-xs">
              Exercício {anoFiltro}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-[#004C97] dark:text-blue-400" />
            Controle de Ações dos Indicadores
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestão consolidada de todas as ações 5W2H vinculadas a desvios dos indicadores PCP com
            acompanhamento de prazos e verificação de eficácia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarAcoes}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Topo Clicáveis (Filtros Rápidos) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {/* 1. Total Abertas */}
        <button
          onClick={() => setStatusFiltro(statusFiltro === 'TODOS' ? 'EM_ANDAMENTO' : 'TODOS')}
          className="text-left bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all shadow-2xs"
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Total Abertas
          </div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">
            {metricas.abertas}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Em execução</div>
        </button>

        {/* 2. Não Iniciadas */}
        <button
          onClick={() =>
            setStatusFiltro(statusFiltro === 'NAO_INICIADA' ? 'TODOS' : 'NAO_INICIADA')
          }
          className={`text-left bg-white dark:bg-slate-900 p-3 rounded-lg border transition-all shadow-2xs ${
            statusFiltro === 'NAO_INICIADA'
              ? 'border-slate-800 ring-1 ring-slate-800'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Não Iniciadas</div>
          <div className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">
            {metricas.naoIniciadas}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">0% concluído</div>
        </button>

        {/* 3. Em Andamento */}
        <button
          onClick={() =>
            setStatusFiltro(statusFiltro === 'EM_ANDAMENTO' ? 'TODOS' : 'EM_ANDAMENTO')
          }
          className={`text-left bg-white dark:bg-slate-900 p-3 rounded-lg border transition-all shadow-2xs ${
            statusFiltro === 'EM_ANDAMENTO'
              ? 'border-blue-500 ring-1 ring-blue-500'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
            <PlayCircle className="w-3.5 h-3.5" />
            Em Andamento
          </div>
          <div className="text-xl font-bold text-blue-600 mt-1">{metricas.emAndamento}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Progresso ativo</div>
        </button>

        {/* 4. Atrasadas */}
        <button
          onClick={() => setStatusFiltro(statusFiltro === 'ATRASADA' ? 'TODOS' : 'ATRASADA')}
          className={`text-left bg-white dark:bg-slate-900 p-3 rounded-lg border transition-all shadow-2xs ${
            statusFiltro === 'ATRASADA'
              ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20'
              : 'border-rose-200 dark:border-rose-900/40 bg-rose-50/10'
          }`}
        >
          <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Atrasadas
          </div>
          <div className="text-xl font-bold text-rose-600 mt-1">{metricas.atrasadas}</div>
          <div className="text-[10px] text-rose-500 mt-0.5">Prazo expirado</div>
        </button>

        {/* 5. Concluídas */}
        <button
          onClick={() => setStatusFiltro(statusFiltro === 'CONCLUIDA' ? 'TODOS' : 'CONCLUIDA')}
          className={`text-left bg-white dark:bg-slate-900 p-3 rounded-lg border transition-all shadow-2xs ${
            statusFiltro === 'CONCLUIDA'
              ? 'border-emerald-500 ring-1 ring-emerald-500'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Concluídas
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{metricas.concluidas}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">100% físico</div>
        </button>

        {/* 6. Aguardando Eficácia */}
        <button
          onClick={() =>
            setEficaciaFiltro(
              eficaciaFiltro === 'AGUARDANDO_AVALIACAO' ? 'TODOS' : 'AGUARDANDO_AVALIACAO',
            )
          }
          className={`text-left bg-white dark:bg-slate-900 p-3 rounded-lg border transition-all shadow-2xs ${
            eficaciaFiltro === 'AGUARDANDO_AVALIACAO'
              ? 'border-amber-500 ring-1 ring-amber-500'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Aguardando Eficácia
          </div>
          <div className="text-xl font-bold text-amber-600 mt-1">{metricas.aguardandoEficacia}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Período de maturação</div>
        </button>

        {/* 7. Ações Eficazes */}
        <button
          onClick={() => setEficaciaFiltro(eficaciaFiltro === 'EFICAZ' ? 'TODOS' : 'EFICAZ')}
          className={`text-left bg-white dark:bg-slate-900 p-3 rounded-lg border transition-all shadow-2xs ${
            eficaciaFiltro === 'EFICAZ'
              ? 'border-emerald-600 ring-1 ring-emerald-600'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Eficazes
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{metricas.eficazes}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Meta restaurada</div>
        </button>

        {/* 8. Ações Ineficazes */}
        <button
          onClick={() => setEficaciaFiltro(eficaciaFiltro === 'INEFICAZ' ? 'TODOS' : 'INEFICAZ')}
          className={`text-left bg-white dark:bg-slate-900 p-3 rounded-lg border transition-all shadow-2xs ${
            eficaciaFiltro === 'INEFICAZ'
              ? 'border-rose-600 ring-1 ring-rose-600'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-medium text-rose-700 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Ineficazes
          </div>
          <div className="text-xl font-bold text-rose-600 mt-1">{metricas.ineficazes}</div>
          <div className="text-[10px] text-rose-500 mt-0.5">Exige nova ação</div>
        </button>
      </div>

      {/* Barra de Filtros */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            <div>
              <Label className="text-[11px] text-slate-500">Busca Textual</Label>
              <div className="relative mt-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  placeholder="Ação, indicador, código..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Exercício</Label>
              <Select value={anoFiltro.toString()} onValueChange={(v) => setAnoFiltro(Number(v))}>
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
              <Label className="text-[11px] text-slate-500">Status da Ação</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Status</SelectItem>
                  <SelectItem value="NAO_INICIADA">Não Iniciada</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                  <SelectItem value="ATRASADA">Atrasada</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Prioridade</Label>
              <Select value={prioridadeFiltro} onValueChange={setPrioridadeFiltro}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas as Prioridades</SelectItem>
                  <SelectItem value="CRITICA">Crítica</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Situação da Eficácia</Label>
              <Select value={eficaciaFiltro} onValueChange={setEficaciaFiltro}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas as Situações</SelectItem>
                  <SelectItem value="AGUARDANDO_AVALIACAO">Aguardando Avaliação</SelectItem>
                  <SelectItem value="EFICAZ">Eficaz</SelectItem>
                  <SelectItem value="PARCIALMENTE_EFICAZ">Parcialmente Eficaz</SelectItem>
                  <SelectItem value="INEFICAZ">Ineficaz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Linha</Label>
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

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBuscaTexto('')
                  setStatusFiltro('TODOS')
                  setPrioridadeFiltro('TODOS')
                  setEficaciaFiltro('TODOS')
                  setLinhaFiltro('TODAS')
                }}
                className="w-full h-8 text-xs text-slate-600"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Ações Consolidadas */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            Planos de Ação 5W2H Cadastrados ({acoes.length})
          </span>
          <span className="text-xs text-slate-500">
            Destacadas em vermelho: Ações com prazo vencido e não concluídas
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Carregando ações...</div>
        ) : acoes.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 italic">
            Nenhuma ação encontrada com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Indicador</th>
                  <th className="p-3">Centro / Linha</th>
                  <th className="p-3">Desvio</th>
                  <th className="p-3">Causa Raiz</th>
                  <th className="p-3">Ação (What)</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Prazo</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">% Conc.</th>
                  <th className="p-3 text-center">Eficácia</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {acoes.map((act) => {
                  const isAtrasada = act.status === 'ATRASADA' || act.isAtrasada
                  return (
                    <tr
                      key={act.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isAtrasada ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Indicador */}
                      <td className="p-3 font-medium">
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {act.indicador_codigo}
                        </span>
                        <span className="text-slate-900 dark:text-slate-100 font-semibold">
                          {act.indicador_nome}
                        </span>
                      </td>

                      {/* Centro / Linha */}
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {act.linha || act.centro || 'Geral'}
                      </td>

                      {/* Desvio */}
                      <td className="p-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {act.desvio_resumo || '—'}
                      </td>

                      {/* Causa Raiz */}
                      <td
                        className="p-3 max-w-[180px] truncate text-slate-600 dark:text-slate-300"
                        title={act.causa_raiz_vinculada}
                      >
                        {act.causa_raiz_vinculada || 'Em investigação'}
                      </td>

                      {/* Ação */}
                      <td className="p-3 max-w-[220px]">
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {act.codigo}
                        </span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {act.what_acao}
                        </span>
                      </td>

                      {/* Responsável */}
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {act.who_responsavel_nome}
                      </td>

                      {/* Prazo */}
                      <td className="p-3 font-mono font-medium">
                        <span
                          className={
                            isAtrasada
                              ? 'text-rose-600 font-bold'
                              : 'text-slate-700 dark:text-slate-300'
                          }
                        >
                          {formatarDataPtBr(act.when_prazo)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] ${
                            act.status === 'CONCLUIDA'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isAtrasada
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {act.status}
                        </Badge>
                      </td>

                      {/* % Conclusão */}
                      <td className="p-3 text-center font-mono font-bold">
                        {act.percentual_concluido || 0}%
                      </td>

                      {/* Eficácia */}
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            act.situacao_eficacia === 'EFICAZ'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : act.situacao_eficacia === 'INEFICAZ'
                                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                                : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {act.situacao_eficacia === 'EFICAZ'
                            ? 'Eficaz'
                            : act.situacao_eficacia === 'INEFICAZ'
                              ? 'Ineficaz'
                              : act.situacao_eficacia === 'PARCIALMENTE_EFICAZ'
                                ? 'Parcial'
                                : 'Aguardando'}
                        </Badge>
                      </td>

                      {/* Botões de Ação */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAcaoVisualizando(act)}
                            title="Visualizar Detalhes"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const novoPerc = act.percentual_concluido >= 100 ? 50 : 100
                              const novoSt = novoPerc === 100 ? 'CONCLUIDA' : 'EM_ANDAMENTO'
                              handleAtualizarAndamentoRapido(act, novoSt, novoPerc)
                            }}
                            title="Alternar Andamento / Concluir"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAcaoAvaliandoEficacia(act)
                              setSituacaoEficaciaModal(
                                act.situacao_eficacia || 'AGUARDANDO_AVALIACAO',
                              )
                              setDataAvaliacaoModal(new Date().toISOString().split('T')[0])
                              setEvidenciasModal(act.evidencias_eficacia || '')
                              setComentarioModal(act.comentario_eficacia || '')
                              setResponsavelEficaciaModal(act.responsavel_avaliacao_eficacia || '')
                            }}
                            title="Avaliar Eficácia"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Visualizar Detalhes da Ação */}
      {acaoVisualizando && (
        <Dialog open={!!acaoVisualizando} onOpenChange={() => setAcaoVisualizando(null)}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {acaoVisualizando.codigo}
                </Badge>
                <DialogTitle className="text-base font-bold">
                  {acaoVisualizando.what_acao}
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-3 text-xs pt-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Indicador:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {acaoVisualizando.indicador_nome}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Causa Raiz Vinculada:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {acaoVisualizando.causa_raiz_vinculada || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Responsável (Who):</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {acaoVisualizando.who_responsavel_nome}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Prazo (When):</span>
                  <span className="font-medium font-mono text-slate-800 dark:text-slate-200">
                    {formatarDataPtBr(acaoVisualizando.when_prazo)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status Atual:</span>
                  <Badge className="mt-0.5 text-[10px]">{acaoVisualizando.status}</Badge>
                </div>
                <div>
                  <span className="text-slate-400 block">Progresso:</span>
                  <span className="font-bold">{acaoVisualizando.percentual_concluido || 0}%</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Why (Motivo / Justificativa):
                </span>
                <p className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  {acaoVisualizando.why_motivo || 'Bloqueio de causa raiz'}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  How (Como está sendo executado):
                </span>
                <p className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  {acaoVisualizando.how_como || 'Ações operacionais em alinhamento'}
                </p>
              </div>

              {acaoVisualizando.evidencia_conclusao && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Evidência de Execução:
                  </span>
                  <p className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 rounded border border-emerald-200">
                    {acaoVisualizando.evidencia_conclusao}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setAcaoVisualizando(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Avaliar Eficácia */}
      {acaoAvaliandoEficacia && (
        <Dialog open={!!acaoAvaliandoEficacia} onOpenChange={() => setAcaoAvaliandoEficacia(null)}>
          <DialogContent className="max-w-xl bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Avaliação de Eficácia — {acaoAvaliandoEficacia.codigo}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 text-xs pt-1">
              <div>
                <Label className="text-xs font-semibold">Resultado da Avaliação</Label>
                <Select
                  value={situacaoEficaciaModal}
                  onValueChange={(v: any) => setSituacaoEficaciaModal(v)}
                >
                  <SelectTrigger className="mt-1 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGUARDANDO_AVALIACAO">Aguardando Avaliação</SelectItem>
                    <SelectItem value="EFICAZ">Eficaz (Meta Atingida e Sustentada)</SelectItem>
                    <SelectItem value="PARCIALMENTE_EFICAZ">Parcialmente Eficaz</SelectItem>
                    <SelectItem value="INEFICAZ">Ineficaz (Problema Reincidente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Data da Avaliação</Label>
                  <Input
                    type="date"
                    value={dataAvaliacaoModal}
                    onChange={(e) => setDataAvaliacaoModal(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Responsável pela Avaliação</Label>
                  <Input
                    value={responsavelEficaciaModal}
                    onChange={(e) => setResponsavelEficaciaModal(e.target.value)}
                    placeholder="Ex: Engenharia de Processo / PCP"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Evidências da Avaliação</Label>
                <Input
                  value={evidenciasModal}
                  onChange={(e) => setEvidenciasModal(e.target.value)}
                  placeholder="Relatório de apontamentos, amostras, inspeção visual..."
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Comentário Técnico de Fechamento</Label>
                <Textarea
                  value={comentarioModal}
                  onChange={(e) => setComentarioModal(e.target.value)}
                  rows={3}
                  placeholder="Parecer final comprovando se a causa raiz foi eliminada..."
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setAcaoAvaliandoEficacia(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSalvarEficacia}
                disabled={salvandoEficacia}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {salvandoEficacia ? 'Gravando...' : 'Salvar Eficácia'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
export default ControleAcoesIndicadoresPage
