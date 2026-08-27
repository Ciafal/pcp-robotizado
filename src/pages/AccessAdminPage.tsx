import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/pcp-auth'
import {
  UserProfile,
  PCPRole,
  Permission,
  AccessScope,
  PCPPermissionException,
  ProductionLine,
  PCPUserRole,
} from '@/types/pcp-auth'
import {
  UserCog,
  Shield,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Layers,
  Filter,
  Search,
  KeyRound,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export default function AccessAdminPage() {
  const { user: currentUser, refreshPermissions } = useAuth()
  const { toast } = useToast()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [roles, setRoles] = useState<PCPRole[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [lines, setLines] = useState<ProductionLine[]>([])

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [userScopes, setUserScopes] = useState<any[]>([])
  const [userExceptions, setUserExceptions] = useState<any[]>([])

  const [loading, setLoading] = useState<boolean>(true)
  const [searchUser, setSearchUser] = useState<string>('')

  // Dialog de novo Escopo
  const [isScopeModalOpen, setIsScopeModalOpen] = useState<boolean>(false)
  const [newScopeType, setNewScopeType] = useState<string>('PRODUCTION_LINE')
  const [newScopeLineId, setNewScopeLineId] = useState<string>('')

  // Dialog de nova Exceção de Permissão
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState<boolean>(false)
  const [newExceptionPermKey, setNewExceptionPermKey] = useState<string>('')
  const [newExceptionType, setNewExceptionType] = useState<'GRANT' | 'DENY'>('GRANT')
  const [newExceptionReason, setNewExceptionReason] = useState<string>('')

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [usersData, rolesData, permsData, linesData] = await Promise.all([
        authService.listUsers(),
        authService.listRoles(),
        authService.listPermissions(),
        authService.listProductionLines(),
      ])

      setUsers(usersData)
      setRoles(rolesData)
      setPermissions(permsData)
      setLines(linesData)

      if (usersData.length > 0 && !selectedUser) {
        setSelectedUser(usersData[0])
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados de governança',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Quando o usuário selecionado muda, carregar seus escopos e exceções
  useEffect(() => {
    if (!selectedUser) return
    const fetchUserSecurity = async () => {
      try {
        const [scopes, exceptions] = await Promise.all([
          authService.listScopes(selectedUser.id),
          authService.listPermissionExceptions(selectedUser.id),
        ])
        setUserScopes(scopes)
        setUserExceptions(exceptions)
      } catch (err: any) {
        console.error('Erro ao buscar escopos do usuário:', err)
      }
    }
    fetchUserSecurity()
  }, [selectedUser])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await authService.updateUserRole(userId, newRole)

      await authService.logAuditEvent({
        event_type: 'ROLE_ASSIGNED',
        action: 'UPDATE_USER_ROLE',
        resource: 'USERS_COLLECTION',
        resource_id: userId,
        permission_required: 'pcp.admin.access',
        outcome: 'SUCCESS',
        details: { user_id: userId, new_role: newRole, updated_by: currentUser?.email },
      })

      toast({
        title: 'Perfil Atualizado',
        description: `Role alterada para ${newRole} com auditoria registrada.`,
      })

      // Atualizar lista local
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as PCPUserRole } : u)),
      )
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, role: newRole as PCPUserRole } : null))
      }

      await refreshPermissions()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar perfil',
        description: err.message,
      })
    }
  }

  const handleAddScope = async () => {
    if (!selectedUser) return
    try {
      let targetCode = ''
      let targetName = ''

      if (newScopeType === 'GLOBAL') {
        targetCode = 'GLOBAL'
        targetName = 'Todas as Unidades e Linhas CIAFAL'
      } else if (newScopeType === 'PRODUCTION_LINE') {
        const targetLine = lines.find((l) => l.id === newScopeLineId)
        targetCode = targetLine?.code || ''
        targetName = targetLine?.name || ''
      }

      await authService.saveScope({
        user_id: selectedUser.id,
        scope_type: newScopeType,
        target_id: newScopeType === 'GLOBAL' ? 'ALL' : newScopeLineId,
        target_code: targetCode,
        target_name: targetName,
        active: true,
      })

      await authService.logAuditEvent({
        event_type: 'SCOPE_ASSIGNED',
        action: 'ASSIGN_ACCESS_SCOPE',
        resource: 'pcp_access_scopes',
        resource_id: selectedUser.id,
        permission_required: 'pcp.admin.access',
        outcome: 'SUCCESS',
        scope: targetCode,
        details: {
          user_email: selectedUser.email,
          scope_type: newScopeType,
          target_code: targetCode,
        },
      })

      toast({
        title: 'Escopo Atribuído',
        description: `Escopo ${targetCode || newScopeType} vinculado a ${selectedUser.name}.`,
      })

      setIsScopeModalOpen(false)
      const updatedScopes = await authService.listScopes(selectedUser.id)
      setUserScopes(updatedScopes)
      await refreshPermissions()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atribuir escopo',
        description: err.message,
      })
    }
  }

  const handleDeleteScope = async (scopeId: string) => {
    if (!selectedUser) return
    try {
      await authService.deleteScope(scopeId)

      await authService.logAuditEvent({
        event_type: 'SCOPE_REMOVED',
        action: 'REMOVE_ACCESS_SCOPE',
        resource: 'pcp_access_scopes',
        resource_id: scopeId,
        permission_required: 'pcp.admin.access',
        outcome: 'SUCCESS',
        details: { user_email: selectedUser.email, scope_id: scopeId },
      })

      toast({
        title: 'Escopo Removido',
        description: 'Vínculo de escopo cancelado com sucesso.',
      })

      setUserScopes((prev) => prev.filter((s) => s.id !== scopeId))
      await refreshPermissions()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover escopo',
        description: err.message,
      })
    }
  }

  const handleAddException = async () => {
    if (!selectedUser || !newExceptionPermKey) return
    try {
      const permObj = permissions.find((p) => p.key === newExceptionPermKey)
      if (!permObj) return

      // Buscar o ID da permissão na coleção
      const permRec = await authService.listPermissions()
      // Salvar
      await authService.savePermissionException({
        user_id: selectedUser.id,
        permission_id: (permObj as any).id || (permObj as any).key,
        type: newExceptionType,
        reason:
          newExceptionReason || 'Ajuste operacional de autorização concedido pela administração.',
      })

      await authService.logAuditEvent({
        event_type: 'PERMISSION_CHANGED',
        action: `EXCEPTION_${newExceptionType}`,
        resource: 'pcp_permission_exceptions',
        resource_id: selectedUser.id,
        permission_required: 'pcp.admin.access',
        outcome: 'SUCCESS',
        details: {
          user_email: selectedUser.email,
          permission_key: newExceptionPermKey,
          exception_type: newExceptionType,
          reason: newExceptionReason,
        },
      })

      toast({
        title: 'Exceção Registrada',
        description: `Permissão ${newExceptionPermKey} configurada como ${newExceptionType}.`,
      })

      setIsExceptionModalOpen(false)
      setNewExceptionReason('')
      const updatedExceptions = await authService.listPermissionExceptions(selectedUser.id)
      setUserExceptions(updatedExceptions)
      await refreshPermissions()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar exceção',
        description: err.message,
      })
    }
  }

  const handleDeleteException = async (excId: string) => {
    if (!selectedUser) return
    try {
      await authService.deletePermissionException(excId)

      await authService.logAuditEvent({
        event_type: 'PERMISSION_CHANGED',
        action: 'REMOVE_PERMISSION_EXCEPTION',
        resource: 'pcp_permission_exceptions',
        resource_id: excId,
        permission_required: 'pcp.admin.access',
        outcome: 'SUCCESS',
        details: { user_email: selectedUser.email, exception_id: excId },
      })

      toast({
        title: 'Exceção Removida',
        description: 'A permissão retornou ao padrão da Role.',
      })

      setUserExceptions((prev) => prev.filter((e) => e.id !== excId))
      await refreshPermissions()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover exceção',
        description: err.message,
      })
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = searchUser.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCog className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              Governança de Perfis, Escopos e Acessos (RBAC)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão unificada em 3 níveis: Perfil Funcional &bull; Escopo por Linha/Processo &bull;
            Exceções Granulares.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAllData}
          className="border-slate-700 bg-slate-900 text-slate-200 hover:text-white text-xs gap-1.5 h-8"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar Lista
        </Button>
      </div>

      {/* Grid: Lista de Usuários AD (Esquerda) vs Configuração de Acesso (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Usuários Corporativos do HUB (4 colunas) */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Usuários do HUB CIAFAL
                </CardTitle>
                <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px]">
                  {users.length} usuários
                </Badge>
              </div>
              <div className="pt-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <Input
                    placeholder="Buscar por nome, e-mail ou perfil..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="pl-8 bg-slate-900 border-slate-800 text-xs h-8 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-700 text-white shadow-sm'
                        : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs truncate max-w-[170px]">
                        {u.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 h-4 ${
                          u.role === 'PCP_ADMIN'
                            ? 'border-purple-500 text-purple-300 bg-purple-950/40'
                            : u.role === 'PCP_PROGRAMMER'
                              ? 'border-cyan-500 text-cyan-300 bg-cyan-950/40'
                              : 'border-slate-700 text-slate-400 bg-slate-800'
                        }`}
                      >
                        {u.role}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 truncate">{u.email}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2: Painel de Configuração de 3 Níveis (8 colunas) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedUser ? (
            <div className="space-y-4">
              {/* Nível 1: Perfil Corporativo (Role) */}
              <Card className="bg-slate-950 border-slate-800 text-slate-100">
                <CardHeader className="p-4 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                          Nível 1 &bull; Perfil Funcional
                        </span>
                        <h2 className="text-base font-bold text-white">{selectedUser.name}</h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{selectedUser.email}</p>
                    </div>

                    {/* Seletor de Role */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-400 whitespace-nowrap">
                        Perfil PCP:
                      </Label>
                      <select
                        value={selectedUser.role}
                        onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                        className="bg-slate-900 border border-cyan-700/80 rounded text-xs text-cyan-300 font-semibold px-3 py-1.5 outline-none focus:border-cyan-400"
                      >
                        {roles.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.code} - {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-400 border-t border-slate-900 mt-2">
                  <p className="italic">
                    💡 Alterar o perfil modifica automaticamente a matriz base de permissões
                    herdadas do usuário.
                  </p>
                </CardContent>
              </Card>

              {/* Nível 2: Escopo de Acesso por Linha / Processo / Unidade */}
              <Card className="bg-slate-950 border-slate-800 text-slate-100">
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                        Nível 2 &bull; Escopo de Linhas & Processos
                      </span>
                      <CardTitle className="text-sm font-bold text-white mt-1">
                        Abrangência Operacional Autorizada
                      </CardTitle>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setIsScopeModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-7 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Escopo
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-2 text-xs">
                  {userScopes.length === 0 ? (
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg text-center text-slate-400">
                      Nenhum escopo explícito cadastrado. O usuário opera com escopo restrito ou
                      padrão.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userScopes.map((scope) => (
                        <div
                          key={scope.id}
                          className="flex items-center justify-between p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Layers className="w-4 h-4 text-amber-400" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">
                                  {scope.target_code || scope.target_name || 'Escopo Geral'}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-amber-700 text-amber-300 bg-amber-950/40"
                                >
                                  {scope.scope_type}
                                </Badge>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {scope.target_name}
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteScope(scope.id)}
                            className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-7 w-7 p-0"
                            title="Remover Escopo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Nível 3: Exceções de Permissão (GRANT / DENY) */}
              <Card className="bg-slate-950 border-slate-800 text-slate-100">
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                        Nível 3 &bull; Exceções de Permissão Granular
                      </span>
                      <CardTitle className="text-sm font-bold text-white mt-1">
                        Sobrescrita Pontual (Conceder ou Negar)
                      </CardTitle>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setIsExceptionModalOpen(true)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs h-7 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nova Exceção
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-2 text-xs">
                  {userExceptions.length === 0 ? (
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg text-center text-slate-400">
                      Nenhuma exceção configurada. O usuário herda 100% das permissões da Role.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userExceptions.map((exc) => {
                        const isGrant = exc.type === 'GRANT'
                        return (
                          <div
                            key={exc.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border ${
                              isGrant
                                ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                                : 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`text-[10px] uppercase font-bold ${
                                    isGrant
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                      : 'bg-rose-950 text-rose-300 border-rose-600'
                                  }`}
                                >
                                  {exc.type} (Sobrescrita)
                                </Badge>
                                <code className="font-mono text-xs text-white">
                                  {exc.expand?.permission_id?.key || exc.permission_id}
                                </code>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Motivo: {exc.reason || 'Concessão administrativa'}
                              </p>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteException(exc.id)}
                              className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              Selecione um usuário na lista ao lado para configurar seus perfis e acessos.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Adicionar Escopo */}
      <Dialog open={isScopeModalOpen} onOpenChange={setIsScopeModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Adicionar Escopo para {selectedUser?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Defina a linha, processo ou abrangência global deste usuário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Tipo de Escopo</Label>
              <select
                value={newScopeType}
                onChange={(e) => setNewScopeType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="PRODUCTION_LINE">
                  Linha de Produção Específica (PRODUCTION_LINE)
                </option>
                <option value="GLOBAL">Acesso Global (GLOBAL - Todas as Unidades)</option>
                <option value="PROCESS">Processo Específico (PROCESS)</option>
              </select>
            </div>

            {newScopeType === 'PRODUCTION_LINE' && (
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Selecione a Linha Industrial</Label>
                <select
                  value={newScopeLineId}
                  onChange={(e) => setNewScopeLineId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="">Selecione uma linha...</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScopeModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAddScope}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
            >
              Vincular Escopo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Exceção */}
      <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400" />
              Adicionar Exceção de Permissão
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Conceda ou revogue uma permissão específica independentemente do perfil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Permissão do Catálogo</Label>
              <select
                value={newExceptionPermKey}
                onChange={(e) => setNewExceptionPermKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="">Selecione uma permissão granular...</option>
                {permissions.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key} ({p.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Tipo de Sobrescrita</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewExceptionType('GRANT')}
                  className={`text-xs h-8 ${
                    newExceptionType === 'GRANT'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  GRANT (Conceder Acesso)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewExceptionType('DENY')}
                  className={`text-xs h-8 ${
                    newExceptionType === 'DENY'
                      ? 'bg-rose-950 border-rose-500 text-rose-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  DENY (Negar Acesso)
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Justificativa da Exceção</Label>
              <Input
                placeholder="Ex: Habilitado para projeto piloto da Linha 1..."
                value={newExceptionReason}
                onChange={(e) => setNewExceptionReason(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExceptionModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAddException}
              disabled={!newExceptionPermKey}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              Aplicar Exceção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
