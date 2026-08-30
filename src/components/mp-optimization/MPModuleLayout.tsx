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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MPModuleLayoutProps {
  children: React.ReactNode
  activeTopic?: 'visao-geral' | 'pedidos-recebimento' | 'planos-corte' | 'otimizar-aplicacoes'
  currentStep?: number
  headerActions?: React.ReactNode
}

export const mpMainTopics = [
  {
    id: 'visao-geral',
    title: 'Visão Geral',
    number: '•',
    path: '/pcp/gestao-materia-prima',
    icon: LayoutDashboard,
    description: 'Cockpit do ciclo completo de MP, KPIs e Alertas Globais',
  },
  {
    id: 'pedidos-recebimento',
    title: '1. Pedidos e Recebimento de MP',
    number: '1',
    path: '/pcp/gestao-materia-prima/pedidos-recebimento',
    icon: FileSpreadsheet,
    description: 'Necessidade, Pedidos SAP ECC, Horizontes (7-90d) e Estoque Futuro',
  },
  {
    id: 'planos-corte',
    title: '2. Planos de Corte',
    number: '2',
    path: '/pcp/gestao-materia-prima/planos-corte',
    icon: Scissors,
    description: 'Estoque dimensional, Motor de Corte IA, Matriz Oficial e Gêmeo 3D',
  },
  {
    id: 'otimizar-aplicacoes',
    title: '3. Otimizar Aplicações',
    number: '3',
    path: '/pcp/gestao-materia-prima/otimizar-aplicacoes',
    icon: RefreshCw,
    description: 'ZPP86 (modificar aplicação), ZPP88 (fora do padrão ideal) e Matriz IA',
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
      {/* Header Geral do Submódulo CIAFAL */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#004C97] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              PCP ROBOTIZADO &bull; GESTÃO INTEGRADA
            </span>
            <span className="text-xs text-slate-500 font-mono">
              SAP ECC (ME23N / ZPP86 / ZPPMP / ZPP88 / ZPPT058)
            </span>
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-300 text-[10px] font-bold"
            >
              Pantone 2945 (#004C97)
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            GESTÃO DE MATÉRIA-PRIMA
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Otimização do <strong>ciclo completo da MP</strong>: Necessidade &rarr; Pedido de Compra
            &rarr; Previsão de Recebimento &rarr; Recebimento Real (Dimensão Real) &rarr; Estoque
            Dimensional &rarr; Plano de Corte &rarr; Aplicação &rarr; Reaplicação &rarr; Reserva
            para Produção &rarr; Consumo &rarr; Plano x Real.
          </p>
        </div>

        {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
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
