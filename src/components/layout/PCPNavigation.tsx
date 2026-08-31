import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarRange,
  Layers,
  Activity,
  Sparkles,
  CalendarDays,
  BarChart3,
  Briefcase,
  Sliders,
  History,
  Building2,
  FileSpreadsheet,
  Cpu,
  CheckCircle2,
  Users,
  ShieldCheck,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Compass,
  Megaphone,
  Inbox,
  Clock,
  FileText,
  Bell,
  Calendar,
  Microscope,
  Boxes,
  GitCompare,
  AlertTriangle,
  Scissors,
  Maximize2,
  RefreshCw,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import { Can } from '@/components/auth/Can'
import { ADSimulatorSwitcher } from '@/components/auth/ADSimulatorSwitcher'
import { EnvironmentSelectorBadge } from './EnvironmentSelectorBadge'
import { Button } from '@/components/ui/button'
import { Network } from 'lucide-react'

const logoCiafalBlue = 'https://img.usecurling.com/i?q=ciafal&color=blue'

interface NavSubItem {
  title: string
  href: string
  badge?: string
  permission?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}
interface NavSectionItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  permission?: string
  subItems?: NavSubItem[]
}

const navSections: NavSectionItem[] = [
  {
    title: 'Cockpit Executivo (IA)',
    href: '/pcp/cockpit-executivo',
    icon: Activity,
    badge: 'CIAFAL IA',
    permission: 'pcp.executive.view',
  },
  {
    title: 'Cockpit & Fila Fabril',
    href: '/pcp/cockpit',
    icon: LayoutDashboard,
  },
  {
    title: 'Gestão de Estoques',
    href: '/pcp/estoques',
    icon: Layers,
    badge: 'SAP &bull; WMS',
    permission: 'pcp.inventory.overview',
    subItems: [
      {
        title: 'Visão Geral',
        href: '/pcp/estoques',
        icon: Layers,
        permission: 'pcp.inventory.overview',
      },
      {
        title: 'Matéria-Prima — MP',
        href: '/pcp/estoques?tab=materia-prima',
        icon: Boxes,
        permission: 'pcp.inventory.raw_material',
      },
      {
        title: 'Semiacabados',
        href: '/pcp/estoques?tab=semiacabados',
        icon: Layers,
        permission: 'pcp.inventory.semi_finished',
      },
      {
        title: 'Produtos Acabados',
        href: '/pcp/estoques?tab=produtos-acabados',
        icon: FileSpreadsheet,
        permission: 'pcp.inventory.finished_goods',
      },
      {
        title: 'Cobertura & Projeções',
        href: '/pcp/estoques?tab=cobertura',
        icon: CalendarRange,
        permission: 'pcp.inventory.coverage',
      },
      {
        title: 'Divergências SAP × WMS',
        href: '/pcp/estoques?tab=divergencias',
        icon: GitCompare,
        permission: 'pcp.inventory.discrepancies',
      },
      {
        title: 'Alertas & IA',
        href: '/pcp/estoques?tab=alertas-ia',
        icon: Sparkles,
        permission: 'pcp.inventory.ai',
      },
    ],
  },
  {
    title: 'Central de Sequenciamento',
    href: '/pcp/sequenciamento',
    icon: Layers,
    badge: 'Hub',
    permission: 'pcp.schedule.view',
    subItems: [
      {
        title: 'Visão Geral',
        href: '/pcp/sequenciamento',
        icon: Layers,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Montagem Semanal',
        href: '/pcp/sequenciamento/montagem-semanal',
        icon: CalendarDays,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Oficina de Cilindros',
        href: '/pcp/oficina-cilindros',
        icon: Wrench,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Torre de Controle',
        href: '/pcp/sequenciamento/torre-controle',
        icon: Activity,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Operacional',
        href: '/pcp/sequenciamento/operacional',
        icon: Sparkles,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Sequenciamento (Gantt)',
        href: '/pcp/sequenciamento/programacao',
        icon: CalendarDays,
        permission: 'pcp.schedule.edit',
      },
      {
        title: 'Eficiência & Perdas',
        href: '/pcp/sequenciamento/eficiencia',
        icon: BarChart3,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Carteira (CRM / WMS)',
        href: '/pcp/sequenciamento/carteira',
        icon: Briefcase,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Cenários & Simulações',
        href: '/pcp/sequenciamento/cenarios',
        icon: Sliders,
        permission: 'pcp.schedule.simulate',
      },
      {
        title: 'Histórico & Versões',
        href: '/pcp/sequenciamento/historico',
        icon: History,
        permission: 'pcp.schedule.view',
      },
    ],
  },
  {
    title: 'Planejamento Mestre',
    href: '/pcp/planejamento',
    icon: CalendarRange,
    badge: 'PMP / S&OP',
    permission: 'pcp.masterplan.overview',
    subItems: [
      {
        title: 'Visão Geral (PMP)',
        href: '/pcp/planejamento',
        icon: Layers,
        permission: 'pcp.masterplan.overview',
      },
      {
        title: 'Plano Anual & Mensal',
        href: '/pcp/planejamento?tab=plano-mensal',
        icon: CalendarRange,
        permission: 'pcp.masterplan.overview',
      },
      {
        title: 'Demanda & CRM 360º',
        href: '/pcp/planejamento?tab=demanda-crm',
        icon: Briefcase,
        permission: 'pcp.masterplan.demand_crm',
      },
      {
        title: 'Aderência Prog × Real',
        href: '/pcp/planejamento?tab=aderencia',
        icon: BarChart3,
        permission: 'pcp.masterplan.adherence',
      },
      {
        title: 'Desvios & Causas',
        href: '/pcp/planejamento?tab=desvios-causas',
        icon: AlertTriangle,
        permission: 'pcp.masterplan.deviations',
      },
      {
        title: 'Forecast IA & Cenários',
        href: '/pcp/planejamento?tab=forecast-ia',
        icon: Sparkles,
        permission: 'pcp.masterplan.forecast_ai',
      },
      {
        title: 'Histórico & Versões',
        href: '/pcp/planejamento?tab=historico-versoes',
        icon: History,
        permission: 'pcp.masterplan.versions',
      },
    ],
  },
  {
    title: 'Gestão de Linhas',
    href: '/pcp/linhas',
    icon: Building2,
    badge: 'Malha',
    permission: 'pcp.masterdata.view',
    subItems: [
      {
        title: 'Cadastro de Linhas',
        href: '/pcp/linhas/cadastro',
        icon: Building2,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'Mapa de Integração',
        href: '/pcp/linhas/mapa-integracao',
        icon: Compass,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'Capacidades & Performance',
        href: '/pcp/linhas/capacidades',
        icon: BarChart3,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'Dependências e Rotas',
        href: '/pcp/linhas/dependencias',
        icon: Layers,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'Histórico de Revisões',
        href: '/pcp/linhas/historico',
        icon: History,
        permission: 'pcp.masterdata.view',
      },
    ],
  },
  {
    title: 'Reuniões PCP',
    href: '/pcp/reunioes',
    icon: CalendarDays,
    badge: 'Semanal',
    permission: 'pcp.meeting.view',
    subItems: [
      {
        title: 'Próxima Reunião',
        href: '/pcp/reunioes?tab=proxima',
        icon: CalendarDays,
        permission: 'pcp.meeting.view',
      },
      {
        title: 'Atas Digitais',
        href: '/pcp/reunioes/atas',
        icon: FileText,
        permission: 'pcp.meeting.view',
      },
      {
        title: 'Painel de Pendências',
        href: '/pcp/reunioes/pendencias',
        icon: Clock,
        permission: 'pcp.meeting.view',
      },
      {
        title: 'Reunião em Andamento',
        href: '/pcp/reunioes/andamento',
        icon: Activity,
        permission: 'pcp.meeting.conduct',
      },
      {
        title: 'Análise IA das Reuniões',
        href: '/pcp/reunioes?tab=ia_analise',
        icon: Sparkles,
        permission: 'pcp.meeting.view',
      },
    ],
  },
  {
    title: 'Comunicados PCP',
    href: '/pcp/comunicados',
    icon: Megaphone,
    badge: 'Diretrizes',
    permission: 'pcp.communication.view',
    subItems: [
      {
        title: 'Caixa de Comunicados',
        href: '/pcp/comunicados?tab=todos',
        icon: Inbox,
        permission: 'pcp.communication.view',
      },
      {
        title: 'Comunicados Vigentes',
        href: '/pcp/comunicados?tab=vigentes',
        icon: Megaphone,
        permission: 'pcp.communication.view',
      },
      {
        title: 'Comunicados Programados',
        href: '/pcp/comunicados?tab=programados',
        icon: Calendar,
        permission: 'pcp.communication.view',
      },
      {
        title: 'Comunicados Encerrados',
        href: '/pcp/comunicados?tab=encerrados',
        icon: History,
        permission: 'pcp.communication.view',
      },
      {
        title: 'Minha Caixa PCP',
        href: '/pcp/inbox',
        icon: Bell,
        permission: 'pcp.communication.view',
      },
    ],
  },
  {
    title: 'GESTÃO DE MATÉRIA-PRIMA',
    href: '/pcp/gestao-materia-prima',
    icon: Boxes,
    badge: 'CICLO MP',
    permission: 'pcp.mp_opt.view',
    subItems: [
      {
        title: 'Visão Geral de MP',
        href: '/pcp/gestao-materia-prima',
        icon: LayoutDashboard,
        description: 'Painel executivo, estoque físico, previsões e alertas globais de MP',
      },
      {
        title: 'Pedidos e Recebimento de MP',
        href: '/pcp/gestao-materia-prima/pedidos-recebimento',
        icon: FileSpreadsheet,
        description: 'Necessidade, Pedidos SAP, Recebimentos Futuros (7-90d) e Estoque Futuro',
      },
      {
        title: 'Projeções de MP',
        href: '/pcp/gestao-materia-prima/projecoes-mp',
        icon: CalendarRange,
        description: 'Projeção de Ruptura diária vs Excel, Cobertura Total MP+Acabado e Simulação',
      },
      {
        title: 'Saldo e Disponibilidade por Destino',
        href: '/pcp/gestao-materia-prima/saldo-disponibilidade-destino',
        icon: Boxes,
        description: 'Visão por Lote, Depósitos, Produção Própria, Reservas e Sobras',
      },
      {
        title: 'Níveis de Estoque – Aços Especiais',
        href: '/pcp/gestao-materia-prima/niveis-estoque-acos-especiais',
        icon: Layers,
        description: 'Níveis contínuos semana/dia/turno, Pools 525kg/510kg e Fator L2',
      },
      {
        title: 'Saldo MP L1 e Previsão de Consumo',
        href: '/pcp/gestao-materia-prima/saldo-mp-l1-previsao-consumo',
        icon: Layers,
        description: 'Matriz L1, Depósitos KS/DP07/DP04, Necessidade L2 e Fornecedores',
      },
      {
        title: 'Utilização e Substituição de MP',
        href: '/pcp/gestao-materia-prima/utilizacao-substituicao-mp',
        icon: ShieldCheck,
        description: 'Substituição 1020 vs AC, Enfornamento Quente/Frio e Desvios por Ordem',
      },
      {
        title: 'Planos de Corte',
        href: '/pcp/gestao-materia-prima/planos-corte',
        icon: Scissors,
        description:
          'Estoque dimensional, Motor IA multi-cenários, Matriz de requisitos e Gêmeo 3D',
      },
      {
        title: 'Otimizar Aplicações',
        href: '/pcp/gestao-materia-prima/otimizar-aplicacoes',
        icon: RefreshCw,
        description: 'ZPP86 (modificar aplicação), ZPP88 (fora do padrão), Matriz e Projeção 3D',
      },
      {
        title: 'Matéria-prima – Industrializador',
        href: '/pcp/gestao-materia-prima/industrializador',
        icon: Sparkles,
        description:
          'Acompanhamento Operacional, DP07/18/20, Trânsito, TB-002, Rupturas e Comunicados',
      },
    ],
  },
  {
    title: 'Qualidade do Produto & Ensaios',
    href: '/pcp/qualidade',
    icon: Microscope,
    badge: 'US / EM',
    permission: 'pcp.quality.view',
    subItems: [
      {
        title: 'Painel de Qualidade',
        href: '/pcp/qualidade',
        icon: Microscope,
        permission: 'pcp.quality.view',
      },
      {
        title: 'Workflow de Ultrassom',
        href: '/pcp/qualidade?tab=WORKFLOW',
        icon: Sparkles,
        permission: 'pcp.quality.view',
      },
      {
        title: 'Fichas de Requisitos MTO',
        href: '/pcp/qualidade?tab=SHEETS',
        icon: FileText,
        permission: 'pcp.requirement.view',
      },
      {
        title: 'Capacidade Laboratórios',
        href: '/pcp/qualidade?tab=CAPACITY',
        icon: Cpu,
        permission: 'pcp.quality.manage',
      },
      {
        title: 'Catálogo Mestre MTS/MTO',
        href: '/pcp/qualidade?tab=CATALOG',
        icon: Layers,
        permission: 'pcp.product.quality',
      },
    ],
  },
  {
    title: 'Ficha Mestre',
    href: '/pcp/ficha-mestre',
    icon: FileSpreadsheet,
    badge: 'SAP ECC',
    permission: 'pcp.masterdata.view',
  },
  {
    title: 'Motor de Regras & Setup',
    href: '/pcp/regras',
    icon: Cpu,
    permission: 'pcp.rules.view',
  },
  {
    title: 'Painel de Aprovações',
    href: '/pcp/aprovacoes',
    icon: CheckCircle2,
    badge: '2 Fases',
    permission: 'pcp.approval.view',
  },
  {
    title: 'Responsáveis de Linha',
    href: '/pcp/linhas-responsaveis',
    icon: Users,
    permission: 'pcp.masterdata.view',
  },
  {
    title: 'Trilha de Auditoria',
    href: '/pcp/auditoria',
    icon: ShieldCheck,
    permission: 'pcp.audit.view',
  },
  {
    title: 'Gestão de Acessos & RBAC',
    href: '/pcp/admin/acessos',
    icon: KeyRound,
    permission: 'pcp.admin.manage',
  },
]

