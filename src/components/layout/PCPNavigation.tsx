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
} from 'lucide-react'
import { Can } from '@/components/auth/Can'
import { ADSimulatorSwitcher } from '@/components/auth/ADSimulatorSwitcher'
import { Button } from '@/components/ui/button'

const logoCiafalBlue = 'https://img.usecurling.com/i?q=ciafal&color=blue'

interface NavSubItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
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
    title: 'Cockpit & Fila Fabril',
    href: '/pcp/cockpit',
    icon: LayoutDashboard,
  },
  {
    title: 'Gestão de Estoques',
    href: '/pcp/estoques',
    icon: Layers,
    badge: 'SAP ECC',
    permission: 'pcp.inventory.view',
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
    badge: 'S&OP',
    permission: 'pcp.masterdata.view',
    subItems: [
      {
        title: 'Visão Geral (PMP)',
        href: '/pcp/planejamento',
        icon: Layers,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'Plano Anual',
        href: '/pcp/planejamento/anual',
        icon: CalendarRange,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'Plano Mensal',
        href: '/pcp/planejamento/mensal',
        icon: CalendarRange,
        permission: 'pcp.masterdata.view',
      },
      {
        title: 'Plano Semanal',
        href: '/pcp/planejamento/semanal',
        icon: CalendarDays,
        permission: 'pcp.masterdata.view',
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
    permission: 'pcp.rules.manage',
  },
  {
    title: 'Painel de Aprovações',
    href: '/pcp/aprovacoes',
    icon: CheckCircle2,
    badge: '2 Fases',
    permission: 'pcp.schedule.approve',
  },
  {
    title: 'Responsáveis de Linha',
    href: '/pcp/linhas-responsaveis',
    icon: Users,
    permission: 'pcp.masterdata.edit',
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
        <div className="text-xs text-slate-600 font-medium hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ambiente Corporativo</span>
        </div>
        <ADSimulatorSwitcher />
      </div>
    </header>
  )
}

export const PCPSidebar: React.FC = () => {
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '/pcp/sequenciamento': true,
    '/pcp/planejamento': true,
    '/pcp/linhas': true,
  })

  const toggleSection = (href: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [href]: !prev[href],
    }))
  }

  return (
    <aside className="w-64 border-r border-slate-200 bg-white hidden md:block shrink-0 min-h-[calc(100vh-4rem)] p-3 shadow-sm">
      <nav className="space-y-1">
        {navSections.map((section) => {
          const hasSub = !!section.subItems && section.subItems.length > 0
          const isCurrentSectionActive =
            section.href === '/pcp/cockpit'
              ? location.pathname === '/pcp/cockpit' ||
                location.pathname === '/' ||
                location.pathname === '/pcp-robotizado'
              : location.pathname.startsWith(section.href)

          const isExpanded = expandedSections[section.href] ?? isCurrentSectionActive
          const SectionIcon = section.icon

          const renderSectionItem = (
            <div key={section.href} className="space-y-0.5">
              <div
                className={`flex items-center justify-between rounded-lg transition-colors group ${
                  isCurrentSectionActive && !hasSub
                    ? 'bg-[#004C97] text-white font-semibold shadow-sm'
                    : isCurrentSectionActive && hasSub
                      ? 'bg-blue-50 text-[#004C97] font-semibold border border-blue-200'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <Link
                  to={section.href}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold flex-1 overflow-hidden"
                >
                  <SectionIcon
                    className={`w-4 h-4 shrink-0 ${
                      isCurrentSectionActive
                        ? !hasSub
                          ? 'text-white'
                          : 'text-[#004C97]'
                        : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  />
                  <span className="truncate">{section.title}</span>
                  {section.badge && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                        isCurrentSectionActive && !hasSub
                          ? 'bg-blue-800/80 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {section.badge}
                    </span>
                  )}
                </Link>

                {hasSub && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleSection(section.href)
                    }}
                    className="px-2.5 py-2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                    aria-label="Expandir/Recolher subitens"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Sub-itens com verificação individual de RBAC */}
              {hasSub && isExpanded && (
                <div className="ml-3 pl-2.5 border-l border-slate-200 space-y-0.5 pt-0.5">
                  {section.subItems!.map((sub) => {
                    const SubIcon = sub.icon
                    const isSubActive =
                      sub.href === section.href
                        ? location.pathname === sub.href
                        : location.pathname.startsWith(sub.href)

                    const navSub = (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                          isSubActive
                            ? 'bg-[#004C97] text-white font-bold shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <SubIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{sub.title}</span>
                      </Link>
                    )

                    if (sub.permission) {
                      return (
                        <Can key={sub.href} permission={sub.permission}>
                          {navSub}
                        </Can>
                      )
                    }
                    return navSub
                  })}
                </div>
              )}
            </div>
          )

          if (section.permission) {
            return (
              <Can key={section.href} permission={section.permission}>
                {renderSectionItem}
              </Can>
            )
          }

          return renderSectionItem
        })}
      </nav>
    </aside>
  )
}

export const PCPNavigation: React.FC = () => {
  return <PCPSidebar />
}
export default PCPNavigation
