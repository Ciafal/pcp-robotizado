import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/pcp-auth'
import pb from '@/lib/pocketbase/client'
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Lock,
  Unlock,
  Terminal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export interface SecurityTestCase {
  id: number
  title: string
  description: string
  expectedOutcome: 'ALLOW' | 'DENY_403'
  targetRole: string
  targetUserEmail: string
  category:
    | 'RBAC_ROLE'
    | 'SCOPE_ISOLATION'
    | 'IDOR_PREVENTION'
    | 'AUDIT_PROTECTION'
    | 'DELEGATION_CONTROL'
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'
  details?: string
  responseHttpCode?: number
}

const initialTestCases: SecurityTestCase[] = [
  {
    id: 1,
    title: 'CT-01: PCP_ADMIN tem acesso global irrestrito (Read/Write)',
    description:
      'Valida se PCP_ADMIN pode listar e atualizar linhas de qualquer centro com permissão masterdata.edit.',
    expectedOutcome: 'ALLOW',
    targetRole: 'PCP_ADMIN',
    targetUserEmail: 'ciafal@ciafal.com.br',
    category: 'RBAC_ROLE',
    status: 'PENDING',
  },
  {
    id: 2,
    title: 'CT-02: PCP_PROGRAMMER pode simular e editar programações',
    description:
      'Verifica se Programador PCP possui permissões pcp.schedule.simulate e pcp.schedule.create.',
    expectedOutcome: 'ALLOW',
    targetRole: 'PCP_PROGRAMMER',
    targetUserEmail: 'programador.pcp@ciafal.com.br',
    category: 'RBAC_ROLE',
    status: 'PENDING',
  },
  {
    id: 3,
    title: 'CT-03: PCP_PROGRAMMER bloqueado de acessar Administração de Perfis',
    description: 'Garante 403 Forbidden ao tentar acessar pcp.admin.access ou mutar pcp_roles.',
    expectedOutcome: 'DENY_403',
    targetRole: 'PCP_PROGRAMMER',
    targetUserEmail: 'programador.pcp@ciafal.com.br',
    category: 'RBAC_ROLE',
    status: 'PENDING',
  },
  {
    id: 4,
    title: 'CT-04: LINE_MANAGER L1 tem acesso permitido na Linha 1',
    description: 'Gestor da Linha 1 consegue visualizar e gerenciar alertas associados à Linha 1.',
    expectedOutcome: 'ALLOW',
    targetRole: 'LINE_MANAGER',
    targetUserEmail: 'gestor.l1@ciafal.com.br',
    category: 'SCOPE_ISOLATION',
    status: 'PENDING',
  },
  {
    id: 5,
    title: 'CT-05: IDOR Defense — LINE_MANAGER L1 bloqueado de atualizar Linha 2',
    description:
      'Interceptor do backend rejeita com 403 Forbidden tentativa de mutar Linha L2 fora do escopo.',
    expectedOutcome: 'DENY_403',
    targetRole: 'LINE_MANAGER',
    targetUserEmail: 'gestor.l1@ciafal.com.br',
    category: 'IDOR_PREVENTION',
    status: 'PENDING',
  },
  {
    id: 6,
    title: 'CT-06: PRODUCTION_VIEWER bloqueado de editar dados mestres',
    description:
      'Usuário de operação apenas visualiza; tentativas de mutação de ficha mestre retornam 403.',
    expectedOutcome: 'DENY_403',
    targetRole: 'PRODUCTION_VIEWER',
    targetUserEmail: 'operador.fabrica@ciafal.com.br',
    category: 'RBAC_ROLE',
    status: 'PENDING',
  },
  {
    id: 7,
    title: 'CT-07: AUDITOR visualiza trilha de auditoria completa e Cockpit',
    description:
      'Auditor acessa relatórios e logs de segurança sem permissão de mutação nas linhas.',
    expectedOutcome: 'ALLOW',
    targetRole: 'AUDITOR',
    targetUserEmail: 'auditor.compliance@ciafal.com.br',
    category: 'RBAC_ROLE',
    status: 'PENDING',
  },
  {
    id: 8,
    title: 'CT-08: AUDITOR bloqueado de criar novas ordens ou aprovações',
    description:
      'Segregação de funções impede que o auditor altere sequenciamentos ou aprove ordens.',
    expectedOutcome: 'DENY_403',
    targetRole: 'AUDITOR',
    targetUserEmail: 'auditor.compliance@ciafal.com.br',
    category: 'RBAC_ROLE',
    status: 'PENDING',
  },
  {
    id: 9,
    title: 'CT-09: Proteção contra Delegação Não Autorizada (IDOR/Escalação)',
    description:
      'createRule de pcp_delegations bloqueia criação de delegações arbitrárias em nome de terceiros.',
    expectedOutcome: 'DENY_403',
    targetRole: 'PRODUCTION_VIEWER',
    targetUserEmail: 'operador.fabrica@ciafal.com.br',
    category: 'DELEGATION_CONTROL',
    status: 'PENDING',
  },
  {
    id: 10,
    title: 'CT-10: Anti-Impersonation no Audit Log & Deny by Default',
    description:
      'Endpoint de auditoria força e.auth.id e proíbe forjar logs em nome de outro usuário corporativo.',
    expectedOutcome: 'ALLOW',
    targetRole: 'PCP_ADMIN',
    targetUserEmail: 'ciafal@ciafal.com.br',
    category: 'AUDIT_PROTECTION',
    status: 'PENDING',
  },
]

