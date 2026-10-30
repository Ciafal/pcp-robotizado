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
import { useNavigate } from 'react-router-dom'
import { ResponsiveHorizontalNav } from '@/components/common/ResponsiveHorizontalNav'
import { mpSdcService } from '@/services/mp-sidercentro-service'

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
  lowStockCount?: number
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
  lowStockCount: propLowStockCount,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [internalLowStockCount, setInternalLowStockCount] = React.useState<number | null>(null)

  // Caso lowStockCount não tenha sido explicitamente passado via prop, busca da fonte central
  React.useEffect(() => {
    if (propLowStockCount !== undefined) return
    let isMounted = true
    mpSdcService
      .getSteelMatrixRows()
      .then((rows) => {
        if (!isMounted) return
        const count = rows.filter((r) => r.projected_balance_tons < r.min_stock_tons).length
        setInternalLowStockCount(count)
      })
      .catch(() => {
        if (isMounted) setInternalLowStockCount(0)
      })
    return () => {
      isMounted = false
    }
  }, [propLowStockCount])

  const effectiveLowStockCount =
    propLowStockCount !== undefined ? propLowStockCount : (internalLowStockCount ?? 0)

  return (
    <div className="w-full max-w-full min-w-0 box-border space-y-4 bg-slate-50">
      {/* Header Compacto da Gestão de MP (Linha 1: Título + Descrição Curta + Indicador Resumo + Ações) */}
      <div className="w-full max-w-full min-w-0 box-border bg-white border border-slate-200 rounded-lg p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        {/* Linha 1: Título em linha única + tags + Indicador Estoque Baixo + Ações alinhadas */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight whitespace-nowrap">
              GESTÃO DE MATÉRIA-PRIMA
            </h1>
            <span className="text-[9px] font-black uppercase tracking-wider text-[#004C97] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap">
              PCP ROBOTIZADO &bull; SAP ECC (ZPP86/ZPPMP)
            </span>

            {/* Indicador Resumo Discreto de Estoque Baixo */}
            {effectiveLowStockCount > 0 ? (
              <span
                data-testid="mp-header-low-stock-indicator"
                title={`${effectiveLowStockCount} material(is) com estoque projetado abaixo do mínimo de segurança`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold shrink-0 animate-in fade-in duration-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                <span>
                  {effectiveLowStockCount}{' '}
                  {effectiveLowStockCount === 1 ? 'material crítico' : 'materiais críticos'}
                </span>
              </span>
            ) : (
              <span
                data-testid="mp-header-low-stock-indicator-ok"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Estoque regular</span>
              </span>
            )}

            <p className="text-[11px] text-slate-500 hidden 2xl:inline line-clamp-1">
              Otimização do ciclo completo de suprimento e corte integrado à programação.
            </p>
          </div>

          {headerActions && (
            <div className="flex items-center gap-1.5 flex-wrap shrink-0 max-w-full">
              {headerActions}
            </div>
          )}
        </div>

        {/* Linha 2: Fluxo horizontal compacto do ciclo de MP */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 w-full max-w-full min-w-0 box-border text-[10px] text-slate-600 font-semibold">
          <span className="text-slate-400 uppercase text-[9px] font-bold shrink-0">
            Ciclo Operacional:
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap shrink-0">
            1. Necessidade
          </span>
          <span className="text-slate-400 shrink-0">&rarr;</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap shrink-0">
            2. Compra (ME23N)
          </span>
          <span className="text-slate-400 shrink-0">&rarr;</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap shrink-0">
            3. Recebimento
          </span>
          <span className="text-slate-400 shrink-0">&rarr;</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap shrink-0">
            4. Estoque Dimensional
          </span>
          <span className="text-slate-400 shrink-0">&rarr;</span>
          <span className="bg-blue-50 text-[#004C97] border border-blue-200 px-2 py-0.5 rounded font-bold whitespace-nowrap shrink-0">
            5. Plano de Corte
          </span>
          <span className="text-slate-400 shrink-0">&rarr;</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap shrink-0">
            6. Aplicação (ZPP86)
          </span>
          <span className="text-slate-400 shrink-0">&rarr;</span>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold whitespace-nowrap shrink-0">
            7. Reaplicação
          </span>
        </div>
      </div>

      {/* Régua dos Subtópicos da Gestão de MP com Navegação Horizontal Responsiva e Setas */}
      <div className="w-full max-w-full min-w-0 box-border bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs">
        <ResponsiveHorizontalNav
          ariaLabel="Navegação da Gestão de MP"
          storageKey="gestao_mp_topics"
          activeId={
            activeTopic ||
            (location.pathname.includes('/planos-corte') ||
            location.pathname.includes('/plano-corte') ||
            location.pathname.includes('/estoque-dimensional')
              ? 'planos-corte'
              : location.pathname.includes('/pedidos-recebimento')
                ? 'pedidos-recebimento'
                : location.pathname.includes('/projecoes-mp')
                  ? 'projecoes-mp'
                  : location.pathname.includes('/saldo-disponibilidade-destino')
                    ? 'saldo-disponibilidade-destino'
                    : location.pathname.includes('/niveis-estoque-acos-especiais')
                      ? 'niveis-estoque-acos-especiais'
                      : location.pathname.includes('/saldo-mp-l1-previsao-consumo')
                        ? 'saldo-mp-l1-previsao-consumo'
                        : location.pathname.includes('/utilizacao-substituicao-mp')
                          ? 'utilizacao-substituicao-mp'
                          : location.pathname.includes('/otimizar-aplicacoes')
                            ? 'otimizar-aplicacoes'
                            : location.pathname.includes('/industrializador')
                              ? 'materia-prima-industrializador'
                              : location.pathname.includes('/sidercentro')
                                ? 'materia-prima-sidercentro'
                                : 'visao-geral')
          }
          items={mpMainTopics.map((topic) => {
            const TopicIcon = topic.icon
            return {
              id: topic.id,
              icon: TopicIcon,
              label: (
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md text-[10px] flex items-center justify-center font-mono font-bold bg-black/10">
                    {topic.number}
                  </span>
                  <span>{topic.title}</span>
                </div>
              ),
              onClick: () => {
                if (location.pathname !== topic.path) {
                  navigate(topic.path)
                }
              },
            }
          })}
        />
      </div>

      {/* Conteúdo da Subpágina */}
      <div className="w-full max-w-full min-w-0 box-border space-y-4">{children}</div>
    </div>
  )
}
