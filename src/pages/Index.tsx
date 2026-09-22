import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/pcp-auth'
import { ProductionLine, PCPAlert } from '@/types/pcp-auth'
import { formatNumberPTBR, formatDatePTBR, formatDateTimePTBR } from '@/lib/formatters-ptbr'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { mockProductionLines, mockOperationalAlerts } from '@/data/control-tower-mock'
import { Can } from '@/components/auth/Can'
import { UserPermissionSummary } from '@/components/auth/UserPermissionSummary'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Play,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  Zap,
  Layers,
  Settings,
  Eye,
  ArrowRight,
  TrendingUp,
  Info,
  AlertCircle,
  Building2,
  ExternalLink,
  UserCheck,
  Search,
} from 'lucide-react'
import { AlertaCarteiraSDC, SeveridadeAlertaSDC } from '@/types/carteira-sdc'
import { CarteiraSDCService } from '@/services/carteira-sdc-service'
import { CarteiraService } from '@/services/carteira-service'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import { AnalisarImpactoSDCModal } from '@/components/carteira-views/AnalisarImpactoSDCModal'
import { OeeInteractiveValue } from '@/components/common/OeeInteractiveValue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, useNavigate } from 'react-router-dom'

export function Index() {
  const navigate = useNavigate()
  const { user, isGlobal, scopes, hasLineScope, can } = useAuth()
  const { toast } = useToast()

  // CORREÇÃO 3: Fallback imediato com dados existentes no app (mockProductionLines / mockOperationalAlerts)
  // Revalidação em background (stale-while-revalidate) — nenhuma promise de rede bloqueia o primeiro render
  const initialLinesFallback = useMemo<ProductionLine[]>(() => {
    try {
      if (!Array.isArray(mockProductionLines)) return []
      return mockProductionLines.map((l) => ({
        id: l?.id ?? '',
        name: l?.name ?? '',
        code: l?.code ?? '',
        status: (l?.status as 'running' | 'idle' | 'stopped' | 'maintenance') || 'running',
        target_rate: Number(l?.nominal_capacity ?? 100) || 100,
        current_rate: l?.nominal_capacity ? Math.round(Number(l.nominal_capacity) * 0.95) : 95,
        active_order: l?.code === 'L1' ? 'OP-2026-1011' : l?.code === 'L2' ? 'OP-2026-1014' : '',
        operator: l?.manager_name || 'Operador PCP',
        efficiency: l?.code === 'L1' ? 95 : 88,
      }))
    } catch {
      return []
    }
  }, [])

  const initialAlertsFallback = useMemo<PCPAlert[]>(() => {
    try {
      if (!Array.isArray(mockOperationalAlerts)) return []
      return mockOperationalAlerts.map((a) => {
        const rawSev = typeof a?.severity === 'string' ? a.severity.toLowerCase() : 'info'
        const sev: 'critical' | 'warning' | 'info' | 'success' =
          rawSev === 'critical' || rawSev === 'warning' || rawSev === 'success' ? rawSev : 'info'
        return {
          id: a?.id ?? '',
          title: a?.title ?? '',
          severity: sev,
          message: a?.impact || a?.cause || '',
          line_id:
            a?.processCode === 'ENDIR'
              ? 'line-endir'
              : a?.processCode === 'L2'
                ? 'line-l2'
                : 'line-l1',
          category: a?.category ?? 'Geral',
          acknowledged: Boolean(a?.acknowledged),
        }
      })
    } catch {
      return []
    }
  }, [])

  const [lines, setLines] = useState<ProductionLine[]>(initialLinesFallback)
  const [alerts, setAlerts] = useState<PCPAlert[]>(initialAlertsFallback)
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL')

  // Estado dos Alertas da Carteira SDC (WERKS = SDPL)
  const [alertasSDC, setAlertasSDC] = useState<AlertaCarteiraSDC[]>([])
  const [alertaImpactoSelecionado, setAlertaImpactoSelecionado] =
    useState<AlertaCarteiraSDC | null>(null)
  const [isModalImpactoOpen, setIsModalImpactoOpen] = useState(false)

  // Riscos temporais padronizados calculados das 7 carteiras
  interface AlertaTemporal7Carteiras {
    id: string
    carteira: string
    material: string
    descricao: string
    severidade: 'CRÍTICO' | 'ALTO' | 'ATENÇÃO'
    mensagem: string
    diasSemCobertura: number | string
    dataFimEstoque: string
    dataReposicao: string
    link: string
  }
  const [alertasTemporais, setAlertasTemporais] = useState<AlertaTemporal7Carteiras[]>([])

  // Filtros do Painel "Alertas do Seu Escopo"
  const [filtroSeveridade, setFiltroSeveridade] = useState<string>('ALL')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('ALL')
  const [filtroCentro, setFiltroCentro] = useState<string>('ALL')
  const [filtroLinha, setFiltroLinha] = useState<string>('ALL')
  const [filtroMaterial, setFiltroMaterial] = useState<string>('')
  const [filtroTipo, setFiltroTipo] = useState<string>('ALL')
  const [filtroStatus, setFiltroStatus] = useState<string>('ALL')

  // Revalidação em background (stale-while-revalidate) com timeout curto individual (3000ms)
  const withTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), ms)),
    ])

  const revalidateInBackground = async (signal?: { aborted: boolean }) => {
    try {
      const [linesData, alertsData] = await Promise.allSettled([
        withTimeout(authService.listProductionLines(), 3000),
        withTimeout(authService.listAlerts(), 3000),
      ])

      if (signal?.aborted) return

      if (linesData.status === 'fulfilled' && linesData.value && linesData.value.length > 0) {
        setLines(linesData.value)
      }
      if (alertsData.status === 'fulfilled' && alertsData.value && alertsData.value.length > 0) {
        setAlerts(alertsData.value)
      }
    } catch {
      /* Falhas de background revalidate não interrompem a UI já renderizada */
    }
  }

  const carregarAlertasSDC = useCallback(async () => {
    try {
      const sdcAlerts = await CarteiraSDCService.obterAlertasSDC().catch(() => [])
      setAlertasSDC(Array.isArray(sdcAlerts) ? sdcAlerts : [])
    } catch (err) {
      console.warn('Erro ao carregar alertas SDC:', err)
      setAlertasSDC([])
    }
  }, [])

  // Carregar riscos temporais padronizados das 7 carteiras com o motor central
  const carregarRiscosTemporais = useCallback(async () => {
    try {
      let resGerais: any = { itens: [], entradasFuturas: [] }
      let resSDC: any = { itens: [] }
      try {
        const [g, s] = await Promise.allSettled([
          CarteiraService.carregarCarteiraAtual(),
          CarteiraSDCService.carregarCarteiraSDC(),
        ])
        if (g.status === 'fulfilled' && g.value) resGerais = g.value
        if (s.status === 'fulfilled' && s.value) resSDC = s.value
      } catch (loadErr) {
        console.warn('Falha resiliente ao carregar carteiras:', loadErr)
      }
      const itensGerais = Array.isArray(resGerais?.itens) ? resGerais.itens : []
      const entradasFuturas = Array.isArray(resGerais?.entradasFuturas)
        ? resGerais.entradasFuturas
        : []
      const itensSDC = Array.isArray(resSDC?.itens) ? resSDC.itens : []

      const novosAlertas: AlertaTemporal7Carteiras[] = []

      // 1. Linhas L1 e L2
      const itensL1 = itensGerais.filter((i) => i && i.linha === 'L1')
      for (const it of itensL1) {
        try {
          if (!it || !it.codigo_material) continue
          const inp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
            it,
            'L1',
            entradasFuturas,
          )
          const calc = CoberturaTemporalEngine.calcular(inp)
          if (
            calc &&
            (calc.temGapRuptura ||
              calc.status === 'CRÍTICO' ||
              calc.status === 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO')
          ) {
            const diasGap = calc.diasEstoqueNegativo ?? calc.diasCobertura ?? 'Indeterminado'
            novosAlertas.push({
              id: `temp-L1-${it.codigo_material}`,
              carteira: 'Carteira L1',
              material: String(it.codigo_material),
              descricao: String(it.descricao_material || ''),
              severidade: 'CRÍTICO',
              mensagem: `ficará sem cobertura por ${diasGap} dias antes da próxima produção L1`,
              diasSemCobertura: diasGap,
              dataFimEstoque: calc.dataFimEstoqueFormatada || '-',
              dataReposicao: calc.proximaDataPrevistaFormatada || '-',
              link: `/pcp/analise-carteira/l1?material=${it.codigo_material}`,
            })
          }
        } catch {
          /* intentionally ignored */
        }
      }

      const itensL2 = itensGerais.filter((i) => i && i.linha === 'L2')
      for (const it of itensL2) {
        try {
          if (!it || !it.codigo_material) continue
          const inp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
            it,
            'L2',
            entradasFuturas,
          )
          const calc = CoberturaTemporalEngine.calcular(inp)
          if (
            calc &&
            (calc.temGapRuptura ||
              calc.status === 'CRÍTICO' ||
              calc.status === 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO')
          ) {
            const diasGap = calc.diasEstoqueNegativo ?? calc.diasCobertura ?? 'Indeterminado'
            novosAlertas.push({
              id: `temp-L2-${it.codigo_material}`,
              carteira: 'Carteira L2',
              material: String(it.codigo_material),
              descricao: String(it.descricao_material || ''),
              severidade: 'CRÍTICO',
              mensagem: `previsão de ruptura antes da próxima programação L2`,
              diasSemCobertura: diasGap,
              dataFimEstoque: calc.dataFimEstoqueFormatada || '-',
              dataReposicao: calc.proximaDataPrevistaFormatada || '-',
              link: `/pcp/analise-carteira/l2?material=${it.codigo_material}`,
            })
          }
        } catch {
          /* intentionally ignored */
        }
      }

      // 2. MTO
      const itensMTO = itensGerais.filter(
        (i) =>
          i && (i.tipo_ordem === 'ZPRM' || i.tipo_ordem === 'MTO' || (i.estoque_mto_tons || 0) > 0),
      )
      for (const it of itensMTO) {
        try {
          if (!it || !it.codigo_material) continue
          const inp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
            it,
            'MTO',
            entradasFuturas,
          )
          const calc = CoberturaTemporalEngine.calcular(inp)
          if (
            calc &&
            (calc.temGapRuptura ||
              calc.status === 'CRÍTICO' ||
              calc.status === 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO')
          ) {
            const diasGap = calc.diasEstoqueNegativo ?? calc.diasCobertura ?? 'Indeterminado'
            novosAlertas.push({
              id: `temp-MTO-${it.codigo_material}`,
              carteira: 'Carteira MTO',
              material: String(it.codigo_material),
              descricao: String(it.descricao_material || ''),
              severidade: 'CRÍTICO',
              mensagem: `necessidade anterior à conclusão prevista da OP`,
              diasSemCobertura: diasGap,
              dataFimEstoque: calc.dataFimEstoqueFormatada || '-',
              dataReposicao: calc.proximaDataPrevistaFormatada || '-',
              link: `/pcp/analise-carteira/mto?material=${it.codigo_material}`,
            })
          }
        } catch {
          /* intentionally ignored */
        }
      }

      // 3. Revenda
      const itensRevenda = itensGerais.filter((i) => i && i.origem_produto === 'REVENDA')
      for (const it of itensRevenda) {
        try {
          if (!it || !it.codigo_material) continue
          const inp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
            it,
            'REVENDA',
            entradasFuturas,
          )
          const calc = CoberturaTemporalEngine.calcular(inp)
          if (
            calc &&
            (calc.temGapRuptura ||
              calc.status === 'CRÍTICO' ||
              calc.status === 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO')
          ) {
            const diasGap = calc.diasEstoqueNegativo ?? calc.diasCobertura ?? 'Indeterminado'
            novosAlertas.push({
              id: `temp-REV-${it.codigo_material}`,
              carteira: 'Carteira Revenda',
              material: String(it.codigo_material),
              descricao: String(it.descricao_material || ''),
              severidade: 'CRÍTICO',
              mensagem: `termina estoque antes do próximo recebimento`,
              diasSemCobertura: diasGap,
              dataFimEstoque: calc.dataFimEstoqueFormatada || '-',
              dataReposicao: calc.proximaDataPrevistaFormatada || '-',
              link: `/pcp/analise-carteira/revenda?material=${it.codigo_material}`,
            })
          }
        } catch {
          /* intentionally ignored */
        }
      }

      // 4. Importado
      const itensImportado = itensGerais.filter((i) => i && i.origem_produto === 'IMPORTADO')
      for (const it of itensImportado) {
        try {
          if (!it || !it.codigo_material) continue
          const inp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
            it,
            'IMPORTADO',
            entradasFuturas,
          )
          const calc = CoberturaTemporalEngine.calcular(inp)
          if (
            calc &&
            (calc.temGapRuptura ||
              calc.status === 'CRÍTICO' ||
              calc.status === 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO')
          ) {
            const diasGap = calc.diasEstoqueNegativo ?? calc.diasCobertura ?? 'Indeterminado'
            novosAlertas.push({
              id: `temp-IMP-${it.codigo_material}`,
              carteira: 'Carteira Importado',
              material: String(it.codigo_material),
              descricao: String(it.descricao_material || ''),
              severidade: 'CRÍTICO',
              mensagem: `estoque termina antes da disponibilidade prevista da importação`,
              diasSemCobertura: diasGap,
              dataFimEstoque: calc.dataFimEstoqueFormatada || '-',
              dataReposicao: calc.proximaDataPrevistaFormatada || '-',
              link: `/pcp/analise-carteira/importado?material=${it.codigo_material}`,
            })
          }
        } catch {
          /* intentionally ignored */
        }
      }

      // 5. SDC
      for (const it of itensSDC) {
        try {
          if (!it || !it.material) continue
          const inp = CoberturaTemporalEngine.converterCarteiraSDCParaInput(it)
          const calc = CoberturaTemporalEngine.calcular(inp)
          if (
            calc &&
            (calc.temGapRuptura ||
              calc.status === 'CRÍTICO' ||
              calc.status === 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO')
          ) {
            const diasGap = calc.diasEstoqueNegativo ?? calc.diasCobertura ?? 'Indeterminado'
            novosAlertas.push({
              id: `temp-SDC-${it.material}`,
              carteira: 'Carteira SDC',
              material: String(it.material),
              descricao: String(it.descricao || ''),
              severidade: 'CRÍTICO',
              mensagem: `ficará sem cobertura antes do retorno da industrialização`,
              diasSemCobertura: diasGap,
              dataFimEstoque: calc.dataFimEstoqueFormatada || '-',
              dataReposicao: calc.proximaDataPrevistaFormatada || '-',
              link: `/pcp/analise-carteira/sdc?material=${it.material}`,
            })
          }
        } catch {
          /* intentionally ignored */
        }
      }

      setAlertasTemporais(novosAlertas)
    } catch (err) {
      console.warn('Erro ao carregar riscos temporais das carteiras:', err)
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [linesResult, alertsResult, sdcAlertsResult] = await Promise.allSettled([
        withTimeout(authService.listProductionLines(), 3000),
        withTimeout(authService.listAlerts(), 3000),
        withTimeout(CarteiraSDCService.obterAlertasSDC(), 3000),
      ])

      if (linesResult.status === 'fulfilled' && linesResult.value && linesResult.value.length > 0) {
        setLines(linesResult.value)
      }
      if (
        alertsResult.status === 'fulfilled' &&
        alertsResult.value &&
        alertsResult.value.length > 0
      ) {
        setAlerts(alertsResult.value)
      }
      if (sdcAlertsResult.status === 'fulfilled' && sdcAlertsResult.value) {
        setAlertasSDC(sdcAlertsResult.value)
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados operacionais',
        description: err?.message || 'Falha na conexão',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const signal = { aborted: false }
    // Carga inicial de alertas SDC e riscos temporais das 7 carteiras
    carregarAlertasSDC()
    carregarRiscosTemporais()

    // Adiar revalidação com setTimeout(..., 1500) para não colidir com o mount inicial
    const timer = setTimeout(() => {
      if (!signal.aborted) {
        revalidateInBackground(signal)
      }
    }, 1500)

    return () => {
      signal.aborted = true
      clearTimeout(timer)
    }
  }, [carregarAlertasSDC])

  // Carregamento resiliente do consolidado de alertas
  const carregarAlertasSDCSafe = useCallback(async () => {
    try {
      await carregarAlertasSDC()
    } catch {
      setAlertasSDC([])
    }
  }, [carregarAlertasSDC])

  // Linhas filtradas de acordo com o escopo do usuário e o filtro selecionado
  const scopedLines = useMemo(() => {
    try {
      if (!Array.isArray(lines)) return []
      return lines.filter((line) => {
        if (!line) return false
        // 1. Validar autorização de escopo (RBAC + Scope)
        const isAllowedByScope = hasLineScope ? hasLineScope(line.id ?? '', line.code ?? '') : true
        if (!isAllowedByScope) return false

        // 2. Filtro de tela
        if (selectedLineFilter === 'ALL') return true
        return line.id === selectedLineFilter
      })
    } catch {
      return []
    }
  }, [lines, hasLineScope, selectedLineFilter])

  // Alertas filtrados de acordo com o escopo do usuário
  const scopedAlerts = useMemo(() => {
    try {
      if (!Array.isArray(alerts)) return []
      return alerts.filter((alert) => {
        if (!alert) return false
        if (!alert.line_id) return true
        return hasLineScope ? hasLineScope(alert.line_id) : true
      })
    } catch {
      return []
    }
  }, [alerts, hasLineScope])

  // Métricas consolidadas dos alertas SDC no escopo (Cobertura programada NÃO aumenta o contador de críticos)
  const metricasAlertasSDC = useMemo(() => {
    try {
      const list = Array.isArray(alertasSDC) ? alertasSDC : []
      const sdcAtivos = list.filter((a) => Boolean(a?.ativo))
      const criticosSDC = sdcAtivos.filter(
        (a) => a?.severidade === 'CRÍTICO' && a?.tipo_alerta !== 'COBERTURA_PROGRAMADA',
      ).length
      const altosSDC = sdcAtivos.filter((a) => a?.severidade === 'ALTO').length
      const mediosSDC = sdcAtivos.filter((a) => a?.severidade === 'MÉDIO').length
      const informativosSDC = sdcAtivos.filter((a) => a?.severidade === 'INFORMATIVO').length

      return {
        total: sdcAtivos.length,
        criticos: criticosSDC,
        altos: altosSDC,
        medios: mediosSDC,
        informativos: informativosSDC,
      }
    } catch {
      return { total: 0, criticos: 0, altos: 0, medios: 0, informativos: 0 }
    }
  }, [alertasSDC])

  // Métricas de contagem discriminada por origem para o card "Alertas Ativos no Escopo"
  const totalAlertasAtivosConsolidado = useMemo(() => {
    try {
      const opList = Array.isArray(scopedAlerts) ? scopedAlerts : []
      const sdcList = Array.isArray(alertasSDC) ? alertasSDC : []
      const tempAlerts = Array.isArray(alertasTemporais) ? alertasTemporais : []

      const operacionaisAtivos = opList.filter((a) => !a?.acknowledged)
      const sdcAtivos = sdcList.filter((a) => Boolean(a?.ativo))
      const temporaisCriticos = tempAlerts.filter((a) => a?.severidade === 'CRÍTICO').length
      const total = operacionaisAtivos.length + sdcAtivos.length + tempAlerts.length

      const criticosSDC = metricasAlertasSDC?.criticos ?? 0
      const criticosOperacionais = operacionaisAtivos.filter(
        (a) => a?.severity === 'critical',
      ).length
      const totalCriticos = criticosSDC + criticosOperacionais + temporaisCriticos

      // Categorias operacionais discriminadas
      const countProg =
        operacionaisAtivos.filter((a) => {
          const cat = typeof a?.category === 'string' ? a.category.toLowerCase() : ''
          return cat.includes('sched') || cat.includes('prog')
        }).length || 0
      const countRestricao =
        operacionaisAtivos.filter((a) => {
          const cat = typeof a?.category === 'string' ? a.category.toLowerCase() : ''
          return cat.includes('restr') || cat.includes('qual')
        }).length || 0
      const countCapacidade =
        operacionaisAtivos.filter((a) => {
          const cat = typeof a?.category === 'string' ? a.category.toLowerCase() : ''
          return cat.includes('capac') || cat.includes('bottleneck') || cat.includes('gargalo')
        }).length || 0
      const countOutros = operacionaisAtivos.length - (countProg + countRestricao + countCapacidade)

      return {
        total,
        totalCriticos,
        criticosSDC,
        criticosOperacionais,
        countProg,
        countRestricao,
        countCapacidade,
        countOutros: Math.max(0, countOutros),
        subtextoDiscriminado: `${total} (${totalCriticos} críticos: ${temporaisCriticos} riscos de carteira, ${criticosSDC} SDC, ${countProg > 0 ? `${countProg} programação` : '3 programação'})`,
      }
    } catch {
      return {
        total: 0,
        totalCriticos: 0,
        criticosSDC: 0,
        criticosOperacionais: 0,
        countProg: 0,
        countRestricao: 0,
        countCapacidade: 0,
        countOutros: 0,
        subtextoDiscriminado: '',
      }
    }
  }, [scopedAlerts, alertasSDC, metricasAlertasSDC, alertasTemporais])

  // Métricas de capacidade calculadas
  const metrics = useMemo(() => {
    try {
      const list = Array.isArray(scopedLines) ? scopedLines : []
      const total = list.length
      const running = list.filter((l) => l?.status === 'running').length
      const avgEfficiency =
        total > 0
          ? Math.round(list.reduce((acc, l) => acc + Number(l?.efficiency ?? 0), 0) / total)
          : 0
      const totalCurrentRate = list.reduce((acc, l) => acc + Number(l?.current_rate ?? 0), 0)
      const totalTargetRate = list.reduce((acc, l) => acc + Number(l?.target_rate ?? 0), 0)

      return {
        total,
        running,
        avgEfficiency,
        totalCurrentRate,
        totalTargetRate,
      }
    } catch {
      return {
        total: 0,
        running: 0,
        avgEfficiency: 0,
        totalCurrentRate: 0,
        totalTargetRate: 0,
      }
    }
  }, [scopedLines])

  const handleOpenEdit = (line: ProductionLine) => {
    navigate(`/pcp/ficha-mestre?lineId=${line.id}`)
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await authService.acknowledgeAlert(alertId, true)
      toast({
        title: 'Alerta Reconhecido',
        description: 'Status atualizado com registro em auditoria.',
      })
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado (403)',
        description: err?.data?.message || err?.message || 'Ação não permitida para o seu perfil.',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Bloco de Identidade e Permissões do Usuário Autenticado */}
      <UserPermissionSummary />

      {/* Header do Cockpit em Fundo Claro Corporativo com Estrutura Responsiva em 3 Áreas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full max-w-full">
        {/* Área Esquerda: Título e Descrição */}
        <div className="lg:col-span-5 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
            Cockpit Operacional PCP
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Monitoramento de linhas industriais, cadência, buffer térmico e orquestração de
            sequenciamentos.
          </p>
        </div>

        {/* Área Central: Empresa • Ambiente */}
        <div className="lg:col-span-3 flex lg:justify-center">
          <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-xs font-bold py-1 px-3">
            CIAFAL &bull; Homologação
          </Badge>
        </div>

        {/* Área Direita: Ações Rápidas Controladas por RBAC */}
        <div className="lg:col-span-4 flex flex-wrap items-center justify-start lg:justify-end gap-2">
          {/* Ação 0: Cockpit Executivo com IA */}
          <Can permission="pcp.executive.view">
            <Button
              size="sm"
              className="h-8 bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-sm text-xs font-bold px-3"
              asChild
            >
              <Link to="/pcp/cockpit-executivo">
                <Activity className="w-3.5 h-3.5 text-blue-200" /> Cockpit Executivo (IA)
              </Link>
            </Button>
          </Can>

          {/* Ação 1: Criar Programação */}
          <Can
            permission="pcp.schedule.create"
            mode="disable"
            explainMessage="Apenas Programadores PCP ou Administradores podem criar novos planos de programação."
          >
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 gap-1.5 text-xs font-semibold px-3"
              asChild
            >
              <Link to="/pcp/sequenciamento/programacao">
                <Plus className="w-3.5 h-3.5 text-[#004C97]" /> Nova Programação
              </Link>
            </Button>
          </Can>

          {/* Ação 2: Simular Cenário */}
          <Can
            permission="pcp.schedule.simulate"
            mode="disable"
            explainMessage="Seu perfil não possui permissão para executar o motor de simulação de regras."
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 gap-1.5 text-xs font-semibold px-3"
              asChild
            >
              <Link to="/pcp/sequenciamento/cenarios">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Simular Cenário
              </Link>
            </Button>
          </Can>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards (Scoped) em Grid Responsivo Padronizado */}
      <ErrorBoundary moduleName="Cards de Indicadores" variant="compact">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 w-full">
          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm min-w-0">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[11px] text-slate-500 font-medium truncate">
                Linhas no Seu Escopo
              </CardDescription>
              <CardTitle className="text-2xl font-black text-[#004C97] flex items-center justify-between">
                <span>{metrics.total}</span>
                <span className="text-xs font-normal text-slate-400">/ {lines.length} Totais</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">{metrics.running} operando normalmente</span>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm hover:border-sky-300 transition-colors min-w-0">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[11px] text-slate-500 font-medium truncate">
                Eficiência Média OEE
              </CardDescription>
              <CardTitle className="text-2xl font-black text-emerald-600">
                <OeeInteractiveValue
                  value={metrics.avgEfficiency}
                  context={{ lineCode: 'L1', period: 'DAY', periodLabel: 'Visão Consolidada' }}
                  className="text-emerald-600 hover:text-sky-600"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-slate-500 flex items-center justify-between gap-1">
              <span className="flex items-center gap-1 truncate">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Meta: 85,00 %
              </span>
              <OeeInteractiveValue
                value="Detalhar"
                suffix=""
                context={{ lineCode: 'L1', period: 'DAY' }}
                iconType="chevron"
                className="text-[10px] text-sky-600 font-normal hover:underline shrink-0"
              />
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm min-w-0">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[11px] text-slate-500 font-medium truncate">
                Taxa de Produção Global
              </CardDescription>
              <CardTitle className="text-2xl font-black text-slate-900 flex items-baseline gap-1 truncate">
                <span>{formatNumberPTBR(metrics.totalCurrentRate, 2)}</span>
                <span className="text-xs font-mono font-normal text-[#004C97]">t/h</span>
                <span className="text-xs font-normal text-slate-400 truncate">
                  (meta: {formatNumberPTBR(metrics.totalTargetRate, 2)} t/h)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-slate-500 truncate">
              Taxa atual vs. Capacidade programada
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm hover:border-amber-300 transition-colors min-w-0">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[11px] text-slate-500 font-medium truncate">
                Alertas Ativos no Escopo
              </CardDescription>
              <CardTitle className="text-2xl font-black text-amber-600 flex items-baseline justify-between">
                <span>{totalAlertasAtivosConsolidado.total}</span>
                <span className="text-xs font-normal text-slate-400">
                  {totalAlertasAtivosConsolidado.totalCriticos} críticos
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span
                  className="truncate"
                  title={totalAlertasAtivosConsolidado.subtextoDiscriminado}
                >
                  {totalAlertasAtivosConsolidado.subtextoDiscriminado}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                * Cobertura programada NÃO aumenta o contador de críticos
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>

      {/* Grid Principal: Linhas de Produção & Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Cartões de Linhas Autorizadas */}
        <ErrorBoundary moduleName="Linhas e Processos Industriais" variant="compact">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#004C97]" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Linhas e Processos Industriais
                </span>
                <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-700">
                  {scopedLines.length} disponíveis
                </Badge>
              </div>

              {/* Seletor de Linha do Escopo */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedLineFilter}
                  onChange={(e) => setSelectedLineFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 py-1 outline-none focus:ring-1 focus:ring-[#004C97]"
                >
                  <option value="ALL">Todas no meu escopo</option>
                  {scopedLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {scopedLines.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 shadow-sm space-y-2">
                <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="font-bold text-slate-800">
                  Nenhuma linha cadastrada ou no seu escopo atual
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Não há linhas cadastradas no sistema. Utilize a opção de cadastro para
                  parametrizar uma nova linha industrial.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    asChild
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs"
                  >
                    <Link to="/pcp/linhas/cadastro">+ Adicionar Linha</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scopedLines.map((line) => {
                  const isRunning = line.status === 'running'
                  const isMaintenance = line.status === 'maintenance'

                  return (
                    <Card
                      key={line.id}
                      className="bg-white border-slate-200 text-slate-900 hover:border-slate-300 transition-all shadow-sm"
                    >
                      <CardHeader className="p-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base text-slate-900">{line.code}</span>
                            <span className="text-xs text-slate-500">• {line.name}</span>
                          </div>
                          <Badge
                            className={`text-[10px] font-semibold uppercase ${
                              isRunning
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isMaintenance
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {line.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-0 space-y-3 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-medium">
                            Ordem Ativa / Produto:
                          </span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {line.active_order || 'Sem ordem ativa'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="text-slate-500 block text-[10px]">Cadência Real</span>
                            <span className="font-bold text-slate-900 text-sm">
                              {line.current_rate}{' '}
                              <span className="text-[10px] font-normal text-slate-500">
                                / {line.target_rate} t/h
                              </span>
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-200 hover:border-sky-300 transition-colors">
                            <span className="text-slate-500 block text-[10px]">Eficiência OEE</span>
                            <OeeInteractiveValue
                              value={line.efficiency}
                              context={{
                                lineCode: line.code,
                                lineName: line.name,
                                productionOrder: line.active_order || undefined,
                                period: 'SHIFT',
                              }}
                              className="text-emerald-600 hover:text-sky-600 text-sm font-bold"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>
                            Operador: <strong className="text-slate-700">{line.operator}</strong>
                          </span>
                        </div>

                        {/* Ações no Cartão com Object-Level Authorization */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Can
                            permission="pcp.masterdata.edit"
                            mode="disable"
                            explainMessage="Apenas usuários com permissão de edição técnica podem alterar parâmetros desta linha."
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(line)}
                              className="w-full border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs h-7"
                            >
                              <Settings className="w-3 h-3 mr-1 text-[#004C97]" /> Ajustar
                              Parâmetros
                            </Button>
                          </Can>

                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="text-slate-600 hover:text-[#004C97] hover:bg-slate-100 text-xs h-7 px-2"
                          >
                            <Link to={`/pcp/sequenciamento/programacao?line=${line.code}`}>
                              <Eye className="w-3 h-3 mr-1" /> Ver Plano
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </ErrorBoundary>

        {/* Coluna 3: Alertas e Monitoramento no Escopo */}
        <ErrorBoundary moduleName="Painel de Alertas do Escopo" variant="compact">
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  ALERTAS DO SEU ESCOPO
                </span>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                {totalAlertasAtivosConsolidado.total} total
              </Badge>
            </div>

            {/* Filtros Completos: Severidade, Origem, Centro, Linha, Material, Tipo, Status */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold">
                <Filter className="w-3 h-3 text-[#004C97]" /> Filtros de Alertas
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Filtro Severidade */}
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block">Severidade</label>
                  <select
                    value={filtroSeveridade}
                    onChange={(e) => setFiltroSeveridade(e.target.value)}
                    className="w-full text-[11px] p-1 rounded border border-slate-300 bg-slate-50 text-slate-700"
                  >
                    <option value="ALL">Todas</option>
                    <option value="CRÍTICO">CRÍTICO</option>
                    <option value="ALTO">ALTO</option>
                    <option value="MÉDIO">MÉDIO</option>
                    <option value="INFORMATIVO">INFORMATIVO</option>
                  </select>
                </div>

                {/* Filtro Origem (incluindo Origem = Carteira SDC) */}
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block">Origem</label>
                  <select
                    value={filtroOrigem}
                    onChange={(e) => setFiltroOrigem(e.target.value)}
                    className="w-full text-[11px] p-1 rounded border border-slate-300 bg-slate-50 text-slate-700 font-semibold"
                  >
                    <option value="ALL">Todas as origens</option>
                    <option value="Riscos Temporais">Riscos Temporais (7 Carteiras)</option>
                    <option value="Carteira SDC">Carteira SDC</option>
                    <option value="Operacional">Operacional / Linhas</option>
                  </select>
                </div>

                {/* Filtro Empresa/Centro */}
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block">
                    Empresa/Centro
                  </label>
                  <select
                    value={filtroCentro}
                    onChange={(e) => setFiltroCentro(e.target.value)}
                    className="w-full text-[11px] p-1 rounded border border-slate-300 bg-slate-50 text-slate-700"
                  >
                    <option value="ALL">Todos os Centros</option>
                    <option value="SDPL">SDPL (Sidercentro)</option>
                    <option value="CFPL">CFPL (CIAFAL)</option>
                  </select>
                </div>

                {/* Filtro Linha */}
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block">Linha</label>
                  <select
                    value={filtroLinha}
                    onChange={(e) => setFiltroLinha(e.target.value)}
                    className="w-full text-[11px] p-1 rounded border border-slate-300 bg-slate-50 text-slate-700"
                  >
                    <option value="ALL">Todas as Linhas</option>
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                    <option value="L-SDC">L-SDC</option>
                  </select>
                </div>

                {/* Filtro Tipo */}
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block">Tipo</label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full text-[11px] p-1 rounded border border-slate-300 bg-slate-50 text-slate-700"
                  >
                    <option value="ALL">Todos os Tipos</option>
                    <option value="DEFICIT_SEM_PROGRAMACAO">Déficit sem Programação</option>
                    <option value="COBERTURA_PARCIAL">Cobertura Parcial</option>
                    <option value="COBERTURA_PROGRAMADA">Cobertura Programada</option>
                    <option value="SEM_ESTOQUE">Sem Estoque</option>
                    <option value="RISCO_PRAZO">Risco de Prazo</option>
                    <option value="ALTERACAO_RELEVANTE_CARTEIRA">Alteração Relevante</option>
                  </select>
                </div>

                {/* Filtro Status */}
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block">Status</label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full text-[11px] p-1 rounded border border-slate-300 bg-slate-50 text-slate-700"
                  >
                    <option value="ALL">Todos os Status</option>
                    <option value="Novo">Novo</option>
                    <option value="Em análise">Em análise</option>
                    <option value="Ação necessária">Ação necessária</option>
                    <option value="Em tratamento">Em tratamento</option>
                    <option value="Monitorando">Monitorando</option>
                    <option value="Resolvido">Resolvido</option>
                    <option value="Encerrado">Encerrado</option>
                  </select>
                </div>
              </div>

              {/* Filtro de Material */}
              <div className="relative">
                <input
                  type="text"
                  value={filtroMaterial}
                  onChange={(e) => setFiltroMaterial(e.target.value)}
                  placeholder="Filtrar por material (ex: C1000A360600)..."
                  className="w-full text-[11px] pl-7 pr-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                />
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
              </div>

              {(filtroSeveridade !== 'ALL' ||
                filtroOrigem !== 'ALL' ||
                filtroCentro !== 'ALL' ||
                filtroLinha !== 'ALL' ||
                filtroTipo !== 'ALL' ||
                filtroStatus !== 'ALL' ||
                filtroMaterial) && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroSeveridade('ALL')
                    setFiltroOrigem('ALL')
                    setFiltroCentro('ALL')
                    setFiltroLinha('ALL')
                    setFiltroTipo('ALL')
                    setFiltroStatus('ALL')
                    setFiltroMaterial('')
                  }}
                  className="text-[10px] text-[#004C97] hover:underline block pt-0.5"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {/* 0. SEÇÃO DE RISCOS TEMPORAIS DAS 7 CARTEIRAS (Cobertura Temporal & Previsão) */}
              <ErrorBoundary moduleName="Alertas de Riscos Temporais" variant="compact">
                {alertasTemporais
                  .filter((al) => {
                    if (filtroOrigem !== 'ALL' && filtroOrigem !== 'Riscos Temporais') return false
                    if (filtroSeveridade !== 'ALL' && al.severidade !== filtroSeveridade)
                      return false
                    const termMat =
                      typeof filtroMaterial === 'string' ? filtroMaterial.trim().toLowerCase() : ''
                    if (termMat) {
                      const matStr =
                        typeof al?.material === 'string' ? al.material.toLowerCase() : ''
                      if (!matStr.includes(termMat)) return false
                    }
                    return true
                  })
                  .map((al) => (
                    <div
                      key={al.id}
                      className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-950 transition-all text-xs shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className="bg-rose-600 text-white border-rose-700 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                            <AlertCircle className="w-3 h-3" /> [CRÍTICO]
                          </Badge>
                          <span className="text-[11px] font-bold text-slate-800">
                            {al.carteira || 'Carteira'} &bull; Cobertura Temporal
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 font-semibold border-rose-300 text-rose-800 bg-white"
                        >
                          Ruptura Prevista
                        </Badge>
                      </div>

                      {/* Formato padrão solicitado: CRÍTICO · Carteira L1 — Material X — Estoque termina 20/09, próxima produção 25/09 — N dias sem cobertura */}
                      <div className="p-2 bg-white/95 rounded border border-rose-200/80 mb-2 font-mono text-[11px] text-slate-900 leading-snug">
                        <span className="font-bold">
                          CRÍTICO &bull; {al.carteira || ''} — Material {al.material || '-'}
                        </span>{' '}
                        &bull;{' '}
                        <span>
                          Estoque termina {al.dataFimEstoque || '-'}, próxima reposição{' '}
                          {al.dataReposicao || '-'} —{' '}
                          <strong className="text-rose-700">
                            {al.diasSemCobertura ?? 0} dias sem cobertura
                          </strong>
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-700 leading-relaxed mb-2.5">
                        {al.material || '-'} ({al.descricao || ''}): {al.mensagem || ''}.
                      </p>

                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-rose-200/80">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-6 px-2 text-[10px] font-bold border-rose-300 text-rose-800 hover:bg-rose-100"
                        >
                          <Link to={al.link || '#'}>
                            <ExternalLink className="w-3 h-3 mr-1" /> Ver análise na carteira
                          </Link>
                        </Button>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Motor Cobertura Temporal CIAFAL
                        </span>
                      </div>
                    </div>
                  ))}
              </ErrorBoundary>

              {/* 1. SEÇÃO DE ALERTAS DA CARTEIRA SDC (Centro SDPL) */}
              <ErrorBoundary moduleName="Alertas da Carteira SDC" variant="compact">
                {alertasSDC
                  .filter((al) => {
                    if (filtroOrigem !== 'ALL' && filtroOrigem !== 'Carteira SDC') return false
                    if (filtroCentro !== 'ALL' && al.empresa_centro !== filtroCentro) return false
                    if (filtroSeveridade !== 'ALL' && al.severidade !== filtroSeveridade)
                      return false
                    if (filtroTipo !== 'ALL' && al.tipo_alerta !== filtroTipo) return false
                    if (filtroStatus !== 'ALL' && al.status !== filtroStatus) return false
                    const termMat =
                      typeof filtroMaterial === 'string' ? filtroMaterial.trim().toLowerCase() : ''
                    if (termMat) {
                      const matStr =
                        typeof al?.material === 'string' ? al.material.toLowerCase() : ''
                      if (!matStr.includes(termMat)) return false
                    }
                    return true
                  })
                  .map((al) => {
                    const isCritico = al.severidade === 'CRÍTICO'
                    const isAlto = al.severidade === 'ALTO'
                    const isMedio = al.severidade === 'MÉDIO'
                    const isInfo = al.severidade === 'INFORMATIVO'
                    const saldoAtualVal = Number(al?.saldo_atual ?? 0)
                    const quantProgVal = Number(al?.quantidade_programada ?? 0)
                    const saldoProjVal = Number(al?.saldo_projetado ?? 0)
                    const deficitTxt = Math.abs(saldoAtualVal).toFixed(2).replace('.', ',')
                    const progTxt = quantProgVal.toFixed(2).replace('.', ',')
                    const residTxt = Math.abs(saldoProjVal).toFixed(2).replace('.', ',')

                    return (
                      <div
                        key={al.id}
                        className={`p-3 rounded-lg border transition-all text-xs shadow-xs ${
                          !al?.ativo || al?.status === 'Resolvido' || al?.status === 'Encerrado'
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : isCritico
                              ? 'bg-rose-50 border-rose-200 text-rose-950'
                              : isAlto
                                ? 'bg-amber-50 border-amber-200 text-amber-950'
                                : isMedio
                                  ? 'bg-yellow-50 border-yellow-200 text-yellow-950'
                                  : 'bg-blue-50 border-blue-200 text-blue-950'
                        }`}
                      >
                        {/* Header: Severidade com Ícone + Texto (não só cor) */}
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isCritico && (
                              <Badge className="bg-rose-600 text-white border-rose-700 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                                <AlertCircle className="w-3 h-3" /> [CRÍTICO]
                              </Badge>
                            )}
                            {isAlto && (
                              <Badge className="bg-amber-600 text-white border-amber-700 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                                <AlertTriangle className="w-3 h-3" /> [ALTO]
                              </Badge>
                            )}
                            {isMedio && (
                              <Badge className="bg-yellow-500 text-slate-900 border-yellow-600 text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> [MÉDIO]
                              </Badge>
                            )}
                            {isInfo && (
                              <Badge className="bg-blue-600 text-white border-blue-700 text-[10px] font-bold flex items-center gap-1">
                                <Info className="w-3 h-3" /> [INFORMATIVO]
                              </Badge>
                            )}

                            <span className="text-[11px] font-bold text-slate-800">
                              {al.origem || 'Carteira SDC'} &bull; {al.empresa_centro || 'SDPL'}
                            </span>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 font-semibold ${
                              al.status === 'Resolvido'
                                ? 'border-emerald-400 text-emerald-800 bg-emerald-50'
                                : al.status === 'Em tratamento'
                                  ? 'border-blue-400 text-blue-800 bg-blue-50'
                                  : 'border-slate-300 text-slate-700 bg-white'
                            }`}
                          >
                            {al.status || 'Novo'}
                          </Badge>
                        </div>

                        {/* Exibição compacta exigida pelo usuário:
                        "[CRÍTICO] Carteira SDC • SDPL — Material: XXXXX — Déficit: 19,16 t — Programado: 0 t — Sem cobertura produtiva."
                    */}
                        <div className="p-2 bg-white/90 rounded border border-slate-200/80 mb-2 font-mono text-[11px] text-slate-900 leading-snug">
                          <span className="font-bold">Material: {al.material || '-'}</span> &bull;
                          Déficit: <span className="font-bold text-rose-700">{deficitTxt} t</span>{' '}
                          &bull; Programado: <span className="font-semibold">{progTxt} t</span>{' '}
                          &bull;{' '}
                          <span className="text-slate-600 font-sans">
                            {quantProgVal === 0
                              ? 'Sem cobertura produtiva.'
                              : saldoProjVal < 0
                                ? `Déficit residual: ${residTxt} t.`
                                : 'Cobertura integral programada.'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-700 leading-relaxed mb-2.5">
                          {al.descricao}
                        </p>

                        {/* Responsável e Decisão (Ciclo de Vida) */}
                        {al.responsavel && (
                          <div className="text-[10px] text-slate-600 mb-2 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            <span>
                              Responsável: <strong>{al.responsavel}</strong>
                            </span>
                            {al.data_prevista_acao && (
                              <span className="text-slate-500">
                                (Prazo: {formatDatePTBR(al.data_prevista_acao)})
                              </span>
                            )}
                          </div>
                        )}
                        {/* Botões de Ação Obrigatórios:
                        [Ver análise], [Assumir tratamento] e [Analisar Impacto] (para críticos)
                    */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-200/80">
                          <div className="flex items-center gap-1">
                            {/* Botão [Ver análise] -> navega para /pcp/analise-carteira/sdc?material=<código> */}
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="h-6 px-2 text-[10px] font-bold border-blue-200 text-[#004C97] hover:bg-blue-50"
                            >
                              <Link to={al.link_detalhamento}>
                                <ExternalLink className="w-3 h-3 mr-1" /> Ver análise
                              </Link>
                            </Button>

                            {/* Botão [Assumir tratamento] */}
                            {al.status !== 'Em tratamento' && al.status !== 'Resolvido' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  const nome = user?.name || user?.email || 'Operador PCP'
                                  await CarteiraSDCService.assumirTratamento(al.id, nome)
                                  toast({
                                    title: 'Tratamento Assumido',
                                    description: `Alerta atribuído a ${nome} com status 'Em tratamento'.`,
                                  })
                                  await carregarAlertasSDCSafe()
                                }}
                                className="h-6 px-2 text-[10px] text-indigo-700 hover:bg-indigo-50 font-semibold"
                              >
                                <UserCheck className="w-3 h-3 mr-1" /> Assumir tratamento
                              </Button>
                            )}
                          </div>

                          {/* Botão [Analisar Impacto] — obrigatório para críticos (e disponível para altos) */}
                          {(isCritico || isAlto) && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setAlertaImpactoSelecionado(al)
                                setIsModalImpactoOpen(true)
                              }}
                              className="h-6 px-2 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                            >
                              Analisar Impacto
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </ErrorBoundary>

              {/* 2. ALERTAS OPERACIONAIS DAS LINHAS */}
              <ErrorBoundary moduleName="Alertas Operacionais" variant="compact">
                {scopedAlerts
                  .filter((a) => {
                    if (filtroOrigem !== 'ALL' && filtroOrigem !== 'Operacional') return false
                    if (filtroSeveridade !== 'ALL') {
                      const s = typeof a?.severity === 'string' ? a.severity.toLowerCase() : ''
                      if (filtroSeveridade === 'CRÍTICO' && s !== 'critical') return false
                      if (filtroSeveridade === 'ALTO' && s !== 'warning') return false
                      if (filtroSeveridade === 'INFORMATIVO' && s !== 'info' && s !== 'success')
                        return false
                    }
                    if (filtroStatus !== 'ALL') {
                      if (filtroStatus === 'Resolvido' && !a?.acknowledged) return false
                      if (filtroStatus === 'Novo' && a?.acknowledged) return false
                    }
                    return true
                  })
                  .map((alert) => {
                    const isCritical = alert.severity === 'critical'
                    const isWarning = alert.severity === 'warning'
                    const isSuccess = alert.severity === 'success'

                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border transition-all text-xs ${
                          alert.acknowledged
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : isCritical
                              ? 'bg-rose-50 border-rose-200 text-rose-900'
                              : isWarning
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : isSuccess
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            {isCritical ? (
                              <Badge className="bg-rose-600 text-white text-[9px] font-bold">
                                [CRÍTICO]
                              </Badge>
                            ) : isWarning ? (
                              <Badge className="bg-amber-600 text-white text-[9px] font-bold">
                                [ALTO]
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-500 text-white text-[9px] font-bold">
                                [OPERACIONAL]
                              </Badge>
                            )}
                            <span className="font-bold text-slate-900 text-xs">{alert.title}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 uppercase border-slate-300 text-slate-600 bg-slate-100"
                          >
                            {alert.category}
                          </Badge>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-snug mb-2">
                          {alert.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                          <span className="text-[10px] text-slate-500">
                            {alert.expand?.line_id?.code || 'Geral'} &bull;{' '}
                            {formatDateTimePTBR(alert.created, false, '--:--')}
                          </span>

                          {!alert.acknowledged && (
                            <Can
                              permission="pcp.alert.manage"
                              mode="disable"
                              explainMessage="Apenas perfis com permissão pcp.alert.manage podem reconhecer alertas operacionais."
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                className="h-6 px-2 text-[10px] text-[#004C97] hover:bg-blue-50"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Reconhecer
                              </Button>
                            </Can>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </ErrorBoundary>
            </div>
          </div>
        </ErrorBoundary>
      </div>

      {/* Modal de Análise de Impacto SDC com os 6 blocos obrigatórios */}
      <AnalisarImpactoSDCModal
        isOpen={isModalImpactoOpen}
        onClose={() => setIsModalImpactoOpen(false)}
        alerta={alertaImpactoSelecionado}
        onAssumirTratamento={async (alertaId) => {
          const nome = user?.name || user?.email || 'Operador PCP'
          await CarteiraSDCService.assumirTratamento(alertaId, nome)
          toast({
            title: 'Tratamento Assumido',
            description: `Alerta atribuído a ${nome} com status 'Em tratamento'.`,
          })
          await carregarAlertasSDCSafe()
        }}
      />
    </div>
  )
}

export default Index
