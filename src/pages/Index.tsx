import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/pcp-auth'
import { ProductionLine, PCPAlert } from '@/types/pcp-auth'
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
} from 'lucide-react'
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
import { Link } from 'react-router-dom'

export default function Index() {
  const { user, isGlobal, scopes, hasLineScope, can } = useAuth()
  const { toast } = useToast()

  const [lines, setLines] = useState<ProductionLine[]>([])
  const [alerts, setAlerts] = useState<PCPAlert[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL')

  // Modal para simulação de edição rápida de linha (Object-Level Authorization Test)

  const loadData = async () => {
    setLoading(true)
    try {
      const [linesData, alertsData] = await Promise.all([
        authService.listProductionLines(),
        authService.listAlerts(),
      ])
      setLines(linesData)
      setAlerts(alertsData)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados operacionais',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Linhas filtradas de acordo com o escopo do usuário e o filtro selecionado
  const scopedLines = useMemo(() => {
    return lines.filter((line) => {
      // 1. Validar autorização de escopo (RBAC + Scope)
      const isAllowedByScope = hasLineScope(line.id, line.code)
      if (!isAllowedByScope) return false

      // 2. Filtro de tela
      if (selectedLineFilter === 'ALL') return true
      return line.id === selectedLineFilter
    })
  }, [lines, hasLineScope, selectedLineFilter])

  // Alertas filtrados de acordo com o escopo do usuário
  const scopedAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (!alert.line_id) return true
      return hasLineScope(alert.line_id)
    })
  }, [alerts, hasLineScope])

  // Métricas de capacidade calculadas
  const metrics = useMemo(() => {
    const total = scopedLines.length
    const running = scopedLines.filter((l) => l.status === 'running').length
    const avgEfficiency =
      total > 0
        ? Math.round(scopedLines.reduce((acc, l) => acc + (l.efficiency || 0), 0) / total)
        : 0
    const totalCurrentRate = scopedLines.reduce((acc, l) => acc + (l.current_rate || 0), 0)
    const totalTargetRate = scopedLines.reduce((acc, l) => acc + (l.target_rate || 0), 0)

    return {
      total,
      running,
      avgEfficiency,
      totalCurrentRate,
      totalTargetRate,
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

      {/* Header do Cockpit em Fundo Claro Corporativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Cockpit Operacional PCP
            </h1>
            <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-xs font-bold">
              CIAFAL &bull; Homologado
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoramento de linhas industriais, cadência, buffer térmico e orquestração de
            sequenciamentos.
          </p>
        </div>

        {/* Ações Rápidas Controladas por RBAC */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ação 0: Cockpit Executivo com IA */}
          <Can permission="pcp.executive.view">
            <Button
              size="sm"
              className="bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-sm text-xs font-bold"
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
              className="border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 gap-1.5 text-xs font-semibold"
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
              className="border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 gap-1.5 text-xs font-semibold"
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
            className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-2 h-8"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards (Scoped) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] text-slate-500 font-medium">
              Linhas no Seu Escopo
            </CardDescription>
            <CardTitle className="text-2xl font-black text-[#004C97] flex items-center justify-between">
              {metrics.total}{' '}
              <span className="text-xs font-normal text-slate-400">/ {lines.length} Totais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {metrics.running} operando normalmente
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 text-slate-900 shadow-sm hover:border-sky-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] text-slate-500 font-medium">
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
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Meta corporativa: 85%
            </span>
            <OeeInteractiveValue
              value="Detalhar"
              suffix=""
              context={{ lineCode: 'L1', period: 'DAY' }}
              iconType="chevron"
              className="text-[10px] text-sky-600 font-normal hover:underline"
            />
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] text-slate-500 font-medium">
              Taxa de Produção Global
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-900">
              {metrics.totalCurrentRate}{' '}
              <span className="text-xs font-mono font-normal text-[#004C97]">t/h</span>{' '}
              <span className="text-xs font-normal text-slate-400">
                (meta: {metrics.totalTargetRate} t/h)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
            Taxa atual vs. Capacidade programada
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] text-slate-500 font-medium">
              Alertas Ativos no Escopo
            </CardDescription>
            <CardTitle className="text-2xl font-black text-amber-600">
              {scopedAlerts.filter((a) => !a.acknowledged).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {scopedAlerts.filter((a) => a.severity === 'critical').length} críticos
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal: Linhas de Produção & Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Cartões de Linhas Autorizadas */}
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
                Não há linhas cadastradas no sistema. Utilize a opção de cadastro para parametrizar
                uma nova linha industrial.
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
                            <Settings className="w-3 h-3 mr-1 text-[#004C97]" /> Ajustar Parâmetros
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

        {/* Coluna 3: Alertas e Monitoramento no Escopo */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Alertas do Seu Escopo
              </span>
            </div>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
              {scopedAlerts.length} total
            </Badge>
          </div>

          <div className="space-y-2.5">
            {scopedAlerts.map((alert) => {
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
                    <span className="font-bold text-slate-900 text-xs">{alert.title}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 uppercase ${
                        isCritical
                          ? 'border-rose-400 text-rose-700 bg-rose-100'
                          : isWarning
                            ? 'border-amber-400 text-amber-700 bg-amber-100'
                            : 'border-slate-300 text-slate-600 bg-slate-100'
                      }`}
                    >
                      {alert.category}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug mb-2">{alert.message}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500">
                      {alert.expand?.line_id?.code || 'Geral'} &bull;{' '}
                      {new Date(alert.created || '').toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
          </div>
        </div>
      </div>
    </div>
  )
}
