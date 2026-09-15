import React, { useState, useEffect } from 'react'
import {
  GitFork,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Building2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ProductionRoute,
  ProductionRouteNode,
  ProductionRouteEdge,
  EdgeRelationType,
} from '@/types/sequencing-orchestration'
import { sequencingRoutesService } from '@/services/sequencing-routes'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export interface LineHierarchyOption {
  id: string
  code: string
  name: string
  companyName: string
  companyCode: string
  isActive: boolean
  status: string
  centersCount: number
  sapWorkCenter?: string
  process?: string
  nominalCapacity?: number
  capacityUnit?: string
}

export interface ProductionRouteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  routeToEdit?: ProductionRoute | null
  onSuccess: (savedRoute: ProductionRoute) => void
}

export const ProductionRouteModal: React.FC<ProductionRouteModalProps> = ({
  open,
  onOpenChange,
  routeToEdit,
  onSuccess,
}) => {
  const { toast } = useToast()

  // Estado de carregamento de Linhas reais do banco
  const [availableLines, setAvailableLines] = useState<LineHierarchyOption[]>([])
  const [loadingLines, setLoadingLines] = useState(false)

  // Bloco 1: Identificação
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [productCode, setProductCode] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [isVersionBump, setIsVersionBump] = useState(false)

  // Bloco 2: Linhas Produtivas da Rota
  interface RouteLineItem {
    lineId: string
    lineCode: string
    lineName: string
    companyName: string
    companyCode: string
    centersCount: number
    isActive: boolean
    status: string
    nominalRate: number
    capacityUnit: string
    processName: string
  }
  const [routeLines, setRouteLines] = useState<RouteLineItem[]>([])
  const [selectedLineToAdd, setSelectedLineToAdd] = useState<string>('')

  // Bloco 3: Dependências / Edges
  interface RouteEdgeConfig {
    origin_line_code: string
    target_line_code: string
    relation_type: EdgeRelationType
    lead_time_minutes: number
  }
  const [routeEdges, setRouteEdges] = useState<RouteEdgeConfig[]>([])
  const [isNNMode, setIsNNMode] = useState(false)

  // Modais de confirmação internos (shadcn Dialog — NUNCA alert/window.confirm)
  const [inactiveConfirmLine, setInactiveConfirmLine] = useState<LineHierarchyOption | null>(null)
  const [removeLineIndex, setRemoveLineIndex] = useState<number | null>(null)

  // Controle de submissão e erros
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Carregar linhas reais da Hierarquia (production_lines + companies + dependencies)
  useEffect(() => {
    if (!open) return
    const fetchLinesHierarchy = async () => {
      setLoadingLines(true)
      try {
        const [linesRecords, companiesRecords, depsRecords, mastersRecords] = await Promise.all([
          pb.collection('production_lines').getFullList({ sort: 'code' }),
          pb
            .collection('companies')
            .getFullList()
            .catch(() => []),
          pb
            .collection('line_sequencing_dependencies')
            .getFullList()
            .catch(() => []),
          pb
            .collection('line_masters')
            .getFullList()
            .catch(() => []),
        ])

        const companyMap = new Map<string, any>()
        companiesRecords.forEach((c: any) => {
          companyMap.set(c.id, c)
        })

        const mapped: LineHierarchyOption[] = linesRecords.map((line: any) => {
          // Determinar empresa
          let comp: any = line.plant_id ? companyMap.get(line.plant_id) : null
          if (!comp && companiesRecords.length > 0) {
            comp =
              companiesRecords.find((c: any) =>
                line.code && line.code.includes('KS')
                  ? c.code && c.code.includes('KS')
                  : c.code && c.code.includes('CIAFAL'),
              ) || companiesRecords[0]
          }

          // Contagem de centros associados
          const centersAssociated = depsRecords.filter((d: any) => d.line_id === line.id).length
          const fallbackCenters =
            centersAssociated > 0
              ? centersAssociated
              : line.code === 'L1' || line.code === 'L2'
                ? 2
                : line.code === 'RETRAB'
                  ? 3
                  : 1

          const master = mastersRecords.find(
            (m: any) => m.line_id === line.id || m.code === line.code,
          )

          return {
            id: line.id,
            code: line.code,
            name: line.name,
            companyName: comp?.name || 'CIAFAL Wilson Santos',
            companyCode: comp?.code || 'CIAFAL',
            isActive: line.is_active !== false,
            status: line.status || 'idle',
            centersCount: fallbackCenters,
            sapWorkCenter: line.sap_work_center,
            process:
              master?.process_step ||
              line.process ||
              line.programming_type ||
              'Processamento Geral',
            nominalCapacity:
              master?.nominal_hourly_capacity || line.nominal_capacity || line.current_rate || 100,
            capacityUnit: master?.capacity_unit || line.capacity_unit || 't/h',
          }
        })

        setAvailableLines(mapped)
      } catch (err) {
        console.error('Erro ao buscar linhas para o modal de rotas:', err)
      } finally {
        setLoadingLines(false)
      }
    }

    fetchLinesHierarchy()
  }, [open])

  // Inicializar formulário quando abrir ou mudar rota selecionada
  useEffect(() => {
    if (!open) return
    setErrorMessage(null)

    if (routeToEdit) {
      setCode(routeToEdit.code)
      setName(routeToEdit.metadata?.name || routeToEdit.description || '')
      setDescription(routeToEdit.description || '')
      setProductCode(routeToEdit.product_code || '')
      setFamilyCode(routeToEdit.family_code || '')
      setIsVersionBump(routeToEdit.status === 'APPROVED')

      // Carregar nós existentes se houver
      if (routeToEdit.nodes && routeToEdit.nodes.length > 0) {
        const sortedNodes = [...routeToEdit.nodes].sort((a, b) => a.logical_order - b.logical_order)
        const loadedLines: RouteLineItem[] = sortedNodes.map((n) => {
          const match = availableLines.find((al) => al.id === n.line_id || al.code === n.line_code)
          return {
            lineId: n.line_id,
            lineCode: n.line_code,
            lineName: match?.name || n.line_code,
            companyName: match?.companyName || 'CIAFAL',
            companyCode: match?.companyCode || 'CIAFAL',
            centersCount: match?.centersCount || 1,
            isActive: match?.isActive ?? true,
            status: match?.status || 'idle',
            nominalRate: n.nominal_rate || 100,
            capacityUnit: n.capacity_unit || 't/h',
            processName: n.process_name || 'Processo Produtivo',
          }
        })
        setRouteLines(loadedLines)
      } else {
        setRouteLines([])
      }

      // Carregar edges existentes se houver
      if (routeToEdit.edges && routeToEdit.edges.length > 0) {
        setRouteEdges(
          routeToEdit.edges.map((e) => ({
            origin_line_code: e.origin_line_code,
            target_line_code: e.target_line_code,
            relation_type: e.relation_type,
            lead_time_minutes: e.lead_time_minutes || 30,
          })),
        )
        // Se houver ramificações ou tipos não lineares, ativa modo N:N
        const isNotLinear =
          routeToEdit.edges.some(
            (e) => e.relation_type !== 'MANDATORY' && e.relation_type !== 'CONDITIONAL',
          ) || routeToEdit.edges.length !== (routeToEdit.nodes?.length || 0) - 1
        setIsNNMode(isNotLinear)
      } else {
        setRouteEdges([])
        setIsNNMode(false)
      }
    } else {
      // Nova Rota (sempre DRAFT)
      setCode('')
      setName('')
      setDescription('')
      setProductCode('')
      setFamilyCode('')
      setRouteLines([])
      setRouteEdges([])
      setIsNNMode(false)
      setIsVersionBump(false)
    }
  }, [open, routeToEdit, availableLines.length])

  // Recalcular edges automáticos quando no modo Linear
  const regenerateLinearEdges = (lines: RouteLineItem[]): RouteEdgeConfig[] => {
    if (lines.length <= 1) return []
    const edges: RouteEdgeConfig[] = []
    for (let i = 0; i < lines.length - 1; i++) {
      edges.push({
        origin_line_code: lines[i].lineCode,
        target_line_code: lines[i + 1].lineCode,
        relation_type: 'MANDATORY',
        lead_time_minutes: 30,
      })
    }
    return edges
  }

  // Manipular adição de Linha
  const handleAddLineClick = () => {
    if (!selectedLineToAdd) return
    const lineOpt = availableLines.find((l) => l.id === selectedLineToAdd)
    if (!lineOpt) return

    // Checar se já existe na rota
    if (routeLines.some((rl) => rl.lineId === lineOpt.id || rl.lineCode === lineOpt.code)) {
      setErrorMessage(`A linha ${lineOpt.code} já está adicionada a esta Rota.`)
      return
    }

    // Se estiver inativa, exigir confirmação
    if (!lineOpt.isActive) {
      setInactiveConfirmLine(lineOpt)
      return
    }

    appendLineToRoute(lineOpt)
  }

  const appendLineToRoute = (lineOpt: LineHierarchyOption) => {
    const newItem: RouteLineItem = {
      lineId: lineOpt.id,
      lineCode: lineOpt.code,
      lineName: lineOpt.name,
      companyName: lineOpt.companyName,
      companyCode: lineOpt.companyCode,
      centersCount: lineOpt.centersCount,
      isActive: lineOpt.isActive,
      status: lineOpt.status,
      nominalRate: lineOpt.nominalCapacity || 100,
      capacityUnit: lineOpt.capacityUnit || 't/h',
      processName: lineOpt.process || 'Laminação / Conformação',
    }

    const updated = [...routeLines, newItem]
    setRouteLines(updated)
    setSelectedLineToAdd('')
    setErrorMessage(null)

    if (!isNNMode) {
      setRouteEdges(regenerateLinearEdges(updated))
    }
  }

  // Mover linha para cima / baixo (reordenar)
  const handleMoveLine = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= routeLines.length) return

    const updated = [...routeLines]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp

    setRouteLines(updated)

    if (!isNNMode) {
      setRouteEdges(regenerateLinearEdges(updated))
    }
  }

  // Confirmar remoção de linha
  const handleConfirmRemoveLine = () => {
    if (removeLineIndex === null) return
    const removedLine = routeLines[removeLineIndex]
    const updated = routeLines.filter((_, idx) => idx !== removeLineIndex)
    setRouteLines(updated)
    setRemoveLineIndex(null)

    // Limpar edges órfãos vinculados à linha removida
    if (isNNMode) {
      const remainingCodes = new Set(updated.map((l) => l.lineCode))
      setRouteEdges((prev) =>
        prev.filter(
          (e) => remainingCodes.has(e.origin_line_code) && remainingCodes.has(e.target_line_code),
        ),
      )
    } else {
      setRouteEdges(regenerateLinearEdges(updated))
    }
  }

  // Adicionar Edge customizado no modo N:N
  const [customOrigin, setCustomOrigin] = useState('')
  const [customTarget, setCustomTarget] = useState('')
  const [customType, setCustomType] = useState<EdgeRelationType>('MANDATORY')
  const [customLeadTime, setCustomLeadTime] = useState<number>(30)

  const handleAddCustomEdge = () => {
    if (!customOrigin || !customTarget) {
      setErrorMessage('Selecione Predecessor e Sucessor para a ligação.')
      return
    }
    if (customOrigin === customTarget) {
      setErrorMessage('Uma Linha não pode ter dependência direta com ela mesma.')
      return
    }

    // Checar duplicidade
    if (
      routeEdges.some(
        (e) => e.origin_line_code === customOrigin && e.target_line_code === customTarget,
      )
    ) {
      setErrorMessage(
        `A dependência ${customOrigin} ➔ ${customTarget} já foi configurada nesta Rota.`,
      )
      return
    }

    // Detecção preventiva de ciclo
    const candidateEdges = [
      ...routeEdges,
      {
        origin_line_code: customOrigin,
        target_line_code: customTarget,
        relation_type: customType,
        lead_time_minutes: Number(customLeadTime) || 30,
      },
    ]

    const cycleCheck = sequencingRoutesService.hasCycle(candidateEdges)
    if (cycleCheck.hasCycle) {
      setErrorMessage('A Rota contém dependência cíclica entre Linhas Produtivas.')
      return
    }

    setRouteEdges(candidateEdges)
    setCustomOrigin('')
    setCustomTarget('')
    setErrorMessage(null)
  }

  const handleRemoveEdge = (index: number) => {
    setRouteEdges((prev) => prev.filter((_, i) => i !== index))
  }

  // Salvar rota (Consistência Rota + Nodes + Edges)
  const handleSaveRoute = async () => {
    setErrorMessage(null)

    // Validações obrigatórias
    if (!code.trim()) {
      setErrorMessage('O Código da Rota é obrigatório.')
      return
    }
    if (!name.trim()) {
      setErrorMessage('O Nome da Rota é obrigatório.')
      return
    }
    if (routeLines.length === 0) {
      setErrorMessage('Adicione pelo menos uma Linha Produtiva à Rota.')
      return
    }

    // Detecção de dependência cíclica
    const cycle = sequencingRoutesService.hasCycle(routeEdges)
    if (cycle.hasCycle) {
      setErrorMessage('A Rota contém dependência cíclica entre Linhas Produtivas.')
      return
    }

    setIsSaving(true)
    try {
      const saved = await sequencingRoutesService.saveCompleteRoute({
        id: routeToEdit?.id,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        product_code: productCode.trim().toUpperCase(),
        family_code: familyCode.trim().toUpperCase(),
        isNewVersion: isVersionBump,
        nodes: routeLines.map((l, idx) => ({
          line_id: l.lineId,
          line_code: l.lineCode,
          process_name: l.processName,
          logical_order: (idx + 1) * 10,
          nominal_rate: l.nominalRate,
          capacity_unit: l.capacityUnit,
        })),
        edges: routeEdges.map((e, idx) => ({
          origin_line_code: e.origin_line_code,
          target_line_code: e.target_line_code,
          relation_type: e.relation_type,
          priority: idx + 1,
          lead_time_minutes: e.lead_time_minutes,
        })),
      })

      // Toast só APÓS reler o registro com sucesso
      toast({
        title: 'Sucesso',
        description: 'Rota produtiva salva como rascunho com sucesso.',
      })

      onSuccess(saved)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar rota produtiva:', err)
      // Se qualquer etapa falhar, modal permanece aberto com os dados preservados
      setErrorMessage(
        err.message ||
          'Não foi possível salvar a Rota Produtiva. Verifique as informações e tente novamente.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-sm">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {routeToEdit
                      ? `Editar Rota Produtiva [${routeToEdit.code}]`
                      : 'Cadastrar Nova Rota Produtiva N:N'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Sequenciamento da hierarquia industrial: Identificação, Linhas Reais e Relações
                    N:N com persistência consistente.
                  </DialogDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[11px] font-bold"
              >
                Status Inicial: Rascunho (DRAFT)
              </Badge>
            </div>
          </DialogHeader>

          {/* Mensagem de Erro Geral */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2 shadow-xs">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Erro de Validação ou Salvamento</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Banner de Versionamento Automático para Rotas Aprovadas */}
          {routeToEdit && routeToEdit.status === 'APPROVED' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-[#004C97] shrink-0" />
              <span>
                Esta Rota está <strong>Aprovada (APPROVED)</strong>. Ao salvar as alterações, o
                sistema gerará automaticamente a <strong>Versão {routeToEdit.version + 1}</strong>{' '}
                como <strong>Rascunho</strong>, preservando integralmente a versão atual.
              </span>
            </div>
          )}

          <div className="space-y-6 py-2">
            {/* BLOCO 1: IDENTIFICAÇÃO DA ROTA */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  Bloco 1 &mdash; Identificação da Rota
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Status: <strong>Rascunho</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-mono font-medium">
                    Código da Rota *
                  </label>
                  <Input
                    placeholder="Ex: ROUT_CANTON_STD_V1"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 uppercase font-mono text-xs focus-visible:ring-[#004C97]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-mono font-medium">
                    Nome da Rota *
                  </label>
                  <Input
                    placeholder="Ex: Rota Tubos Estruturais e Quadrados"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 text-xs focus-visible:ring-[#004C97]"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Descrição Técnica
                </label>
                <Input
                  placeholder="Ex: Laminação contínua com tratamento térmico e calibração fina"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs focus-visible:ring-[#004C97]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-mono font-medium">
                    Produto Vinculado
                  </label>
                  <Input
                    placeholder="Ex: TUB_50X50"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 uppercase font-mono text-xs focus-visible:ring-[#004C97]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-mono font-medium">Família</label>
                  <Input
                    placeholder="Ex: TUB_QUAD"
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 uppercase font-mono text-xs focus-visible:ring-[#004C97]"
                  />
                </div>
              </div>
            </div>

            {/* BLOCO 2: LINHAS PRODUTIVAS DA ROTA */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  Bloco 2 &mdash; Linhas Produtivas da Rota ({routeLines.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Ordenação em saltos de 10 em 10 (10, 20, 30...)
                </span>
              </div>

              {/* Seletor de Linhas Reais da Hierarquia */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <select
                  value={selectedLineToAdd}
                  onChange={(e) => setSelectedLineToAdd(e.target.value)}
                  disabled={loadingLines}
                  className="w-full sm:flex-1 bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                >
                  <option value="">Selecione uma Linha da Hierarquia para adicionar...</option>
                  {availableLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.companyCode} | {line.code} - {line.name} |{' '}
                      {line.isActive ? 'Ativa' : 'Inativa'} | {line.centersCount} Centro(s)
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddLineClick}
                  disabled={!selectedLineToAdd}
                  className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold whitespace-nowrap w-full sm:w-auto"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Linha Produtiva
                </Button>
              </div>

              {/* Tabela de Linhas da Rota */}
              {routeLines.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono text-[11px]">
                      <tr>
                        <th className="py-2 px-3 w-16">Ordem</th>
                        <th className="py-2 px-3">Empresa</th>
                        <th className="py-2 px-3">Código</th>
                        <th className="py-2 px-3">Linha</th>
                        <th className="py-2 px-3">Centros</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {routeLines.map((item, idx) => {
                        const stepOrder = (idx + 1) * 10
                        return (
                          <tr key={item.lineId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-[#004C97]">{stepOrder}</td>
                            <td className="py-2.5 px-3 text-slate-700">{item.companyCode}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {item.lineCode}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-sans font-medium">
                              {item.lineName}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-700 border-slate-300 text-[10px]"
                              >
                                {item.centersCount} Centro(s)
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              {item.isActive ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                  Ativa
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                                  Inativa
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveLine(idx, 'UP')}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                                  title="Subir Ordem"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={idx === routeLines.length - 1}
                                  onClick={() => handleMoveLine(idx, 'DOWN')}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                                  title="Descer Ordem"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRemoveLineIndex(idx)}
                                  className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                                  title="Remover Linha da Rota"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-lg text-xs space-y-1">
                  <Layers className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="font-semibold text-slate-700">Nenhuma Linha Produtiva na Rota.</p>
                  <p className="text-[11px] text-slate-500">
                    Selecione uma Linha no campo acima e clique em "+ Adicionar Linha Produtiva".
                  </p>
                </div>
              )}
            </div>

            {/* BLOCO 3: DEPENDÊNCIAS / PRECEDÊNCIAS N:N */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  Bloco 3 &mdash; Dependências & Precedências N:N ({routeEdges.length} Ligação/ões)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isNNMode
                      setIsNNMode(next)
                      if (!next) {
                        setRouteEdges(regenerateLinearEdges(routeLines))
                      }
                    }}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
                      isNNMode
                        ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isNNMode ? 'Modo Avançado N:N Ativo' : 'Alternar para Rota N:N Customizada'}
                  </button>
                </div>
              </div>

              {!isNNMode ? (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#004C97]" />
                    <span>Modo Linear Sequencial Automático:</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    As ligações são geradas sequencialmente a partir da ordem das Linhas (Ex: 10 L1
                    ➔ 20 L2). Alterne para o modo N:N acima caso necessite de bifurcações,
                    convergências ou caminhos paralelos/alternativos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                    <span className="text-xs font-mono font-bold text-slate-800 block">
                      Configurar Nova Relação entre Linhas da Rota:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-600 mb-1">
                          Predecessor (Origem)
                        </label>
                        <select
                          value={customOrigin}
                          onChange={(e) => setCustomOrigin(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono text-xs outline-none"
                        >
                          <option value="">Selecione...</option>
                          {routeLines.map((l) => (
                            <option key={l.lineCode} value={l.lineCode}>
                              {l.lineCode} ({l.lineName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-600 mb-1">
                          Sucessor (Destino)
                        </label>
                        <select
                          value={customTarget}
                          onChange={(e) => setCustomTarget(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono text-xs outline-none"
                        >
                          <option value="">Selecione...</option>
                          {routeLines.map((l) => (
                            <option key={l.lineCode} value={l.lineCode}>
                              {l.lineCode} ({l.lineName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-600 mb-1">
                          Tipo de Dependência
                        </label>
                        <select
                          value={customType}
                          onChange={(e) => setCustomType(e.target.value as EdgeRelationType)}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono text-xs outline-none"
                        >
                          <option value="MANDATORY">Obrigatória (MANDATORY)</option>
                          <option value="ALTERNATIVE">Alternativa (ALTERNATIVE)</option>
                          <option value="PARALLEL">Paralela (PARALLEL)</option>
                          <option value="CONDITIONAL">Condicional (CONDITIONAL)</option>
                          <option value="OPTIONAL">Opcional (OPTIONAL)</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={handleAddCustomEdge}
                          size="sm"
                          className="w-full bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold"
                        >
                          + Vincular
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Edges Atuais */}
              {routeEdges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {routeEdges.map((edge, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {edge.origin_line_code}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#004C97]" />
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {edge.target_line_code}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            edge.relation_type === 'MANDATORY'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : edge.relation_type === 'ALTERNATIVE'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : edge.relation_type === 'PARALLEL'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {edge.relation_type === 'MANDATORY'
                            ? 'Obrigatória'
                            : edge.relation_type === 'ALTERNATIVE'
                              ? 'Alternativa'
                              : edge.relation_type === 'PARALLEL'
                                ? 'Paralela'
                                : edge.relation_type}
                        </Badge>
                      </div>

                      {isNNMode && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEdge(idx)}
                          className="h-6 w-6 p-0 text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic text-xs">
                  Nenhuma dependência configurada entre Linhas.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-4 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 font-mono">
              Rota cadastrada permanecerá em DRAFT até validação e aprovação.
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="border-slate-300 text-slate-700 text-xs hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveRoute}
                disabled={isSaving}
                className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold shadow-xs"
              >
                {isSaving ? 'Salvando Rota...' : 'Salvar como Rascunho'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PADRÃO HUB: CONFIRMAR REMOÇÃO DE LINHA DA ROTA (shadcn Dialog — NUNCA alert/window.confirm) */}
      <Dialog
        open={removeLineIndex !== null}
        onOpenChange={(op) => !op && setRemoveLineIndex(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Remover Linha da Rota
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-600 space-y-2">
            <p>
              Deseja remover esta Linha Produtiva da Rota? O cadastro da Linha e seus Centros serão
              preservados.
            </p>
            {removeLineIndex !== null && routeLines[removeLineIndex] && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded font-mono text-[11px]">
                Linha Selecionada:{' '}
                <strong>
                  {routeLines[removeLineIndex].lineCode} - {routeLines[removeLineIndex].lineName}
                </strong>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-slate-200 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRemoveLineIndex(null)}
              className="border-slate-300 text-slate-700 text-xs hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmRemoveLine}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Remover da Rota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PADRÃO HUB: CONFIRMAR ADIÇÃO DE LINHA INATIVA */}
      <Dialog
        open={inactiveConfirmLine !== null}
        onOpenChange={(op) => !op && setInactiveConfirmLine(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Linha Produtiva Inativa
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-600 space-y-2">
            <p>
              A Linha Produtiva <strong>{inactiveConfirmLine?.code}</strong> está atualmente{' '}
              <strong className="text-rose-600">INATIVA</strong> na Hierarquia industrial.
            </p>
            <p>
              Você pode adicioná-la em modo Rascunho, mas a Rota não poderá ser Aprovada até que
              todas as Linhas estejam com status Ativo.
            </p>
          </div>
          <DialogFooter className="border-t border-slate-200 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInactiveConfirmLine(null)}
              className="border-slate-300 text-slate-700 text-xs hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (inactiveConfirmLine) {
                  appendLineToRoute(inactiveConfirmLine)
                  setInactiveConfirmLine(null)
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              Confirmar e Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ProductionRouteModal
