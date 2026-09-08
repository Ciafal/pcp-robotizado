import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Edit2,
  Filter,
  Layers,
  Loader2,
  Plus,
  PowerOff,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { MaterialSelector, MaterialOption } from '@/components/common/MaterialSelector'
import { lineMasterService } from '@/services/line-master'
import {
  LineAdjustmentTimeRule,
  LineSetupMatrix,
  SAMPLE_TYPE_LABELS,
  SampleType,
} from '@/types/line-master'

export interface SetupAcertoMatrixPanelProps {
  lineId: string
  lineCode?: string
  lineName?: string
  initialTab?: 'SETUP' | 'ACERTO'
  onRefresh?: () => void
  onOpenLineMaster?: () => void
}

export const SetupAcertoMatrixPanel: React.FC<SetupAcertoMatrixPanelProps> = ({
  lineId,
  lineCode,
  lineName,
  initialTab = 'ACERTO',
  onRefresh,
  onOpenLineMaster,
}) => {
  const [activeTab, setActiveTab] = useState<'SETUP' | 'ACERTO'>(initialTab)
  const [loading, setLoading] = useState(false)
  const [setupList, setSetupList] = useState<LineSetupMatrix[]>([])
  const [acertoList, setAcertoList] = useState<LineAdjustmentTimeRule[]>([])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  // Modais de Setup
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false)
  const [savingSetup, setSavingSetup] = useState(false)
  const [setupModalError, setSetupModalError] = useState<string | null>(null)
  const [editingSetupId, setEditingSetupId] = useState<string | null>(null)
  const [setupForm, setSetupForm] = useState({
    fromProductCode: '',
    fromProductDescription: '',
    toProductCode: '',
    toProductDescription: '',
    durationMinutes: '' as number | string,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: '',
    setupCategory: 'DIMENSION_CHANGE',
  })

  // Modal de Encerramento/Edição de Vigência de Setup
  const [closingSetupItem, setClosingSetupItem] = useState<LineSetupMatrix | null>(null)
  const [closeSetupDate, setCloseSetupDate] = useState(new Date().toISOString().slice(0, 10))

  // Modais de Acerto
  const [isAcertoModalOpen, setIsAcertoModalOpen] = useState(false)
  const [savingAcerto, setSavingAcerto] = useState(false)
  const [acertoModalError, setAcertoModalError] = useState<string | null>(null)
  const [editingAcertoId, setEditingAcertoId] = useState<string | null>(null)
  const [acertoStatusConfirm, setAcertoStatusConfirm] = useState<{
    item: LineAdjustmentTimeRule
    action: 'INATIVAR' | 'ATIVAR'
  } | null>(null)
  const [acertoForm, setAcertoForm] = useState({
    materialCode: '',
    materialDescription: '',
    sampleType: 'PEQUENA' as SampleType,
    durationMinutes: '' as number | string,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: '',
    active: true,
  })

  // Sincroniza initialTab se mudar externamente
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Modal de Encerramento de Acerto
  const [closingAcertoItem, setClosingAcertoItem] = useState<LineAdjustmentTimeRule | null>(null)
  const [closeAcertoDate, setCloseAcertoDate] = useState(new Date().toISOString().slice(0, 10))

  // Filtros de tabela
  const [setupFilterText, setSetupFilterText] = useState('')
  const [acertoFilterText, setAcertoFilterText] = useState('')

  // Carregamento inicial de dados
  const loadData = async () => {
    if (!lineId) return
    setLoading(true)
    try {
      const [setups, acertos] = await Promise.all([
        lineMasterService.listSetupMatrix(lineId),
        lineMasterService.listAdjustmentRules(lineId),
      ])
      setSetupList(setups)
      setAcertoList(acertos)
    } catch (err: any) {
      console.error('Erro ao carregar matrizes:', err)
      setFeedback({
        type: 'error',
        message: 'Não foi possível carregar as matrizes de setup e acerto.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [lineId])

  // Limpa feedback após 5 segundos
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000)
      return () => clearTimeout(t)
    }
  }, [feedback])

  // ==========================================
  // HANDLERS: MATRIZ DE SETUP
  // ==========================================
  const handleOpenNewSetupModal = () => {
    setEditingSetupId(null)
    setSetupForm({
      fromProductCode: '',
      fromProductDescription: '',
      toProductCode: '',
      toProductDescription: '',
      durationMinutes: '',
      validFrom: new Date().toISOString().slice(0, 10),
      validUntil: '',
      setupCategory: 'DIMENSION_CHANGE',
    })
    setSetupModalError(null)
    setIsSetupModalOpen(true)
  }

  const handleOpenEditSetupModal = (item: LineSetupMatrix) => {
    setEditingSetupId(item.id)
    setSetupForm({
      fromProductCode: item.from_product_code || '',
      fromProductDescription: '',
      toProductCode: item.to_product_code || '',
      toProductDescription: '',
      durationMinutes: item.setup_duration_minutes,
      validFrom: item.valid_from
        ? item.valid_from.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      validUntil: item.valid_until ? item.valid_until.slice(0, 10) : '',
      setupCategory: (item.setup_category as any) || 'DIMENSION_CHANGE',
    })
    setSetupModalError(null)
    setIsSetupModalOpen(true)
  }

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSetupModalError(null)

    // Validações no cliente
    if (!setupForm.fromProductCode || !setupForm.toProductCode) {
      setSetupModalError('Selecione o material de origem e o material de destino.')
      return
    }

    if (
      setupForm.fromProductCode.trim().toUpperCase() ===
      setupForm.toProductCode.trim().toUpperCase()
    ) {
      setSetupModalError('Material de origem e material de destino devem ser diferentes.')
      return
    }

    const durationNum = Number(setupForm.durationMinutes)
    if (!setupForm.durationMinutes || isNaN(durationNum) || durationNum <= 0) {
      setSetupModalError('A duração padrão deve ser maior que 0 minutos.')
      return
    }

    if (!setupForm.validFrom) {
      setSetupModalError('A data de início de vigência é obrigatória.')
      return
    }

    setSavingSetup(true)
    try {
      await lineMasterService.saveSetupMatrix({
        id: editingSetupId || undefined,
        line_id: lineId,
        from_product_code: setupForm.fromProductCode.trim().toUpperCase(),
        to_product_code: setupForm.toProductCode.trim().toUpperCase(),
        setup_code: `STP-${setupForm.fromProductCode}-${setupForm.toProductCode}`,
        setup_description: `Transição de ${setupForm.fromProductCode} para ${setupForm.toProductCode}`,
        setup_duration_minutes: durationNum,
        setup_category: setupForm.setupCategory as any,
        source_mode: 'MANUAL',
        valid_from: setupForm.validFrom,
        valid_until: setupForm.validUntil || undefined,
        active: true,
      })

      setIsSetupModalOpen(false)
      setFeedback({
        type: 'success',
        message: 'Transição de setup cadastrada com sucesso.',
      })
      await loadData()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      console.error('Erro ao salvar setup:', err)
      // Erro NÃO fecha o modal e preserva dados digitados
      setSetupModalError(
        err.message ||
          'Não foi possível salvar a transição de setup. Verifique os dados e tente novamente.',
      )
    } finally {
      setSavingSetup(false)
    }
  }

  const handleToggleSetupActive = async (item: LineSetupMatrix) => {
    try {
      const newActive = !item.active
      await lineMasterService.setSetupMatrixActive(item.id, newActive)
      setFeedback({
        type: 'success',
        message: `Regra de setup ${newActive ? 'reativada' : 'inativada'} com sucesso.`,
      })
      await loadData()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Falha ao alterar o status da regra de setup: ' + err.message,
      })
    }
  }

  const handleConfirmCloseSetupVigency = async () => {
    if (!closingSetupItem) return
    try {
      await lineMasterService.setSetupMatrixActive(
        closingSetupItem.id,
        false,
        closeSetupDate || new Date().toISOString().slice(0, 10),
      )
      setFeedback({
        type: 'success',
        message: 'Vigência da transição encerrada com sucesso.',
      })
      setClosingSetupItem(null)
      await loadData()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao encerrar vigência: ' + err.message,
      })
    }
  }

  // ==========================================
  // HANDLERS: MATRIZ DE ACERTO
  // ==========================================
  const handleOpenNewAcertoModal = () => {
    setEditingAcertoId(null)
    setAcertoForm({
      materialCode: '',
      materialDescription: '',
      sampleType: 'PEQUENA',
      durationMinutes: '',
      validFrom: new Date().toISOString().slice(0, 10),
      validUntil: '',
      active: true,
    })
    setAcertoModalError(null)
    setIsAcertoModalOpen(true)
  }

  const handleOpenEditAcertoModal = (item: LineAdjustmentTimeRule) => {
    setEditingAcertoId(item.id)
    setAcertoForm({
      materialCode: item.material_code,
      materialDescription: item.material_description || '',
      sampleType: item.sample_type,
      durationMinutes: item.duration_minutes,
      validFrom: item.valid_from
        ? item.valid_from.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      validUntil: item.valid_until ? item.valid_until.slice(0, 10) : '',
      active: item.active !== false,
    })
    setAcertoModalError(null)
    setIsAcertoModalOpen(true)
  }

  const handleSaveAcerto = async (e: React.FormEvent) => {
    e.preventDefault()
    setAcertoModalError(null)

    if (!acertoForm.materialCode) {
      setAcertoModalError('O código do material SAP é obrigatório.')
      return
    }

    if (!acertoForm.sampleType) {
      setAcertoModalError('Selecione o tipo de amostra.')
      return
    }

    const durationNum = Number(acertoForm.durationMinutes)
    if (!acertoForm.durationMinutes || isNaN(durationNum) || durationNum <= 0) {
      setAcertoModalError('O tempo de acerto deve ser maior que 0 minutos.')
      return
    }

    if (!acertoForm.validFrom) {
      setAcertoModalError('A data de início de vigência é obrigatória.')
      return
    }

    setSavingAcerto(true)
    try {
      await lineMasterService.saveAdjustmentRule({
        id: editingAcertoId || undefined,
        line_id: lineId,
        material_code: acertoForm.materialCode.trim().toUpperCase(),
        material_description: acertoForm.materialDescription,
        sample_type: acertoForm.sampleType,
        duration_minutes: durationNum,
        valid_from: acertoForm.validFrom,
        valid_until: acertoForm.validUntil || undefined,
        active: acertoForm.active,
      })

      setIsAcertoModalOpen(false)
      setFeedback({
        type: 'success',
        message: editingAcertoId
          ? 'Tempo de acerto atualizado com sucesso.'
          : 'Tempo de acerto cadastrado com sucesso.',
      })
      await loadData()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      console.error('Erro ao salvar acerto:', err)
      // Preserva dados e exibe mensagem
      setAcertoModalError(
        err.message || 'Não foi possível salvar o tempo de acerto. Verifique os dados digitados.',
      )
    } finally {
      setSavingAcerto(false)
    }
  }

  const handleRequestToggleAcertoActive = (item: LineAdjustmentTimeRule) => {
    const isActive = item.active !== false
    setAcertoStatusConfirm({
      item,
      action: isActive ? 'INATIVAR' : 'ATIVAR',
    })
  }

  const handleConfirmToggleAcertoStatus = async () => {
    if (!acertoStatusConfirm) return
    const { item, action } = acertoStatusConfirm
    try {
      const newActive = action === 'ATIVAR'
      await lineMasterService.setAdjustmentRuleActive(item.id, newActive)
      setFeedback({
        type: 'success',
        message: `Tempo de acerto ${newActive ? 'reativado' : 'inativado'} com sucesso.`,
      })
      setAcertoStatusConfirm(null)
      await loadData()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Falha ao alterar status do acerto: ' + err.message,
      })
      setAcertoStatusConfirm(null)
    }
  }

  const handleConfirmCloseAcertoVigency = async () => {
    if (!closingAcertoItem) return
    try {
      await lineMasterService.setAdjustmentRuleActive(
        closingAcertoItem.id,
        false,
        closeAcertoDate || new Date().toISOString().slice(0, 10),
      )
      setFeedback({
        type: 'success',
        message: 'Vigência do tempo de acerto encerrada com sucesso.',
      })
      setClosingAcertoItem(null)
      await loadData()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao encerrar vigência: ' + err.message,
      })
    }
  }

  // Filtros aplicados
  const filteredSetupList = useMemo(() => {
    const q = setupFilterText.trim().toLowerCase()
    if (!q) return setupList
    return setupList.filter(
      (s) =>
        (s.from_product_code && s.from_product_code.toLowerCase().includes(q)) ||
        (s.to_product_code && s.to_product_code.toLowerCase().includes(q)) ||
        (s.setup_description && s.setup_description.toLowerCase().includes(q)),
    )
  }, [setupList, setupFilterText])

  const filteredAcertoList = useMemo(() => {
    const q = acertoFilterText.trim().toLowerCase()
    if (!q) return acertoList
    return acertoList.filter(
      (a) =>
        a.material_code.toLowerCase().includes(q) ||
        (a.material_description && a.material_description.toLowerCase().includes(q)) ||
        a.sample_type.toLowerCase().includes(q) ||
        SAMPLE_TYPE_LABELS[a.sample_type]?.toLowerCase().includes(q),
    )
  }, [acertoList, acertoFilterText])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      const [year, month, day] = dateStr.slice(0, 10).split('-')
      if (year && month && day) return `${day}/${month}/${year}`
      return dateStr
    } catch {
      return dateStr
    }
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-blue-100/70 text-[#004C97]">
                <Sliders className="w-4 h-4" />
              </span>
              <CardTitle className="text-base font-semibold text-slate-900">
                Matriz Operacional de Setup & Acerto
              </CardTitle>
              {lineCode && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-[#004C97] border-blue-200 text-xs font-semibold"
                >
                  {lineCode}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Parametrização técnica de trocas de produto (DE → PARA) e tempos de acerto por amostra
              para sequenciamento robotizado CIAFAL.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-100 border-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {onOpenLineMaster && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onOpenLineMaster}
                className="h-8 text-xs text-[#004C97] hover:bg-blue-50"
              >
                Ver Ficha Mestre
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Banner de Feedback Global */}
        {feedback && (
          <Alert
            className={`mb-4 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <AlertTitle className="font-semibold">
              {feedback.type === 'success' ? 'Sucesso' : 'Atenção'}
            </AlertTitle>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        {/* Abas Principais: Matriz de Setup | Matriz de Acerto */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'SETUP' | 'ACERTO')}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <TabsList className="bg-slate-100 p-1 border border-slate-200">
              <TabsTrigger
                value="SETUP"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-sm font-medium px-4 h-8"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                Matriz de Setup ({setupList.length})
              </TabsTrigger>
              <TabsTrigger
                value="ACERTO"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-sm font-medium px-4 h-8"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Matriz de Acerto ({acertoList.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {activeTab === 'SETUP' ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenNewSetupModal}
                  className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Transição de Setup
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenNewAcertoModal}
                  className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />+ Cadastrar Acerto
                </Button>
              )}
            </div>
          </div>

          {/* ========================================== */}
          {/* TAB 1: MATRIZ DE SETUP                     */}
          {/* ========================================== */}
          <TabsContent value="SETUP" className="pt-4 focus-visible:outline-none">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="relative w-72">
                <Filter className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filtrar por material de origem ou destino..."
                  value={setupFilterText}
                  onChange={(e) => setSetupFilterText(e.target.value)}
                  className="h-8 text-xs pl-8 bg-white border-slate-200"
                />
              </div>
              <div className="text-xs text-slate-500">
                Mostrando {filteredSetupList.length} de {setupList.length} transições
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead className="text-xs font-semibold text-slate-700 w-28">
                      Data Início
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 w-28">
                      Data Fim
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Material DE
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Material PARA
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 w-36 text-right">
                      Duração Padrão (min)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 w-24 text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 w-36 text-center">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin text-[#004C97] mx-auto mb-2" />
                        Carregando matriz de setup...
                      </TableCell>
                    </TableRow>
                  ) : filteredSetupList.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-xs text-slate-500 bg-slate-50/40"
                      >
                        Nenhuma regra de setup encontrada. Clique em{' '}
                        <strong>+ Adicionar Transição de Setup</strong> para parametrizar as trocas
                        de produção.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSetupList.map((item) => {
                      const isActive = item.active !== false
                      return (
                        <TableRow
                          key={item.id}
                          className={`hover:bg-blue-50/40 text-xs transition-colors ${
                            !isActive ? 'bg-slate-50/70 text-slate-400 opacity-80' : ''
                          }`}
                        >
                          <TableCell className="font-mono text-slate-700 py-2.5">
                            {formatDate(item.valid_from)}
                          </TableCell>
                          <TableCell className="font-mono text-slate-500 py-2.5">
                            {formatDate(item.valid_until)}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="font-semibold text-slate-900 font-mono">
                              {item.from_product_code || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="font-semibold text-slate-900 font-mono">
                              {item.to_product_code || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-800 py-2.5">
                            <Badge
                              variant="outline"
                              className="font-mono bg-blue-50/60 text-[#004C97] border-blue-200"
                            >
                              {item.setup_duration_minutes} min
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            {isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-normal text-[10px] py-0 px-2">
                                Vigente
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-500 border-slate-300 font-normal text-[10px] py-0 px-2"
                              >
                                Encerrado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Editar Transição"
                                onClick={() => handleOpenEditSetupModal(item)}
                                className="h-7 w-7 p-0 text-slate-600 hover:text-[#004C97] hover:bg-blue-50"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              {isActive && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  title="Encerrar Vigência (definir data fim)"
                                  onClick={() => {
                                    setClosingSetupItem(item)
                                    setCloseSetupDate(new Date().toISOString().slice(0, 10))
                                  }}
                                  className="h-7 px-2 text-[11px] text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                >
                                  Encerrar
                                </Button>
                              )}

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title={isActive ? 'Inativar regra' : 'Reativar regra'}
                                onClick={() => handleToggleSetupActive(item)}
                                className={`h-7 w-7 p-0 ${
                                  isActive
                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                <PowerOff className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ========================================== */}
          {/* TAB 2: MATRIZ DE ACERTO                    */}
          {/* ========================================== */}
          <TabsContent value="ACERTO" className="pt-4 focus-visible:outline-none">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="relative w-72">
                <Filter className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filtrar por material ou tipo de amostra..."
                  value={acertoFilterText}
                  onChange={(e) => setAcertoFilterText(e.target.value)}
                  className="h-8 text-xs pl-8 bg-white border-slate-200"
                />
              </div>
              <div className="text-xs text-slate-500">
                Mostrando {filteredAcertoList.length} de {acertoList.length} regras de acerto
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead className="text-xs font-semibold text-slate-700 w-28">
                      Data Início
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 w-28">
                      Data Fim
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Material</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 w-44">
                      Tipo de Amostra
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 w-36 text-right">
                      Tempo (min)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 w-24 text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 w-36 text-center">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin text-[#004C97] mx-auto mb-2" />
                        Carregando matriz de acerto...
                      </TableCell>
                    </TableRow>
                  ) : filteredAcertoList.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-xs text-slate-500 bg-slate-50/40"
                      >
                        Nenhum tempo de acerto cadastrado. Clique em{' '}
                        <strong>+ Adicionar Acerto</strong> para registrar o tempo de acerto por
                        tipo de amostra (Pequena, Média, Grande, Tarugo).
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAcertoList.map((item) => {
                      const isActive = item.active !== false
                      const sampleLabel = SAMPLE_TYPE_LABELS[item.sample_type] || item.sample_type
                      return (
                        <TableRow
                          key={item.id}
                          className={`hover:bg-blue-50/40 text-xs transition-colors ${
                            !isActive ? 'bg-slate-50/70 text-slate-400 opacity-80' : ''
                          }`}
                        >
                          <TableCell className="font-mono text-slate-700 py-2.5">
                            {formatDate(item.valid_from)}
                          </TableCell>
                          <TableCell className="font-mono text-slate-500 py-2.5">
                            {formatDate(item.valid_until)}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 font-mono">
                                {item.material_code}
                              </span>
                              {item.material_description && (
                                <span className="text-slate-500 text-[11px] truncate max-w-xs">
                                  {item.material_description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge
                              variant="outline"
                              className="bg-slate-100 text-slate-700 border-slate-300 font-medium text-xs"
                            >
                              {sampleLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-800 py-2.5">
                            <Badge
                              variant="outline"
                              className="font-mono bg-blue-50/60 text-[#004C97] border-blue-200"
                            >
                              {item.duration_minutes} min
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            {isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-normal text-[10px] py-0 px-2">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-500 border-slate-300 font-normal text-[10px] py-0 px-2"
                              >
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <div className="inline-flex items-center gap-1 font-semibold text-xs">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditAcertoModal(item)}
                                className="h-7 px-2 text-xs text-[#004C97] hover:text-blue-800 hover:bg-blue-50 font-semibold"
                              >
                                Editar
                              </Button>
                              <span className="text-slate-300">|</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRequestToggleAcertoActive(item)}
                                className={`h-7 px-2 text-xs font-semibold ${
                                  isActive
                                    ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {isActive ? 'Inativar' : 'Ativar'}
                              </Button>
                            </div>
                          </TableCell>{' '}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* ==================================================== */}
      {/* MODAL 1: NOVA / EDITAR TRANSIÇÃO DE SETUP            */}
      {/* ==================================================== */}
      <Dialog open={isSetupModalOpen} onOpenChange={setIsSetupModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveSetup}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#004C97]" />
                {editingSetupId ? 'Editar Transição de Setup' : 'Nova Transição de Setup'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre o tempo padrão de troca entre produtos DE e PARA nesta linha.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4 text-xs">
              {setupModalError && (
                <Alert className="bg-rose-50 border-rose-200 text-rose-800 p-3">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <AlertDescription className="text-xs font-medium">
                    {setupModalError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Data Início <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <Input
                      type="date"
                      value={setupForm.validFrom}
                      onChange={(e) => setSetupForm({ ...setupForm, validFrom: e.target.value })}
                      required
                      className="pl-9 h-9 text-xs bg-white border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Data Fim <span className="text-slate-400 font-normal">(Opcional)</span>
                  </Label>
                  <div className="relative mt-1">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <Input
                      type="date"
                      value={setupForm.validUntil}
                      onChange={(e) => setSetupForm({ ...setupForm, validUntil: e.target.value })}
                      className="pl-9 h-9 text-xs bg-white border-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Material DE <span className="text-rose-500">*</span>
                  </Label>
                  <div className="mt-1">
                    <MaterialSelector
                      value={setupForm.fromProductCode}
                      onChange={(code, mat) =>
                        setSetupForm({
                          ...setupForm,
                          fromProductCode: code,
                          fromProductDescription: mat?.name || '',
                        })
                      }
                      placeholder="Selecione o material de origem..."
                      lineId={lineId}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Material PARA <span className="text-rose-500">*</span>
                  </Label>
                  <div className="mt-1">
                    <MaterialSelector
                      value={setupForm.toProductCode}
                      onChange={(code, mat) =>
                        setSetupForm({
                          ...setupForm,
                          toProductCode: code,
                          toProductDescription: mat?.name || '',
                        })
                      }
                      placeholder="Selecione o material de destino..."
                      lineId={lineId}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Duração Padrão (min) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Clock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Ex: 45"
                      value={setupForm.durationMinutes}
                      onChange={(e) =>
                        setSetupForm({ ...setupForm, durationMinutes: e.target.value })
                      }
                      required
                      className="pl-9 h-9 text-xs bg-white border-slate-300 font-mono font-medium"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">Categoria de Troca</Label>
                  <Select
                    value={setupForm.setupCategory}
                    onValueChange={(val) => setSetupForm({ ...setupForm, setupCategory: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="DIMENSION_CHANGE">Troca de Dimensão / Bitola</SelectItem>
                      <SelectItem value="TOOL_CHANGE">Troca de Ferramental / Cilindros</SelectItem>
                      <SelectItem value="MATERIAL_CHANGE">Troca de Grau de Aço</SelectItem>
                      <SelectItem value="COLOR_CHANGE">Troca de Cor / Pintura</SelectItem>
                      <SelectItem value="CLEANING_SETUP">Setup de Limpeza</SelectItem>
                      <SelectItem value="HEATING_CYCLE">Ciclo de Aquecimento</SelectItem>
                      <SelectItem value="OTHER">Outros Ajustes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSetupModalOpen(false)}
                disabled={savingSetup}
                className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingSetup}
                className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium"
              >
                {savingSetup ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Transição'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 2: NOVO / EDITAR TEMPO DE ACERTO               */}
      {/* ==================================================== */}
      <Dialog open={isAcertoModalOpen} onOpenChange={setIsAcertoModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveAcerto}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#004C97]" />
                {editingAcertoId ? 'Editar Tempo de Acerto' : 'Novo Tempo de Acerto'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre o tempo de acerto técnico para retirada de amostras da linha.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4 text-xs">
              {acertoModalError && (
                <Alert className="bg-rose-50 border-rose-200 text-rose-800 p-3">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <AlertDescription className="text-xs font-medium">
                    {acertoModalError}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="text-xs font-medium text-slate-700">
                  Material SAP <span className="text-rose-500">*</span>
                </Label>
                <div className="mt-1">
                  <MaterialSelector
                    value={acertoForm.materialCode}
                    onChange={(code, mat) =>
                      setAcertoForm({
                        ...acertoForm,
                        materialCode: code,
                        materialDescription: mat?.name || '',
                      })
                    }
                    placeholder="Selecione o material no catálogo SAP..."
                    lineId={lineId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Tipo de Amostra <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={acertoForm.sampleType}
                    onValueChange={(val) =>
                      setAcertoForm({ ...acertoForm, sampleType: val as SampleType })
                    }
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="PEQUENA">Pequena</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="GRANDE">Grande</SelectItem>
                      <SelectItem value="TARUGO">Tarugo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Tempo (min) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Clock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Ex: 20"
                      value={acertoForm.durationMinutes}
                      onChange={(e) =>
                        setAcertoForm({ ...acertoForm, durationMinutes: e.target.value })
                      }
                      required
                      className="pl-9 h-9 text-xs bg-white border-slate-300 font-mono font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Data Início <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <Input
                      type="date"
                      value={acertoForm.validFrom}
                      onChange={(e) => setAcertoForm({ ...acertoForm, validFrom: e.target.value })}
                      required
                      className="pl-9 h-9 text-xs bg-white border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Data Fim <span className="text-slate-400 font-normal">(Opcional)</span>
                  </Label>
                  <div className="relative mt-1">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <Input
                      type="date"
                      value={acertoForm.validUntil}
                      onChange={(e) => setAcertoForm({ ...acertoForm, validUntil: e.target.value })}
                      className="pl-9 h-9 text-xs bg-white border-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Status <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={acertoForm.active ? 'ACTIVE' : 'INACTIVE'}
                    onValueChange={(val) =>
                      setAcertoForm({ ...acertoForm, active: val === 'ACTIVE' })
                    }
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="INACTIVE">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAcertoModalOpen(false)}
                disabled={savingAcerto}
                className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingAcerto}
                className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium"
              >
                {savingAcerto ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : editingAcertoId ? (
                  'Salvar Alterações'
                ) : (
                  'Salvar Acerto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 3: ENCERRAMENTO DE VIGÊNCIA DE SETUP           */}
      {/* ==================================================== */}
      <Dialog open={!!closingSetupItem} onOpenChange={(open) => !open && setClosingSetupItem(null)}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-slate-900">
              Encerrar Vigência de Setup
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Informe a data de encerramento da vigência para a transição{' '}
              <strong>{closingSetupItem?.from_product_code}</strong> →{' '}
              <strong>{closingSetupItem?.to_product_code}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-xs font-medium text-slate-700">Data Fim de Vigência</Label>
            <Input
              type="date"
              value={closeSetupDate}
              onChange={(e) => setCloseSetupDate(e.target.value)}
              className="mt-1 h-9 text-xs bg-white border-slate-300"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setClosingSetupItem(null)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCloseSetupVigency}
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirmar Encerramento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 4: CONFIRMAÇÃO DE ATIVAR / INATIVAR ACERTO     */}
      {/* ==================================================== */}
      <Dialog
        open={!!acertoStatusConfirm}
        onOpenChange={(open) => !open && setAcertoStatusConfirm(null)}
      >
        <DialogContent className="sm:max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-slate-900">
              {acertoStatusConfirm?.action === 'INATIVAR'
                ? 'Inativar Regra de Acerto'
                : 'Reativar Regra de Acerto'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tem certeza que deseja {acertoStatusConfirm?.action.toLowerCase()} a regra de acerto
              para o material <strong>{acertoStatusConfirm?.item.material_code}</strong> (
              {acertoStatusConfirm?.item.sample_type}) com duração de{' '}
              {acertoStatusConfirm?.item.duration_minutes} min?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAcertoStatusConfirm(null)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmToggleAcertoStatus}
              className={`h-8 text-xs text-white ${
                acertoStatusConfirm?.action === 'INATIVAR'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              Confirmar {acertoStatusConfirm?.action === 'INATIVAR' ? 'Inativação' : 'Ativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default SetupAcertoMatrixPanel
