import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  FileText,
  Mail,
  Sliders,
  History,
  Download,
  RefreshCw,
  Database,
  Printer,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { FacaExecutiveCards } from '@/components/faca/FacaExecutiveCards'
import { FacaAnaliticaTable } from '@/components/faca/FacaAnaliticaTable'
import { FacaMateriaPrimaSection } from '@/components/faca/FacaMateriaPrimaSection'
import { FacaChartsSection } from '@/components/faca/FacaChartsSection'
import { FacaAlertasIASection } from '@/components/faca/FacaAlertasIASection'
import { FacaCardDrilldownModal } from '@/components/faca/FacaCardDrilldownModal'
import { FacaMaterialDetailModal } from '@/components/faca/FacaMaterialDetailModal'
import { FacaParametrizacaoModal } from '@/components/faca/FacaParametrizacaoModal'
import { FacaRelatorioModal } from '@/components/faca/FacaRelatorioModal'
import { FacaEnvioEmailModal } from '@/components/faca/FacaEnvioEmailModal'
import { FacaHistoricoModal } from '@/components/faca/FacaHistoricoModal'
import { FacaFilterBar } from '@/components/faca/FacaFilterBar'
import {
  FacaItemAnalitico,
  FacaMateriaPrimaDetalhe,
  FacaCardKpis,
  FacaAlertaIA,
  FacaRelatorioExecutivo,
  FacaMaterialParametrizado,
  FacaVinculoPaMp,
  FacaAnaliseHistoricoItem,
  FacaEnvioEmailItem,
  FacaFiltrosState,
} from '@/types/faca-analise'
import { FacaAnaliseService } from '@/services/faca-analise-service'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

