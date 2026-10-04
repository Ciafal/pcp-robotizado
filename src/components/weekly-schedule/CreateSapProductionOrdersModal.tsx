import React, { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  Info,
} from 'lucide-react'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import {
  sapProductionOrderService,
  SapProdOrdItemResult,
} from '@/services/sap-production-order-service'
import { weeklyScheduleService } from '@/services/weekly-schedule-service'
import { useToast } from '@/hooks/use-toast'

interface CreateSapProductionOrdersModalProps {
  isOpen: boolean
  onClose: () => void
  items: WeeklyScheduleItem[]
  lineCode: string
  companyCode: string
  scheduleCode: string
  onOrdersCreated: (updatedItems: WeeklyScheduleItem[]) => void
}

export const CreateSapProductionOrdersModal: React.FC<CreateSapProductionOrdersModalProps> = ({
  isOpen,
  onClose,
  items,
  lineCode,
  companyCode,
  scheduleCode,
  onOrdersCreated,
}) => {
  const { toast } = useToast()

  // Filtra apenas itens de produção (ignora paradas planejadas)
  const productionItems = useMemo(() => {
    return (items || []).filter((it) => it.item_type !== 'SCHEDULED_STOP')
  }, [items])

  // IDs selecionados (checkboxes)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Estado de confirmação pré-transmissão
  const [isConfirming, setIsConfirming] = useState<boolean>(false)
  // Estado de carregamento / envio
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false)
  // Resultados da última transmissão
  const [lastResults, setLastResults] = useState<SapProdOrdItemResult[] | null>(null)
  // Mensagem global de status / erro
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Ao abrir o modal, pré-seleciona todos os itens que ainda NÃO possuem Ordem SAP (idempotência)
  useEffect(() => {
    if (isOpen) {
      const pendingIds = productionItems.filter((it) => !it.production_order).map((it) => it.id)
      setSelectedIds(pendingIds)
      setLastResults(null)
      setIsConfirming(false)
      setGlobalError(null)
    }
  }, [isOpen, productionItems])

  // Map de resultados por ID
  const resultsByItemId = useMemo(() => {
    const map = new Map<string, SapProdOrdItemResult>()
    if (lastResults) {
      lastResults.forEach((r) => {
        if (r.schedule_item_id) map.set(r.schedule_item_id, r)
        map.set(`mat:${r.material_code}:${r.sequence_order}`, r)
      })
    }
    return map
  }, [lastResults])

  // Selecionar todos / Desmarcar todos (apenas entre os selecionáveis ou todos)
  const isAllSelected = useMemo(() => {
    if (productionItems.length === 0) return false
    return selectedIds.length === productionItems.length
  }, [productionItems, selectedIds])

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(productionItems.map((it) => it.id))
    }
  }

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  // Itens efetivamente selecionados
  const selectedItems = useMemo(() => {
    return productionItems.filter((it) => selectedIds.includes(it.id))
  }, [productionItems, selectedIds])

  // Executa transmissão ao SAP
  const handleExecuteTransmission = async () => {
    if (selectedItems.length === 0) return

    setIsConfirming(false)
    setIsTransmitting(true)
    setGlobalError(null)

    try {
      const payloads = selectedItems.map((it) =>
        sapProductionOrderService.mapScheduleItemToSapPayload(it, companyCode || '1001', lineCode),
      )

      const response = await sapProductionOrderService.createProductionOrders({
        items: payloads,
        scheduleCode,
        companyCode,
        lineCode,
      })

      setLastResults(response.results)

      // Atualiza lista em memória se ordens foram criadas
      if (response.summary && response.summary.created > 0) {
        const updatedList = await sapProductionOrderService.applySapResultsToScheduleItems(
          items,
          response.results,
        )
        onOrdersCreated(updatedList)

        // Persiste imediatamente na coleção weekly_schedules
        try {
          await weeklyScheduleService.saveWeeklyScheduleItems(updatedList, {
            companyCode,
            plantCode: companyCode,
            lineCode,
            year: updatedList[0]?.year || new Date().getFullYear(),
            weekNumber: updatedList[0]?.week_number || 1,
            periodDisplay: updatedList[0]?.period_display || '',
          })
        } catch (saveErr) {
          console.warn('Erro ao persistir ordens criadas no banco:', saveErr)
        }

        toast({
          title: 'Ordens Criadas no SAP com Sucesso',
          description: `${response.summary.created} ordem(ns) de produção gerada(s) no SAP ECC.`,
        })
      }

      if (response.code === 'SAP_ENDPOINT_NOT_CONFIGURED') {
        setGlobalError('Endpoint SAP não configurado — provisionamento pendente')
        toast({
          variant: 'destructive',
          title: 'Integração SAP Indisponível',
          description: 'Endpoint SAP não configurado — provisionamento pendente',
        })
      } else if (response.summary && response.summary.failed > 0) {
        const msg = `${response.summary.created} ordens criadas, ${response.summary.failed} com erro.`
        toast({
          variant: 'destructive',
          title: 'Criação de Ordens Parcial',
          description: msg,
        })
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        'Não foi possível estabelecer comunicação com o SAP. Nenhuma Ordem de Produção foi criada. Tente novamente posteriormente.'
      setGlobalError(msg)
      toast({
        variant: 'destructive',
        title: 'Falha na Comunicação SAP',
        description: msg,
      })
    } finally {
      setIsTransmitting(false)
    }
  }

  // Formatação pt-BR de números com vírgula decimal
  const formatNumberPtBr = (value: number | undefined): string => {
    if (value === undefined || value === null) return '0,00'
    return Number(value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isTransmitting && onClose()}>
        <DialogContent className="max-w-5xl w-full max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900 shadow-2xl">
          {/* Header Institucional (#004C97) */}
          <DialogHeader className="p-5 bg-[#004C97] text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/20">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    Criar Ordens de Produção no SAP
                  </DialogTitle>
                  <DialogDescription className="text-xs text-blue-100/90 mt-0.5">
                    Transmissão RFC/BAPI (BAPI_PRODORD_CREATE) a partir da Montagem Programação do
                    PCP Robotizado.
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-none font-mono text-xs">
                  {lineCode || 'Linha'} • {companyCode || 'CIAFAL'}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Banner de Aviso de Risco/Erro Global */}
          {globalError && (
            <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{globalError}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExecuteTransmission()}
                disabled={isTransmitting || selectedItems.length === 0}
                className="h-6 px-2 text-[11px] border-rose-300 text-rose-800 hover:bg-rose-100"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Tentar novamente
              </Button>
            </div>
          )}

          {/* Resumo da Seleção e Ações de Tabela */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Itens Programados Carregados:</span>
              <Badge className="bg-slate-200 text-slate-800 font-mono font-bold">
                {productionItems.length} produto(s)
              </Badge>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">
                Selecionados:{' '}
                <strong className="text-[#004C97] font-mono">{selectedItems.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  disabled={isTransmitting || productionItems.length === 0}
                  className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                />
                <span>Selecionar todos</span>
              </label>
            </div>
          </div>

          {/* Tabela Responsiva de Produtos */}
          <div className="flex-1 overflow-y-auto overflow-x-auto p-4 min-h-[260px]">
            {productionItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-medium">
                  Nenhum produto programado encontrado para esta programação.
                </p>
                <p className="text-xs text-slate-400">
                  Adicione produtos à grade operacional antes de transmitir ao SAP.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border border-slate-200 rounded-md">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Sel.</th>
                    <th className="p-2.5 w-12 text-center">Seq.</th>
                    <th className="p-2.5 w-16">Centro</th>
                    <th className="p-2.5 w-24">Data Prev.</th>
                    <th className="p-2.5 w-28">Material SAP</th>
                    <th className="p-2.5 min-w-[160px]">Descrição</th>
                    <th className="p-2.5 w-24 text-right">Qtd</th>
                    <th className="p-2.5 w-14 text-center">UM</th>
                    <th className="p-2.5 w-28">Ordem SAP</th>
                    <th className="p-2.5 w-36">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productionItems.map((it) => {
                    const isSelected = selectedIds.includes(it.id)
                    const hasOrder = Boolean(it.production_order)
                    const result =
                      resultsByItemId.get(it.id) ||
                      resultsByItemId.get(`mat:${it.material_code}:${it.sequence_order}`)
                    const isResultSuccess = result?.status === 'SUCCESS'
                    const isResultError = result?.status === 'ERROR'
                    const isResultAlready = result?.status === 'ALREADY_CREATED'

                    return (
                      <tr
                        key={it.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {/* 1. Selecionar */}
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleItem(it.id)}
                            disabled={isTransmitting}
                            className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                          />
                        </td>

                        {/* 2. Sequência */}
                        <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                          #{it.sequence_order}
                        </td>

                        {/* 3. Centro */}
                        <td className="p-2.5 font-mono text-slate-600">
                          {it.line_code || lineCode || 'L1'}
                        </td>

                        {/* 4. Data Programada */}
                        <td className="p-2.5 font-mono text-slate-600">
                          {it.date_str || it.day_of_week}
                        </td>

                        {/* 5. Material SAP */}
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          {it.material_code}
                        </td>

                        {/* 6. Descrição */}
                        <td
                          className="p-2.5 text-slate-700 truncate max-w-[220px]"
                          title={it.material_description}
                        >
                          {it.material_description || '—'}
                        </td>

                        {/* 7. Quantidade */}
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatNumberPtBr(it.planned_quantity_tons)}
                        </td>

                        {/* 8. UM */}
                        <td className="p-2.5 text-center font-mono text-slate-500">t</td>

                        {/* 9. Ordem SAP */}
                        <td className="p-2.5 font-mono font-bold">
                          {it.production_order ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {it.production_order}
                            </span>
                          ) : result?.order_number ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {result.order_number}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">—</span>
                          )}
                        </td>

                        {/* 10. Status */}
                        <td className="p-2.5">
                          {hasOrder || isResultAlready ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold text-[10px]">
                              Ordem já criada
                            </Badge>
                          ) : isResultSuccess ? (
                            <Badge className="bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Criada no SAP
                            </Badge>
                          ) : isResultError ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold text-[10px] flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Erro no SAP
                              </Badge>
                              {result?.error_message && (
                                <p
                                  className="text-[10px] text-rose-700 leading-tight max-w-[180px] truncate"
                                  title={result.error_message}
                                >
                                  {result.error_message}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-medium text-[10px]">
                              Pendente
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer com Ações */}
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Validações de cadastro e parâmetros obrigatórios serão executadas antes da geração
                da ordem.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isTransmitting}
                className="h-8 px-3 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => setIsConfirming(true)}
                disabled={isTransmitting || selectedItems.length === 0}
                className="h-8 px-4 text-xs font-bold bg-[#004C97] hover:bg-[#003d7a] text-white shadow-xs"
              >
                {isTransmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Transmitindo ao SAP...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Criar Ordens no SAP ({selectedItems.length})
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação Pré-Transmissão */}
      <Dialog open={isConfirming} onOpenChange={(open) => !open && setIsConfirming(false)}>
        <DialogContent className="max-w-md bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-blue-100 text-[#004C97] flex items-center justify-center mb-2">
              <Send className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirmar Criação no SAP ECC
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1 leading-relaxed">
              Você selecionou{' '}
              <strong className="text-slate-900">{selectedItems.length} produto(s)</strong> para
              criação de Ordem de Produção no SAP. Deseja continuar?
              <span className="block mt-1 font-semibold text-amber-700">
                Esta operação irá gerar documentos reais no SAP.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirming(false)}
              className="h-8 px-3 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteTransmission}
              className="h-8 px-4 text-xs font-bold bg-[#004C97] hover:bg-[#003d7a] text-white"
            >
              Confirmar criação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
