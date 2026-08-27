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
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)
  const [editRate, setEditRate] = useState<number>(0)
  const [editActiveOrder, setEditActiveOrder] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState<boolean>(false)

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
    setEditingLine(line)
    setEditRate(line.target_rate)
    setEditActiveOrder(line.active_order)
  }

  const handleSaveLine = async () => {
    if (!editingLine) return
    setSavingEdit(true)
    try {
      await authService.updateProductionLine(editingLine.id, {
        target_rate: Number(editRate),
        active_order: editActiveOrder,
      })

      toast({
        title: 'Parâmetros atualizados',
        description: `Linha ${editingLine.code} atualizada com sucesso no backend.`,
      })

      setEditingLine(null)
      await loadData()
    } catch (err: any) {
      // Interceptado pelo Hook de segurança (403 Object-Level Scope Violation)
      toast({
        variant: 'destructive',
        title: 'Bloqueio de Segurança (403)',
        description:
          err?.data?.message ||
          err?.message ||
          'Tentativa de alteração fora do escopo ou sem autorização.',
      })
    } finally {
      setSavingEdit(false)
    }
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

      {/* Header do Cockpit */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Cockpit Operacional PCP
            </h1>
            <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-xs">
              Módulo Ativo
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento de linhas industriais, cadência, buffer térmico e orquestração de
            sequenciamentos.
          </p>
        </div>

        {/* Ações Rápidas Controladas por RBAC */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ação 1: Criar Programação */}
          <Can
            permission="pcp.schedule.create"
            mode="disable"
            explainMessage="Apenas Programadores PCP ou Administradores podem criar novos planos de programação."
          >
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5 shadow-sm text-xs font-semibold"
              asChild
            >
              <Link to="/pcp-robotizado/programacoes">
                <Plus className="w-3.5 h-3.5" /> Nova Programação
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
              className="border-slate-700 bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 gap-1.5 text-xs font-semibold"
              asChild
            >
              <Link to="/pcp-robotizado/programacoes">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Simular Cenário
              </Link>
            </Button>
          </Can>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 h-8"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards (Scoped) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-950 border-slate-800 text-slate-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Linhas no Seu Escopo
            </CardDescription>
            <CardTitle className="text-2xl font-black text-cyan-400 flex items-center justify-between">
              {metrics.total}{' '}
              <span className="text-xs font-normal text-slate-500">/ {lines.length} Totais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            {metrics.running} operando normalmente
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800 text-slate-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Eficiência Média OEE
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-400">
              {metrics.avgEfficiency}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Meta corporativa: 85%
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800 text-slate-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Taxa de Produção (t/h)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-white">
              {metrics.totalCurrentRate}{' '}
              <span className="text-xs font-normal text-slate-400">
                / {metrics.totalTargetRate} meta
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            Cadência operacional calculada
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800 text-slate-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Alertas Ativos no Escopo
            </CardDescription>
            <CardTitle className="text-2xl font-black text-amber-400">
              {scopedAlerts.filter((a) => !a.acknowledged).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            {scopedAlerts.filter((a) => a.severity === 'critical').length} críticos
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal: Linhas de Produção & Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Cartões de Linhas Autorizadas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Linhas e Processos Industriais
              </span>
              <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                {scopedLines.length} disponíveis
              </Badge>
            </div>

            {/* Seletor de Linha do Escopo */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedLineFilter}
                onChange={(e) => setSelectedLineFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 px-2 py-1 outline-none focus:border-cyan-500"
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
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-200">
                Nenhuma linha dentro do seu escopo atual
              </p>
              <p className="text-xs mt-1">
                Seu usuário não possui atribuição de escopo para as linhas selecionadas. Solicite
                liberação ao PCP_ADMIN.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scopedLines.map((line) => {
                const isRunning = line.status === 'running'
                const isMaintenance = line.status === 'maintenance'

                return (
                  <Card
                    key={line.id}
                    className="bg-slate-950 border-slate-800 text-slate-100 hover:border-slate-700 transition-all shadow-sm"
                  >
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-white">{line.code}</span>
                          <span className="text-xs text-slate-400">• {line.name}</span>
                        </div>
                        <Badge
                          className={`text-[10px] font-semibold uppercase ${
                            isRunning
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                              : isMaintenance
                                ? 'bg-rose-950 text-rose-400 border-rose-700'
                                : 'bg-amber-950 text-amber-400 border-amber-700'
                          }`}
                        >
                          {line.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3 text-xs">
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Ordem Ativa / Produto:
                        </span>
                        <span className="font-semibold text-slate-200 truncate block">
                          {line.active_order || 'Sem ordem ativa'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-900/40 p-2 rounded border border-slate-800/80">
                          <span className="text-slate-400 block text-[10px]">Cadência Real</span>
                          <span className="font-bold text-white text-sm">
                            {line.current_rate}{' '}
                            <span className="text-[10px] font-normal text-slate-400">
                              / {line.target_rate} t/h
                            </span>
                          </span>
                        </div>
                        <div className="bg-slate-900/40 p-2 rounded border border-slate-800/80">
                          <span className="text-slate-400 block text-[10px]">Eficiência OEE</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            {line.efficiency}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>
                          Operador: <strong className="text-slate-300">{line.operator}</strong>
                        </span>
                      </div>

                      {/* Ações no Cartão com Object-Level Authorization */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                        <Can
                          permission="pcp.masterdata.edit"
                          mode="disable"
                          explainMessage="Apenas usuários com permissão de edição técnica podem alterar parâmetros desta linha."
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(line)}
                            className="w-full border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 text-xs h-7"
                          >
                            <Settings className="w-3 h-3 mr-1 text-cyan-400" /> Ajustar Parâmetros
                          </Button>
                        </Can>

                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-slate-400 hover:text-cyan-300 hover:bg-slate-900 text-xs h-7 px-2"
                        >
                          <Link to={`/pcp-robotizado/programacoes?line=${line.code}`}>
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
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Alertas do Seu Escopo
              </span>
            </div>
            <Badge className="bg-amber-950 text-amber-400 border-amber-700 text-[10px]">
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
                      ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                      : isCritical
                        ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                        : isWarning
                          ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                          : isSuccess
                            ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-bold text-white text-xs">{alert.title}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 uppercase ${
                        isCritical
                          ? 'border-rose-600 text-rose-400'
                          : isWarning
                            ? 'border-amber-600 text-amber-400'
                            : 'border-slate-700 text-slate-400'
                      }`}
                    >
                      {alert.category}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug mb-2">{alert.message}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
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
                          className="h-6 px-2 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-slate-900"
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

      {/* Modal para Ajuste com Teste de Object-Level Authorization */}
      <Dialog open={!!editingLine} onOpenChange={(open) => !open && setEditingLine(null)}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base">
              <Settings className="w-4 h-4 text-cyan-400" />
              Ajustar Parâmetros Industriais ({editingLine?.code})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Operação protegida por Object-Level Authorization no backend. O sistema validará se
              seu perfil e escopo permitem a gravação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Meta de Produção (t/h)</Label>
              <Input
                type="number"
                value={editRate}
                onChange={(e) => setEditRate(Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Ordem de Produção Ativa</Label>
              <Input
                value={editActiveOrder}
                onChange={(e) => setEditActiveOrder(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingLine(null)}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveLine}
              disabled={savingEdit}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
            >
              {savingEdit ? 'Validando no Backend...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
