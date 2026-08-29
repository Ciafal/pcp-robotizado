import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  Scissors,
  Boxes,
  Maximize2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  History,
  BarChart3,
  TrendingUp,
  FileText,
  Compass,
  AlertTriangle,
  Microscope,
  Database,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MPModuleLayoutProps {
  children: React.ReactNode
  currentStep?: number
  headerActions?: React.ReactNode
}

export const mpSubmenuItems = [
  {
    step: 1,
    title: 'Visão Geral',
    slug: 'visao-geral',
    icon: LayoutDashboard,
    path: '/pcp/otimizacao-mp/visao-geral',
  },
  {
    step: 2,
    title: 'Necessidade de MP',
    slug: 'necessidade',
    icon: FileText,
    path: '/pcp/otimizacao-mp/necessidade',
  },
  {
    step: 3,
    title: 'MP por Aplicação',
    slug: 'por-aplicacao',
    icon: Layers,
    path: '/pcp/otimizacao-mp/por-aplicacao',
  },
  {
    step: 4,
    title: 'Plano Inteligente de Corte',
    slug: 'plano-corte',
    icon: Scissors,
    path: '/pcp/otimizacao-mp/plano-corte',
  },
  {
    step: 5,
    title: 'Estoque Dimensional',
    slug: 'estoque-dimensional',
    icon: Boxes,
    path: '/pcp/otimizacao-mp/estoque-dimensional',
  },
  {
    step: 6,
    title: 'Cortes Existentes',
    slug: 'cortes-existentes',
    icon: RefreshCw,
    path: '/pcp/otimizacao-mp/cortes-existentes',
  },
  {
    step: 7,
    title: 'Oportunidades de Reaplicação',
    slug: 'reaplicacoes',
    icon: Sparkles,
    path: '/pcp/otimizacao-mp/reaplicacoes',
  },
  {
    step: 8,
    title: 'Peças Fora do Padrão Ideal',
    slug: 'fora-padrao-ideal',
    icon: Microscope,
    path: '/pcp/otimizacao-mp/fora-padrao-ideal',
  },
  {
    step: 9,
    title: 'Análise Dimensional',
    slug: 'analise-dimensional',
    icon: BarChart3,
    path: '/pcp/otimizacao-mp/analise-dimensional',
  },
  {
    step: 10,
    title: 'Projeção 3D',
    slug: 'projecao-3d',
    icon: Maximize2,
    path: '/pcp/otimizacao-mp/projecao-3d',
  },
  {
    step: 11,
    title: 'Aprovações',
    slug: 'aprovacoes',
    icon: CheckCircle2,
    path: '/pcp/otimizacao-mp/aprovacoes',
  },
  {
    step: 12,
    title: 'Histórico',
    slug: 'historico',
    icon: History,
    path: '/pcp/otimizacao-mp/historico',
  },
  {
    step: 13,
    title: 'Plano x Real',
    slug: 'plano-x-real',
    icon: Compass,
    path: '/pcp/otimizacao-mp/plano-x-real',
  },
  {
    step: 14,
    title: 'Indicadores',
    slug: 'indicadores',
    icon: TrendingUp,
    path: '/pcp/otimizacao-mp/indicadores',
  },
]

export const MPModuleLayout: React.FC<MPModuleLayoutProps> = ({
  children,
  currentStep,
  headerActions,
}) => {
  const location = useLocation()

  return (
    <div className="space-y-4 bg-slate-50 min-h-[calc(100vh-6rem)]">
      {/* Header Geral do Submódulo CIAFAL */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#004C97] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              PCP ROBOTIZADO &bull; MOTOR IA
            </span>
            <span className="text-xs text-slate-400 font-mono">SAP ZPP86 / ZPPMP / ZPP88</span>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold"
            >
              Tema Claro Corporativo
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            PLANEJAMENTO E OTIMIZAÇÃO DIMENSIONAL DE MATÉRIA-PRIMA
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Motor inteligente de corte, aplicação, reaplicação e preservação de MP integrada ao SAP.
            Otimização global: Carteira + Rendimento + Custo + Redução de Sucata + Preservação de MP
            Crítica.
          </p>
        </div>

        {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
      </div>

      {/* Régua de Navegação Rápida entre os 14 tópicos */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {mpSubmenuItems.map((item) => {
            const ItemIcon = item.icon
            const isCurrent =
              location.pathname === item.path ||
              (item.slug === 'visao-geral' && location.pathname === '/pcp/otimizacao-mp') ||
              currentStep === item.step

            return (
              <Link
                key={item.slug}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[#004C97] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-mono ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.step}
                </span>
                <ItemIcon className="w-3.5 h-3.5" />
                <span>{item.title}</span>
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
