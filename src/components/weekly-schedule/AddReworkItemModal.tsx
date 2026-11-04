import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Boxes,
  Loader2,
  Layers,
  MapPin,
  Building,
  Info,
} from 'lucide-react'
import {
  PcpReworkService,
  ReworkStockItem,
  ReworkChangeReason,
  ReworkOperation,
  ReworkStockOrigin,
} from '../../services/pcp-rework-service'
import { ReworkSummaryCard } from './ReworkSummaryCard'
import { LocalErrorBoundary } from '../common/LocalErrorBoundary'

export interface SelectedLotReworkConfig {
  item: ReworkStockItem
  rework_quantity: number
  rework_reason_code: string
  rework_reason: string
  rework_operation: string
  rework_notes: string
  error?: string
}

export interface AddReworkItemModalProps {
  open: boolean
  onClose: () => void
  onAddReworkItems: (configuredLots: SelectedLotReworkConfig[]) => Promise<void> | void
  companyCode?: string
  plantCode?: string
  lineCode?: string
  lineName?: string
  targetDayKey?: string
  targetShiftCode?: string
}

export function AddReworkItemModal({
  open,
  onClose,
  onAddReworkItems,
  companyCode = '1000',
  plantCode = '1010',
  lineCode = 'RETRAB-01',
  lineName = 'Centro de Retrabalho',
}: AddReworkItemModalProps) {
  // Filtros Etapa 1
  const [stockOriginType, setStockOriginType] = useState<'TODOS' | 'SEMIACABADO' | 'ACABADO'>(
    'TODOS',
  )
  const [materialQuery, setMaterialQuery] = useState('')
  const [lotQuery, setLotQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')

  // Estado da Busca
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [stockResults, setStockResults] = useState<ReworkStockItem[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)

  // Seleção múltipla de lotes
  const [selectedLots, setSelectedLots] = useState<Record<string, SelectedLotReworkConfig>>({})

  // Motivos corporativos e Operações homologadas
  const [reworkReasons, setReworkReasons] = useState<ReworkChangeReason[]>([])
  const [reworkOperations, setReworkOperations] = useState<ReworkOperation[]>([])

  // Estado de confirmação / backend
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Diálogo de cancelamento com dados preenchidos
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Carregar motivos e operações ao abrir o modal
  useEffect(() => {
    if (!open) {
      // Resetar estados
      setSelectedLots({})
      setValidationError(null)
      setSuccessMessage(null)
      setShowCancelConfirm(false)
      return
    }

    async function loadAuxiliaryData() {
      try {
        const [reasons, operations] = await Promise.all([
          PcpReworkService.getReworkReasons(),
          PcpReworkService.getReworkOperationsForCenter(lineCode),
        ])
        setReworkReasons(reasons)
        setReworkOperations(operations)
      } catch (err) {
        console.error('[AddReworkItemModal] Erro ao carregar dados auxiliares:', err)
      }
    }

    loadAuxiliaryData()
    handleSearchStock()
  }, [open, lineCode])

  // Busca de estoque com filtros
  const handleSearchStock = async () => {
    setIsLoadingStock(true)
    setSearchError(null)
    try {
      const items = await PcpReworkService.searchStockForRework({
        stockOriginType,
        materialQuery,
        lotNumber: lotQuery,
        location: locationQuery,
        companyCode,
        plantCode,
      })
      setStockResults(items)
    } catch (err: any) {
      console.error('[AddReworkItemModal] Erro na busca de estoque:', err)
      setSearchError('Não foi possível carregar os itens de estoque. Tente novamente.')
    } finally {
      setIsLoadingStock(false)
    }
  }

  // Alternar seleção de lote
  const handleToggleLot = (item: ReworkStockItem) => {
    setSelectedLots((prev) => {
      const next = { ...prev }
      if (next[item.id]) {
        delete next[item.id]
      } else {
        // Inicializar com a quantidade total disponível, primeiro motivo e primeira operação
        const defaultReason = reworkReasons[0]?.name || 'Desvio dimensional / Bitola fora do padrão'
        const defaultReasonCode = reworkReasons[0]?.code || 'RET-01'
        const defaultOp = reworkOperations[0]?.name || 'Endireitamento Mecânico'
        next[item.id] = {
          item,
          rework_quantity: item.available_quantity,
          rework_reason_code: defaultReasonCode,
          rework_reason: defaultReason,
          rework_operation: defaultOp,
          rework_notes: '',
        }
      }
      return next
    })
  }

  // Atualizar configuração do lote
  const handleUpdateLotConfig = (
    itemId: string,
    field: keyof SelectedLotReworkConfig,
    value: any,
  ) => {
    setSelectedLots((prev) => {
      const current = prev[itemId]
      if (!current) return prev

      const updated = { ...current, [field]: value }

      // Validação imediata de quantidade x disponível
      if (field === 'rework_quantity') {
        const numVal = Number(value)
        if (numVal > current.item.available_quantity) {
          updated.error =
            'A quantidade informada para retrabalho é superior ao estoque disponível deste lote.'
        } else if (numVal <= 0) {
          updated.error = 'A quantidade para retrabalho deve ser maior que zero.'
        } else {
          delete updated.error
        }
      }

      return { ...prev, [itemId]: updated }
    })
  }

  // Lista de lotes selecionados em array
  const selectedList = useMemo(() => Object.values(selectedLots), [selectedLots])

  // Validação global antes do submit
  const isFormValid = useMemo(() => {
    if (selectedList.length === 0) return false
    for (const lot of selectedList) {
      if (lot.error) return false
      if (!lot.rework_quantity || lot.rework_quantity <= 0) return false
      if (lot.rework_quantity > lot.item.available_quantity) return false
      if (!lot.rework_reason || !lot.rework_reason.trim()) return false
      if (!lot.rework_operation || !lot.rework_operation.trim()) return false
      if (!lot.item.storage_location || !lot.item.storage_location.trim()) return false
    }
    return true
  }, [selectedList])

  // Verificação de dados preenchidos para confirmação de cancelamento
  const hasUnsavedChanges = useMemo(() => {
    return selectedList.length > 0
  }, [selectedList])

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true)
    } else {
      onClose()
    }
  }

  // Submissão com revalidação de backend
  const handleSubmit = async () => {
    if (!isFormValid || selectedList.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    setValidationError(null)
    setSuccessMessage(null)

    try {
      // 1. Revalidar estoque em tempo real no backend (Requisito 15)
      const payload = {
        rework_center_code: lineCode,
        items: selectedList.map((cfg) => ({
          material_code: cfg.item.material_code,
          material_description: cfg.item.material_description,
          lot_number: cfg.item.lot_number,
          heat_number: cfg.item.heat_number,
          stock_origin_type: cfg.item.stock_origin_type,
          storage_deposit: cfg.item.storage_deposit,
          storage_location: cfg.item.storage_location,
          available_quantity: cfg.item.available_quantity,
          rework_quantity: cfg.rework_quantity,
          unit: cfg.item.unit,
          rework_reason_code: cfg.rework_reason_code,
          rework_reason: cfg.rework_reason,
          rework_notes: cfg.rework_notes,
          rework_operation: cfg.rework_operation,
          stock_reference_id: cfg.item.id,
        })),
      }

      await PcpReworkService.validateStockBeforeAdding(payload)

      // 2. Persistir rastreabilidade no banco em pcp_rework_items (Requisito 14)
      await PcpReworkService.persistReworkAuditRecords({
        companyCode,
        plantCode,
        reworkCenterCode: lineCode,
        items: payload.items,
      })

      // 3. Notificar pai e fechar
      await onAddReworkItems(selectedList)

      const successTxt =
        selectedList.length === 1
          ? `Lote ${selectedList[0].item.lot_number} adicionado à programação de Retrabalho com sucesso.`
          : `${selectedList.length} lotes adicionados à programação de Retrabalho com sucesso.`

      setSuccessMessage(successTxt)
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      console.error('[AddReworkItemModal] Erro ao submeter retrabalho:', err)
      setValidationError(
        err?.message || 'Falha ao revalidar estoque ou adicionar lote. Verifique as quantidades.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <LocalErrorBoundary>
      <Dialog open={open} onOpenChange={(o) => (!o ? handleRequestClose() : null)}>
        <DialogContent className="w-[95vw] max-w-[1380px] h-[92vh] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 text-slate-900 border-slate-300">
          {/* CABEÇALHO FIXO */}
          <DialogHeader className="p-4 bg-white border-b border-slate-200 shrink-0 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-amber-500 text-white">
                  <RotateCcw className="w-5 h-5" />
                </span>
                <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">
                  Adicionar Item para Retrabalho
                </DialogTitle>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  Modo Retrabalho Exclusivo
                </span>
              </div>
              <DialogDescription className="text-xs text-slate-600">
                Selecione um material/lote existente em estoque para inclusão na programação de
                retrabalho.
              </DialogDescription>
            </div>

            {/* Informações de Contexto Auto da Linha / Empresa (Não editáveis) */}
            <div className="flex items-center gap-3 text-xs bg-slate-100 px-3 py-1.5 rounded border border-slate-200">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Empresa:</span>
                <span className="font-bold text-slate-800">{companyCode}</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Centro/Linha Retrabalho:</span>
                <span className="font-bold text-slate-800">
                  {lineCode} — {lineName}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* CORPO DO MODAL - ROLAGEM INTERNA */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* ETAPA 1: FILTROS E SELEÇÃO DE ESTOQUE */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">
                    Selecionar material/lote em estoque
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  Exibe somente estoque físico disponível (Semiacabados e Acabados)
                </span>
              </div>

              {/* BARRA DE FILTROS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Tipo de estoque*</Label>
                  <Select
                    value={stockOriginType}
                    onValueChange={(val: any) => setStockOriginType(val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos (Semiacabado e Acabado)</SelectItem>
                      <SelectItem value="SEMIACABADO">Semiacabado</SelectItem>
                      <SelectItem value="ACABADO">Acabado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Material (Código, Bitola, Aço)
                  </Label>
                  <Input
                    type="text"
                    placeholder="Ex.: 1045, Barra, Cantoneira..."
                    value={materialQuery}
                    onChange={(e) => setMaterialQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchStock()}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Lote</Label>
                  <Input
                    type="text"
                    placeholder="Nº do lote..."
                    value={lotQuery}
                    onChange={(e) => setLotQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchStock()}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Localização</Label>
                  <Input
                    type="text"
                    placeholder="Depósito / Baia / Box..."
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchStock()}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    onClick={handleSearchStock}
                    disabled={isLoadingStock}
                    className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white flex-1 flex items-center justify-center gap-1.5"
                  >
                    {isLoadingStock ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    Filtrar Estoque
                  </Button>
                </div>
              </div>

              {/* MENSAGEM DE ERRO NA BUSCA */}
              {searchError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
                  <span>{searchError}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSearchStock}
                    className="h-6 text-[10px]"
                  >
                    Tentar novamente
                  </Button>
                </div>
              )}

              {/* TABELA DE ESTOQUE DISPONÍVEL COM ROLAGEM PRÓPRIA */}
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <div className="max-h-[260px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">Sel.</th>
                        <th className="py-2 px-2.5">Tipo Estoque</th>
                        <th className="py-2 px-2.5">Material SAP</th>
                        <th className="py-2 px-2.5">Descrição</th>
                        <th className="py-2 px-2.5">Lote</th>
                        <th className="py-2 px-2.5">Corrida</th>
                        <th className="py-2 px-2.5 text-right">Qtd Disponível</th>
                        <th className="py-2 px-2.5 text-center">Un</th>
                        <th className="py-2 px-2.5">Depósito</th>
                        <th className="py-2 px-2.5">Localização*</th>
                        <th className="py-2 px-2.5">Status</th>
                        <th className="py-2 px-2.5">Qualidade/Bloqueio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingStock ? (
                        <tr>
                          <td colSpan={12} className="py-8 text-center text-slate-500">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-[#004C97]" />
                            <span>Consultando estoque físico disponível...</span>
                          </td>
                        </tr>
                      ) : stockResults.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-8 text-center text-slate-400">
                            <Boxes className="w-8 h-8 mx-auto mb-1 opacity-40" />
                            <span>Nenhum material/lote encontrado com os filtros aplicados.</span>
                          </td>
                        </tr>
                      ) : (
                        stockResults.map((item) => {
                          const isSelected = Boolean(selectedLots[item.id])
                          return (
                            <tr
                              key={item.id}
                              onClick={() => handleToggleLot(item)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td
                                className="py-2 px-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleLot(item)}
                                  aria-label={`Selecionar lote ${item.lot_number}`}
                                />
                              </td>
                              <td className="py-2 px-2.5">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    item.stock_origin_type === 'SEMIACABADO'
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {item.stock_origin_type}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 font-mono font-bold text-slate-800">
                                {item.material_code}
                              </td>
                              <td
                                className="py-2 px-2.5 text-slate-700 max-w-[200px] truncate"
                                title={item.material_description}
                              >
                                {item.material_description}
                              </td>
                              <td className="py-2 px-2.5 font-mono font-bold text-slate-900">
                                {item.lot_number}
                              </td>
                              <td className="py-2 px-2.5 font-mono text-slate-600">
                                {item.heat_number || '—'}
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900">
                                {item.available_quantity.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3,
                                })}
                              </td>
                              <td className="py-2 px-2.5 text-center font-mono text-slate-500">
                                {item.unit}
                              </td>
                              <td className="py-2 px-2.5 text-slate-700 font-mono">
                                {item.storage_deposit}
                              </td>
                              <td className="py-2 px-2.5 font-mono font-bold text-slate-900 bg-slate-50">
                                {item.storage_location}
                              </td>
                              <td className="py-2 px-2.5">
                                <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium">
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-[11px] text-slate-600">
                                {item.quality_block_status || 'Livre Utilização'}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>
                  {stockResults.length} lote(s) disponível(is) para seleção.{' '}
                  <strong>{selectedList.length}</strong> selecionado(s).
                </span>
                <span className="text-[11px] text-amber-700 font-medium">
                  Múltiplos lotes permitidos com rastreabilidade individual (sem consolidação).
                </span>
              </div>
            </div>

            {/* ETAPA 2: DADOS DO RETRABALHO (POR LOTE SELECIONADO) */}
            {selectedList.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">
                      Dados do Retrabalho (Parametrização por Lote)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    Defina a quantidade a retrabalhar, motivo corporativo e a operação do centro
                  </span>
                </div>

                <div className="space-y-4 divide-y divide-slate-100">
                  {selectedList.map((cfg) => {
                    const item = cfg.item
                    return (
                      <div key={item.id} className="pt-3 first:pt-0 space-y-3">
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              Lote: {item.lot_number}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-semibold text-xs text-slate-800">
                              {item.material_code} — {item.material_description}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-500">
                              Origem: <strong>{item.stock_origin_type}</strong>
                            </span>
                            <span className="text-slate-500">
                              Disp.:{' '}
                              <strong className="text-slate-800 font-mono">
                                {item.available_quantity.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3,
                                })}{' '}
                                {item.unit}
                              </strong>
                            </span>
                            <span className="text-slate-500">
                              Depósito:{' '}
                              <strong className="text-slate-800 font-mono">
                                {item.storage_deposit}
                              </strong>
                            </span>
                            <span className="text-slate-500">
                              Localização:{' '}
                              <strong className="text-slate-900 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {item.storage_location}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* CAMPOS EDITÁVEIS DA ETAPA 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Quantidade a retrabalhar */}
                          <div>
                            <Label className="text-[11px] font-bold text-slate-700">
                              Quantidade a retrabalhar ({item.unit})*
                            </Label>
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max={item.available_quantity}
                              value={cfg.rework_quantity}
                              onChange={(e) =>
                                handleUpdateLotConfig(
                                  item.id,
                                  'rework_quantity',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className={`h-8 text-xs font-mono font-bold bg-white ${
                                cfg.error ? 'border-red-500 bg-red-50 text-red-900' : ''
                              }`}
                            />
                            {cfg.error ? (
                              <p className="text-[10px] text-red-600 mt-1 font-semibold">
                                {cfg.error}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Máximo disponível: {item.available_quantity.toLocaleString('pt-BR')}{' '}
                                {item.unit}
                              </p>
                            )}
                          </div>

                          {/* Motivo do Retrabalho */}
                          <div>
                            <Label className="text-[11px] font-bold text-slate-700">
                              Motivo do Retrabalho*
                            </Label>
                            <Select
                              value={cfg.rework_reason_code}
                              onValueChange={(val) => {
                                const matched = reworkReasons.find((r) => r.code === val)
                                handleUpdateLotConfig(item.id, 'rework_reason_code', val)
                                handleUpdateLotConfig(
                                  item.id,
                                  'rework_reason',
                                  matched?.name || val,
                                )
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue placeholder="Selecione o motivo..." />
                              </SelectTrigger>
                              <SelectContent>
                                {reworkReasons.map((reason) => (
                                  <SelectItem key={reason.id || reason.code} value={reason.code}>
                                    [{reason.code}] {reason.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Operação / Processo de Retrabalho */}
                          <div>
                            <Label className="text-[11px] font-bold text-slate-700">
                              Operação / Processo de Retrabalho*
                            </Label>
                            <Select
                              value={cfg.rework_operation}
                              onValueChange={(val) =>
                                handleUpdateLotConfig(item.id, 'rework_operation', val)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue placeholder="Selecione a operação..." />
                              </SelectTrigger>
                              <SelectContent>
                                {reworkOperations.map((op) => (
                                  <SelectItem key={op.id || op.code} value={op.name}>
                                    {op.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Campo Livre Observação do Retrabalho */}
                        <div>
                          <Label className="text-[11px] font-bold text-slate-700">
                            Observação do Retrabalho (Campo Livre)
                          </Label>
                          <Input
                            type="text"
                            placeholder="Ex.: Material apresentou desvio dimensional identificado após acabamento. Necessário retornar para operação de endireitamento."
                            value={cfg.rework_notes}
                            onChange={(e) =>
                              handleUpdateLotConfig(item.id, 'rework_notes', e.target.value)
                            }
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ETAPA 3 / REQUISITO 11: RESUMO DO RETRABALHO ANTES DE ADICIONAR */}
            {selectedList.length > 0 && (
              <ReworkSummaryCard
                data={{
                  items: selectedList.map((cfg) => ({
                    material_code: cfg.item.material_code,
                    material_description: cfg.item.material_description,
                    lot_number: cfg.item.lot_number,
                    heat_number: cfg.item.heat_number,
                    stock_origin_type: cfg.item.stock_origin_type,
                    storage_deposit: cfg.item.storage_deposit,
                    storage_location: cfg.item.storage_location,
                    available_quantity: cfg.item.available_quantity,
                    rework_quantity: cfg.rework_quantity,
                    unit: cfg.item.unit,
                    rework_reason: cfg.rework_reason,
                    rework_operation: cfg.rework_operation,
                    rework_notes: cfg.rework_notes,
                  })),
                  reworkCenterCode: `${lineCode} — ${lineName}`,
                }}
              />
            )}

            {/* FEEDBACK DE VALIDAÇÃO / SUCESSO */}
            {validationError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-300 text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block">Atenção ao incluir retrabalho:</strong>
                  <span>{validationError}</span>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* RODAPÉ FIXO */}
          <DialogFooter className="p-3 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {selectedList.length === 0
                  ? 'Selecione pelo menos 1 lote na tabela acima para prosseguir.'
                  : `${selectedList.length} lote(s) pronto(s) para inclusão na grade.`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRequestClose}
                disabled={isSubmitting}
                className="h-9 px-4 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!isFormValid || selectedList.length === 0 || isSubmitting}
                className="h-9 px-5 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white flex items-center gap-2 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Revalidando Estoque...</span>
                  </>
                ) : (
                  <>
                    <span>+ Adicionar à Programação</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE CANCELAMENTO SE HOUVER DADOS PREENCHIDOS */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Confirmar cancelamento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1">
              Existem informações não salvas. Deseja realmente cancelar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCancelConfirm(false)}
              className="text-xs"
            >
              Continuar editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowCancelConfirm(false)
                onClose()
              }}
              className="text-xs font-bold"
            >
              Sim, descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LocalErrorBoundary>
  )
}
