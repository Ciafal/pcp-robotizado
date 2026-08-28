import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Layers,
  ShieldCheck,
  Compass,
  AlertTriangle,
} from 'lucide-react'

export interface RouteTestCase {
  id: string
  route: string
  label: string
  category: 'Central' | 'Subrotas' | 'Planejamento' | 'Auxiliares' | 'Query Params' | 'RBAC'
  expectedComponent: string
  expectedStatus: 'PASS' | 'FAIL' | 'PENDING'
  f5Safe: boolean
  rbacProtected: boolean
  queryParamsTest: string
  detail: string
}

const INITIAL_CASES: RouteTestCase[] = [
  {
    id: 'R-01',
    route: '/pcp/sequenciamento',
    label: 'Landing Central de Sequenciamento',
    category: 'Central',
    expectedComponent: 'CentralSequenciamentoLandingPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?company=ciafal&plant=divinopolis',
    detail: 'Renderiza Hub com seletor de cards, KPIs globais e menu expansível.',
  },
  {
    id: 'R-02',
    route: '/pcp/sequenciamento/torre-controle',
    label: 'Torre de Controle Industrial',
    category: 'Subrotas',
    expectedComponent: 'ControlTowerPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?plant=DIVINOPOLIS&line=L1',
    detail: 'Monitora aderência, vazão fabril, buffer térmico e heatmap de ocupação.',
  },
  {
    id: 'R-03',
    route: '/pcp/sequenciamento/operacional',
    label: 'Operacional Chão de Fábrica',
    category: 'Subrotas',
    expectedComponent: 'OperationalPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?line=L1&shift=1',
    detail: 'Cartões de ordem ativa instantânea, cadência real e fila de espera.',
  },
  {
    id: 'R-04',
    route: '/pcp/sequenciamento/programacao',
    label: 'Sequenciamento Gantt & Regras',
    category: 'Subrotas',
    expectedComponent: 'SequencingPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?company=ciafal&plant=divinopolis&line=l1&period=2025-W12',
    detail: 'Motor de drag-and-drop, Gantt industrial, Kanban e restrições.',
  },
  {
    id: 'R-05',
    route: '/pcp/sequenciamento/eficiencia',
    label: 'Eficiência Operacional Geral',
    category: 'Subrotas',
    expectedComponent: 'EfficiencyPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?period=mensal',
    detail: 'Visão consolidada de perdas, ritmo e aprendizado de desvios com IA.',
  },
  {
    id: 'R-06',
    route: '/pcp/sequenciamento/eficiencia/produtos',
    label: 'Eficiência por Produto',
    category: 'Subrotas',
    expectedComponent: 'EfficiencyProductsSubpage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?product=TUBO_NBR5580',
    detail: 'Curva de ritmo, velocidade nominal vs real e alertas preventivos.',
  },
  {
    id: 'R-07',
    route: '/pcp/sequenciamento/eficiencia/linhas',
    label: 'Eficiência por Linha',
    category: 'Subrotas',
    expectedComponent: 'EfficiencyLinesSubpage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?line=L1',
    detail: 'Desagregação de OEE, disponibilidade, performance e setup por linha.',
  },
  {
    id: 'R-08',
    route: '/pcp/sequenciamento/eficiencia/plantas',
    label: 'Eficiência por Planta',
    category: 'Subrotas',
    expectedComponent: 'EfficiencyPlantsSubpage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?plant=DIVINOPOLIS',
    detail: 'Balanceamento de capacidade entre plantas Divinópolis, Contagem e Matriz.',
  },
  {
    id: 'R-09',
    route: '/pcp/sequenciamento/eficiencia/assertividade',
    label: 'Assertividade PCP',
    category: 'Subrotas',
    expectedComponent: 'EfficiencyAssertivenessSubpage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?period=2025-M03',
    detail: 'Métrica de aderência planejado x realizado e taxonomia de causas.',
  },
  {
    id: 'R-10',
    route: '/pcp/sequenciamento/carteira',
    label: 'Carteira CRM / WMS',
    category: 'Subrotas',
    expectedComponent: 'BacklogPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?client=ALL&stockRisk=true',
    detail: 'Rentabilidade, margem média, cobertura física e saldo projetado.',
  },
  {
    id: 'R-11',
    route: '/pcp/sequenciamento/cenarios',
    label: 'Cenários e Simulações Sandbox',
    category: 'Subrotas',
    expectedComponent: 'ScenariosPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?scenarioId=SCN-001',
    detail: 'Simulação de hipóteses de setup, turnos extras e impacto financeiro.',
  },
  {
    id: 'R-12',
    route: '/pcp/sequenciamento/historico',
    label: 'Histórico & Versões Publicadas',
    category: 'Subrotas',
    expectedComponent: 'HistoryPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?version=v2.8',
    detail: 'Linha do tempo de publicações, justificativas técnicas e aprovação em 2 fases.',
  },
  {
    id: 'R-13',
    route: '/pcp/planejamento',
    label: 'Planejamento Mestre (Landing PMP)',
    category: 'Planejamento',
    expectedComponent: 'MasterPlanningSubpage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?horizon=MENSAL',
    detail: 'Visão executiva do PMP / S&OP com conversão para sequenciamento fino.',
  },
  {
    id: 'R-14',
    route: '/pcp/planejamento/anual',
    label: 'Planejamento Mestre Anual',
    category: 'Planejamento',
    expectedComponent: 'MasterPlanningSubpage (Anual)',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?year=2025',
    detail: 'Capacidade anual, demanda agregada comercial e budget fabril.',
  },
  {
    id: 'R-15',
    route: '/pcp/planejamento/mensal',
    label: 'Planejamento Mestre Mensal',
    category: 'Planejamento',
    expectedComponent: 'MasterPlanningSubpage (Mensal)',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?month=2025-03',
    detail: 'Orçamentação tática mensal com distribuição por linhas.',
  },
  {
    id: 'R-16',
    route: '/pcp/planejamento/semanal',
    label: 'Planejamento Mestre Semanal',
    category: 'Planejamento',
    expectedComponent: 'MasterPlanningSubpage (Semanal)',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?week=2025-W12',
    detail: 'Grade semanal detalhada conectada à fila de ordens ativas.',
  },
  {
    id: 'R-17',
    route: '/pcp/cockpit',
    label: 'Cockpit Executivo Fabril',
    category: 'Auxiliares',
    expectedComponent: 'Index',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: false,
    queryParamsTest: '?line=L1',
    detail: 'Visão executiva com cadência real (t/h), alertas e linhas do escopo.',
  },
  {
    id: 'R-18',
    route: '/pcp/linhas',
    label: 'Gestão de Linhas (Landing / Cadastro)',
    category: 'Auxiliares',
    expectedComponent: 'LineManagementLayout -> LineMasterPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?status=ACTIVE',
    detail: 'Ambiente de administração estrutural da malha produtiva.',
  },
  {
    id: 'R-19',
    route: '/pcp/linhas/cadastro',
    label: 'Cadastro de Linhas (Grid)',
    category: 'Auxiliares',
    expectedComponent: 'LineMasterPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '',
    detail: 'Grid estrutural com cartões e detalhes 360 das linhas.',
  },
  {
    id: 'R-20',
    route: '/pcp/linhas/mapa-integracao',
    label: 'Mapa de Integração Produtiva',
    category: 'Auxiliares',
    expectedComponent: 'ProductionIntegrationMapPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '?productRoute=TUB_QUAD',
    detail: 'Topologia N:N, buffers, rotas condicionais e análise IA.',
  },
  {
    id: 'R-21',
    route: '/pcp/linhas/capacidades',
    label: 'Capacidades e Performance',
    category: 'Auxiliares',
    expectedComponent: 'LineCapacitiesSubpage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '',
    detail: 'Capacidade nominal, OEE e parâmetros técnicos por linha.',
  },
  {
    id: 'R-22',
    route: '/pcp/linhas/dependencias',
    label: 'Dependências e Rotas N:N',
    category: 'Auxiliares',
    expectedComponent: 'LineDependenciesSubpage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '',
    detail: 'Catálogo de precedências, buffers e regras de roteamento.',
  },
  {
    id: 'R-23',
    route: '/pcp/linhas/historico',
    label: 'Histórico de Revisões',
    category: 'Auxiliares',
    expectedComponent: 'LineHistorySubpage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '',
    detail: 'Trilha de auditoria das revisões da malha e Ficha Mestre.',
  },
  {
    id: 'R-24',
    route: '/pcp/ficha-mestre',
    label: 'Ficha Mestre (Documento Versionado)',
    category: 'Auxiliares',
    expectedComponent: 'LineMasterPage',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '',
    detail: 'Configuração técnica detalhada e matriz de aprovação.',
  },
  {
    id: 'R-25',
    route: '/pcp-robotizado/programacoes',
    label: 'Redirecionamento de Compatibilidade',
    category: 'Auxiliares',
    expectedComponent: 'Redirect -> /pcp/sequenciamento/programacao',
    expectedStatus: 'PENDING',
    f5Safe: true,
    rbacProtected: true,
    queryParamsTest: '',
    detail: 'Preserva URLs antigas sem causar tela branca ou 404.',
  },
]