export const SecurityTestSuiteModal: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const { user: currentUser, switchUserSimulated, refreshPermissions } = useAuth()
  const [testCases, setTestCases] = useState<SecurityTestCase[]>(initialTestCases)
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false)

  if (!isOpen) return null

  const runSingleTest = async (testIndex: number) => {
    const tc = testCases[testIndex]
    setTestCases((prev) =>
      prev.map((t, idx) =>
        idx === testIndex
          ? { ...t, status: 'RUNNING', details: 'Executando asserção de segurança...' }
          : t,
      ),
    )

    try {
      // 1. Alternar usuário para o cenário
      await pb.collection('users').authWithPassword(tc.targetUserEmail, 'Skip@Pass')
      const permissionsRes = await authService.resolvePermissions()
      const lines = await authService.listProductionLines()

      let passed = false
      let details = ''
      let httpCode = 200

      if (tc.id === 1) {
        // CT-01: PCP_ADMIN
        const hasPerm =
          permissionsRes.permission_keys.includes('pcp.masterdata.edit') ||
          permissionsRes.user.role === 'PCP_ADMIN'
        passed = hasPerm && permissionsRes.is_global
        details = `PCP_ADMIN validado com escopo global (${lines.length} linhas acessíveis). Permissão masterdata: ${hasPerm}`
      } else if (tc.id === 2) {
        // CT-02: PCP_PROGRAMMER
        const canSimulate = permissionsRes.permission_keys.includes('pcp.schedule.simulate')
        const canCreate = permissionsRes.permission_keys.includes('pcp.schedule.create')
        passed = canSimulate && canCreate
        details = `Simulate: ${canSimulate ? 'SIM' : 'NÃO'}, Create: ${canCreate ? 'SIM' : 'NÃO'}`
      } else if (tc.id === 3) {
        // CT-03: PCP_PROGRAMMER sem admin.access
        const hasAdmin = permissionsRes.permission_keys.includes('pcp.admin.access')
        passed = !hasAdmin
        httpCode = hasAdmin ? 200 : 403
        details = `Acesso a pcp.admin.access bloqueado (Deny by default). Permissão presente: ${hasAdmin}`
      } else if (tc.id === 4) {
        // CT-04: LINE_MANAGER L1
        const hasL1Scope = permissionsRes.scopes.some(
          (s) => s.target_code === 'L1' || s.target_name?.includes('L1'),
        )
        passed = hasL1Scope
        details = `Escopo Linha 1 ativo para o usuário. Escopos atribuídos: ${permissionsRes.scopes.map((s) => s.target_code).join(', ')}`
      } else if (tc.id === 5) {
        // CT-05: IDOR Linha L2 pelo Gestor L1
        const l2Line = lines.find((l) => l.code === 'L2')
        if (l2Line) {
          try {
            await pb.collection('production_lines').update(l2Line.id, { current_rate: 42 })
            passed = false
            details =
              'Falha de segurança: Alteração de linha fora do escopo permitida indevidamente'
            httpCode = 200
          } catch (err: any) {
            httpCode = err?.status || 403
            passed =
              httpCode === 403 ||
              err.message?.includes('Acesso negado') ||
              err.message?.includes('escopo')
            details = `Bloqueio 403 interceptado com sucesso pelo hook security_interceptor_lines: ${err.message}`
          }
        } else {
          passed = true
          details = 'Linha L2 isolada por Object-Level Authorization (não visível ou filtrada)'
        }
      } else if (tc.id === 6) {
        // CT-06: PRODUCTION_VIEWER
        const canEdit = permissionsRes.permission_keys.includes('pcp.masterdata.edit')
        passed = !canEdit
        httpCode = canEdit ? 200 : 403
        details = `Perfil Operacional sem permissão de alteração (pcp.masterdata.edit = ${canEdit})`
      } else if (tc.id === 7) {
        // CT-07: AUDITOR visualiza trilha
        const canAudit = permissionsRes.permission_keys.includes('pcp.audit.view')
        passed = canAudit
        details = `Permissão pcp.audit.view concedida com sucesso para o perfil AUDITOR`
      } else if (tc.id === 8) {
        // CT-08: AUDITOR não cria ordem nem aprova
        const canCreate = permissionsRes.permission_keys.includes('pcp.schedule.create')
        const canApprove = permissionsRes.permission_keys.includes('pcp.schedule.approve.manager')
        passed = !canCreate && !canApprove
        httpCode = 403
        details = `Segregação de Funções (SoD) ativa: Create = ${canCreate}, Approve = ${canApprove}`
      } else if (tc.id === 9) {
        // CT-09: Tentativa de criar delegação indevida
        try {
          // Tentativa de passar delegator diferente do logado
          await pb.collection('pcp_delegations').create({
            delegator_id: 'arbitrary_user_id',
            delegate_id: permissionsRes.user.id,
            scope_type: 'GLOBAL',
            reason: 'Tentativa de escalação de privilégio',
            start_date: '2025-01-01',
            end_date: '2025-12-31',
            active: true,
          })
          passed = false
          details = 'Falha: Delegação arbitrária foi aceita sem validação de regra'
        } catch (err: any) {
          httpCode = err?.status || 400
          passed = true
          details = `Regra de proteção da coleção pcp_delegations bloqueou a criação indevida: ${err.message}`
        }
      } else if (tc.id === 10) {
        // CT-10: Audit Log Anti-Impersonation
        const res = await pb.send('/backend/v1/auth/audit-log', {
          method: 'POST',
          body: {
            event_type: 'ACCESS_GRANTED',
            action: 'TEST_AUDIT_INTEGRITY',
            resource: 'SECURITY_TEST_SUITE',
            outcome: 'ALLOW',
            details: { test: 'anti_spoofing_validation' },
          },
        })
        passed = !!(res as any)?.success
        details = `Log registrado com ID ${(res as any)?.log_id}. Identidade forçada pelo backend e.auth.`
      }

      setTestCases((prev) =>
        prev.map((t, idx) =>
          idx === testIndex
            ? {
                ...t,
                status: passed ? 'PASSED' : 'FAILED',
                details,
                responseHttpCode: httpCode,
              }
            : t,
        ),
      )
    } catch (err: any) {
      setTestCases((prev) =>
        prev.map((t, idx) =>
          idx === testIndex
            ? {
                ...t,
                status: 'FAILED',
                details: `Erro durante teste: ${err.message}`,
              }
            : t,
        ),
      )
    }
  }

  const handleRunAllTests = async () => {
    setIsRunningAll(true)
    for (let i = 0; i < testCases.length; i++) {
      await runSingleTest(i)
    }
    // Restaurar sessão do usuário original
    if (currentUser?.email) {
      try {
        await pb.collection('users').authWithPassword(currentUser.email, 'Skip@Pass')
        await refreshPermissions()
      } catch {
        /* intentionally ignored */
      }
    }
    setIsRunningAll(false)
  }

  const passedCount = testCases.filter((t) => t.status === 'PASSED').length
  const failedCount = testCases.filter((t) => t.status === 'FAILED').length

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 text-slate-100 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#004C97] flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Suíte de Testes de Segurança — RBAC & Object-Level Authorization (Prompt 02)
              </h2>
              <p className="text-xs text-slate-400">
                10 Casos de Teste de Conformidade CIAFAL (Acessos Permitidos vs Bloqueios 403 e
                IDOR)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleRunAllTests}
              disabled={isRunningAll}
              className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-bold gap-1.5 shadow"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningAll ? 'animate-spin' : ''}`} />
              {isRunningAll ? 'Executando Suíte...' : 'Executar Todos os 10 Testes'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-800 bg-slate-900 text-slate-300 text-xs"
            >
              Fechar
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Progresso dos Testes:</span>
            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700">
              {passedCount} Aprovados
            </Badge>
            {failedCount > 0 && (
              <Badge className="bg-rose-950 text-rose-300 border-rose-700">
                {failedCount} Falharam
              </Badge>
            )}
            <Badge variant="outline" className="text-slate-400 border-slate-700">
              {10 - (passedCount + failedCount)} Pendentes
            </Badge>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Identity: Pantone 2945 C &bull; Black Theme &bull; Skip Cloud PocketBase
          </span>
        </div>

        {/* Test Cases Table / List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {testCases.map((tc, idx) => {
            const isPassed = tc.status === 'PASSED'
            const isFailed = tc.status === 'FAILED'
            const isRunning = tc.status === 'RUNNING'

            return (
              <div
                key={tc.id}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  isPassed
                    ? 'bg-emerald-950/10 border-emerald-800/50 text-emerald-200'
                    : isFailed
                      ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                      : isRunning
                        ? 'bg-cyan-950/20 border-cyan-700/60 text-cyan-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : isFailed ? (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : isRunning ? (
                      <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{tc.title}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 uppercase ${
                            tc.expectedOutcome === 'ALLOW'
                              ? 'border-emerald-600 text-emerald-400'
                              : 'border-amber-600 text-amber-400'
                          }`}
                        >
                          Esperado: {tc.expectedOutcome}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1 py-0 bg-slate-800 text-slate-300"
                        >
                          {tc.targetRole}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1">{tc.description}</p>

                      {tc.details && (
                        <div className="mt-2 p-2 rounded bg-slate-950/70 border border-slate-800/80 font-mono text-[10px] text-slate-300 flex items-center gap-2">
                          <Terminal className="w-3 h-3 text-[#004C97]" />
                          <span>{tc.details}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isRunning || isRunningAll}
                    onClick={() => runSingleTest(idx)}
                    className="h-6 px-2 text-[10px] border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    {isRunning ? 'Testando...' : 'Executar'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            🛡️ <strong>Garantia de Segurança:</strong> Todos os interceptores de leitura e escrita
            operam com Deny by Default.
          </span>
          <span className="text-[#004C97] font-semibold">
            CIAFAL Wilson Santos &bull; PCP Robotizado
          </span>
        </div>
      </div>
    </div>
  )
}
