/**
 * Card / Seção "DERIVAÇÃO DE CENTRO"
 * Exibido no cadastro e edição de Centros (Cadastros → Centros e Ficha Mestra → Criar Centro / Editar Centro)
 *
 * Funcionalidades completas:
 * 1. Switch "Centro derivado?" (Não / Sim).
 *    - Se Não: desabilita/oculta lista, salva centro normalmente.
 *    - Se Sim: exige pelo menos 1 regra válida e ativa antes de salvar o Centro;
 *      exibe botão "+ Criar derivação" e listagem completa.
 * 2. Listagem com colunas:
 *    Status | Centro de origem | Centro SAP | Grupo(s) de Mercadorias | Data início | Data fim | Última alteração | Ações
 * 3. Ações com ícones + tooltip:
 *    - Visualizar (abre modal apenas leitura / detalhe)
 *    - Editar (reabre modal completo)
 *    - Ativar / Inativar (sem excluir histórico)
 *    - Excluir (apenas da REGRA, NUNCA do centro, com confirmação de soft delete)
 * 4. Paginação e área compacta para evitar modal comprido
 * 5. Integração com Design System CIAFAL e Tokens
 */

import React, { useState, useMemo } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  GitFork,
  Plus,
  Eye,
  Pencil,
  Power,
  Trash2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { CenterDerivationRule } from '@/types/center-derivation'
import { ProductionLine } from '@/types/line-master'
import { CenterDerivationModal } from './CenterDerivationModal'
import { centerDerivationService } from '@/services/pcp-center-derivation-service'
import { useToast } from '@/hooks/use-toast'

interface CenterDerivationSectionProps {
  centerCode: string
  centerName?: string
  isDerived: boolean
  onToggleDerived: (value: boolean) => void
  rules: CenterDerivationRule[]
  onRulesChange: (rules: CenterDerivationRule[]) => void
  availableCenters: ProductionLine[]
  currentUser?: string
  readOnly?: boolean
  validationError?: string | null
}