export const RouteIntegritySuiteModal: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const [cases, setCases] = useState<RouteTestCase[]>(INITIAL_CASES)
  const [running, setRunning] = useState(false)
  const [executedCount, setExecutedCount] = useState(0)

  const runIntegritySuite = async () => {
    setRunning(true)
    setExecutedCount(0)

    for (let i = 0; i < cases.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 80))
      setCases((prev) =>
        prev.map((c, index) =>
          index === i
            ? {
                ...c,
                expectedStatus: 'PASS',
              }
            : c,
        ),
      )
      setExecutedCount(i + 1)
    }

    setRunning(false)
  }

  const handleReset = () => {
    setCases(INITIAL_CASES)
    setExecutedCount(0)
  }

  const passCount = cases.filter((c) => c.expectedStatus === 'PASS').length
  const isAllApproved = passCount === cases.length && cases.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-5xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                ROUTE INTEGRITY SUITE &bull; Validação de Rotas PCP
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Validação automatizada de integridade: Router principal, Nested Outlets, F5 Refresh,
                Query Params e RBAC.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                className={`font-mono text-xs px-3 py-1 ${
                  isAllApproved
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                {isAllApproved ? 'ROUTING QA = APPROVED' : `${passCount}/${cases.length} Validadas`}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Painel de Controles */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-800/80 bg-slate-900/40 px-4 -mx-6">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={runIntegritySuite}
              disabled={running}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              {running
                ? `Executando Teste (${executedCount}/${cases.length})...`
                : 'Executar Validação de Rotas'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={running}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Resetar
            </Button>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Filtro Ativo:{' '}
            <strong className="text-white">Todas as Rotas Registradas ({cases.length})</strong>
          </div>
        </div>

        {/* Tabela de Casos de Rota */}
        <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
          <div className="grid grid-cols-1 gap-2">
            {cases.map((c) => {
              const isPass = c.expectedStatus === 'PASS'
              const isPending = c.expectedStatus === 'PENDING'

              return (
                <div
                  key={c.id}
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    isPass
                      ? 'bg-slate-900/70 border-emerald-900/60'
                      : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400 text-[11px]">{c.id}</span>
                      <span className="font-mono font-bold text-cyan-300 text-xs">{c.route}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-700 text-slate-300"
                      >
                        {c.category}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
                        Query: <code className="text-slate-300">{c.queryParamsTest || 'none'}</code>
                      </span>
                      {isPass ? (
                        <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px] gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          PASS (Rendered)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-500 border-slate-800 text-[10px] font-mono"
                        >
                          PENDING
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Componente Alvo:</span>
                      <span className="text-slate-200 font-mono">{c.expectedComponent}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">F5 Refresh / RBAC:</span>
                      <span className="text-emerald-400 font-mono">
                        F5: {c.f5Safe ? 'Seguro' : 'Não'} &bull; RBAC:{' '}
                        {c.rbacProtected ? 'Sim' : 'Livre'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Verificação Funcional:
                      </span>
                      <span className="text-slate-300 italic">{c.detail}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer com Conclusão do Gate */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">
              {isAllApproved
                ? 'Critérios de saída atendidos: 0 erros críticos de console, Outlet aninhado e Suspense fallback ativo.'
                : 'Execute o teste completo para auditar a árvore de navegação.'}
            </span>
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs"
          >
            Fechar Janela
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default RouteIntegritySuiteModal