export const PCPNavbar: React.FC = () => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <Link to="/pcp/sequenciamento" className="flex items-center gap-3">
          <img
            src={logoCiafalBlue}
            alt="CIAFAL Wilson Santos"
            className="h-8 w-auto object-contain"
          />
          <div className="border-l border-slate-200 pl-3 hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 text-sm">
                HUB INDUSTRIAL
              </span>
              <span className="text-white font-extrabold text-[10px] bg-[#004C97] px-2 py-0.5 rounded shadow-sm border border-blue-600/30">
                PCP ROBOTIZADO
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              CIAFAL &bull; Divinópolis &bull; Contagem
            </div>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <EnvironmentSelectorBadge />
        <ADSimulatorSwitcher />
      </div>
    </header>
  )
}

interface NavGroup {
  groupTitle: string
  items: {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    permission?: string
  }[]
}

const officialNavGroups: NavGroup[] = [
  {
    groupTitle: 'PRINCIPAL',
    items: [
      { title: 'Visão Geral', href: '/pcp/cockpit', icon: LayoutDashboard },
      {
        title: 'Torre de Controle',
        href: '/pcp/sequenciamento/torre-controle',
        icon: Activity,
        permission: 'pcp.schedule.view',
      },
    ],
  },
  {
    groupTitle: 'PROGRAMAÇÃO',
    items: [
      {
        title: 'Montagem Semanal',
        href: '/pcp/sequenciamento/montagem-semanal',
        icon: CalendarDays,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Oficina de Cilindros',
        href: '/pcp/oficina-cilindros',
        icon: Wrench,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Visão Mensal',
        href: '/pcp/sequenciamento/programacao-mensal',
        icon: CalendarRange,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Cenários e Simulações',
        href: '/pcp/sequenciamento/cenarios',
        icon: Sliders,
        permission: 'pcp.schedule.simulate',
      },
      {
        title: 'Em Aprovação',
        href: '/pcp/aprovacoes',
        icon: CheckCircle2,
        permission: 'pcp.approval.view',
      },
      {
        title: 'Aprovadas',
        href: '/pcp/aprovacoes?filter=approved',
        icon: ShieldCheck,
        permission: 'pcp.approval.view',
      },
      {
        title: 'Integração SAP / Ordens',
        href: '/pcp/linhas/mapa-integracao',
        icon: Compass,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'Central de Alterações & Versões',
        href: '/pcp/alteracoes',
        icon: History,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Histórico de Programações',
        href: '/pcp/sequenciamento/historico',
        icon: History,
        permission: 'pcp.schedule.view',
      },
    ],
  },
  {
    groupTitle: 'EXECUÇÃO',
    items: [
      {
        title: 'Acompanhamento',
        href: '/pcp/sequenciamento/operacional',
        icon: Sparkles,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Previsto x Realizado',
        href: '/pcp/sequenciamento/eficiencia/assertividade',
        icon: BarChart3,
        permission: 'pcp.schedule.view',
      },
      {
        title: 'Análise de Desvios',
        href: '/pcp/planejamento?tab=desvios-causas',
        icon: AlertTriangle,
        permission: 'pcp.masterplan.deviations',
      },
    ],
  },
  {
    groupTitle: 'GESTÃO DE MP',
    items: [
      {
        title: 'Visão Geral de MP',
        href: '/pcp/gestao-materia-prima',
        icon: LayoutDashboard,
        permission: 'pcp.mp_opt.view',
      },
      {
        title: 'Pedidos e Recebimento de MP',
        href: '/pcp/gestao-materia-prima/pedidos-recebimento',
        icon: FileSpreadsheet,
        permission: 'pcp.mp_opt.view',
      },
      {
        title: 'Projeções de MP',
        href: '/pcp/gestao-materia-prima/projecoes-mp',
        icon: CalendarRange,
        permission: 'pcp.mp_opt.view',
      },
      {
        title: 'Saldo e Disponibilidade por Destino',
        href: '/pcp/gestao-materia-prima/saldo-disponibilidade-destino',
        icon: Boxes,
        permission: 'pcp.mp_opt.view',
      },
      {
        title: 'Níveis de Estoque – Aços Especiais',
        href: '/pcp/gestao-materia-prima/niveis-estoque-acos-especiais',
        icon: Layers,
        permission: 'pcp.mp_opt.view',
      },
      {
        title: 'Saldo MP L1 e Previsão de Consumo',
        href: '/pcp/gestao-materia-prima/saldo-mp-l1-previsao-consumo',
        icon: Layers,
        permission: 'pcp.mp_opt.view',
      },
      {
        title: 'Utilização e Substituição de MP',
        href: '/pcp/gestao-materia-prima/utilizacao-substituicao-mp',
        icon: ShieldCheck,
        permission: 'pcp.mp_opt.view',
      },
      {
        title: 'Planos de Corte',
        href: '/pcp/gestao-materia-prima/planos-corte',
        icon: Scissors,
        permission: 'pcp.mp_opt.view',
      },
      {
        title: 'Otimizar Aplicações',
        href: '/pcp/gestao-materia-prima/otimizar-aplicacoes',
        icon: RefreshCw,
        permission: 'pcp.mp_opt.view',
      },
      {
        title: 'Matéria-prima – Industrializador',
        href: '/pcp/gestao-materia-prima/industrializador',
        icon: Sparkles,
        permission: 'pcp.mp_opt.view',
      },
    ],
  },
  {
    groupTitle: 'CADASTROS',
    items: [
      {
        title: 'Ficha Mestre de Linha',
        href: '/pcp/ficha-mestre',
        icon: FileSpreadsheet,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'Motor de Regras & Setup',
        href: '/pcp/regras',
        icon: Cpu,
        permission: 'pcp.rules.view',
      },
      {
        title: 'Tabelas de Tempo',
        href: '/pcp/linhas/capacidades',
        icon: Clock,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'MP e Fornecedores',
        href: '/pcp/estoques?tab=materia-prima',
        icon: Boxes,
        permission: 'pcp.inventory.raw_material',
      },
      {
        title: 'Paradas Programadas',
        href: '/pcp/linhas/dependencias',
        icon: Calendar,
        permission: 'pcp.masterdata.view',
      },
    ],
  },
  {
    groupTitle: 'RELATÓRIOS',
    items: [
      {
        title: 'Capacidade',
        href: '/pcp/planejamento?tab=aderencia',
        icon: BarChart3,
        permission: 'pcp.masterplan.adherence',
      },
      {
        title: 'MP & Estoque Projetado',
        href: '/pcp/estoques?tab=cobertura',
        icon: Layers,
        permission: 'pcp.inventory.coverage',
      },
      {
        title: 'Carteira & Atendimento',
        href: '/pcp/sequenciamento/carteira',
        icon: Briefcase,
        permission: 'pcp.schedule.view',
      },
    ],
  },
  {
    groupTitle: 'INTEGRAÇÕES & GOVERNANÇA',
    items: [
      {
        title: 'Integrações PCP',
        href: '/pcp/integracoes',
        icon: Network,
        permission: 'pcp.integrations.view',
      },
      {
        title: 'Monitor de Eventos',
        href: '/pcp/integracoes/monitor',
        icon: Activity,
        permission: 'pcp.integrations.view',
      },
      {
        title: 'Trilha de Auditoria',
        href: '/pcp/auditoria',
        icon: ShieldCheck,
        permission: 'pcp.audit.view',
      },
      {
        title: 'Configurações & Acessos',
        href: '/pcp/admin/acessos',
        icon: KeyRound,
        permission: 'pcp.admin.manage',
      },
    ],
  },
]

