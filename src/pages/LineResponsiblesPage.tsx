import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/pcp-auth'
import { ProductionLine, UserProfile, PCPLineResponsible } from '@/types/pcp-auth'
import { Can } from '@/components/auth/Can'
import {
  Activity,
  UserCheck,
  Plus,
  ShieldCheck,
  Calendar,
  AlertCircle,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export default function LineResponsiblesPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [lines, setLines] = useState<ProductionLine[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [responsibles, setResponsibles] = useState<PCPLineResponsible[]>([])
  const [delegations, setDelegations] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Modal Novo Responsável
  const [isRespModalOpen, setIsRespModalOpen] = useState<boolean>(false)
  const [selectedLineId, setSelectedLineId] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRoleType, setSelectedRoleType] = useState<'PRIMARY' | 'SUBSTITUTE' | 'ADDITIONAL'>(
    'PRIMARY',
  )

  // Modal Nova Delegação Temporária
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState<boolean>(false)
  const [delegationDelegateId, setDelegationDelegateId] = useState<string>('')
  const [delegationScopeType, setDelegationScopeType] = useState<string>('PRODUCTION_LINE')
  const [delegationLineId, setDelegationLineId] = useState<string>('')
  const [delegationReason, setDelegationReason] = useState<string>('')
  const [delegationStart, setDelegationStart] = useState<string>('')
  const [delegationEnd, setDelegationEnd] = useState<string>('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [linesData, usersData, respData, delData] = await Promise.all([
        authService.listProductionLines(),
        authService.listUsers(),
        authService.listLineResponsibles(),
        authService.listDelegations(),
      ])

      setLines(linesData)
      setUsers(usersData)
      setResponsibles(respData)
      setDelegations(delData)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar governança de linhas',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateResponsible = async () => {
    if (!selectedLineId || !selectedUserId) return
    try {
      await authService.saveLineResponsible({
        line_id: selectedLineId,
        user_id: selectedUserId,
        role_type: selectedRoleType,
        active: true,
      })

      const targetLine = lines.find((l) => l.id === selectedLineId)
      const targetUser = users.find((u) => u.id === selectedUserId)

      // Também criar o scope no pcp_access_scopes para garantir integridade
      await authService.saveScope({
        user_id: selectedUserId,
        scope_type: 'PRODUCTION_LINE',
        target_id: selectedLineId,
        target_code: targetLine?.code || '',
        target_name: targetLine?.name || '',
        active: true,
      })

      await authService.logAuditEvent({
        event_type: 'SCOPE_ASSIGNED',
        action: 'ASSIGN_LINE_RESPONSIBLE',
        resource: 'pcp_line_responsibles',
        resource_id: selectedLineId,
        permission_required: 'pcp.admin.access',
        outcome: 'SUCCESS',
        scope: targetLine?.code,
        details: { user_email: targetUser?.email, role_type: selectedRoleType },
      })

      toast({
        title: 'Gestor Vinculado',
        description: `${targetUser?.name} definido como ${selectedRoleType} da linha ${targetLine?.code}.`,
      })

      setIsRespModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao vincular gestor',
        description: err.message,
      })
    }
  }

  const handleCreateDelegation = async () => {
    if (!delegationDelegateId || !delegationReason || !delegationStart || !delegationEnd) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos do formulário de delegação.',
      })
      return
    }

    try {
      await authService.createDelegation({
        delegator_id: currentUser?.id || '',
        delegate_id: delegationDelegateId,
        scope_type: delegationScopeType,
        target_id: delegationScopeType === 'GLOBAL' ? 'ALL' : delegationLineId,
        reason: delegationReason,
        start_date: delegationStart,
        end_date: delegationEnd,
        active: true,
      })

      await authService.logAuditEvent({
        event_type: 'DELEGATION_CREATED',
        action: 'CREATE_TEMPORARY_DELEGATION',
        resource: 'pcp_delegations',
        permission_required: 'pcp.admin.access',
        outcome: 'SUCCESS',
        details: {
          delegator: currentUser?.email,
          delegate_id: delegationDelegateId,
          reason: delegationReason,
          start: delegationStart,
          end: delegationEnd,
        },
      })

      toast({
        title: 'Delegação Temporária Ativada',
        description: 'Vigência e escopo atribuídos para o substituto.',
      })

      setIsDelegationModalOpen(false)
      setDelegationReason('')
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar delegação',
        description: err.message,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              Gestores de Linha & Delegações Temporárias
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mapeamento de responsabilidade operacional por linha industrial e protocolo de
            substituições temporárias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Can permission="pcp.admin.access">
            <Button
              size="sm"
              onClick={() => setIsRespModalOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs gap-1.5 h-8 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Vincular Gestor de Linha
            </Button>
          </Can>

          <Button
            size="sm"
            onClick={() => setIsDelegationModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs gap-1.5 h-8 font-bold"
          >
            <Calendar className="w-3.5 h-3.5" /> Nova Delegação Temporária
          </Button>
        </div>
      </div>

      {/* Tabs: Gestores por Linha vs Delegações */}
      <Tabs defaultValue="lines" className="space-y-4">
        <TabsList className="bg-slate-950 border border-slate-800 p-1">
          <TabsTrigger
            value="lines"
            className="text-xs data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300"
          >
            Linhas & Gestores Atribuídos ({lines.length})
          </TabsTrigger>
          <TabsTrigger
            value="delegations"
            className="text-xs data-[state=active]:bg-amber-950 data-[state=active]:text-amber-300"
          >
            Delegações Temporárias ({delegations.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Linhas & Gestores */}
        <TabsContent value="lines">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lines.map((line) => {
              const lineResps = responsibles.filter((r) => r.line_id === line.id)
              const primary = lineResps.find((r) => r.role_type === 'PRIMARY')
              const substitutes = lineResps.filter((r) => r.role_type !== 'PRIMARY')

              return (
                <Card key={line.id} className="bg-slate-950 border-slate-800 text-slate-100">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg text-white">{line.code}</span>
                        <span className="text-xs text-slate-400">&bull; {line.name}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-700 text-slate-300"
                      >
                        {line.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3 text-xs">
                    {/* Gestor Principal */}
                    <div className="p-2.5 bg-slate-900/90 border border-cyan-900/60 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-1">
                        Gestor Responsável Principal (Fase 2)
                      </span>
                      {primary ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">
                              {primary.expand?.user_id?.name || primary.user_id}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {primary.expand?.user_id?.email}
                            </span>
                          </div>
                          <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px]">
                            Titular
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">
                          Nenhum gestor titular configurado
                        </span>
                      )}
                    </div>

                    {/* Substitutos e Adicionais */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Substitutos e Adicionais:
                      </span>
                      {substitutes.length === 0 ? (
                        <span className="text-[11px] text-slate-500 italic block">
                          Sem substitutos imediatos
                        </span>
                      ) : (
                        substitutes.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-2 bg-slate-900/40 rounded border border-slate-800/80 text-[11px]"
                          >
                            <span className="text-slate-300">
                              {sub.expand?.user_id?.name || sub.user_id}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] border-slate-700 text-amber-300"
                            >
                              {sub.role_type}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Tab 2: Delegações Temporárias */}
        <TabsContent value="delegations">
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Delegações de Competência Ativas
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Mecanismo corporativo para cobertura de férias, ausências e transferências
                provisórias de autorização.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Delegante (Titular)</th>
                      <th className="p-3">Substituto (Delegado)</th>
                      <th className="p-3">Escopo Cedido</th>
                      <th className="p-3">Período de Vigência</th>
                      <th className="p-3">Motivo / Justificativa</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {delegations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          Nenhuma delegação temporária ativa no momento.
                        </td>
                      </tr>
                    ) : (
                      delegations.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-900/60">
                          <td className="p-3 font-semibold text-white">
                            {d.expand?.delegator_id?.name || d.delegator_id}
                          </td>
                          <td className="p-3 text-cyan-300 font-semibold">
                            {d.expand?.delegate_id?.name || d.delegate_id}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-600 text-amber-300"
                            >
                              {d.scope_type} {d.target_id !== 'ALL' && `(${d.target_id})`}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {d.start_date} até {d.end_date}
                          </td>
                          <td className="p-3 text-slate-300">{d.reason}</td>
                          <td className="p-3">
                            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-600 text-[10px]">
                              Ativa
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Vincular Gestor de Linha */}
      <Dialog open={isRespModalOpen} onOpenChange={setIsRespModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Atribuir Gestor para Linha de Produção
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Linha Industrial</Label>
              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="">Selecione a linha...</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} - {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Usuário Gestor</Label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="">Selecione o usuário...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Tipo de Vínculo</Label>
              <select
                value={selectedRoleType}
                onChange={(e) => setSelectedRoleType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="PRIMARY">PRIMARY (Gestor Titular Responsável)</option>
                <option value="SUBSTITUTE">SUBSTITUTE (Substituto Imediato)</option>
                <option value="ADDITIONAL">ADDITIONAL (Gestor Suplementar)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRespModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateResponsible}
              disabled={!selectedLineId || !selectedUserId}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
            >
              Confirmar Vínculo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Nova Delegação Temporária */}
      <Dialog open={isDelegationModalOpen} onOpenChange={setIsDelegationModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Criar Delegação Temporária de Autorização
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">
                Substituto (Quem receberá a delegação)
              </Label>
              <select
                value={delegationDelegateId}
                onChange={(e) => setDelegationDelegateId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="">Selecione o usuário delegado...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Escopo Delegado</Label>
              <select
                value={delegationScopeType}
                onChange={(e) => setDelegationScopeType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="PRODUCTION_LINE">Linha de Produção Específica</option>
                <option value="GLOBAL">Todas as Linhas do Titular (Global)</option>
              </select>
            </div>

            {delegationScopeType === 'PRODUCTION_LINE' && (
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Selecione a Linha</Label>
                <select
                  value={delegationLineId}
                  onChange={(e) => setDelegationLineId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="">Selecione a linha...</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Data de Início</Label>
                <Input
                  type="date"
                  value={delegationStart}
                  onChange={(e) => setDelegationStart(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Data de Término</Label>
                <Input
                  type="date"
                  value={delegationEnd}
                  onChange={(e) => setDelegationEnd(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Motivo da Delegação</Label>
              <Input
                placeholder="Ex: Férias do gestor titular / Plantão de fim de semana"
                value={delegationReason}
                onChange={(e) => setDelegationReason(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDelegationModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateDelegation}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
            >
              Ativar Delegação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
