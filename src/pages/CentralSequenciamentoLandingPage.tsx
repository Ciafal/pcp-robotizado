import React from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Activity,
  Sparkles,
  CalendarDays,
  BarChart3,
  Briefcase,
  Sliders,
  History,
  ArrowRight,
  ShieldCheck,
  Building2,
  TrendingUp,
  Cpu,
  AlertTriangle,
  Factory,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useControlTower } from '@/contexts/ControlTowerContext'

interface AreaCard {
  title: string
  subtitle: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
  kpi?: string
  color: string
}

const areas: AreaCard[] = [
  {
    title: 'Montagem Semanal',
    subtitle: 'Programação de Linha, Turnos e MP',
    description:
      'Montagem operacional da programação semanal com cálculo determinístico de necessidade de tarugos, disponibilidade projetada de MP e semáforo.',
    href: '/pcp/sequenciamento/montagem-semanal',
    icon: CalendarDays,
    badge: 'Semáforo MP',
    kpi: 'Disponibilidade MP',
    color: 'from-blue-600/20 to-blue-900/10 border-blue-800/60',
  },
  {
    title: 'Torre de Controle',
    subtitle: 'Visão Integrada e Gargalos',
    description:
      'Monitoramento executivo de aderência, vazão fabril, buffer térmico e impacto de gargalos por planta e linha.',
    href: '/pcp/sequenciamento/torre-controle',
    icon: Activity,
    badge: 'Tempo Real',
    kpi: '97.4% Aderência',
    color: 'from-indigo-600/20 to-indigo-900/10 border-indigo-800/60',
  },
  {
    title: 'Operacional de Chão de Fábrica',
    subtitle: 'Agora / Próximo / Fila',
    description:
      'Visão prática por linha: ordem em produção instantânea, cadência real, setup previsto e ordens aguardando.',
    href: '/pcp/sequenciamento/operacional',
    icon: Sparkles,
    badge: 'Chão de Fábrica',
    kpi: '6 Linhas Ativas',
    color: 'from-emerald-600/20 to-emerald-900/10 border-emerald-800/60',
  },
  {
    title: 'Sequenciamento Técnico & Gantt',
    subtitle: 'Motor Drag-and-Drop e Restrições',
    description:
      'Ambiente do programador com Gantt dinâmico, Kanban, mapa de integrações, fluxo de massa e regras industriais.',
    href: '/pcp/sequenciamento/programacao',
    icon: CalendarDays,
    badge: 'Motor de Regras',
    kpi: 'Simulação Ativa',
    color: 'from-cyan-600/20 to-cyan-900/10 border-cyan-800/60',
  },
  {
    title: 'Eficiência & Assertividade PCP',
    subtitle: 'Por Produto, Linha e Planta',
    description:
      'Análise de ritmo por produto, faixas mínimas e esperadas, alertas preventivos, OEE e decomposição de causas com IA.',
    href: '/pcp/sequenciamento/eficiencia',
    icon: BarChart3,
    badge: 'Aprendizado Contínuo',
    kpi: '92.6% Assertividade',
    color: 'from-indigo-600/20 to-indigo-900/10 border-indigo-800/60',
  },
  {
    title: 'Carteira de Pedidos (CRM / WMS)',
    subtitle: 'Rentabilidade e Dias Negativos',
    description:
      'Cruzamento com ordens de venda, margem de contribuição, saldo projetado em estoque e janelas de oportunidade para vendas.',
    href: '/pcp/sequenciamento/carteira',
    icon: Briefcase,
    badge: 'CRM ↔ PCP ↔ WMS',
    kpi: '22.8% Margem Média',
    color: 'from-sky-600/20 to-sky-900/10 border-sky-800/60',
  },
  {
    title: 'Cenários & Simulações',
    subtitle: 'Trade-Offs e Homologação',
    description:
      'Ambiente sandbox para testar inversões de campanha, turnos adicionais e otimizações de setup sem afetar o plano oficial.',
    href: '/pcp/sequenciamento/cenarios',
    icon: Sliders,
    badge: 'Sandbox Seguro',
    kpi: '3 Cenários Prontos',
    color: 'from-purple-600/20 to-purple-900/10 border-purple-800/60',
  },
  {
    title: 'Histórico & Versões',
    subtitle: 'Trilha de Auditoria e Aprovações',
    description:
      'Rastreabilidade completa de versões publicadas, esteira em 2 fases (PCP e Gestor) e log de justificativas.',
    href: '/pcp/sequenciamento/historico',
    icon: History,
    badge: 'Governança CIAFAL',
    kpi: 'Esteira 2 Fases',
    color: 'from-slate-700/30 to-slate-900/20 border-slate-700/60',
  },
]

