import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Brain,
  History,
  ShieldAlert,
  Sparkles,
  Filter,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  MessageSquare,
  HelpCircle,
  FileCheck2,
} from 'lucide-react'
import type { ProductionLine } from '@/types/line-master'
import {
  fetchLessonsLearnedForCenter,
  submitLessonFeedback,
  type HistoricalLesson,
  type LessonsLearnedSummary,
  type LessonType,
} from '@/services/lessons-learned'
import { useToast } from '@/hooks/use-toast'
import { pb } from '@/lib/pocketbase/client'

interface LineLessonsLearnedPanelProps {
  line: ProductionLine
}

export const LineLessonsLearnedPanel: React.FC<LineLessonsLearnedPanelProps> = ({ line }) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<LessonsLearnedSummary | null>(null)

  // Filtros
  const [periodFilter, setPeriodFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [productFilter, setProductFilter] = useState<string>('')
  const [familyFilter, setFamilyFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'TODAS' | 'MELHORES_PRATICAS' | 'ERROS_OCORRENCIAS'>(
    'TODAS',
  )

  // Feedback states
  const [activeFeedbackKey, setActiveFeedbackKey] = useState<string | null>(null)
  const [feedbackComment, setFeedbackComment] = useState<string>('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false)

  const loadLessons = useCallback(async () => {
    setLoading(true)
    try {
      const summary = await fetchLessonsLearnedForCenter(line)
      setData(summary)
    } catch (err) {
      console.error('Erro ao carregar lições aprendidas:', err)
      toast({
        variant: 'destructive',
        title: 'Erro de leitura',
        description: 'Não foi possível carregar os dados de lições aprendidas.',
      })
    } finally {
      setLoading(false)
    }
  }, [line, toast])

  useEffect(() => {
    loadLessons()
  }, [loadLessons])

  // Lista de famílias únicas derivadas
  const uniqueFamilies = useMemo(() => {
    if (!data) return []
    const setF = new Set<string>()
    data.lessons.forEach((l) => {
      if (l.family) setF.add(l.family)
    })
    return Array.from(setF)
  }, [data])

  // Filtragem
  const filteredLessons = useMemo(() => {
    if (!data) return []
    return data.lessons.filter((l) => {
      // Modo de visão rápida
      if (viewMode === 'MELHORES_PRATICAS') {
        if (l.type !== 'BOA_PRATICA' && l.type !== 'PADRAO_POSITIVO') return false
      } else if (viewMode === 'ERROS_OCORRENCIAS') {
        if (l.type !== 'ERRO_RECORRENTE' && l.type !== 'ALERTA' && l.type !== 'RESTRICAO_APRENDIDA')
          return false
      }

      // Filtro de tipo
      if (typeFilter !== 'ALL' && l.type !== typeFilter) return false

      // Filtro de família
      if (familyFilter !== 'ALL' && l.family !== familyFilter) return false

      // Filtro de busca produto/material
      if (productFilter.trim()) {
        const query = productFilter.toLowerCase()
        const matchTitle = l.title.toLowerCase().includes(query)
        const matchMat = (l.material || '').toLowerCase().includes(query)
        const matchDesc = (l.basedOn.materialOrProduct || '').toLowerCase().includes(query)
        if (!matchTitle && !matchMat && !matchDesc) return false
      }

      return true
    })
  }, [data, viewMode, typeFilter, familyFilter, productFilter])

  // Ação de envio de feedback
  const handleFeedback = async (
    lesson: HistoricalLesson,
    feedbackType: 'UTIL' | 'NAO_APLICAVEL' | 'VALIDAR_MELHOR_PRATICA' | 'DESCARTAR',
  ) => {
    setIsSubmittingFeedback(true)
    try {
      const user = pb.authStore.record || pb.authStore.model
      await submitLessonFeedback({
        lesson_key: lesson.key,
        center_code: data?.centerCode || line.code,
        feedback_type: feedbackType,
        user_comment: feedbackComment || undefined,
        user_name: (user as any)?.name || 'Especialista PCP',
        user_id: user?.id || undefined,
      })

      toast({
        title: 'Feedback registrado',
        description: `Avaliação "${feedbackType.replace(/_/g, ' ')}" associada com sucesso. Histórico preservado para governança.`,
      })
      setActiveFeedbackKey(null)
      setFeedbackComment('')
      loadLessons()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar feedback',
        description: err.message,
      })
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const getTypeBadge = (type: LessonType) => {
    switch (type) {
      case 'BOA_PRATICA':
      case 'PADRAO_POSITIVO':
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]">
            {type.replace(/_/g, ' ')}
          </Badge>
        )
      case 'ERRO_RECORRENTE':
        return (
          <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px]">
            {type.replace(/_/g, ' ')}
          </Badge>
        )
      case 'ALERTA':
      case 'RESTRICAO_APRENDIDA':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px]">
            {type.replace(/_/g, ' ')}
          </Badge>
        )
      case 'OPORTUNIDADE':
        return (
          <Badge className="bg-blue-50 text-[#004C97] border-blue-200 font-bold text-[10px]">
            {type}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {type}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho da Tela Funcional */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#004C97]" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Lições Aprendidas IA
            </h2>
            <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-xs font-semibold">
              Centro: {line.code}
            </Badge>
          </div>
          <p className="text-xs text-slate-600">
            Conhecimento gerado a partir do histórico de programação, execução e resultados desta
            linha.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Linha Fabril
            </span>
            <span className="font-semibold text-slate-800">{line.name || line.code}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Período Analisado
            </span>
            <span className="font-semibold text-slate-800">
              {data?.periodAnalyzed || 'Consolidado'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Última Análise
            </span>
            <span className="font-semibold text-[#004C97]">{data?.lastAnalysisDate || '-'}</span>
          </div>
        </div>
      </div>

      {/* 1. CARDS RESUMO (Máximo 5 cards, visual claro CIAFAL: fundo branco, borda discreta, número destacado, ícone pequeno) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Lições identificadas */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-xs hover:border-[#004C97] transition-all">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
              Lições Identificadas
            </span>
            <Brain className="w-4 h-4 text-[#004C97]" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <span className="text-2xl font-black text-[#004C97] font-mono">
              {loading ? '-' : (data?.counts.total ?? 0)}
            </span>
            <span className="text-[10px] text-slate-500 block pt-0.5">Histórico do centro</span>
          </CardContent>
        </Card>

        {/* Card 2: Boas práticas */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-xs hover:border-emerald-500 transition-all">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
              Boas Práticas
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {loading ? '-' : (data?.counts.boasPraticas ?? 0)}
            </span>
            <span className="text-[10px] text-slate-500 block pt-0.5">Padrões comprovados</span>
          </CardContent>
        </Card>

        {/* Card 3: Alertas */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-xs hover:border-amber-500 transition-all">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
              Alertas
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <span className="text-2xl font-black text-amber-600 font-mono">
              {loading ? '-' : (data?.counts.alertas ?? 0)}
            </span>
            <span className="text-[10px] text-slate-500 block pt-0.5">Atenção e restrições</span>
          </CardContent>
        </Card>

        {/* Card 4: Erros recorrentes */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-xs hover:border-rose-500 transition-all">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">
              Erros Recorrentes
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <span className="text-2xl font-black text-rose-600 font-mono">
              {loading ? '-' : (data?.counts.errosRecorrentes ?? 0)}
            </span>
            <span className="text-[10px] text-slate-500 block pt-0.5">Desvios no histórico</span>
          </CardContent>
        </Card>

        {/* Card 5: Oportunidades */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-xs hover:border-blue-500 transition-all">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
              Oportunidades
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <span className="text-2xl font-black text-blue-600 font-mono">
              {loading ? '-' : (data?.counts.oportunidades ?? 0)}
            </span>
            <span className="text-[10px] text-slate-500 block pt-0.5">Gargalo e capacidade</span>
          </CardContent>
        </Card>
      </div>

      {/* 4 & 5. SEÇÕES RÁPIDAS (Abas de visão rápida: Todas | Melhores Práticas | Erros e Ocorrências) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
        <div className="inline-flex h-9 p-1 bg-slate-100 rounded-md border border-slate-200 items-center">
          <button
            type="button"
            onClick={() => setViewMode('TODAS')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
              viewMode === 'TODAS'
                ? 'bg-[#004C97] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Todas as Lições ({data?.lessons.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('MELHORES_PRATICAS')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all ml-1 ${
              viewMode === 'MELHORES_PRATICAS'
                ? 'bg-[#004C97] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Melhores Práticas ({data?.counts.boasPraticas ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('ERROS_OCORRENCIAS')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all ml-1 ${
              viewMode === 'ERROS_OCORRENCIAS'
                ? 'bg-[#004C97] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Erros e Ocorrências (
            {(data?.counts.errosRecorrentes || 0) + (data?.counts.alertas || 0)})
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadLessons}
          disabled={loading}
          className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Análise Real
        </Button>
      </div>

      {/* 6. FILTROS CLEAN (Usando o centro atual como contexto, sem repetir seletor de centro) */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-600 uppercase">
            Tipo de Lição
          </Label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 h-9 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="BOA_PRATICA">BOA PRÁTICA</option>
            <option value="ERRO_RECORRENTE">ERRO RECORRENTE</option>
            <option value="ALERTA">ALERTA</option>
            <option value="PADRAO_POSITIVO">PADRÃO POSITIVO</option>
            <option value="RESTRICAO_APRENDIDA">RESTRIÇÃO APRENDIDA</option>
            <option value="OPORTUNIDADE">OPORTUNIDADE</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-600 uppercase">
            Família de Produtos
          </Label>
          <select
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 h-9 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todas as Famílias</option>
            {uniqueFamilies.map((fam) => (
              <option key={fam} value={fam}>
                {fam}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-600 uppercase">
            Filtrar Produto / Material
          </Label>
          <Input
            placeholder="Código ou descrição..."
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="bg-slate-50 border-slate-300 text-xs h-9 text-slate-800"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-600 uppercase">
            Período Histórico
          </Label>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 h-9 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todo o Histórico Real</option>
            <option value="30D">Últimos 30 dias</option>
            <option value="90D">Últimos 90 dias</option>
            <option value="1Y">Último ano</option>
          </select>
        </div>
      </div>

      {/* 3. LISTAGEM DE LIÇÕES & ESTADO VAZIO REAL */}
      {loading ? (
        <div className="bg-white p-12 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
          <RotateCcw className="w-6 h-6 text-[#004C97] animate-spin mx-auto mb-2" />
          Analisando histórico real de programações, revisões e apontamentos do centro {line.code}
          ...
        </div>
      ) : filteredLessons.length === 0 ? (
        /* ESTADO VAZIO REAL CONFORME ESPECIFICAÇÃO */
        <div className="bg-white p-10 rounded-lg border border-slate-200 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Brain className="w-6 h-6 text-[#004C97]" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Nenhuma lição aprendida disponível para este centro no período analisado.
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            As lições serão geradas automaticamente a partir do histórico real das programações e
            dos resultados realizados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLessons.map((lesson) => {
            const feedbacksForLesson = data?.feedbackMap[lesson.key] || []
            const isFeedbackOpen = activeFeedbackKey === lesson.key
            const isErrorOrAlert =
              lesson.type === 'ERRO_RECORRENTE' ||
              lesson.type === 'ALERTA' ||
              lesson.type === 'RESTRICAO_APRENDIDA'

            return (
              <Card
                key={lesson.id}
                className="bg-white border-slate-200 shadow-sm hover:border-[#004C97]/50 transition-all text-xs"
              >
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getTypeBadge(lesson.type)}
                      <h4 className="font-bold text-slate-900 text-sm">{lesson.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-500">
                        Confiança:{' '}
                        <strong
                          className={
                            lesson.confidence === 'Alta'
                              ? 'text-emerald-700 font-semibold'
                              : lesson.confidence === 'Média'
                                ? 'text-blue-700 font-semibold'
                                : 'text-slate-600 font-medium'
                          }
                        >
                          {lesson.confidence}
                        </strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-[11px] text-slate-500">
                        Recorrência:{' '}
                        <strong className="text-[#004C97] font-semibold">
                          {lesson.recurrence}x
                        </strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-[11px] text-slate-400">
                        Última: {lesson.lastOccurrenceDate}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {/* Visão no formato O que aconteceu → Impacto → Como evitar */}
                  {isErrorOrAlert ? (
                    <div className="space-y-2 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            O que aconteceu
                          </span>
                          <p className="text-slate-800 leading-relaxed font-medium">
                            {lesson.evidence}
                          </p>
                        </div>
                        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3">
                          <span className="text-[10px] uppercase font-bold text-amber-700 block">
                            Qual foi o impacto
                          </span>
                          <p className="text-slate-700 leading-relaxed">{lesson.impact}</p>
                        </div>
                        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3">
                          <span className="text-[10px] uppercase font-bold text-[#004C97] block">
                            Como evitar novamente
                          </span>
                          <p className="text-[#004C97] leading-relaxed font-semibold">
                            {lesson.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Evidência Histórica
                          </span>
                          <p className="text-slate-800 leading-relaxed">{lesson.evidence}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                            Impacto Observado
                          </span>
                          <p className="text-slate-700 leading-relaxed">{lesson.impact}</p>
                        </div>
                      </div>
                      <div className="p-2.5 bg-blue-50/50 rounded border border-blue-200 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-[#004C97] block">
                          Recomendação Prática
                        </span>
                        <p className="text-slate-900 font-medium">{lesson.recommendation}</p>
                      </div>
                    </div>
                  )}

                  {/* Rastreabilidade "Baseado em" (centro/programação/versão/período/material-produto/evento/resultado) */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 bg-slate-50/50 -mx-4 -mb-4 p-3 rounded-b-lg">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-700">Baseado em:</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-800">
                        Centro: {lesson.basedOn.center}
                      </span>
                      {lesson.basedOn.programacaoOrVersion && (
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[#004C97]">
                          {lesson.basedOn.programacaoOrVersion}
                        </span>
                      )}
                      {lesson.basedOn.materialOrProduct && (
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                          {lesson.basedOn.materialOrProduct}
                        </span>
                      )}
                      {lesson.basedOn.resultMetric && (
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                          {lesson.basedOn.resultMetric}
                        </span>
                      )}
                    </div>

                    {/* Feedback Humano por lição */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFeedback(lesson, 'UTIL')}
                        disabled={isSubmittingFeedback}
                        className="h-7 px-2 text-[11px] text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 gap-1"
                        title="Marcar como útil"
                      >
                        <ThumbsUp className="w-3 h-3 text-emerald-600" /> Útil
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFeedback(lesson, 'VALIDAR_MELHOR_PRATICA')}
                        disabled={isSubmittingFeedback}
                        className="h-7 px-2 text-[11px] text-[#004C97] hover:bg-blue-50 gap-1 font-semibold"
                        title="Validar como melhor prática institucional"
                      >
                        <FileCheck2 className="w-3 h-3 text-[#004C97]" /> Validar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFeedback(lesson, 'NAO_APLICAVEL')}
                        disabled={isSubmittingFeedback}
                        className="h-7 px-2 text-[11px] text-slate-600 hover:bg-slate-100 gap-1"
                        title="Não aplicável"
                      >
                        <ThumbsDown className="w-3 h-3 text-slate-400" /> Não aplicável
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveFeedbackKey(isFeedbackOpen ? null : lesson.key)}
                        className={`h-7 px-2 text-[11px] gap-1 ${
                          isFeedbackOpen
                            ? 'bg-slate-200 text-slate-900'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        title="Adicionar comentário ou descartar sugestão"
                      >
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        Comentar {feedbacksForLesson.length > 0 && `(${feedbacksForLesson.length})`}
                      </Button>
                    </div>
                  </div>

                  {/* Painel expandido de comentário / descarte com persistência */}
                  {isFeedbackOpen && (
                    <div className="pt-3 border-t border-slate-200 space-y-2 bg-slate-100/60 p-3 rounded-lg">
                      <Label className="text-[11px] font-bold text-slate-700">
                        Registrar Feedback / Comentário Humano
                      </Label>
                      <Input
                        placeholder="Ex: Confirmado em reunião de PCP com a laminação / Descartado por alteração futura de cilindros..."
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        className="bg-white border-slate-300 text-xs h-8 text-slate-800"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFeedback(lesson, 'DESCARTAR')}
                          disabled={isSubmittingFeedback}
                          className="text-[11px] h-7 border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          Descartar Sugestão (Preserva Histórico)
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveFeedbackKey(null)}
                            className="text-[11px] h-7 text-slate-600"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleFeedback(lesson, 'UTIL')}
                            disabled={isSubmittingFeedback}
                            className="text-[11px] h-7 bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
                          >
                            Salvar Comentário
                          </Button>
                        </div>
                      </div>

                      {/* Feedbacks anteriores da lição */}
                      {feedbacksForLesson.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">
                            Histórico de Feedbacks Registrados
                          </span>
                          {feedbacksForLesson.map((fb, idx) => (
                            <div
                              key={fb.id || idx}
                              className="text-[11px] bg-white p-2 rounded border border-slate-200 flex items-center justify-between"
                            >
                              <div className="space-x-1.5">
                                <Badge variant="outline" className="text-[9px] font-bold">
                                  {fb.feedback_type}
                                </Badge>
                                <span className="text-slate-800 font-medium">
                                  {fb.user_comment || 'Sem comentário adicional'}
                                </span>
                              </div>
                              <span className="text-slate-400 text-[10px]">
                                {fb.user_name || 'Usuário'} •{' '}
                                {fb.created ? fb.created.slice(0, 10) : 'Hoje'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