export const AnaliseFacaPage: React.FC = () => {
  const { can } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [itens, setItens] = useState<FacaItemAnalitico[]>([])
  const [materiasPrimas, setMateriasPrimas] = useState<FacaMateriaPrimaDetalhe[]>([])
  const [kpis, setKpis] = useState<FacaCardKpis>({
    carteira_total_t: 0,
    estoque_disponivel_pa_t: 0,
    necessidade_producao_t: 0,
    mp_especifica_disponivel_t: 0,
    mp_necessaria_t: 0,
    faturamento_potencial_brl: 0,
    faturamento_confirmado_brl: 0,
    estoque_sem_pedido_t: 0,
    carteira_minima_abaixo_t: 0,
    pedidos_criticos_count: 0,
  })
  const [alertasIA, setAlertasIA] = useState<FacaAlertaIA[]>([])
  const [materiaisParam, setMateriaisParam] = useState<FacaMaterialParametrizado[]>([])
  const [vinculosPaMp, setVinculosPaMp] = useState<FacaVinculoPaMp[]>([])
  const [historicoAnalises, setHistoricoAnalises] = useState<FacaAnaliseHistoricoItem[]>([])
  const [historicoEnvios, setHistoricoEnvios] = useState<FacaEnvioEmailItem[]>([])

  // Modais
  const [drilldownCardKey, setDrilldownCardKey] = useState<string | null>(null)
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<FacaItemAnalitico | null>(
    null,
  )
  const [isParamModalOpen, setIsParamModalOpen] = useState(false)
  const [isRelatorioModalOpen, setIsRelatorioModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false)
  const [relatorioAtual, setRelatorioAtual] = useState<FacaRelatorioExecutivo | null>(null)
  const [analiseIdAtual, setAnaliseIdAtual] = useState<string | undefined>(undefined)

  // Filtros
  const [filtros, setFiltros] = useState<FacaFiltrosState>({
    empresa: 'TODAS',
    centro: 'TODOS',
    linha: 'TODAS',
    material: 'TODOS',
    bitola: '',
    tipo_aco: 'TODOS',
    cliente: 'TODOS',
    periodo: 'TODOS',
    status_carteira: 'TODOS',
    situacao_mp: 'TODAS',
  })

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [analitico, matParam, vinc, histAn, histEnv] = await Promise.all([
        FacaAnaliseService.getDadosAnaliticosCompletos(),
        FacaAnaliseService.getMateriaisParametrizados(),
        FacaAnaliseService.getVinculosPaMp(),
        FacaAnaliseService.getHistoricoAnalises(),
        FacaAnaliseService.getHistoricoEnvios(),
      ])

      setItens(analitico.itens)
      setMateriasPrimas(analitico.materiasPrimas)
      setKpis(analitico.kpis)
      setAlertasIA(analitico.alertasIA)
      setMateriaisParam(matParam)
      setVinculosPaMp(vinc)
      setHistoricoAnalises(histAn)
      setHistoricoEnvios(histEnv)

      // Prepara relatório preliminar
      const rel = FacaAnaliseService.gerarRelatorioExecutivo(
        analitico.itens,
        analitico.materiasPrimas,
        analitico.kpis,
        analitico.alertasIA,
        'CIAFAL',
        '1100',
      )
      setRelatorioAtual(rel)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados de FACA',
        description: err.message || 'Falha na comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Filtragem dos itens na tabela
  const itensFiltrados = itens.filter((i) => {
    if (filtros.empresa !== 'TODAS' && i.empresa !== filtros.empresa) return false
    if (filtros.centro !== 'TODOS' && i.centro !== filtros.centro) return false
    if (filtros.linha !== 'TODAS' && i.linha_preferencial !== filtros.linha) return false
    if (filtros.material !== 'TODOS' && i.codigo_material !== filtros.material) return false
    if (filtros.bitola && !i.bitola.toLowerCase().includes(filtros.bitola.toLowerCase()))
      return false
    if (filtros.tipo_aco !== 'TODOS' && i.tipo_aco !== filtros.tipo_aco) return false
    if (filtros.cliente !== 'TODOS' && i.cliente !== filtros.cliente) return false
    if (filtros.status_carteira !== 'TODOS' && i.status_atendimento !== filtros.status_carteira)
      return false
    return true
  })

  const handleGerarAnaliseIA = async () => {
    try {
      const rel = FacaAnaliseService.gerarRelatorioExecutivo(
        itens,
        materiasPrimas,
        kpis,
        alertasIA,
        'CIAFAL',
        '1100',
      )
      setRelatorioAtual(rel)

      // Salva no histórico
      const salvo = await FacaAnaliseService.salvarAnaliseNoHistorico(
        rel,
        'RASCUNHO',
        'Programador PCP / HUB CIAFAL',
        'pcp@ciafal.com.br',
      )
      setAnaliseIdAtual(salvo.id)

      const novoHist = await FacaAnaliseService.getHistoricoAnalises()
      setHistoricoAnalises(novoHist)

      setIsRelatorioModalOpen(true)
      toast({
        title: 'Análise de FACA gerada com sucesso',
        description: `Código rastreável: ${salvo.codigo_analise}. Relatório pronto para revisão.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar análise',
        description: err.message || 'Falha ao processar relatório executivo.',
        variant: 'destructive',
      })
    }
  }

  const handleSalvarEdicaoRelatorio = async (relAtualizado: FacaRelatorioExecutivo) => {
    setRelatorioAtual(relAtualizado)
    const salvo = await FacaAnaliseService.salvarAnaliseNoHistorico(
      relAtualizado,
      'REVISADO',
      'Programador PCP (Editado)',
      'pcp@ciafal.com.br',
    )
    setAnaliseIdAtual(salvo.id)
    const novoHist = await FacaAnaliseService.getHistoricoAnalises()
    setHistoricoAnalises(novoHist)
  }

  const handleEnvioRegistrado = async () => {
    const [novoHistEnv, novoHistAn] = await Promise.all([
      FacaAnaliseService.getHistoricoEnvios(),
      FacaAnaliseService.getHistoricoAnalises(),
    ])
    setHistoricoEnvios(novoHistEnv)
    setHistoricoAnalises(novoHistAn)
  }

  const materiaisOpcoes = Array.from(new Set(itens.map((i) => i.codigo_material))).sort()
  const clientesOpcoes = Array.from(
    new Set(itens.map((i) => i.cliente).filter((c) => c !== 'SEM CARTEIRA ATIVA (DISPONÍVEL)')),
  ).sort()

  return (
    <div className="space-y-4 p-4 lg:p-6 bg-slate-50/50 min-h-screen">
      {/* Barra de Navegação Superior da Análise de Carteira (Preserva os 11 subtópicos) */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => navigate('/pcp/analise-carteira')}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#004C97] hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
          >
            1. Carteira Geral
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/l1')}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#004C97] hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
          >
            2. Carteira L1
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/l2')}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#004C97] hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
          >
            3. Carteira L2
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/sdc')}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#004C97] hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
          >
            4. SDC
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/revenda')}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#004C97] hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
          >
            5. Revenda
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/importado')}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#004C97] hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
          >
            6. Importado
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/mto')}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#004C97] hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
          >
            7. MTO
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/kpis')}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#004C97] hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
          >
            8. KPI's
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/cancelados')}
            className="px-3 py-1.5 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-50 font-medium transition-colors whitespace-nowrap"
          >
            9. Cancelados
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/carteira-minima-nao-atingida')}
            className="px-3 py-1.5 rounded-lg text-amber-700 hover:text-amber-900 hover:bg-amber-50 font-medium transition-colors whitespace-nowrap"
          >
            10. Carteira Mínima
          </button>
          <button
            onClick={() => navigate('/pcp/analise-carteira/faca')}
            className="px-3 py-1.5 rounded-lg bg-[#004C97] text-white font-bold transition-colors whitespace-nowrap shadow-xs"
          >
            11. Análise de FACA
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold"
          >
            SAP RFC Conectado
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            onClick={carregarDados}
            disabled={loading}
            className="h-7 w-7 text-slate-600 hover:text-[#004C97]"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Cabeçalho da Tela Oficial */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Análise de FACA</h1>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold tracking-wide">
              PCP ROBOTIZADO
            </Badge>
          </div>
          <p className="text-xs text-slate-600 pt-0.5">
            Carteira, estoques, matéria-prima e previsão de faturamento.
          </p>
          <div className="flex items-center gap-3 pt-1.5 text-[11px] text-slate-500 font-medium">
            <span>
              Fonte: <strong>SAP ECC (RFC ZSD28C / MB52 / CS03)</strong>
            </span>
            <span>&bull;</span>
            <span>
              Centro Padrão: <strong>1100 (Matriz CIAFAL)</strong>
            </span>
            <span>&bull;</span>
            <span>
              Ref. E-mail: <strong>FACA - previsão de faturamentonovos pedidos.msg</strong>
            </span>
          </div>
        </div>

        {/* Barra de Ações Principais (Etapas 4 e 5) */}
        <div className="flex flex-wrap items-center gap-2">
          {can('pcp.faca.generate') && (
            <Button
              size="sm"
              onClick={handleGerarAnaliseIA}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> Gerar Análise IA
            </Button>
          )}

          {can('pcp.faca.edit') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRelatorioModalOpen(true)}
              disabled={!relatorioAtual}
              className="text-xs font-semibold gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#004C97]" /> Editar Relatório
            </Button>
          )}

          {can('pcp.faca.send') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEmailModalOpen(true)}
              disabled={!relatorioAtual}
              className="text-xs font-semibold gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-blue-700" /> Visualizar / Enviar E-mail
            </Button>
          )}

          {can('pcp.faca.manage_params') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsParamModalOpen(true)}
              className="text-xs font-semibold gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-700" /> Parametrização
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsHistoricoModalOpen(true)}
            className="text-xs font-semibold gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-slate-700" /> Histórico ({historicoAnalises.length}
            )
          </Button>
        </div>
      </div>

      {/* Filtros Analíticos Completos */}
      <FacaFilterBar
        filtros={filtros}
        onChangeFiltros={setFiltros}
        onResetFiltros={() =>
          setFiltros({
            empresa: 'TODAS',
            centro: 'TODOS',
            linha: 'TODAS',
            material: 'TODOS',
            bitola: '',
            tipo_aco: 'TODOS',
            cliente: 'TODOS',
            periodo: 'TODOS',
            status_carteira: 'TODOS',
            situacao_mp: 'TODAS',
          })
        }
        materiaisOpcoes={materiaisOpcoes}
        clientesOpcoes={clientesOpcoes}
      />

      {/* 9 Cards Executivos Clicáveis */}
      <FacaExecutiveCards kpis={kpis} onCardClick={(key) => setDrilldownCardKey(key)} />

      {/* Seção Alertas & IA — Diagnóstico Automático FACA (Situações A–F) */}
      <FacaAlertasIASection
        alertas={alertasIA}
        onFiltrarMaterial={(cod) => setFiltros({ ...filtros, material: cod })}
      />

      {/* Gráficos Interativos (Etapa 3) */}
      <FacaChartsSection itens={itensFiltrados} materiasPrimas={materiasPrimas} />

      {/* Tabela Principal Analítica com as 25 Colunas Oficiais (Etapa 3) */}
      <FacaAnaliticaTable
        itens={itensFiltrados}
        onOpenDetalheMaterial={(item) => setSelectedMaterialDetail(item)}
      />

      {/* Seção Exclusiva Matéria-Prima FACA (Etapa 3) */}
      <FacaMateriaPrimaSection materiasPrimas={materiasPrimas} />

      {/* Modais do Sistema */}
      <FacaCardDrilldownModal
        cardKey={drilldownCardKey}
        isOpen={Boolean(drilldownCardKey)}
        onClose={() => setDrilldownCardKey(null)}
        kpis={kpis}
        itens={itens}
        alertas={alertasIA}
      />

      <FacaMaterialDetailModal
        item={selectedMaterialDetail}
        isOpen={Boolean(selectedMaterialDetail)}
        onClose={() => setSelectedMaterialDetail(null)}
      />

      <FacaParametrizacaoModal
        isOpen={isParamModalOpen}
        onClose={() => setIsParamModalOpen(false)}
        materiais={materiaisParam}
        vinculos={vinculosPaMp}
        onSalvo={carregarDados}
      />

      <FacaRelatorioModal
        relatorio={relatorioAtual}
        isOpen={isRelatorioModalOpen}
        onClose={() => setIsRelatorioModalOpen(false)}
        onSalvarEdicao={handleSalvarEdicaoRelatorio}
        onAbrirEnvioEmail={() => {
          setIsRelatorioModalOpen(false)
          setIsEmailModalOpen(true)
        }}
      />

      <FacaEnvioEmailModal
        relatorio={relatorioAtual}
        analiseId={analiseIdAtual}
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onEnvioRegistrado={handleEnvioRegistrado}
      />

      <FacaHistoricoModal
        isOpen={isHistoricoModalOpen}
        onClose={() => setIsHistoricoModalOpen(false)}
        historicoAnalises={historicoAnalises}
        historicoEnvios={historicoEnvios}
        onVisualizarAnalise={(an) => {
          setRelatorioAtual(an.relatorio_estruturado)
          setIsHistoricoModalOpen(false)
          setIsRelatorioModalOpen(true)
        }}
      />
    </div>
  )
}

export default AnaliseFacaPage