export const CentralSequenciamentoLandingPage: React.FC = () => {
  const { kpis, filters } = useControlTower()

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto text-slate-100">
      {/* Header Principal da Central */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#004C97] text-white border-blue-400/40 text-xs font-mono font-bold px-2.5 py-0.5">
                HUB INDUSTRIAL CIAFAL
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/40 text-emerald-400 text-xs font-mono"
              >
                ● SAP ECC Online
              </Badge>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Layers className="w-8 h-8 text-[#004C97]" />
              Central de Sequenciamento
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Ambiente unificado de governança, sequenciamento de ordens de produção, balanceamento
              de capacidade, monitoramento em tempo real de gargalos e simulação com Inteligência
              Artificial.
            </p>
          </div>

          {/* Atalho Rápido para Gantt */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="lg"
              className="bg-[#004C97] hover:bg-[#003d7a] text-white font-bold gap-2 shadow-lg text-xs"
              asChild
            >
              <Link to="/pcp/sequenciamento/programacao">
                <CalendarDays className="w-4 h-4" />
                Abrir Sequenciamento Fino (Gantt)
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* KPIs Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Programado Total</span>
            <span className="text-lg font-bold text-white">
              {kpis.plannedTons.toLocaleString('pt-BR')} t
            </span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Realizado</span>
            <span className="text-lg font-bold text-emerald-400">
              {kpis.producedTons.toLocaleString('pt-BR')} t
            </span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Aderência Global</span>
            <span className="text-lg font-bold text-[#3b82f6]">{kpis.adherencePct}%</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Ocupação Fabril</span>
            <span className="text-lg font-bold text-indigo-400">{kpis.occupancyPct}%</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Vazão Total</span>
            <span className="text-lg font-bold text-cyan-300">{kpis.totalRatePerHour} t/h</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Gargalos Ativos</span>
            <span className="text-lg font-bold text-rose-400">{kpis.activeBottlenecks} pontos</span>
          </div>
        </div>
      </div>

      {/* Grid de Seletor de Áreas / Submódulos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Módulos Especializados da Central
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Selecione uma área para navegar</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => {
            const IconComponent = area.icon
            return (
              <Link key={area.href} to={area.href} className="group block focus:outline-none">
                <Card
                  className={`h-full bg-gradient-to-br ${area.color} bg-slate-950/90 border transition-all duration-200 hover:scale-[1.01] hover:shadow-xl hover:border-[#004C97]/80 cursor-pointer flex flex-col justify-between`}
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-[#3b82f6] group-hover:bg-[#004C97] group-hover:text-white transition-colors shadow-inner">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono bg-slate-900/80 border-slate-700 text-slate-300"
                      >
                        {area.badge}
                      </Badge>
                    </div>

                    <CardTitle className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {area.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 font-medium mt-0.5">
                      {area.subtitle}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3">
                    <p className="text-xs text-slate-300/90 leading-relaxed">{area.description}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-mono">
                      <span className="text-emerald-400 font-semibold">{area.kpi}</span>
                      <span className="text-cyan-400 flex items-center gap-1 font-sans font-semibold group-hover:translate-x-1 transition-transform text-[11px]">
                        Acessar Área <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
export default CentralSequenciamentoLandingPage
