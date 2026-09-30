import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { pcpStorageDepositsService } from '@/services/pcp-storage-deposits-service'
import {
  InventoryDemand,
  InventoryEntry,
  InventoryRun,
  InventoryGauge,
  CreateEntryPayload,
} from '@/types/pcp-inventory-demands'
import {
  ClipboardCheck,
  Plus,
  Loader2,
  CheckCircle2,
  Save,
  AlertTriangle,
  Package,
  Ban,
  Lock,
  Trash2,
} from 'lucide-react'

interface LancarInventarioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demand: InventoryDemand | null
  onSuccess: () => void
}

export const LancarInventarioModal: React.FC<LancarInventarioModalProps> = ({
  open,
  onOpenChange,
  demand,
  onSuccess,
}) => {
  const { toast } = useToast()

  const [entries, setEntries] = useState<InventoryEntry[]>([])
  const [runs, setRuns] = useState<InventoryRun[]>([])
  const [gauges, setGauges] = useState<InventoryGauge[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // Formulário "+ Adicionar Contagem"
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [runNumber, setRunNumber] = useState<string>('')
  const [locationWms, setLocationWms] = useState<string>('')
  const [piecesCount, setPiecesCount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [savingEntry, setSavingEntry] = useState<boolean>(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Excluir Lançamento
  const handleDeleteEntry = async (entryId: string) => {
    if (isReadOnly) return
    try {
      setDeletingId(entryId)
      await pcpInventoryDemandsService.deleteEntry(entryId)
      toast({
        title: 'Contagem Removida',
        description: 'Lançamento físico removido com sucesso.',
      })
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover contagem',
        description: err?.message || 'Falha ao remover registro.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Ações de salvamento da demanda
  const [savingPartial, setSavingPartial] = useState<boolean>(false)
  const [concluding, setConcluding] = useState<boolean>(false)
  const [showConfirmConclusion, setShowConfirmConclusion] = useState<boolean>(false)

  // Estado do Cancelamento pelo modal de Lançamento
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false)
  const [cancelReasonText, setCancelReasonText] = useState<string>('')
  const [cancelling, setCancelling] = useState<boolean>(false)

  // Estado da Consulta ao Saldo SAP (ETAPA F e B)
  const [sapLoading, setSapLoading] = useState<boolean>(false)
  const [sapError, setSapError] = useState<string | null>(null)
  const [sapBalance, setSapBalance] = useState<number | null>(null)
  const [sapUnit, setSapUnit] = useState<string>('peças')

  // Consulta saldo SAP via endpoint RFC corporativo
  const fetchSapBalance = useCallback(async () => {
    if (!demand?.company || !demand?.storage_deposit || !demand?.material_code) {
      setSapError('Parâmetros da demanda insuficientes para consultar SAP.')
      setSapBalance(null)
      return
    }

    setSapLoading(true)
    setSapError(null)

    try {
      const firstHeat =
        demand.materials_summary?.[0]?.heat_number ||
        demand.materials?.[0]?.heat_number ||
        undefined
      const res = await pcpInventoryDemandsService.getSapStockBalance({
        werks: demand.company,
        lgort: demand.storage_deposit,
        matnr: demand.material_code,
        charg: firstHeat,
      })

      if (res.success && res.saldo !== null) {
        setSapBalance(res.saldo)
        setSapError(null)
      } else {
        setSapBalance(null)
        setSapError(res.message || 'Não foi possível consultar o saldo no SAP.')
      }
    } catch (err: any) {
      setSapBalance(null)
      setSapError(err?.message || 'Não foi possível consultar o saldo no SAP.')
    } finally {
      setSapLoading(false)
    }
  }, [
    demand?.company,
    demand?.storage_deposit,
    demand?.material_code,
    demand?.materials_summary,
    demand?.materials,
  ])

  // Estado local da demanda para refletir reaberturas ou conclusões em tempo real
  const [currentDemandState, setCurrentDemandState] = useState<InventoryDemand | null>(demand)

  useEffect(() => {
    setCurrentDemandState(demand)
  }, [demand])

  // Carrega dados da demanda selecionada
  const loadData = useCallback(async () => {
    const activeDemandId = currentDemandState?.id || demand?.id
    if (!activeDemandId) return
    setLoading(true)
    try {
      // Reconsulta a demanda atualizada
      const freshDemand = await pcpInventoryDemandsService.getDemandById(activeDemandId)
      if (freshDemand) {
        setCurrentDemandState(freshDemand)
      }
      const [fetchedEntries, fetchedRuns, fetchedGauges] = await Promise.all([
        pcpInventoryDemandsService.listEntriesByDemand(activeDemandId, true, true),
        pcpInventoryDemandsService.listRunsByDemand(activeDemandId),
        pcpInventoryDemandsService.listGaugesByDemand(activeDemandId),
      ])
      setEntries(fetchedEntries)
      setRuns(fetchedRuns)
      setGauges(fetchedGauges)
      if (fetchedRuns.length > 0 && !runNumber) {
        setRunNumber(fetchedRuns[0].run_number)
      }
    } catch (err) {
      console.error('Erro ao carregar dados do inventário:', err)
    } finally {
      setLoading(false)
    }
  }, [currentDemandState?.id, demand?.id, runNumber])

  useEffect(() => {
    if (open && demand?.id) {
      loadData()
      fetchSapBalance()
      setShowAddForm(false)
      setLocationWms(demand.storage_deposit || 'DP07')
      setPiecesCount('')
      setNotes('')
    }
  }, [open, demand?.id, loadData, fetchSapBalance])

  // Cálculos em tempo real conforme ETAPA F (6 Cards exatos na ordem solicitada):
  // 1. DEMANDA: quantidade da demanda (sem "Previsto")
  // 2. SALDO SAP: saldo retornado ou "Saldo indisponível"
  // 3. INVENTARIADO: soma das contagens
  // 4. DIVERGÊNCIA DEMANDA: Inventariado − Demanda
  // 5. DIVERGÊNCIA SAP: Inventariado − Saldo SAP (ou "—" se SAP indisponível)
  // 6. DIVERGÊNCIA %: ((Inventariado − Demanda)/Demanda)*100 (0,00% se Demanda=0)
  const activeDemand = currentDemandState || demand
  const demandaQtd = activeDemand?.total_pieces_required || 0
  const inventariadoQtd = useMemo(() => {
    return entries.reduce((acc, curr) => acc + (curr.pieces_count || 0), 0)
  }, [entries])

  const divergenciaDemanda = inventariadoQtd - demandaQtd
  const divergenciaSap = sapBalance !== null ? inventariadoQtd - sapBalance : null
  const divergenciaPct = demandaQtd > 0 ? ((inventariadoQtd - demandaQtd) / demandaQtd) * 100 : 0

  const formatPtBrNumber = (val: number, decimals: number = 0): string => {
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const formatPtBrPct = (val: number): string => {
    const formatted = Math.abs(val).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    if (val === 0) return '0,00%'
    return `${val > 0 ? '+' : '−'}${formatted}%`
  }

  // Erros inline de validação do formulário de contagem
  const [formErrors, setFormErrors] = useState<{
    runNumber?: string
    locationWms?: string
    piecesCount?: string
  }>({})

  // Adicionar nova contagem física
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!demand?.id || savingEntry) return

    const errors: { runNumber?: string; locationWms?: string; piecesCount?: string } = {}

    const runTrim = runNumber.trim()
    const locTrim = locationWms.trim()
    const rawPieces = piecesCount.trim()

    if (!runTrim) {
      errors.runNumber = 'Informe o número da corrida.'
    }

    if (!locTrim) {
      errors.locationWms = 'Informe a localização no WMS.'
    }

    if (!rawPieces) {
      errors.piecesCount = 'Informe o número de peças.'
    } else {
      const parsed = parseInt(rawPieces, 10)
      if (isNaN(parsed) || parsed <= 0) {
        errors.piecesCount = 'O número de peças deve ser maior que zero.'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setSavingEntry(true)

    const count = parseInt(rawPieces, 10)
    try {
      const payload: CreateEntryPayload = {
        demand_id: demand.id,
        run_number: runTrim,
        location_wms: locTrim,
        pieces_count: count,
        gauge: gauges[0]?.gauge || 'Tarugo 130mm',
        notes: notes.trim() || undefined,
      }

      const saved = await pcpInventoryDemandsService.addEntry(payload)

      toast({
        title: 'Contagem salva com sucesso.',
        description: `Contagem de ${count} peças da corrida ${runTrim} salva com sucesso.`,
      })

      // Limpa os campos SOMENTE após sucesso confirmado pelo backend
      setPiecesCount('')
      setNotes('')
      setShowAddForm(false)

      // Atualiza o grid imediatamente sem depender de recarregar página
      if (saved) {
        setEntries((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)])
      }
      await loadData()
    } catch (err: any) {
      console.error('Erro ao adicionar contagem:', err)
      // Em erro, mensagem clara e NÃO limpa os campos
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar a contagem.',
        description: 'Não foi possível salvar a contagem. Tente novamente.',
      })
    } finally {
      setSavingEntry(false)
    }
  }

  // Verificação de bloqueio
  const isCancelled = useMemo(() => {
    const st = activeDemand?.status
    if (!st) return false
    const s = st.trim().toLowerCase()
    return s === 'cancelado' || s === 'cancelada'
  }, [activeDemand?.status])

  const isConcluded = useMemo(() => {
    const st = activeDemand?.status
    if (!st) return false
    const s = st.trim().toLowerCase()
    return (
      s === 'concluído' ||
      s === 'concluido' ||
      s === 'inventário concluído' ||
      s === 'inventario concluido'
    )
  }, [activeDemand?.status])

  const isReadOnly = isCancelled || isConcluded

  // Reabertura de demanda Cancelada
  const [reopening, setReopening] = useState<boolean>(false)
  const handleReopenDemand = async () => {
    if (!activeDemand?.id || reopening) return
    setReopening(true)
    try {
      const reaberta = await pcpInventoryDemandsService.reopenDemand(activeDemand.id)
      setCurrentDemandState(reaberta)
      toast({
        title: 'Demanda Reaberta com Sucesso',
        description: `Novo ciclo ${reaberta.cycle_count || 2} iniciado para a demanda ${reaberta.control_number}. Lançamentos habilitados.`,
      })
      await loadData()
      onSuccess()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reabrir demanda',
        description: err?.message || 'Falha na reabertura da demanda cancelada.',
      })
    } finally {
      setReopening(false)
    }
  }

  // Salvar Parcial
  const handleSavePartial = async () => {
    if (!demand?.id || isReadOnly) return
    setSavingPartial(true)
    try {
      await pcpInventoryDemandsService.savePartialDemand(demand.id)
      toast({
        title: 'Inventário salvo parcialmente com sucesso.',
        description: `Demanda ${demand.control_number} salva com status Parcial. A demanda continua disponível em "Selecionar Demanda para Lançamento".`,
      })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar parcial',
        description: err?.message || 'Falha ao atualizar demanda.',
      })
    } finally {
      setSavingPartial(false)
    }
  }

  // Concluir Inventário
  const handleCheckConclusion = () => {
    if (!demand?.id || isReadOnly) return
    setShowConfirmConclusion(true)
  }

  const executeConclude = async () => {
    if (!activeDemand?.id || isReadOnly) return
    setConcluding(true)
    try {
      const concluded = await pcpInventoryDemandsService.concludeDemand(activeDemand.id, {
        sap_balance: sapBalance,
        sap_status: sapBalance !== null ? 'CONCILIADO' : 'INDISPONIVEL',
        divergence_demand: divergenciaDemanda,
        divergence_sap: divergenciaSap,
        divergence_pct: Number(divergenciaPct.toFixed(2)),
      })
      setCurrentDemandState(concluded)
      toast({
        title: 'Inventário concluído com sucesso.',
        description: `Demanda ${activeDemand.control_number} concluída. Nova contagens não são permitidas.`,
      })
      setShowConfirmConclusion(false)
      onSuccess()
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao concluir inventário',
        description: err?.message || 'Falha ao concluir demanda.',
      })
    } finally {
      setConcluding(false)
    }
  }

  // Cancelar Inventário
  const handleConfirmCancel = async () => {
    if (!demand?.id || isReadOnly) return
    const reason = cancelReasonText.trim()
    if (!reason) {
      toast({
        variant: 'destructive',
        title: 'Motivo obrigatório',
        description: 'Informe o motivo do cancelamento para prosseguir.',
      })
      return
    }

    setCancelling(true)
    try {
      await pcpInventoryDemandsService.cancelDemand(demand.id, reason)
      toast({
        title: 'Inventário cancelado com sucesso.',
        description: `Demanda ${demand.control_number} cancelada. Histórico e contagens foram preservados.`,
      })
      setShowCancelModal(false)
      onSuccess()
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar inventário',
        description: err?.message || 'Falha ao cancelar demanda.',
      })
    } finally {
      setCancelling(false)
    }
  }

  if (!demand) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
                <ClipboardCheck className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base font-black text-slate-900">
                    Lançar Inventário — Demanda {demand.control_number}
                  </DialogTitle>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-xs font-semibold text-slate-600">Status:</span>
                    <Badge
                      className={
                        isCancelled
                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold text-xs'
                          : isConcluded
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs'
                            : activeDemand?.status === 'Parcial' ||
                                activeDemand?.status === 'Inventário parcial'
                              ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs'
                              : 'bg-blue-100 text-[#004C97] border-blue-300 font-semibold text-xs'
                      }
                    >
                      {activeDemand?.status || 'Aberto'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-bold text-slate-600"
                    >
                      Ciclo {activeDemand?.cycle_count || 1}
                    </Badge>
                  </div>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Registre as contagens físicas de peças por corrida e localização no WMS.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Banner de Aviso de Estado Final / Somente Leitura */}
          {isConcluded && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg text-xs font-semibold">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>
                Inventário concluído — somente leitura. Novas contagens e edições não são
                permitidas.
              </span>
            </div>
          )}

          {isCancelled && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-50 border border-rose-200 text-rose-900 px-3 py-2.5 rounded-lg text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-semibold">
                  <Lock className="w-4 h-4 text-rose-600" />
                  <span>
                    Inventário cancelado — somente leitura. Novas contagens exigem reabertura de
                    ciclo.
                  </span>
                </div>
                {activeDemand?.cancellation_reason && (
                  <div className="text-[11px] text-rose-700 pl-6">
                    Motivo: <strong>{activeDemand.cancellation_reason}</strong>
                    {activeDemand.cancelled_by && ` (por ${activeDemand.cancelled_by})`}
                  </div>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleReopenDemand}
                disabled={reopening}
                className="h-8 text-xs font-bold bg-[#004C97] hover:bg-[#003B75] text-white shrink-0 shadow-xs"
              >
                {reopening ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Reabrindo Ciclo...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Reabrir para Novo Lançamento (Ciclo {(activeDemand?.cycle_count || 1) + 1})
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Cabeçalho Somente Leitura */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Nº Controle
              </span>
              <span className="font-mono font-bold text-[#004C97]">{demand.control_number}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Centro</span>
              <span className="font-semibold text-slate-800">{demand.center}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Depósito</span>
              <span
                className="font-semibold text-slate-800"
                title={pcpStorageDepositsService.formatDepositLabel(demand.storage_deposit)}
              >
                {pcpStorageDepositsService.formatDepositLabel(demand.storage_deposit)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Material</span>
              <span className="font-mono font-bold text-slate-800">{demand.material_code}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Descrição
              </span>
              <span className="text-slate-800 truncate block" title={demand.material_description}>
                {demand.material_description || '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Bitola / Apl.
              </span>
              <span className="text-slate-800 truncate block">
                {gauges[0]?.gauge || 'Tarugo 130mm'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Qtd. Demanda
              </span>
              <span className="font-mono font-bold text-slate-900">{demandaQtd} pçs</span>
            </div>
          </div>

          {/* ETAPA F: 6 CARDS NA ORDEM EXATA, MESMA ALTURA, TIPOGRAFIA CONSISTENTE, pt-BR COM VÍRGULA */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* 1. DEMANDA */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex flex-col justify-between h-[82px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">
                1. DEMANDA
              </span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-lg font-black font-mono text-slate-900">
                  {formatPtBrNumber(demandaQtd)}
                </span>
                <span className="text-[10px] font-bold text-slate-400">peças</span>
              </div>
              <span className="text-[9px] text-slate-400 truncate">Qtd. da Demanda</span>
            </div>

            {/* 2. SALDO SAP */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between h-[82px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight block">
                  2. SALDO SAP
                </span>
                {sapLoading && <Loader2 className="w-3 h-3 animate-spin text-[#004C97]" />}
              </div>

              {sapLoading ? (
                <div className="flex items-center gap-1.5 py-1 text-slate-500 text-[11px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#004C97]" />
                  <span className="font-medium">Consultando SAP...</span>
                </div>
              ) : sapBalance !== null ? (
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-lg font-black font-mono text-slate-900">
                    {formatPtBrNumber(sapBalance)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">{sapUnit}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 py-0.5">
                  <span className="text-[11px] font-bold text-amber-800 leading-tight">
                    Saldo indisponível
                  </span>
                  <button
                    type="button"
                    onClick={fetchSapBalance}
                    className="text-[10px] text-[#004C97] hover:underline font-semibold text-left inline-flex items-center gap-0.5"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              <span className="text-[9px] text-slate-400 truncate">
                {sapBalance !== null ? 'Estoque Oficial SAP' : 'RFC indisponível'}
              </span>
            </div>

            {/* 3. INVENTARIADO */}
            <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 flex flex-col justify-between h-[82px]">
              <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-tight block">
                3. INVENTARIADO
              </span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-lg font-black font-mono text-[#004C97]">
                  {formatPtBrNumber(inventariadoQtd)}
                </span>
                <span className="text-[10px] font-bold text-blue-700">peças</span>
              </div>
              <span className="text-[9px] text-blue-600/80 truncate">Soma das contagens</span>
            </div>

            {/* 4. DIVERGÊNCIA DEMANDA */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between h-[82px] ${
                divergenciaDemanda === 0
                  ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                  : 'border-amber-200 bg-amber-50/30 text-amber-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-tight block opacity-90">
                4. DIVERGÊNCIA DEMANDA
              </span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-lg font-black font-mono">
                  {divergenciaDemanda > 0 ? '+' : divergenciaDemanda < 0 ? '−' : ''}
                  {formatPtBrNumber(Math.abs(divergenciaDemanda))}
                </span>
                <span className="text-[10px] font-bold opacity-80">peças</span>
              </div>
              <span className="text-[9px] opacity-75 truncate">Inventariado − Demanda</span>
            </div>

            {/* 5. DIVERGÊNCIA SAP */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between h-[82px] ${
                sapBalance === null
                  ? 'border-slate-200 bg-slate-50/60 text-slate-600'
                  : divergenciaSap === 0
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                    : 'border-amber-200 bg-amber-50/30 text-amber-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-tight block opacity-90">
                5. DIVERGÊNCIA SAP
              </span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-lg font-black font-mono">
                  {sapBalance === null
                    ? '—'
                    : divergenciaSap !== null && divergenciaSap > 0
                      ? `+${formatPtBrNumber(divergenciaSap)}`
                      : divergenciaSap !== null && divergenciaSap < 0
                        ? `−${formatPtBrNumber(Math.abs(divergenciaSap))}`
                        : '0'}
                </span>
                <span className="text-[10px] font-bold opacity-80">
                  {sapBalance !== null ? 'peças' : ''}
                </span>
              </div>
              <span className="text-[9px] opacity-75 truncate">
                {sapBalance !== null ? 'Inventariado − SAP' : 'Sem saldo SAP'}
              </span>
            </div>

            {/* 6. DIVERGÊNCIA % */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between h-[82px] ${
                divergenciaDemanda === 0
                  ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                  : 'border-amber-200 bg-amber-50/30 text-amber-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-tight block opacity-90">
                6. DIVERGÊNCIA %
              </span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-lg font-black font-mono">
                  {formatPtBrPct(divergenciaPct)}
                </span>
                <span className="text-[10px] font-bold opacity-80">ref. demanda</span>
              </div>
              <span className="text-[9px] opacity-75 truncate">((Inv − Dem)/Dem)%</span>
            </div>
          </div>

          {/* Área "Contagem Física" */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#004C97]" />
                  Contagem Física de Tarugos
                </h3>
                <p className="text-[11px] text-slate-500">
                  Lançamentos persistidos na demanda. Usuário e data/hora são gravados
                  automaticamente da sua sessão.
                </p>
              </div>

              {!showAddForm && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (isReadOnly) return
                    setShowAddForm(true)
                  }}
                  disabled={isReadOnly}
                  title={
                    isCancelled
                      ? 'Inventário cancelado. Novas contagens não são permitidas.'
                      : isConcluded
                        ? 'Inventário concluído. Novas contagens não são permitidas.'
                        : '+ Adicionar Contagem'
                  }
                  className="text-xs h-7 bg-[#004C97] hover:bg-[#003B75] text-white gap-1 font-bold disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />+ Adicionar Contagem
                </Button>
              )}
            </div>

            {/* Formulário Inline "+ Adicionar Contagem" */}
            {showAddForm && (
              <form
                onSubmit={handleAddEntry}
                className="bg-slate-50 p-3 rounded-lg border border-blue-200 space-y-3 animate-in fade-in-50"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-xs font-bold text-[#004C97]">Novo Lançamento Físico</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Usuário & Data/Hora: Automáticos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Corrida *</Label>
                    <Input
                      value={runNumber}
                      onChange={(e) => {
                        setRunNumber(e.target.value)
                        if (formErrors.runNumber) {
                          setFormErrors((prev) => ({ ...prev, runNumber: undefined }))
                        }
                      }}
                      placeholder="Ex.: 458921"
                      className={`text-xs h-8 font-mono mt-0.5 ${formErrors.runNumber ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                      disabled={savingEntry}
                      autoFocus
                    />
                    {formErrors.runNumber && (
                      <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                        {formErrors.runNumber}
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Localização WMS *
                    </Label>
                    <Input
                      value={locationWms}
                      onChange={(e) => {
                        setLocationWms(e.target.value)
                        if (formErrors.locationWms) {
                          setFormErrors((prev) => ({ ...prev, locationWms: undefined }))
                        }
                      }}
                      placeholder="Ex.: DP07-RUA02-BL04"
                      className={`text-xs h-8 mt-0.5 ${formErrors.locationWms ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                      disabled={savingEntry}
                    />
                    {formErrors.locationWms && (
                      <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                        {formErrors.locationWms}
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Nº de Peças *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={piecesCount}
                      onChange={(e) => {
                        setPiecesCount(e.target.value)
                        if (formErrors.piecesCount) {
                          setFormErrors((prev) => ({ ...prev, piecesCount: undefined }))
                        }
                      }}
                      placeholder="Ex.: 40"
                      className={`text-xs h-8 font-mono font-bold mt-0.5 ${formErrors.piecesCount ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                      disabled={savingEntry}
                    />
                    {formErrors.piecesCount && (
                      <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                        {formErrors.piecesCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    disabled={savingEntry}
                    className="text-xs h-7"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingEntry}
                    className="text-xs h-7 bg-[#004C97] hover:bg-[#003B75] text-white font-bold gap-1"
                  >
                    {savingEntry ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Salvar Contagem
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Tabela de Contagens */}
            <div className="rounded-lg border border-slate-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 text-[11px] font-bold">
                    <TableHead className="w-[120px]">Corrida</TableHead>
                    <TableHead className="w-[140px]">Bitola</TableHead>
                    <TableHead className="w-[160px]">Localização</TableHead>
                    <TableHead className="w-[110px] text-right">Nº de Peças</TableHead>
                    <TableHead className="w-[150px]">Usuário</TableHead>
                    <TableHead className="w-[130px]">Data/Hora</TableHead>
                    <TableHead className="w-[80px] text-center">Status</TableHead>
                    {!isReadOnly && <TableHead className="w-[40px] text-center"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={isReadOnly ? 7 : 8}
                        className="text-center py-6 text-xs text-slate-500"
                      >
                        Carregando lançamentos...
                      </TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isReadOnly ? 7 : 8}
                        className="text-center py-6 text-xs text-slate-400"
                      >
                        Nenhuma contagem física registrada ainda para esta demanda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id} className="text-xs hover:bg-slate-50/70">
                        <TableCell className="font-mono font-bold text-slate-800">
                          {entry.run_number}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {entry.gauge || 'Tarugo 130mm'}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700">
                          {entry.location_wms}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-[#004C97]">
                          {entry.pieces_count} pçs
                        </TableCell>
                        <TableCell
                          className="text-slate-600 truncate max-w-[150px]"
                          title={entry.user_name}
                        >
                          {entry.user_name}
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-[11px]">
                          {entry.entry_date_formatted}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Ativo
                          </Badge>
                        </TableCell>
                        {!isReadOnly && (
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={deletingId === entry.id}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Remover Contagem"
                            >
                              {deletingId === entry.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100 flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={savingPartial || concluding || cancelling}
                className="text-xs"
              >
                Fechar
              </Button>

              {!isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCancelReasonText('')
                    setShowCancelModal(true)
                  }}
                  disabled={savingPartial || concluding || cancelling}
                  className="text-xs font-semibold text-rose-700 hover:bg-rose-50 border-rose-200 gap-1"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Cancelar Inventário
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSavePartial}
                    disabled={savingPartial || concluding || cancelling}
                    className="text-xs font-semibold gap-1 text-slate-700 hover:bg-slate-100"
                  >
                    {savingPartial ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Salvando Parcial...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 text-blue-600" />
                        Salvar Parcial
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCheckConclusion}
                    disabled={savingPartial || concluding || cancelling}
                    className="text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {concluding ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Concluindo...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Concluir Inventário
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Requisito 5: Concluir Inventário — Confirmação com título 'Concluir inventário?', mensagem 'Após a conclusão não será possível adicionar ou alterar contagens físicas.', botões 'Voltar' e 'Concluir Inventário' */}
      <Dialog open={showConfirmConclusion} onOpenChange={setShowConfirmConclusion}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Concluir inventário?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 mt-1">
                  Após a conclusão não será possível adicionar ou alterar contagens físicas.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <span className="font-semibold text-slate-900 block">Resumo do Fechamento:</span>
            <div className="text-[11px] text-slate-700 space-y-0.5 pt-0.5">
              <div>
                Demanda: <strong>{demandaQtd} pçs</strong>
              </div>
              <div>
                Saldo SAP utilizado:{' '}
                <strong>{sapBalance !== null ? `${sapBalance} pçs` : 'Indisponível (—)'}</strong>
              </div>
              <div>
                Inventariado final: <strong>{inventariadoQtd} pçs</strong>
              </div>
              <div>
                Divergência demanda:{' '}
                <strong>
                  {divergenciaDemanda > 0 ? `+${divergenciaDemanda}` : divergenciaDemanda} pçs
                </strong>
              </div>
              <div>
                Divergência SAP:{' '}
                <strong>
                  {divergenciaSap !== null
                    ? `${divergenciaSap > 0 ? `+${divergenciaSap}` : divergenciaSap} pçs`
                    : '—'}
                </strong>
              </div>
              <div>
                Divergência %: <strong>{formatPtBrPct(divergenciaPct)}</strong>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmConclusion(false)}
              className="text-xs"
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={executeConclude}
              disabled={concluding}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {concluding ? 'Concluindo...' : 'Concluir Inventário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Requisito 6: Cancelar Inventário — Título 'Cancelar inventário?', linha 'Demanda: INV-AAAA-NNNNNN', mensagem 'O inventário será cancelado e não aceitará novas contagens. Esta ação ficará registrada no histórico.', campo OBRIGATÓRIO 'Motivo do cancelamento', botões 'Voltar' e 'Confirmar Cancelamento' */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Cancelar inventário?
                </DialogTitle>
                <div className="text-xs text-slate-700 mt-1">
                  Demanda:{' '}
                  <span className="font-mono font-bold text-slate-900">
                    {demand.control_number}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-600 mt-1">
                  O inventário será cancelado e não aceitará novas contagens. Esta ação ficará
                  registrada no histórico.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Motivo do cancelamento *
              </Label>
              <Input
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
                placeholder="Informe o motivo do cancelamento obrigatoriamente..."
                className="text-xs h-9 mt-1"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelling}
              className="text-xs"
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelling || !cancelReasonText.trim()}
              className="text-xs font-bold"
            >
              {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