export const PCPSidebar: React.FC = () => {
  const location = useLocation()

  return (
    <aside className="w-[210px] bg-white text-slate-600 hidden md:flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-200 select-none">
      {/* Topo do menu lateral */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#004C97] ring-2 ring-[#004C97]/30" />
          <span className="font-black text-xs tracking-wider text-slate-900 uppercase">
            PCP ROBOTIZADO
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5 pl-4">CIAFAL • Divinópolis</div>
      </div>

      {/* Itens agrupados compactos */}
      <nav className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-3 text-xs">
        {officialNavGroups.map((group) => (
          <div key={group.groupTitle} className="space-y-0.5">
            <div className="px-2 py-1 text-[9px] font-black tracking-widest text-slate-900 uppercase">
              {group.groupTitle}
            </div>
            {group.items.map((item) => {
              const ItemIcon = item.icon
              // Identifica seleção ativa
              const isSelected =
                item.href === '/pcp/oficina-cilindros' || item.href === '/oficina-cilindros'
                  ? location.pathname.includes('oficina-cilindros')
                  : item.href === '/pcp/sequenciamento/montagem-semanal'
                    ? (location.pathname.includes('montagem-semanal') ||
                        location.pathname.includes('programacao-semanal')) &&
                      !location.pathname.includes('programacao-mensal') &&
                      !location.pathname.includes('oficina-cilindros')
                    : item.href === '/pcp/sequenciamento/programacao-mensal'
                      ? location.pathname.includes('programacao-mensal')
                      : location.pathname === item.href ||
                        (item.href.includes('?') &&
                          location.pathname + location.search === item.href)

              const navLink = (
                <Link
                  key={item.title}
                  to={item.href}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#004C97] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ItemIcon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              )

              if (item.permission) {
                return (
                  <Can key={item.title} permission={item.permission}>
                    {navLink}
                  </Can>
                )
              }

              return navLink
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export const PCPNavigation: React.FC = () => {
  return <PCPSidebar />
}
export default PCPNavigation