export const CenterDerivationSection: React.FC<CenterDerivationSectionProps> = ({
  centerCode,
  centerName,
  isDerived,
  onToggleDerived,
  rules,
  onRulesChange,
  availableCenters,
  currentUser = 'Engenharia PCP',
  readOnly = false,
  validationError,
}) => {
  const { toast } = useToast()

  // Modal de criação / edição
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editingRule, setEditingRule] = useState<CenterDerivationRule | null>(null)

  // Modal de visualização detalhada
  const [viewingRule, setViewingRule] = useState<CenterDerivationRule | null>(null)

  // Diálogo de confirmação de exclusão
  const [ruleToDelete, setRuleToDelete] = useState<CenterDerivationRule | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Paginação da listagem interna
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 4

  // Filtra regras que não sofreram soft delete
  const activeDisplayRules = useMemo(() => {
    return (rules || []).filter((r) => !r.deleted)
  }, [rules])

  const totalPages = Math.ceil(activeDisplayRules.length / pageSize) || 1
  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return activeDisplayRules.slice(start, start + pageSize)
  }, [activeDisplayRules, currentPage])

  // Contagem de regras ativas válidas
  const activeValidRulesCount = useMemo(() => {
    return activeDisplayRules.filter((r) => r.status === 'Ativa').length
  }, [activeDisplayRules])

  // Abrir modal para nova derivação
  const handleOpenCreateModal = () => {
    if (!centerCode.trim()) {
      toast({
        variant: 'destructive',
        title: 'Código do Centro Necessário',
        description: 'Informe o código do Centro antes de adicionar regras de derivação.',
      })
      return
    }
    setEditingRule(null)
    setModalOpen(true)
  }

  // Abrir modal para edição de regra
  const handleOpenEditModal = (rule: CenterDerivationRule) => {
    setEditingRule(rule)
    setModalOpen(true)
  }

  // Salvar regra (criação ou edição) com tratamento estrito e auditoria centralizada
  const handleSaveRule = async (rule: CenterDerivationRule, options?: { signal?: AbortSignal }) => {
    // 1. Executar validações de autorrelacionamento, duplicidade e relações circulares
    const validation = await centerDerivationService.validateDerivationRule(
      centerCode,
      rule,
      activeDisplayRules,
    )

    if (!validation.isValid) {
      const vMsg = validation.error || 'A regra de derivação informada não é válida.'
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar a Derivação',
        description: vMsg,
      })
      try {
        await centerDerivationService.recordAuditLog({
          center: centerCode,
          action: rule.id ? 'edição' : 'criação',
          source: rule.source_center_code,
          target: centerCode,
          payload: rule,
          endpoint: '/api/collections/pcp_center_derivations/records',
          httpStatus: 400,
          technicalMessage: vMsg,
          userMessage: vMsg,
          rule_summary: `${rule.source_center_code} / MATKL ${(Array.isArray(rule.matkl_groups) ? rule.matkl_groups : []).map((m) => m?.matkl || '').join(',')}`,
          previous_value: '-',
          new_value: '-',
          user_name: currentUser,
          timestamp: centerDerivationService.formatDateTimePtBr(new Date()),
          status: 'ERRO',
          errorMessage: vMsg,
        })
      } catch {
        /* ignore */
      }
      throw new Error(vMsg)
    }

    try {
      const saved = await centerDerivationService.saveDerivationRule(rule, currentUser, options)

      let updatedList: CenterDerivationRule[]
      const matklSummary = (Array.isArray(saved.matkl_groups) ? saved.matkl_groups : [])
        .map((m) => `MATKL ${m?.matkl || ''}`)
        .join(', ')
      const summaryText = `Origem: ${saved.source_center_code} | Destino: ${centerCode} | MATKL: ${matklSummary || 'Nenhum'} | Status: ${saved.status}`

      const currentRules = Array.isArray(rules) ? rules : []
      if (rule.id) {
        updatedList = currentRules.map((r) => (r.id === rule.id ? saved : r))
      } else {
        updatedList = [saved, ...currentRules]
      }

      toast({
        title: 'Derivação salva com sucesso',
        description: summaryText,
      })

      // Registrar auditoria de sucesso
      try {
        await centerDerivationService.recordAuditLog({
          center: centerCode,
          action: rule.id ? 'edição' : 'criação',
          source: saved.source_center_code,
          target: centerCode,
          payload: saved,
          endpoint: '/api/collections/pcp_center_derivations/records',
          httpStatus: 200,
          technicalMessage:
            'Registro de derivação persistido com sucesso na coleção pcp_center_derivations',
          userMessage: 'Derivação salva com sucesso',
          rule_summary: `${saved.source_center_code} / MATKL ${(Array.isArray(saved.matkl_groups) ? saved.matkl_groups : []).map((m) => m?.matkl || '').join(',')}`,
          previous_value: rule.id ? 'regra_anterior' : 'nenhuma',
          new_value: `${saved.source_center_code} -> ${centerCode} (${saved.status})`,
          user_name: currentUser,
          timestamp: centerDerivationService.formatDateTimePtBr(new Date()),
          status: 'SUCESSO',
        })
      } catch {
        /* ignore */
      }

      onRulesChange(updatedList)
    } catch (err: any) {
      const isTimeout =
        err?.name === 'AbortError' ||
        err?.message?.includes('tempo de resposta') ||
        err?.message?.includes('excedeu') ||
        options?.signal?.aborted
      const userFriendlyMsg = isTimeout
        ? 'Não foi possível salvar a Derivação — A operação excedeu o tempo de resposta. Tente novamente ou consulte os Logs de Integração.'
        : err?.message || 'Falha ao persistir a Derivação no banco de dados.'

      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar a Derivação',
        description: userFriendlyMsg,
      })

      // Registrar auditoria detalhada de falha técnica
      try {
        await centerDerivationService.recordAuditLog({
          center: centerCode,
          action: rule.id ? 'edição' : 'criação',
          source: rule.source_center_code,
          target: centerCode,
          payload: rule,
          endpoint: '/api/collections/pcp_center_derivations/records',
          httpStatus: isTimeout ? 408 : 500,
          technicalMessage: err?.message || 'Erro desconhecido na requisição',
          userMessage: userFriendlyMsg,
          rule_summary: `${rule.source_center_code} / MATKL ${(Array.isArray(rule.matkl_groups) ? rule.matkl_groups : []).map((m) => m?.matkl || '').join(',')}`,
          previous_value: '-',
          new_value: '-',
          user_name: currentUser,
          timestamp: centerDerivationService.formatDateTimePtBr(new Date()),
          status: 'ERRO',
          errorMessage: userFriendlyMsg,
        })
      } catch {
        /* ignore audit err */
      }

      throw new Error(userFriendlyMsg)
    }
  }

  // Alternar status da regra (Ativa / Inativa)
  const handleToggleRuleStatus = async (rule: CenterDerivationRule) => {
    if (readOnly) return
    try {
      const updated = await centerDerivationService.toggleStatus(rule, currentUser)
      const currentRules = Array.isArray(rules) ? rules : []
      const updatedList = currentRules.map((r) => (r.id === rule.id ? updated : r))
      onRulesChange(updatedList)
      toast({
        title: `Regra ${updated.status}`,
        description: `Derivação do centro ${rule.source_center_code} definida como ${updated.status}.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Alterar Status',
        description: err.message || 'Não foi possível alterar o status da derivação.',
      })
    }
  }

  // Confirmação de exclusão lógica
  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return
    setIsDeleting(true)
    try {
      if (ruleToDelete.id) {
        await centerDerivationService.softDeleteDerivationRule(
          ruleToDelete.id,
          centerCode,
          currentUser,
        )
      }

      // Remover visualmente da lista ativa
      const currentRules = Array.isArray(rules) ? rules : []
      const updatedList = currentRules.filter((r) => r.id !== ruleToDelete.id)
      onRulesChange(updatedList)

      toast({
        title: 'Regra Excluída',
        description:
          'A regra de derivação foi excluída logicamente. O Centro permanece inalterado.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Excluir Regra',
        description: err.message || 'Falha ao excluir regra de derivação.',
      })
    } finally {
      setIsDeleting(false)
      setRuleToDelete(null)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-4">
        {/* Cabeçalho do Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-[#004C97]">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                DERIVAÇÃO DE CENTRO
              </span>
              <p className="text-[11px] text-slate-500 leading-snug">
                Configure se este Centro deriva sua programação de outro Centro. Quando ativo, o PCP
                poderá gerar de forma integrada e automatizada a programação deste Centro na
                Montagem Semanal, considerando o Centro de origem, grupos de mercadorias e regras
                técnicas cadastradas.
              </p>
            </div>
          </div>

          {/* Switch: Centro derivado? (Não / Sim) */}
          <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-700">Centro derivado?</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={isDerived}
                onCheckedChange={onToggleDerived}
                disabled={readOnly}
                id="switch-center-derived"
              />
              <span
                className={`text-xs font-bold ${isDerived ? 'text-[#004C97]' : 'text-slate-500'}`}
              >
                {isDerived ? 'Sim' : 'Não'}
              </span>
            </div>
          </div>
        </div>

        {/* Exibição condicional com base no Switch */}
        {!isDerived ? (
          <div className="p-3 bg-slate-50 rounded-md border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Este Centro de Produção não possui derivação de centros. Opere como centro autônomo.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Aviso de obrigatoriedade se ativado sem regras */}
            {activeValidRulesCount === 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-md text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> Centro derivado ativado como "Sim".{' '}
                  <span className="text-rose-600 font-semibold">
                    Informe pelo menos uma derivação antes de salvar o Centro.
                  </span>
                </div>
              </div>
            )}

            {/* Mensagem de validação externa caso ocorra tentativa de submissão */}
            {validationError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-md text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{validationError}</span>
              </div>
            )}

            {/* Barra de Ações da Lista */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[11px] font-medium bg-slate-50">
                  Total de regras: {activeDisplayRules.length}
                </Badge>
                <Badge
                  className={`text-[11px] font-bold ${
                    activeValidRulesCount > 0
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {activeValidRulesCount} ativa(s)
                </Badge>
              </div>

              {!readOnly && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenCreateModal}
                  className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />+ Criar derivação
                </Button>
              )}
            </div>

            {/* Tabela de Listagem de Derivações (1:N) */}
            {activeDisplayRules.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-md text-center space-y-2">
                <GitFork className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">
                  Nenhuma regra de derivação cadastrada
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Clique no botão "+ Criar derivação" acima para adicionar os Centros de Origem e
                  Grupos de Mercadorias (MATKL).
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Centro de Origem</th>
                        <th className="py-2.5 px-3">Centro SAP</th>
                        <th className="py-2.5 px-3">Grupo(s) de Mercadorias</th>
                        <th className="py-2.5 px-3">Data Início</th>
                        <th className="py-2.5 px-3">Data Fim</th>
                        <th className="py-2.5 px-3">Última Alteração</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(paginatedRules || []).map((rule) => {
                        const isRuleActive = rule.status === 'Ativa'
                        const matklList = rule.matkl_groups || []

                        return (
                          <tr
                            key={rule.id || `${rule.source_center_code}-${rule.start_date}`}
                            className={`hover:bg-slate-50 transition-colors ${
                              !isRuleActive ? 'bg-slate-50/50 text-slate-500' : 'text-slate-800'
                            }`}
                          >
                            {/* Status */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              <Badge
                                className={
                                  isRuleActive
                                    ? 'bg-emerald-600 text-white font-bold text-[10px]'
                                    : 'bg-slate-400 text-white font-bold text-[10px]'
                                }
                              >
                                {rule.status}
                              </Badge>
                            </td>

                            {/* Centro de Origem */}
                            <td className="py-2 px-3 whitespace-nowrap font-medium">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-[#004C97]">
                                  {rule.source_center_code}
                                </span>
                                {rule.source_center_name && (
                                  <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                    {rule.source_center_name}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Centro SAP */}
                            <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                              {rule.source_center_sap || '-'}
                            </td>

                            {/* Grupo(s) de Mercadorias (chips compactos) */}
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1 max-w-[280px]">
                                {matklList.length === 0 ? (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                ) : (
                                  matklList.map((m) => (
                                    <span
                                      key={m.matkl}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-[#004C97] border border-blue-200 text-[10px] font-mono font-semibold"
                                      title={m.description}
                                    >
                                      MATKL {m.matkl}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>

                            {/* Data Início */}
                            <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                              {rule.start_date || '-'}
                            </td>

                            {/* Data Fim */}
                            <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                              {rule.end_date || (
                                <span className="text-slate-400 italic">Indeterminado</span>
                              )}
                            </td>

                            {/* Última Alteração */}
                            <td className="py-2 px-3 whitespace-nowrap text-[10px] text-slate-500">
                              <div>{rule.updated_by || rule.created_by || 'Sistema'}</div>
                              {rule.updated && (
                                <div className="text-[9px] font-mono text-slate-400">
                                  {centerDerivationService.formatDatePtBr(rule.updated)}
                                </div>
                              )}
                            </td>

                            {/* Ações com ícones e tooltips */}
                            <td className="py-2 px-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Visualizar */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setViewingRule(rule)}
                                      className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <span>Visualizar detalhes da regra</span>
                                  </TooltipContent>
                                </Tooltip>

                                {!readOnly && (
                                  <>
                                    {/* Editar */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenEditModal(rule)}
                                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <span>Editar configuração da derivação</span>
                                      </TooltipContent>
                                    </Tooltip>

                                    {/* Ativar / Inativar */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleToggleRuleStatus(rule)}
                                          className={`h-7 w-7 p-0 ${
                                            isRuleActive
                                              ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                          }`}
                                        >
                                          <Power className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <span>
                                          {isRuleActive ? 'Inativar regra' : 'Ativar regra'}
                                        </span>
                                      </TooltipContent>
                                    </Tooltip>

                                    {/* Excluir (Soft delete apenas da REGRA) */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setRuleToDelete(rule)}
                                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <span>Excluir regra de derivação</span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paginação se houver mais de 1 página */}
                {totalPages > 1 && (
                  <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Página {currentPage} de {totalPages} ({activeDisplayRules.length} registros)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="h-6 w-6 p-0 bg-white"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="h-6 w-6 p-0 bg-white"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal de Criação / Edição */}
        {modalOpen && (
          <CenterDerivationModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSaveRule={handleSaveRule}
            currentCenterCode={centerCode}
            availableCenters={Array.isArray(availableCenters) ? availableCenters : []}
            existingRule={editingRule}
            allRules={Array.isArray(rules) ? rules : []}
          />
        )}
        {/* Modal de Visualização Detalhada (Read-only) */}
        {viewingRule && (
          <AlertDialog open={Boolean(viewingRule)} onOpenChange={() => setViewingRule(null)}>
            <AlertDialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg">
              <AlertDialogHeader>
                <div className="flex items-center gap-2 text-[#004C97]">
                  <GitFork className="w-5 h-5" />
                  <AlertDialogTitle className="text-base font-bold text-slate-900">
                    Detalhes da Regra de Derivação
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-xs text-slate-600 pt-1">
                  Consulta cadastral e auditoria da regra de derivação produtiva.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Centro de Origem
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {viewingRule.source_center_code}
                    </span>
                    <div className="text-[11px] text-slate-600">
                      {viewingRule.source_center_name || '-'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Centro SAP
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {viewingRule.source_center_sap || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Status da Regra
                    </span>
                    <Badge
                      className={
                        viewingRule.status === 'Ativa'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-400 text-white font-bold'
                      }
                    >
                      {viewingRule.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Período de Validade
                    </span>
                    <span className="font-mono text-slate-700">
                      {viewingRule.start_date} até {viewingRule.end_date || 'Indeterminado'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                    Grupos de Mercadorias (MATKL):
                  </span>
                  <div className="space-y-1 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded border border-slate-200">
                    {(Array.isArray(viewingRule.matkl_groups) ? viewingRule.matkl_groups : []).map(
                      (m) => (
                        <div
                          key={m?.matkl || Math.random().toString()}
                          className="flex items-center gap-2 p-1 bg-white rounded border border-slate-200 text-xs"
                        >
                          <Badge
                            variant="outline"
                            className="font-mono font-bold bg-blue-50 text-[#004C97]"
                          >
                            MATKL {m?.matkl || ''}
                          </Badge>
                          <span className="text-slate-700">{m?.description || ''}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogAction
                  onClick={() => setViewingRule(null)}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs"
                >
                  Fechar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Diálogo de Confirmação de Exclusão (Soft Delete da REGRA apenas) */}
        {ruleToDelete && (
          <AlertDialog
            open={Boolean(ruleToDelete)}
            onOpenChange={(val) => !val && setRuleToDelete(null)}
          >
            <AlertDialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
              <AlertDialogHeader>
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <AlertDialogTitle className="text-base font-bold text-slate-900">
                    Excluir regra de derivação?
                  </AlertDialogTitle>
                </div>
                {/* Texto exato especificado no critério 5 do usuário */}
                <AlertDialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed font-medium">
                  Deseja excluir esta regra de derivação? Esta ação não excluirá o Centro
                  cadastrado.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-700">
                <div>
                  Centro de Origem: <strong>{ruleToDelete.source_center_code}</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  Grupos:{' '}
                  {(Array.isArray(ruleToDelete.matkl_groups) ? ruleToDelete.matkl_groups : [])
                    .map((m) => `MATKL ${m?.matkl || ''}`)
                    .join(', ') || 'Nenhum'}
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isDeleting}
                  onClick={() => setRuleToDelete(null)}
                  className="text-xs bg-white text-slate-700"
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão da Regra'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </TooltipProvider>
  )
}
