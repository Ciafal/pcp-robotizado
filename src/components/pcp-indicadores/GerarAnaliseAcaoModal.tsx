import React, { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  IndicadorMatrizLinha,
  AnaliseDesvioRecord,
  Acao5W2HRecord,
  Item5Porques,
  Ishikawa6M,
  IshikawaCausaItem,
  pcpIndicadoresService,
  formatarValorPtBr,
  formatarDataPtBr,
} from '@/services/pcp-indicadores-service'
import {
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar,
  Save,
  HelpCircle,
  FileText,
  UserCheck,
  Target,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

interface GerarAnaliseAcaoModalProps {
  isOpen: boolean
  onClose: () => void
  linha: IndicadorMatrizLinha
  anoExercicio: number
  mesIndexInicial?: number
  onSuccess?: () => void
}

const ETAPAS = [
  { id: 1, label: '1. Identificação' },
  { id: 2, label: '2. Análise de Causa' },
  { id: 3, label: '3. 5 Porquês' },
  { id: 4, label: '4. Ishikawa 6M' },
  { id: 5, label: '5. Causa Raiz' },
  { id: 6, label: '6. Plano 5W2H' },
  { id: 7, label: '7. Acompanhamento' },
  { id: 8, label: '8. Eficácia' },
]

export const GerarAnaliseAcaoModal: React.FC<GerarAnaliseAcaoModalProps> = ({
  isOpen,
  onClose,
  linha,
  anoExercicio,
  mesIndexInicial = 0,
  onSuccess,
}) => {
  const { toast } = useToast()
  const ind = linha.indicador

  // Etapa atual
  const [etapa, setEtapa] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingIA, setLoadingIA] = useState<boolean>(false)

  // Usuários do sistema para selecionar responsáveis (sem criar cadastro paralelo)
  const [usuariosHub, setUsuariosHub] = useState<
    Array<{ id: string; name: string; email: string }>
  >([])

  // Buscar usuários reais do Hub
  useEffect(() => {
    async function carregarUsuarios() {
      try {
        const users = await pb.collection('users').getFullList({ sort: 'name' })
        setUsuariosHub(
          users.map((u: any) => ({
            id: u.id,
            name: u.name || u.email || 'Usuário Hub',
            email: u.email || '',
          })),
        )
      } catch (err) {
        setUsuariosHub([
          { id: 'usr-1', name: 'Programador PCP (Ciafal)', email: 'pcp@ciafal.com.br' },
          { id: 'usr-2', name: 'Supervisor Operacional', email: 'supervisor@ciafal.com.br' },
          { id: 'usr-3', name: 'Gerente Industrial', email: 'gerencia@ciafal.com.br' },
        ])
      }
    }
    carregarUsuarios()
  }, [])

  // Mês selecionado para análise
  const [mesIndex, setMesIndex] = useState<number>(mesIndexInicial)

  // Dados da Análise (Etapa 1)
  const [analiseId, setAnaliseId] = useState<string>('')
  const [codigoAnalise, setCodigoAnalise] = useState<string>('')
  const [descricaoProblema, setDescricaoProblema] = useState<string>('')
  const [usuarioResponsavelId, setUsuarioResponsavelId] = useState<string>('')
  const [usuarioResponsavelNome, setUsuarioResponsavelNome] = useState<string>('Programador PCP')
  const [supervisorNome, setSupervisorNome] = useState<string>('')
  const [aprovadorNome, setAprovadorNome] = useState<string>('')

  // Etapa 2: Análise IA
  const [iaEvidencias, setIaEvidencias] = useState<string[]>([])
  const [iaHipoteses, setIaHipoteses] = useState<string[]>([])
  const [iaDadosFaltantes, setIaDadosFaltantes] = useState<string[]>([])

  // Etapa 3: 5 Porquês
  const [porques, setPorques] = useState<Item5Porques[]>([
    { nivel: 1, pergunta: 'Por que ocorreu o desvio?', resposta: '' },
  ])

  // Etapa 4: Ishikawa 6M
  const [ishikawa, setIshikawa] = useState<Ishikawa6M>({
    metodo: [],
    maquina: [],
    mao_de_obra: [],
    material: [],
    medicao: [],
    meio_ambiente: [],
  })

  // Etapa 5: Causa Raiz
  const [causaRaiz, setCausaRaiz] = useState<string>('')
  const [metodoUtilizado, setMetodoUtilizado] = useState<string>('5 Porquês + Ishikawa 6M')
  const [evidenciaCausaRaiz, setEvidenciaCausaRaiz] = useState<string>('')
  const [responsavelValidacao, setResponsavelValidacao] = useState<string>('')
  const [dataValidacao, setDataValidacao] = useState<string>('')
  const [observacaoValidacao, setObservacaoValidacao] = useState<string>('')
  const [statusCausaRaiz, setStatusCausaRaiz] = useState<
    'EM_INVESTIGACAO' | 'CAUSA_PROVAVEL' | 'CAUSA_CONFIRMADA' | 'NAO_CONFIRMADA'
  >('EM_INVESTIGACAO')

  // Etapa 6: Ações 5W2H (múltiplas ações permitidas para a mesma causa raiz)
  const [acoes, setAcoes] = useState<Acao5W2HRecord[]>([])
  const [novaAcao, setNovaAcao] = useState<{
    what: string
    why: string
    where: string
    when_inicio: string
    when_prazo: string
    who_id: string
    who_nome: string
    how: string
    how_much_previsto: number
    prioridade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'
    supervisor: string
  }>({
    what: '',
    why: '',
    where: 'Chão de fábrica / Linhas',
    when_inicio: new Date().toISOString().split('T')[0],
    when_prazo: '',
    who_id: '',
    who_nome: '',
    how: '',
    how_much_previsto: 0,
    prioridade: 'ALTA',
    supervisor: '',
  })

  // Etapa 8: Eficácia
  const [acaoSelecionadaEficaciaId, setAcaoSelecionadaEficaciaId] = useState<string>('')
  const [situacaoEficacia, setSituacaoEficacia] = useState<
    'AGUARDANDO_AVALIACAO' | 'EFICAZ' | 'PARCIALMENTE_EFICAZ' | 'INEFICAZ'
  >('AGUARDANDO_AVALIACAO')
  const [dataAvaliacao, setDataAvaliacao] = useState<string>(new Date().toISOString().split('T')[0])
  const [indicadorAntes, setIndicadorAntes] = useState<number>(0)
  const [indicadorApos, setIndicadorApos] = useState<number>(0)
  const [evidenciasEficacia, setEvidenciasEficacia] = useState<string>('')
  const [comentarioEficacia, setComentarioEficacia] = useState<string>('')
  const [responsavelEficacia, setResponsavelEficacia] = useState<string>('')

  // Obter mês atual e desvio
  const mesAtual = linha.meses[mesIndex] || linha.meses[0]
  const realizadoMes = mesAtual?.realizado ?? linha.ultimoResultado ?? ind.meta
  const metaMes = ind.meta
  const desvioAbsolutoMes = mesAtual?.desvioAbsoluto ?? Number((realizadoMes - metaMes).toFixed(1))
  const desvioPercentualMes =
    mesAtual?.desvioPercentual ??
    (metaMes ? Number((((realizadoMes - metaMes) / metaMes) * 100).toFixed(1)) : 0)
  const periodoFormatado = `${mesAtual?.mesNomeLongo || 'Janeiro'}/${anoExercicio}`

  // Inicializar dados quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setDescricaoProblema(
        `Desvio apurado no indicador ${ind.nome} em ${periodoFormatado}: realizado ${formatarValorPtBr(
          realizadoMes,
          ind.unidade,
        )} frente à meta oficial de ${formatarValorPtBr(
          metaMes,
          ind.unidade,
        )} (${desvioAbsolutoMes > 0 ? '+' : ''}${formatarValorPtBr(desvioAbsolutoMes, ind.unidade)}).`,
      )
      const user = pb.authStore.record
      if (user) {
        setUsuarioResponsavelId(user.id)
        setUsuarioResponsavelNome(user.name || user.email || 'Programador PCP')
      }
      setIndicadorAntes(realizadoMes)
      setIndicadorApos(metaMes)
    }
  }, [isOpen, mesIndex, linha, ind, periodoFormatado, realizadoMes, metaMes, desvioAbsolutoMes])

  // Gerar Análise com IA (hipóteses consultivas)
  const handleGerarAnaliseIA = () => {
    setLoadingIA(true)
    try {
      const res = pcpIndicadoresService.gerarHipotesesIADesvio({
        indicador: ind,
        realizado: realizadoMes,
        meta: metaMes,
        desvioAbsoluto: desvioAbsolutoMes,
        periodo: periodoFormatado,
      })
      setIaEvidencias(res.evidencias)
      setIaHipoteses(res.hipoteses)
      setIaDadosFaltantes(res.dadosFaltantes)

      // Atualiza descrição se ainda básica
      if (descricaoProblema.length < 50) {
        setDescricaoProblema(
          `Identificado desvio de performance no indicador ${ind.nome} durante ${periodoFormatado}. Realizado: ${formatarValorPtBr(
            realizadoMes,
            ind.unidade,
          )} vs Meta: ${formatarValorPtBr(metaMes, ind.unidade)}.`,
        )
      }

      toast({
        title: 'Análise de IA Gerada',
        description: 'Hipóteses e dados faltantes calculados com sucesso. Valide com a equipe.',
      })
    } finally {
      setLoadingIA(false)
    }
  }

  // Sugerir próximos porquês com IA
  const handleSugerirProximoPorqueIA = () => {
    const sugestao = pcpIndicadoresService.sugerirProximosPorquesIA(
      descricaoProblema || ind.nome,
      porques,
    )
    if (porques.length >= 5) {
      toast({
        title: 'Limite dos 5 Porquês Atingido',
        description: 'Você já atingiu os 5 níveis. Defina agora a causa raiz confirmada.',
      })
      return
    }
    setPorques([
      ...porques,
      {
        nivel: sugestao.nivel,
        pergunta: sugestao.pergunta,
        resposta: sugestao.respostaSugerida,
      },
    ])
  }

  // Adicionar causa no Ishikawa
  const handleAdicionarIshikawa = (
    categoria: keyof Ishikawa6M,
    descricao: string,
    tipo: 'PROVAVEL' | 'CONFIRMADA',
  ) => {
    if (!descricao.trim()) return
    const novoItem: IshikawaCausaItem = {
      id: `ish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      descricao: descricao.trim(),
      tipo,
    }
    setIshikawa((prev) => ({
      ...prev,
      [categoria]: [...prev[categoria], novoItem],
    }))
  }

  const handleRemoverIshikawa = (categoria: keyof Ishikawa6M, id: string) => {
    setIshikawa((prev) => ({
      ...prev,
      [categoria]: prev[categoria].filter((item) => item.id !== id),
    }))
  }

  // Adicionar Ação 5W2H
  const handleAdicionarAcao = () => {
    if (!novaAcao.what.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o que será feito (What / Ação).',
        variant: 'destructive',
      })
      return
    }
    if (!novaAcao.when_prazo) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o prazo de conclusão (When / Prazo).',
        variant: 'destructive',
      })
      return
    }
    if (!novaAcao.who_nome) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Selecione o responsável pela ação (Who).',
        variant: 'destructive',
      })
      return
    }

    const prazoDate = new Date(novaAcao.when_prazo)
    prazoDate.setHours(23, 59, 59, 999)
    const isAtrasada = prazoDate.getTime() < Date.now()

    const itemAcao: Acao5W2HRecord = {
      id: `tmp-${Date.now()}`,
      codigo: `ACT-${anoExercicio}-${Date.now().toString().slice(-4)}`,
      analise_id: analiseId || 'temp-ana',
      analise_codigo: codigoAnalise || `ANA-${anoExercicio}-NOVO`,
      indicador_id: ind.id,
      indicador_codigo: ind.codigo,
      indicador_nome: ind.nome,
      exercicio: anoExercicio,
      periodo_analisado: periodoFormatado,
      centro: ind.centro || '',
      linha: ind.linha || '',
      desvio_resumo: `${desvioAbsolutoMes > 0 ? '+' : ''}${formatarValorPtBr(desvioAbsolutoMes, ind.unidade)}`,
      causa_raiz_vinculada: causaRaiz || 'A definir na validação',
      what_acao: novaAcao.what,
      why_motivo: novaAcao.why || 'Bloqueio de causa raiz',
      where_local: novaAcao.where,
      when_inicio: novaAcao.when_inicio,
      when_prazo: novaAcao.when_prazo,
      who_responsavel_id: novaAcao.who_id,
      who_responsavel_nome: novaAcao.who_nome,
      supervisor_nome: novaAcao.supervisor,
      how_como: novaAcao.how,
      how_much_custo_previsto: Number(novaAcao.how_much_previsto || 0),
      how_much_custo_realizado: 0,
      prioridade: novaAcao.prioridade,
      status: isAtrasada ? 'ATRASADA' : 'NAO_INICIADA',
      percentual_concluido: 0,
      situacao_eficacia: 'AGUARDANDO_AVALIACAO',
      isAtrasada,
    }

    setAcoes((prev) => [...prev, itemAcao])
    setNovaAcao({
      what: '',
      why: '',
      where: 'Chão de fábrica / Linhas',
      when_inicio: new Date().toISOString().split('T')[0],
      when_prazo: '',
      who_id: '',
      who_nome: '',
      how: '',
      how_much_previsto: 0,
      prioridade: 'ALTA',
      supervisor: '',
    })

    toast({
      title: 'Ação Adicionada ao Plano',
      description: 'Ação 5W2H vinculada com sucesso. Você pode adicionar múltiplas ações.',
    })
  }

  // Salvar todo o fluxo no backend
  const handleSalvarWorkflowCompleto = async () => {
    setLoading(true)
    try {
      // 1. Salvar ou atualizar a Análise
      const analiseSalva = await pcpIndicadoresService.salvarAnaliseDesvio({
        id: analiseId || undefined,
        indicador_id: ind.id,
        indicador_codigo: ind.codigo,
        indicador_nome: ind.nome,
        exercicio: anoExercicio,
        periodo_analisado: periodoFormatado,
        mes_index: mesIndex,
        meta: metaMes,
        realizado: realizadoMes,
        desvio_absoluto: desvioAbsolutoMes,
        desvio_percentual: desvioPercentualMes,
        tendencia: linha.tendencia,
        centro: ind.centro || '',
        linha: ind.linha || '',
        data_analise: new Date().toISOString(),
        usuario_responsavel_id: usuarioResponsavelId,
        usuario_responsavel_nome: usuarioResponsavelNome,
        supervisor_nome: supervisorNome,
        aprovador_nome: aprovadorNome,
        descricao_problema: descricaoProblema,
        ia_evidencias: iaEvidencias,
        ia_hipoteses: iaHipoteses,
        ia_dados_faltantes: iaDadosFaltantes,
        cinco_porques: porques,
        ishikawa_6m: ishikawa,
        causa_raiz: causaRaiz,
        metodo_utilizado: metodoUtilizado,
        evidencia_causa_raiz: evidenciaCausaRaiz,
        responsavel_validacao: responsavelValidacao,
        data_validacao: dataValidacao || null,
        observacao_validacao: observacaoValidacao,
        status_causa_raiz: statusCausaRaiz,
        etapa_atual: etapa,
        status_workflow: 'EM_ANDAMENTO',
      })

      setAnaliseId(analiseSalva.id)
      setCodigoAnalise(analiseSalva.codigo)

      // 2. Salvar Ações vinculadas no backend
      for (const act of acoes) {
        await pcpIndicadoresService.salvarAcao5W2H({
          id: act.id?.startsWith('tmp-') ? undefined : act.id,
          analise_id: analiseSalva.id,
          analise_codigo: analiseSalva.codigo,
          indicador_id: ind.id,
          indicador_codigo: ind.codigo,
          indicador_nome: ind.nome,
          exercicio: anoExercicio,
          periodo_analisado: periodoFormatado,
          centro: ind.centro || '',
          linha: ind.linha || '',
          desvio_resumo: act.desvio_resumo,
          causa_raiz_vinculada: causaRaiz || act.causa_raiz_vinculada,
          what_acao: act.what_acao,
          why_motivo: act.why_motivo,
          where_local: act.where_local,
          when_inicio: act.when_inicio,
          when_prazo: act.when_prazo,
          who_responsavel_id: act.who_responsavel_id,
          who_responsavel_nome: act.who_responsavel_nome,
          supervisor_nome: act.supervisor_nome,
          how_como: act.how_como,
          how_much_custo_previsto: act.how_much_custo_previsto,
          how_much_custo_realizado: act.how_much_custo_realizado,
          prioridade: act.prioridade,
          status: act.status,
          percentual_concluido: act.percentual_concluido,
          evidencia_conclusao: act.evidencia_conclusao,
          situacao_eficacia: act.situacao_eficacia,
          data_avaliacao_eficacia: act.data_avaliacao_eficacia,
          indicador_antes: act.indicador_antes,
          indicador_apos: act.indicador_apos,
          evidencias_eficacia: act.evidencias_eficacia,
          comentario_eficacia: act.comentario_eficacia,
          responsavel_avaliacao_eficacia: act.responsavel_avaliacao_eficacia,
        })
      }

      toast({
        title: 'Plano de Ação Salvo com Sucesso',
        description: 'Análise, causa raiz e ações 5W2H gravadas com histórico imutável.',
      })

      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Análise',
        description:
          err?.message || 'Falha na comunicação com o backend. Seus dados foram mantidos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Registrar Eficácia
  const handleRegistrarEficacia = async () => {
    if (!acaoSelecionadaEficaciaId) {
      toast({
        title: 'Selecione uma Ação',
        description: 'Escolha a ação concluída para avaliar a eficácia.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await pcpIndicadoresService.avaliarEficaciaAcao({
        acaoId: acaoSelecionadaEficaciaId,
        situacaoEficacia,
        dataAvaliacao,
        indicadorAntes,
        indicadorApos,
        evidencias: evidenciasEficacia,
        comentario: comentarioEficacia,
        responsavel: responsavelEficacia || usuarioResponsavelNome,
      })

      // Atualizar lista local
      setAcoes((prev) =>
        prev.map((a) =>
          a.id === acaoSelecionadaEficaciaId
            ? {
                ...a,
                situacao_eficacia: situacaoEficacia,
                data_avaliacao_eficacia: dataAvaliacao,
                indicador_antes: indicadorAntes,
                indicador_apos: indicadorApos,
                evidencias_eficacia: evidenciasEficacia,
                comentario_eficacia: comentarioEficacia,
                responsavel_avaliacao_eficacia: responsavelEficacia || usuarioResponsavelNome,
              }
            : a,
        ),
      )

      toast({
        title: 'Avaliação de Eficácia Registrada',
        description: `Resultado registrado como: ${situacaoEficacia}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro na Avaliação de Eficácia',
        description: err?.message || 'Falha ao registrar avaliação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] max-h-[92vh] flex flex-col p-6 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold"
                >
                  {ind.codigo}
                </Badge>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  Workflow de Análise & Ação — {ind.nome}
                </DialogTitle>
                {codigoAnalise && (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
                    {codigoAnalise}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Fluxo Contínuo: Desvio → Análise → 5 Porquês / Ishikawa → Causa Raiz → 5W2H →
                Eficácia
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGerarAnaliseIA}
                disabled={loadingIA}
                className="gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loadingIA ? 'Calculando Hipóteses...' : 'Gerar Análise com IA'}
              </Button>
              <Button
                size="sm"
                onClick={handleSalvarWorkflowCompleto}
                disabled={loading}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-3.5 h-3.5" />
                {loading ? 'Salvando...' : 'Salvar Plano'}
              </Button>
            </div>
          </div>

          {/* Stepper Navegável (8 etapas) */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 pt-3">
            {ETAPAS.map((et) => {
              const isAtiva = etapa === et.id
              const isPassada = etapa > et.id
              return (
                <button
                  key={et.id}
                  onClick={() => setEtapa(et.id)}
                  className={`text-center py-1.5 px-1 rounded text-xs font-medium transition-all ${
                    isAtiva
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : isPassada
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {et.label}
                </button>
              )
            })}
          </div>
        </DialogHeader>

        {/* Conteúdo Dinâmico por Etapa */}
        <div className="flex-1 overflow-y-auto pr-1 py-4">
          {/* ============================================================ */}
          {/* ETAPA 1: Identificação do Desvio */}
          {/* ============================================================ */}
          {etapa === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Indicador:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {ind.nome}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Exercício / Período:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Select
                      value={mesIndex.toString()}
                      onValueChange={(val) => setMesIndex(Number(val))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {linha.meses.map((m) => (
                          <SelectItem key={m.mesIndex} value={m.mesIndex.toString()}>
                            {m.mesNomeLongo}/{anoExercicio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block">Meta Vigente:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatarValorPtBr(metaMes, ind.unidade)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Realizado Apurado:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {formatarValorPtBr(realizadoMes, ind.unidade)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Desvio Absoluto:</span>
                  <span
                    className={`font-bold ${
                      (desvioAbsolutoMes >= 0 && ind.sentido_indicador !== 'MENOR_MELHOR') ||
                      (desvioAbsolutoMes <= 0 && ind.sentido_indicador === 'MENOR_MELHOR')
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {desvioAbsolutoMes > 0 ? '+' : ''}
                    {formatarValorPtBr(desvioAbsolutoMes, ind.unidade)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tendência Recente:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {linha.tendencia}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Usuário Responsável pela Análise</Label>
                  <Select
                    value={usuarioResponsavelId}
                    onValueChange={(uid) => {
                      setUsuarioResponsavelId(uid)
                      const u = usuariosHub.find((x) => x.id === uid)
                      if (u) setUsuarioResponsavelNome(u.name)
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosHub.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Supervisor da Área</Label>
                  <Input
                    value={supervisorNome}
                    onChange={(e) => setSupervisorNome(e.target.value)}
                    placeholder="Ex: Coordenação de Laminação / PCP"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Aprovador do Plano</Label>
                  <Input
                    value={aprovadorNome}
                    onChange={(e) => setAprovadorNome(e.target.value)}
                    placeholder="Ex: Gerência Industrial"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Descrição Detalhada do Problema / Desvio Operacional (Editável pelo Usuário)
                </Label>
                <Textarea
                  value={descricaoProblema}
                  onChange={(e) => setDescricaoProblema(e.target.value)}
                  rows={5}
                  placeholder="Descreva as circunstâncias do desvio, linhas afetadas, paradas e impacto produtivo..."
                  className="mt-1.5 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 2: Análise de Causa & IA PCP */}
          {/* ============================================================ */}
          {etapa === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-200 dark:border-blue-800/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      Análise IA PCP — Motor Diagnóstico Baseado em Dados Reais
                    </h4>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      A IA identifica padrões e sugere hipóteses consultivas. Nenhuma causa raiz é
                      confirmada sem validação humana.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleGerarAnaliseIA}
                  disabled={loadingIA}
                  className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingIA ? 'animate-spin' : ''}`} />
                  Recalcular Hipóteses
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Evidências */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" /> Evidências Encontradas
                  </h5>
                  {iaEvidencias.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Clique em &quot;Gerar Análise com IA&quot; para compilar evidências reais do
                      indicador.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {iaEvidencias.map((ev, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Hipóteses de Causa */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" /> Hipóteses de Causa Sugeridas
                  </h5>
                  {iaHipoteses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Hipóteses geradas pelo cruzamento de paradas, setups e apontamentos MES.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {iaHipoteses.map((hip, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{hip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Dados Faltantes */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-blue-600" /> Dados Faltantes para
                    Investigação
                  </h5>
                  {iaDadosFaltantes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Fontes complementares sugeridas para fechamento da investigação.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {iaDadosFaltantes.map((dado, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{dado}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 3: 5 Porquês */}
          {/* ============================================================ */}
          {etapa === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Método dos 5 Porquês — Investigação Causal Sucessiva
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aprofunde o raciocínio até alcançar a causa raiz sistêmica. Não é obrigatório
                    atingir 5 níveis se a causa raiz for identificada antes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSugerirProximoPorqueIA}
                    className="gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Sugerir Próximo com IA
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (porques.length < 5) {
                        setPorques([
                          ...porques,
                          {
                            nivel: porques.length + 1,
                            pergunta: `Por quê #${porques.length + 1}?`,
                            resposta: '',
                          },
                        ])
                      }
                    }}
                    disabled={porques.length >= 5}
                    className="gap-1 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Nível
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {porques.map((pq, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[11px]">
                        Nível {pq.nivel} de 5
                      </Badge>
                      {porques.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPorques(porques.filter((_, i) => i !== idx))}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] text-slate-500">Pergunta Formulada</Label>
                        <Input
                          value={pq.pergunta}
                          onChange={(e) => {
                            const val = e.target.value
                            setPorques((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, pergunta: val } : item,
                              ),
                            )
                          }}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-slate-500">
                          Resposta / Evidência Apurada
                        </Label>
                        <Input
                          value={pq.resposta}
                          onChange={(e) => {
                            const val = e.target.value
                            setPorques((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, resposta: val } : item,
                              ),
                            )
                          }}
                          placeholder="Informe a resposta encontrada na investigação..."
                          className="mt-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 4: Ishikawa 6M */}
          {/* ============================================================ */}
          {etapa === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Diagrama de Causa e Efeito (Espinha de Peixe / Ishikawa 6M)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Estruture as causas por categoria: Método, Máquina, Mão de obra, Material, Medição
                  e Meio ambiente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(
                  [
                    { key: 'metodo', label: 'Método (Procedimentos e Padrões)' },
                    { key: 'maquina', label: 'Máquina (Equipamentos e Ferramental)' },
                    { key: 'mao_de_obra', label: 'Mão de Obra (Operação e Treinamento)' },
                    { key: 'material', label: 'Material (Matéria-prima e Insumos)' },
                    { key: 'medicao', label: 'Medição (Sensores e Apontamentos)' },
                    { key: 'meio_ambiente', label: 'Meio Ambiente (Temperatura e Layout)' },
                  ] as const
                ).map(({ key, label }) => {
                  const items = ishikawa[key]
                  return (
                    <div
                      key={key}
                      className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {label}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {items.length}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 my-2 min-h-[60px] max-h-[140px] overflow-y-auto">
                          {items.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic block py-2">
                              Nenhuma causa registrada nesta categoria.
                            </span>
                          ) : (
                            items.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-center justify-between text-xs p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800"
                              >
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <Badge
                                    className={`text-[9px] px-1 py-0 ${
                                      it.tipo === 'CONFIRMADA'
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {it.tipo}
                                  </Badge>
                                  <span className="truncate text-slate-700 dark:text-slate-300">
                                    {it.descricao}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoverIshikawa(key, it.id)}
                                  className="h-5 w-5 p-0 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex gap-1">
                        <Input
                          id={`input-ish-${key}`}
                          placeholder="Nova causa..."
                          className="h-7 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget
                              handleAdicionarIshikawa(key, input.value, 'PROVAVEL')
                              input.value = ''
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2"
                          onClick={() => {
                            const el = document.getElementById(
                              `input-ish-${key}`,
                            ) as HTMLInputElement
                            if (el && el.value) {
                              handleAdicionarIshikawa(key, el.value, 'PROVAVEL')
                              el.value = ''
                            }
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 5: Causa Raiz & Validação */}
          {/* ============================================================ */}
          {etapa === 5 && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-lg border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <strong>Regra de Governança CIAFAL:</strong> A Causa Raiz nunca é alterada para
                  &quot;Confirmada&quot; automaticamente pela IA. É obrigatório indicar o
                  responsável e a validação técnica humana com evidências.
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">
                    Causa Raiz Identificada (Foco do Plano de Ação)
                  </Label>
                  <Textarea
                    value={causaRaiz}
                    onChange={(e) => setCausaRaiz(e.target.value)}
                    rows={3}
                    placeholder="Sintetize a causa raiz conclusiva que gerou o desvio do indicador..."
                    className="mt-1 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Método Utilizado</Label>
                    <Select value={metodoUtilizado} onValueChange={setMetodoUtilizado}>
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5 Porquês + Ishikawa 6M">
                          5 Porquês + Ishikawa 6M
                        </SelectItem>
                        <SelectItem value="5 Porquês">Apenas 5 Porquês</SelectItem>
                        <SelectItem value="Ishikawa 6M">Apenas Ishikawa 6M</SelectItem>
                        <SelectItem value="Análise de Árvore de Falhas (FTA)">
                          Árvore de Falhas (FTA)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Status da Causa Raiz</Label>
                    <Select
                      value={statusCausaRaiz}
                      onValueChange={(v: any) => setStatusCausaRaiz(v)}
                    >
                      <SelectTrigger className="mt-1 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EM_INVESTIGACAO">Em Investigação</SelectItem>
                        <SelectItem value="CAUSA_PROVAVEL">Causa Provável</SelectItem>
                        <SelectItem value="CAUSA_CONFIRMADA">
                          Causa Confirmada (Validada)
                        </SelectItem>
                        <SelectItem value="NAO_CONFIRMADA">Não Confirmada (Descartada)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Responsável pela Validação Técnica</Label>
                    <Input
                      value={responsavelValidacao}
                      onChange={(e) => setResponsavelValidacao(e.target.value)}
                      placeholder="Ex: Supervisor de Laminação"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Evidência Comprobatória da Causa</Label>
                    <Input
                      value={evidenciaCausaRaiz}
                      onChange={(e) => setEvidenciaCausaRaiz(e.target.value)}
                      placeholder="Ex: Registro fotográfico, log MES, ordem de manutenção OM-4821"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Data da Validação</Label>
                    <Input
                      type="date"
                      value={dataValidacao}
                      onChange={(e) => setDataValidacao(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 6: Plano 5W2H */}
          {/* ============================================================ */}
          {etapa === 6 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Plano de Ação 5W2H — Múltiplas Ações para a Mesma Causa Raiz
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Crie ações estruturadas com responsáveis vinculados aos usuários reais do HUB
                  Ciafal.
                </p>
              </div>

              {/* Formulário de Nova Ação */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="font-semibold text-xs text-blue-700 dark:text-blue-300">
                  + Adicionar Nova Ação ao Plano
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs">What (O que será feito?)</Label>
                    <Input
                      value={novaAcao.what}
                      onChange={(e) => setNovaAcao({ ...novaAcao, what: e.target.value })}
                      placeholder="Ex: Padronizar gabarito de regulagem do passe 4 e treinar equipe de turno"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Why (Por que será feito?)</Label>
                    <Input
                      value={novaAcao.why}
                      onChange={(e) => setNovaAcao({ ...novaAcao, why: e.target.value })}
                      placeholder="Ex: Eliminar desvio dimensional na partida"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Where (Onde?)</Label>
                    <Input
                      value={novaAcao.where}
                      onChange={(e) => setNovaAcao({ ...novaAcao, where: e.target.value })}
                      placeholder="Ex: Linha L1 / Centro Laminação"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Who (Responsável HUB)</Label>
                    <Select
                      value={novaAcao.who_id}
                      onValueChange={(uid) => {
                        const u = usuariosHub.find((x) => x.id === uid)
                        setNovaAcao({
                          ...novaAcao,
                          who_id: uid,
                          who_nome: u ? u.name : 'Responsável',
                        })
                      }}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue placeholder="Selecione usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuariosHub.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">When (Início)</Label>
                    <Input
                      type="date"
                      value={novaAcao.when_inicio}
                      onChange={(e) => setNovaAcao({ ...novaAcao, when_inicio: e.target.value })}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">When (Prazo Final * obrigatório)</Label>
                    <Input
                      type="date"
                      value={novaAcao.when_prazo}
                      onChange={(e) => setNovaAcao({ ...novaAcao, when_prazo: e.target.value })}
                      className="mt-1 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">How (Como será executado?)</Label>
                    <Input
                      value={novaAcao.how}
                      onChange={(e) => setNovaAcao({ ...novaAcao, how: e.target.value })}
                      placeholder="Ex: Realizar workshop prático no turno da manhã com suporte do SGQ"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Prioridade</Label>
                    <Select
                      value={novaAcao.prioridade}
                      onValueChange={(val: any) => setNovaAcao({ ...novaAcao, prioridade: val })}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICA">Crítica</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="MEDIA">Média</SelectItem>
                        <SelectItem value="BAIXA">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleAdicionarAcao}
                    className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Ação ao Plano
                  </Button>
                </div>
              </div>

              {/* Tabela de Ações Cadastradas */}
              <div>
                <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Ações Vinculadas a este Indicador ({acoes.length})
                </h5>
                {acoes.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center text-xs text-slate-400">
                    Nenhuma ação adicionada ainda. Preencha o formulário acima para compor o plano
                    5W2H.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="p-2 text-left">Código / Ação (What)</th>
                          <th className="p-2 text-left">Responsável</th>
                          <th className="p-2 text-left">Prazo</th>
                          <th className="p-2 text-left">Prioridade</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {acoes.map((act) => (
                          <tr key={act.id}>
                            <td className="p-2 font-medium">
                              <span className="text-[10px] text-slate-400 block">{act.codigo}</span>
                              {act.what_acao}
                            </td>
                            <td className="p-2">{act.who_responsavel_nome}</td>
                            <td className="p-2 font-medium">{formatarDataPtBr(act.when_prazo)}</td>
                            <td className="p-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  act.prioridade === 'CRITICA'
                                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                                    : act.prioridade === 'ALTA'
                                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                                      : 'bg-slate-50 text-slate-700'
                                }`}
                              >
                                {act.prioridade}
                              </Badge>
                            </td>
                            <td className="p-2">
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
                            <td className="p-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAcoes(acoes.filter((a) => a.id !== act.id))}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 7: Acompanhamento da Execução */}
          {/* ============================================================ */}
          {etapa === 7 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Acompanhamento da Execução do Plano de Ação
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Atualize o progresso físico (%), evidências e altere os status das ações em
                  andamento.
                </p>
              </div>

              {acoes.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  Nenhuma ação cadastrada para acompanhamento. Volte à Etapa 6 para adicionar ações.
                </div>
              ) : (
                <div className="space-y-3">
                  {acoes.map((act, idx) => (
                    <div
                      key={act.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-mono text-slate-400">{act.codigo}</span>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {act.what_acao}
                          </h5>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Prazo: {formatarDataPtBr(act.when_prazo)}
                          </Badge>
                          <Select
                            value={act.status}
                            onValueChange={(novoStatus: any) => {
                              setAcoes((prev) =>
                                prev.map((a, i) =>
                                  i === idx
                                    ? {
                                        ...a,
                                        status: novoStatus,
                                        percentual_concluido:
                                          novoStatus === 'CONCLUIDA' ? 100 : a.percentual_concluido,
                                        data_real_conclusao:
                                          novoStatus === 'CONCLUIDA'
                                            ? new Date().toISOString().split('T')[0]
                                            : a.data_real_conclusao,
                                      }
                                    : a,
                                ),
                              )
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs font-semibold w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NAO_INICIADA">Não Iniciada</SelectItem>
                              <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                              <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                              <SelectItem value="ATRASADA">Atrasada</SelectItem>
                              <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                              <SelectItem value="CANCELADA">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[11px] text-slate-500">
                            % Concluído ({act.percentual_concluido || 0}%)
                          </Label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={act.percentual_concluido || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setAcoes((prev) =>
                                prev.map((a, i) =>
                                  i === idx
                                    ? {
                                        ...a,
                                        percentual_concluido: val,
                                        status:
                                          val === 100
                                            ? 'CONCLUIDA'
                                            : a.status === 'NAO_INICIADA'
                                              ? 'EM_ANDAMENTO'
                                              : a.status,
                                        data_real_conclusao:
                                          val === 100
                                            ? new Date().toISOString().split('T')[0]
                                            : a.data_real_conclusao,
                                      }
                                    : a,
                                ),
                              )
                            }}
                            className="w-full mt-2"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-[11px] text-slate-500">
                            Evidência de Execução / Observação
                          </Label>
                          <Input
                            value={act.evidencia_conclusao || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setAcoes((prev) =>
                                prev.map((a, i) =>
                                  i === idx ? { ...a, evidencia_conclusao: val } : a,
                                ),
                              )
                            }}
                            placeholder="Descreva o teste realizado, documento ou validação de encerramento..."
                            className="mt-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 8: Avaliação de Eficácia */}
          {/* ============================================================ */}
          {etapa === 8 && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-lg border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 dark:text-blue-200">
                  <strong>Regra de Eficácia:</strong> A conclusão física da ação não encerra o
                  problema automaticamente. É necessário aguardar o ciclo produtivo seguinte para
                  verificar se o indicador retornou à meta. Se &quot;Ineficaz&quot;, uma nova
                  análise ou ação vinculada é permitida.
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Selecione a Ação a Avaliar</Label>
                    <Select
                      value={acaoSelecionadaEficaciaId}
                      onValueChange={setAcaoSelecionadaEficaciaId}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue placeholder="Escolha a ação do plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {acoes.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.codigo} — {a.what_acao.slice(0, 45)}... ({a.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">
                      Resultado da Avaliação de Eficácia
                    </Label>
                    <Select
                      value={situacaoEficacia}
                      onValueChange={(val: any) => setSituacaoEficacia(val)}
                    >
                      <SelectTrigger className="mt-1 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGUARDANDO_AVALIACAO">
                          Aguardando Período de Avaliação
                        </SelectItem>
                        <SelectItem value="EFICAZ">Eficaz (Meta Atingida e Sustentada)</SelectItem>
                        <SelectItem value="PARCIALMENTE_EFICAZ">Parcialmente Eficaz</SelectItem>
                        <SelectItem value="INEFICAZ">Ineficaz (Problema Reincidente)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Data da Avaliação</Label>
                    <Input
                      type="date"
                      value={dataAvaliacao}
                      onChange={(e) => setDataAvaliacao(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Indicador Antes</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={indicadorAntes}
                      onChange={(e) => setIndicadorAntes(Number(e.target.value))}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Indicador Após Ação</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={indicadorApos}
                      onChange={(e) => setIndicadorApos(Number(e.target.value))}
                      className="mt-1 text-xs font-semibold text-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">
                    Evidências da Avaliação (Dados / Relatórios / Amostras)
                  </Label>
                  <Input
                    value={evidenciasEficacia}
                    onChange={(e) => setEvidenciasEficacia(e.target.value)}
                    placeholder="Ex: Resultados das 3 semanas posteriores mostraram cumprimento de 97,5%"
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs">Parecer Técnico / Comentário Conclusivo</Label>
                  <Textarea
                    value={comentarioEficacia}
                    onChange={(e) => setComentarioEficacia(e.target.value)}
                    rows={3}
                    placeholder="Parecer final da engenharia/PCP sobre a eficácia da ação implementada..."
                    className="mt-1 text-xs"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={handleRegistrarEficacia}
                    disabled={loading || !acaoSelecionadaEficaciaId}
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Registrar Avaliação de Eficácia
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Navegação do Stepper */}
        <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEtapa((prev) => Math.max(1, prev - 1))}
              disabled={etapa === 1}
              className="gap-1 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEtapa((prev) => Math.min(8, prev + 1))}
              disabled={etapa === 8}
              className="gap-1 text-xs"
            >
              Próximo <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarWorkflowCompleto}
              disabled={loading}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Gravando...' : 'Salvar Plano & Ações'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default GerarAnaliseAcaoModal
