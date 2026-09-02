import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSpreadsheet,
  Scissors,
  RefreshCw,
  Sparkles,
  Layers,
  Boxes,
  ShieldCheck,
  CalendarRange,
  ArrowRight,
  Building2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MPModuleLayoutProps {
  children: React.ReactNode
  activeTopic?:
    | 'visao-geral'
    | 'pedidos-recebimento'
    | 'planos-corte'
    | 'otimizar-aplicacoes'
    | 'projecoes-mp'
    | 'saldo-disponibilidade-destino'
    | 'niveis-estoque-acos-especiais'
    | 'saldo-mp-l1-previsao-consumo'
    | 'utilizacao-substituicao-mp'
    | 'materia-prima-industrializador'
    | 'materia-prima-sidercentro'
  currentStep?: number
  headerActions?: React.ReactNode
}

export const mpMainTopics = [
  {
    id: 'visao-geral',
    title: 'Visão Geral de MP',
    number: '0',
    path: '/pcp/gestao-materia-prima',
    icon: LayoutDashboard,
    description: 'Cockpit do ciclo completo de MP, KPIs e Alertas Globais',
  },
  {
    id: 'pedidos-recebimento',
    title: 'Pedidos e Recebimento de MP',
    number: '1',
    path: '/pcp/gestao-materia-prima/pedidos-recebimento',
    icon: FileSpreadsheet,
    description: 'Necessidade, Pedidos SAP ECC, Horizontes (7-90d) e Estoque Futuro',
  },
  {
    id: 'projecoes-mp',
    title: 'Projeções de MP',
    number: '2',
    path: '/pcp/gestao-materia-prima/projecoes-mp',
    icon: CalendarRange,
    description: 'Projeção de Ruptura diária vs Excel e Cobertura Total MP + Acabado',
  },
  {
    id: 'saldo-disponibilidade-destino',
    title: 'Saldo e Disponibilidade por Destino',
    number: '3',
    path: '/pcp/gestao-materia-prima/saldo-disponibilidade-destino',
    icon: Boxes,
    description: 'Visão por Lote, Depósitos, Produção Própria, Reservas e Sobras',
  },
  {
    id: 'niveis-estoque-acos-especiais',
    title: 'Níveis de Estoque – Aços Especiais',
    number: '4',
    path: '/pcp/gestao-materia-prima/niveis-estoque-acos-especiais',
    icon: Layers,
    description: 'Projeção contínua semana/dia/turno, Pools 525kg/510kg e Fator L2',
  },
  {
    id: 'saldo-mp-l1-previsao-consumo',
    title: 'Saldo MP L1 e Previsão de Consumo',
    number: '5',
    path: '/pcp/gestao-materia-prima/saldo-mp-l1-previsao-consumo',
    icon: Layers,
    description: 'Matriz L1, Depósitos KS/DP07/DP04, Necessidade L2 e Fornecedores',
  },
  {
    id: 'utilizacao-substituicao-mp',
    title: 'Utilização e Substituição de MP',
    number: '6',
    path: '/pcp/gestao-materia-prima/utilizacao-substituicao-mp',
    icon: ShieldCheck,
    description: 'Substituição 1020 vs AC, Enfornamento Quente/Frio e Desvios por Ordem',
  },
  {
    id: 'planos-corte',
    title: 'Planos de Corte',
    number: '7',
    path: '/pcp/gestao-materia-prima/planos-corte',
    icon: Scissors,
    description: 'Nesting 1D/2D/3D, Algoritmos Heurísticos e Simulação de Cenários',
  },
  {
    id: 'otimizar-aplicacoes',
    title: 'Otimizar Aplicações',
    number: '8',
    path: '/pcp/gestao-materia-prima/otimizar-aplicacoes',
    icon: Sparkles,
    description: 'Reaplicação Estratégica, Redução de Sucata e Preservação de MP Nobre',
  },
  {
    id: 'materia-prima-industrializador',
    title: 'Matéria-prima – Industrializador',
    number: '9',
    path: '/pcp/gestao-materia-prima/industrializador',
    icon: Sparkles,
    description: 'Acompanhamento Operacional, DP07/18/20, Trânsito, TB-002, Rupturas e Comunicados',
  },
  {
    id: 'materia-prima-sidercentro',
    title: 'Matéria-prima – Sidercentro',
    number: '10',
    path: '/pcp/gestao-materia-prima/sidercentro',
    icon: Building2,
    description:
      'Operação SDC, Estoque DS03/DP04/KS/Sucata, Projeção Diária/Semanal/Mensal, Pools e PxR L2',
  },
]
export const MPModuleLayout: React.FC<MPModuleLayoutProps> = ({
  children,
  activeTopic,
  headerActions,
}) => {
  const location = useLocation()

  return (
    <div className="space-y-4 bg-slate-50 min-h-[calc(100vh-6rem)]">
      {/* Header Compacto da Gestão de MP (Linha 1: Título + Descrição Curta + Ações / Linha 2: Fluxo Horizontal / Linha 3: Cards) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        {/* Linha 1: Título em linha única + tags + Ações alinhadas */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight whitespace-nowrap">
              GESTÃO DE MATÉRIA-PRIMA
            </h1>
            <span className="text-[9px] font-black uppercase tracking-wider text-[#004C97] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap">
              PCP ROBOTIZADO &bull; SAP ECC (ZPP86/ZPPMP)
            </span>
            <p className="text-[11px] text-slate-500 hidden xl:inline line-clamp-1">
              Otimização do ciclo completo de suprimento e corte integrado à programação.
            </p>
          </div>

          {headerActions && (
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">{headerActions}</div>
          )}
        </div>

        {/* Linha 2: Fluxo horizontal compacto do ciclo de MP */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px] text-slate-600 font-semibold">
          <span className="text-slate-400 uppercase text-[9px] font-bold shrink-0">
            Ciclo Operacional:
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap">
            1. Necessidade
          </span>
          <span className="text-slate-400">&rarr;</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap">
            2. Compra (ME23N)
          </span>
          <span className="text-slate-400">&rarr;</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap">
            3. Recebimento
          </span>
          <span className="text-slate-400">&rarr;</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap">
            4. Estoque Dimensional
          </span>
          <span className="text-slate-400">&rarr;</span>
          <span className="bg-blue-50 text-[#004C97] border border-blue-200 px-2 py-0.5 rounded font-bold whitespace-nowrap">
            5. Plano de Corte
          </span>
          <span className="text-slate-400">&rarr;</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap">
            6. Aplicação (ZPP86)
          </span>
          <span className="text-slate-400">&rarr;</span>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold whitespace-nowrap">
            7. Reaplicação
          </span>
        </div>
      </div>

      {/* Régua dos 3 Subtópicos Oficiais Obrigatórios + Visão Geral */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {mpMainTopics.map((topic) => {
            const TopicIcon = topic.icon
            const isCurrent =
              activeTopic === topic.id ||
              (topic.id === 'visao-geral' &&
                (location.pathname === '/pcp/gestao-materia-prima' ||
                  location.pathname === '/pcp/otimizacao-mp' ||
                  location.pathname === '/pcp/otimizacao-mp/visao-geral')) ||
              (topic.id === 'pedidos-recebimento' &&
                (location.pathname.includes('/pedidos-recebimento') ||
                  location.pathname.includes('/necessidade'))) ||
              (topic.id === 'planos-corte' &&
                (location.pathname.includes('/planos-corte') ||
                  location.pathname.includes('/plano-corte') ||
                  location.pathname.includes('/estoque-dimensional') ||
                  location.pathname.includes('/por-aplicacao'))) ||
              (topic.id === 'otimizar-aplicacoes' &&
                (location.pathname.includes('/otimizar-aplicacoes') ||
                  location.pathname.includes('/cortes-existentes') ||
                  location.pathname.includes('/reaplicacoes') ||
                  location.pathname.includes('/fora-padrao-ideal') ||
                  location.pathname.includes('/projecao-3d') ||
                  location.pathname.includes('/analise-dimensional') ||
                  location.pathname.includes('/aprovacoes') ||
                  location.pathname.includes('/historico') ||
                  location.pathname.includes('/plano-x-real') ||
                  location.pathname.includes('/indicadores')))

            return (
              <Link
                key={topic.id}
                to={topic.path}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[#004C97] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/90'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md text-[10px] flex items-center justify-center font-mono font-bold ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {topic.number}
                </span>
                <TopicIcon className="w-4 h-4 shrink-0" />
                <span>{topic.title}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Conteúdo da Subpágina */}
      <div className="space-y-4">{children}</div>
    </div>
  )
}
