import React, { useState, useEffect, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Database,
  Flame,
  Layers,
  Maximize2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Workflow,
  Zap,
  Info,
  Clock,
  FileSpreadsheet,
  ArrowRight,
  Filter,
  Save,
  Search,
  Check,
  Building2,
  AlertCircle,
  HelpCircle,
  Sliders,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  LineBottleneckMatrixRecord,
  LineProcessConstraint,
  DynamicBottleneckCalculationResult,
} from '@/types/bottleneck-matrix'
import { BottleneckRulesEngine, bottleneckMatrixService } from '@/services/bottleneck-rules-engine'
import { sapMrpService } from '@/services/sap-mrp-service'
import { SapMrpGroupItem } from '@/types/sap-mrp'
import { pcpAuditService, computeDiff, FIELD_LABELS_PT_BR } from '@/services/pcp-audit-service'

interface LineBottleneckMatrixPanelProps {
  lineCode: string
  lineName?: string
  initialCompanyCode?: string
}

export const LineBottleneckMatrixPanel: React.FC<LineBottleneckMatrixPanelProps> = ({
  lineCode = 'L1',
  lineName = 'Linha 1 — Laminação',
  initialCompanyCode = 'CIAFAL',
}) => {
  const { toast } = useToast()
  const { user, can } = useAuth()

  const [matrices, setMatrices] = useState<LineBottleneckMatrixRecord[]>([])
  const [constraints, setConstraints] = useState<LineProcessConstraint[]>([])
  const [selectedMatrixId, setSelectedMatrixId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Configuração e Filtro de Empresa / WERKS
  const [selectedCompany, setSelectedCompany] = useState<string>(initialCompanyCode)
  const [currentWerks, setCurrentWerks] = useState<string>(
    sapMrpService.mapCompanyToWerks(initialCompanyCode),
  )

  // Estado do Cache SAP MARC-DISGR
  const [mrpGroups, setMrpGroups] = useState<SapMrpGroupItem[]>([])
  const [mrpSearchTerm, setMrpSearchTerm] = useState('')
  const [isMrpDropdownOpen, setIsMrpDropdownOpen] = useState(false)
  const [selectedMrpCode, setSelectedMrpCode] = useState<string>('')
  const [selectedMrpDesc, setSelectedMrpDesc] = useState<string>('')

  // Estado de Sincronização SAP
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null)
  const [isSyncingSap, setIsSyncingSap] = useState(false)
  const [sapOfflineMessage, setSapOfflineMessage] = useState<string | null>(null)
  const [isSavingAssociation, setIsSavingAssociation] = useState(false)

  // Validação de Conflito de Vigência e Ausência
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // Parâmetros de Simulação Rápida na Matriz
  const [simSection, setSimSection] = useState<number>(130)
  const [simLength, setSimLength] = useState<number>(6.0)
  const [simWeight, setSimWeight] = useState<number>(795)
  const [simPasses, setSimPasses] = useState<number>(6)
  const [simVeins, setSimVeins] = useState<number>(1)

  useEffect(() => {
    loadData()
  }, [lineCode])

  // Atualiza WERKS e Grupos MRP quando a Empresa mudar
  useEffect(() => {
    const werks = sapMrpService.mapCompanyToWerks(selectedCompany)
    setCurrentWerks(werks)
    loadMrpGroups(werks)
  }, [selectedCompany])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mList, cList] = await Promise.all([
        bottleneckMatrixService.listMatrices(lineCode),
        bottleneckMatrixService.listConstraints(lineCode),
      ])
      setMatrices(mList)
      setConstraints(cList)

      if (mList.length > 0) {
        const firstM = mList[0]
        setSelectedMatrixId(firstM.id)
        setSimSection(firstM.billet_section_mm || 130)
        setSimLength(firstM.billet_length_m || 6.0)
        setSimWeight(firstM.billet_weight_kg || 795)
        setSimPasses(firstM.passes_count || 6)
        setSimVeins(firstM.veins_count || 1)

        // Carrega valores persistidos na matriz
        if (firstM.mrp_group_code) {
          setSelectedMrpCode(firstM.mrp_group_code)
          setSelectedMrpDesc(firstM.mrp_group_description || '')
        } else {
          setSelectedMrpCode('')
          setSelectedMrpDesc('')
        }

        if (firstM.werks) {
          setCurrentWerks(firstM.werks)
          // Mapeia de volta a empresa se aplicável
          if (firstM.werks === '2001') setSelectedCompany('KS-FERRADURA')
          else if (firstM.werks === '2101') setSelectedCompany('KS-CIAFAL')
          else if (firstM.werks === '3001') setSelectedCompany('SIDERCENTRO')
          else setSelectedCompany('CIAFAL')
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Carrega grupos MRP do cache filtrado por WERKS
  const loadMrpGroups = async (werks: string) => {
    const [groups, lastSync] = await Promise.all([
      sapMrpService.listMrpGroupsByWerks(werks),
      sapMrpService.getLastSyncDate(werks),
    ])
    setMrpGroups(groups)
    setLastSyncDate(lastSync)

    // Se a matriz ativa tiver mrp_group_code, reconcilia a descrição
    const activeM = matrices.find((m) => m.id === selectedMatrixId)
    if (activeM && activeM.mrp_group_code) {
      const match = groups.find((g) => g.disgr === activeM.mrp_group_code)
      if (match) {
        setSelectedMrpDesc(match.description || '')
      }
    }
  }

  const selectedMatrix = matrices.find((m) => m.id === selectedMatrixId) || matrices[0]

  // Quando o usuário muda a matriz no select superior
  const handleMatrixChange = (mid: string) => {
    setSelectedMatrixId(mid)
    const targetM = matrices.find((m) => m.id === mid)
    if (targetM) {
      setSimSection(targetM.billet_section_mm || 130)
      setSimLength(targetM.billet_length_m || 6.0)
      setSimWeight(targetM.billet_weight_kg || 795)
      setSimPasses(targetM.passes_count || 6)
      setSimVeins(targetM.veins_count || 1)

      // Carrega estado persistido
      setSelectedMrpCode(targetM.mrp_group_code || '')
      setSelectedMrpDesc(targetM.mrp_group_description || '')
      if (targetM.werks) {
        setCurrentWerks(targetM.werks)
        if (targetM.werks === '2001') setSelectedCompany('KS-FERRADURA')
        else if (targetM.werks === '2101') setSelectedCompany('KS-CIAFAL')
        else if (targetM.werks === '3001') setSelectedCompany('SIDERCENTRO')
        else setSelectedCompany('CIAFAL')
      }
      setConflictWarning(null)
    }
  }

  // Sincronização / Atualização com SAP RFC com tratamento gracioso de falha
  const handleSyncSap = async (simulateFailure = false) => {
    setIsSyncingSap(true)
    setSapOfflineMessage(null)
    try {
      const res = await sapMrpService.syncMrpGroups({
        werks: currentWerks,
        simulateOffline: simulateFailure,
      })
      await loadMrpGroups(currentWerks)
      setSapOfflineMessage(null)
      toast({
        title: 'Sincronização SAP Concluída',
        description: `${res.records_synced} Grupos MRP sincronizados para WERKS ${res.werks_filtered}.`,
      })
    } catch (err: any) {
      const msg =
        err.message || 'SAP temporariamente indisponível. Exibindo última sincronização disponível.'
      setSapOfflineMessage(msg)
      toast({
        title: 'Aviso de Conexão SAP',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSyncingSap(false)
    }
  }

  // Filtragem dos grupos MRP pesquisáveis (apenas da planta WERKS selecionada)
  const filteredMrpGroups = useMemo(() => {
    const term = mrpSearchTerm.trim().toLowerCase()
    return mrpGroups.filter((g) => {
      if (!term) return true
      const display = sapMrpService.formatMrpDisplay(g).toLowerCase()
      return display.includes(term) || g.disgr.toLowerCase().includes(term)
    })
  }, [mrpGroups, mrpSearchTerm])

  // Salvar Associação do Grupo MRP com a Matriz de Referência
  const handleSaveAssociation = async () => {
    if (!selectedMatrixId) {
      toast({
        title: 'Selecione uma Matriz',
        description: 'É necessário ter uma matriz selecionada para salvar a associação.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingAssociation(true)
    setConflictWarning(null)

    const beforeState = {
      mrp_group_code: selectedMatrix?.mrp_group_code || '',
      mrp_group_description: selectedMatrix?.mrp_group_description || '',
      werks: selectedMatrix?.werks || '',
      reference_matrix_name: `${selectedMatrix?.gauge_dimension} • ${selectedMatrix?.steel_grade}`,
      status: selectedMatrix?.status || 'VIGENTE',
    }

    const afterState = {
      mrp_group_code: selectedMrpCode,
      mrp_group_description: selectedMrpDesc,
      werks: currentWerks,
      reference_matrix_name: `${selectedMatrix?.gauge_dimension} • ${selectedMatrix?.steel_grade}`,
      status: selectedMatrix?.status || 'VIGENTE',
    }

    try {
      // 1. Validação de conflito de vigência com outras matrizes ativas
      if (selectedMrpCode) {
        const potentialConflicts = matrices.filter(
          (m) =>
            m.id !== selectedMatrixId &&
            m.status === 'VIGENTE' &&
            m.mrp_group_code === selectedMrpCode &&
            (m.werks === currentWerks || !m.werks),
        )

        if (potentialConflicts.length > 0) {
          const warnMsg = `Existe mais de uma Matriz de Referência válida para estes parâmetros (Grupo MRP ${selectedMrpCode} na planta ${currentWerks}). Revise a configuração.`
          setConflictWarning(warnMsg)
        }
      }

      // 2. Persistência real no PocketBase
      const updated = await bottleneckMatrixService.updateMatrix(selectedMatrixId, {
        mrp_group_code: selectedMrpCode,
        mrp_group_description: selectedMrpDesc,
        werks: currentWerks,
      })

      // Atualiza lista local de matrizes
      setMatrices((prev) => prev.map((m) => (m.id === selectedMatrixId ? { ...m, ...updated } : m)))

      // 3. Auditoria oficial com computeDiff e FIELD_LABELS_PT_BR
      const diffChanges = computeDiff(beforeState, afterState)
      if (diffChanges.length > 0) {
        await pcpAuditService.recordLog({
          action: 'Atualização de Matriz de Referência — Associação Grupo MRP (MARC-DISGR)',
          event_type: 'ALTERAÇÃO',
          status: 'Concluída',
          outcome: 'SUCCESS',
          module: 'Matriz de Gargalos Dinâmica',
          screen: 'Centros & Ficha Mestra',
          company: selectedCompany,
          line: lineCode,
          center: lineName,
          resource: 'line_bottleneck_matrix',
          resource_id: selectedMatrixId,
          source: 'SAP RFC / MARC-DISGR',
          changes: diffChanges,
          details: {
            matrix_id: selectedMatrixId,
            mrp_group_code_before: beforeState.mrp_group_code,
            mrp_group_code_after: afterState.mrp_group_code,
            werks: currentWerks,
            origin_source: 'SAP RFC / MARC-DISGR',
          },
        })
      }

      toast({
        title: 'Associação Salva com Sucesso',
        description: `Matriz vinculada ao Grupo MRP ${selectedMrpCode || 'Nenhum'} (WERKS ${currentWerks}). Trilha de auditoria registrada.`,
      })
    } catch (err: any) {
      console.error('Erro ao salvar associação da matriz:', err)
      await pcpAuditService.recordFailureAttempt({
        operation: 'Salvar Associação Grupo MRP na Matriz de Referência',
        module: 'Matriz de Gargalos Dinâmica',
        screen: 'Centros & Ficha Mestra',
        company: selectedCompany,
        line: lineCode,
        center: lineName,
        recordId: selectedMatrixId,
        errorMessage: err.message || 'Falha ao gravar no backend',
      })
      toast({
        title: 'Falha ao Salvar Associação',
        description: err.message || 'Erro de comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingAssociation(false)
    }
  }

  // Recálculo Dinâmico em tempo real
  const dynamicCalc: DynamicBottleneckCalculationResult =
    BottleneckRulesEngine.calculateDynamicBottleneck({
      line_code: lineCode,
      billet_section_mm: simSection,
      billet_length_m: simLength,
      billet_weight_kg: simWeight,
      passes_count: simPasses,
      veins_count: simVeins,
      matrix_ref: selectedMatrix,
    })

  // Formatação de data/hora amigável
  const formatSyncDateDisplay = (isoDate?: string | null) => {
    if (!isoDate) return 'Não sincronizado'
    try {
      const d = new Date(isoDate)
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    } catch (_) {
      return isoDate
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. PAINEL DE CRITÉRIOS DA MATRIZ DE REFERÊNCIA & GRUPO MRP (FRENTE 6) */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <div className="h-1 bg-[#004C97] w-full" />
        <CardHeader className="p-4 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#004C97]/10 text-[#004C97]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Matriz de Gargalos Dinâmica — {lineCode}
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                    {selectedMatrix?.status || 'VIGENTE'} Rev.{selectedMatrix?.version || 1}
                  </Badge>
                  {selectedMatrix?.is_homologated !== false && (
                    <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-semibold">
                      HOMOLOGADA
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Parâmetros de referência para governança de gargalos, capacidade de laminação e
                  seleção automática SAP.
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Seletor da Matriz e Ação de Atualização */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Matriz:</span>
            <select
              value={selectedMatrixId}
              onChange={(e) => handleMatrixChange(e.target.value)}
              aria-label="Matriz de Referência Técnica"
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-[#004C97] focus:ring-1 focus:ring-[#004C97] outline-none"
            >
              {matrices.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.gauge_dimension} • {m.steel_grade} ({m.product_family})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="h-8 text-xs border-slate-200 text-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />{' '}
              Atualizar
            </Button>
          </div>
        </CardHeader>

        {/* Critérios Completos da Matriz de Referência Selecionada (Matriz, Grupo MRP, Vigência, Status) */}
        <CardContent className="p-4 bg-slate-50/70 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Critério 1: Matriz (Nome & Família) */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                1. Matriz Selecionada
              </span>
              <div className="font-bold text-slate-900 text-xs">
                {selectedMatrix?.gauge_dimension || 'Bitola'} •{' '}
                {selectedMatrix?.steel_grade || 'Aço'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Família:{' '}
                <strong className="text-slate-700">
                  {selectedMatrix?.product_family || 'Geral'}
                </strong>
              </div>
            </div>

            {/* Critério 2: Empresa & WERKS SAP */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  2. Empresa & WERKS SAP
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-[#004C97] border-blue-200"
                >
                  WERKS {currentWerks}
                </Badge>
              </div>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:ring-1 focus:ring-[#004C97] outline-none"
              >
                <option value="CIAFAL">CIAFAL (WERKS 1001 — CFPL)</option>
                <option value="KS-FERRADURA">KS - Ferradura (WERKS 2001)</option>
                <option value="KS-CIAFAL">KS - Ciafal (WERKS 2101)</option>
                <option value="SIDERCENTRO">Sidercentro (WERKS 3001)</option>
              </select>
            </div>

            {/* Critério 3: Grupo MRP (MARC-DISGR) — Select Pesquisável */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  3. Grupo MRP (MARC-DISGR)
                </span>
                {selectedMrpCode ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px] font-mono">
                    Associado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 text-[9px]">
                    Não Definido
                  </Badge>
                )}
              </div>

              {/* Botão de Trigger / Dropdown Pesquisável */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMrpDropdownOpen(!isMrpDropdownOpen)}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded px-2 py-1 text-xs text-left font-bold text-slate-800 flex items-center justify-between transition-colors"
                >
                  <span className="truncate">
                    {selectedMrpCode
                      ? sapMrpService.formatMrpDisplay({
                          disgr: selectedMrpCode,
                          description: selectedMrpDesc,
                          werks: currentWerks,
                        })
                      : 'Selecionar Grupo MRP do Cache...'}
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      isMrpDropdownOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {isMrpDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 space-y-2 min-w-[280px]">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <Input
                        placeholder="Pesquisar código ou descrição..."
                        value={mrpSearchTerm}
                        onChange={(e) => setMrpSearchTerm(e.target.value)}
                        className="pl-8 h-7 text-xs bg-slate-50 border-slate-300 text-slate-900"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                      <div
                        onClick={() => {
                          setSelectedMrpCode('')
                          setSelectedMrpDesc('')
                          setIsMrpDropdownOpen(false)
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded cursor-pointer text-slate-500 font-medium flex items-center justify-between"
                      >
                        <span>— Nenhum (Remover Associação) —</span>
                        {!selectedMrpCode && <Check className="w-3.5 h-3.5 text-[#004C97]" />}
                      </div>

                      {filteredMrpGroups.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-[11px]">
                          {mrpGroups.length === 0
                            ? `Nenhum Grupo MRP no cache para WERKS ${currentWerks}. Clique em 'Atualizar SAP'.`
                            : 'Nenhum resultado para a pesquisa.'}
                        </div>
                      ) : (
                        filteredMrpGroups.map((g) => {
                          const isSelected = selectedMrpCode === g.disgr
                          return (
                            <div
                              key={`${g.werks}-${g.disgr}`}
                              onClick={() => {
                                setSelectedMrpCode(g.disgr)
                                setSelectedMrpDesc(g.description || '')
                                setIsMrpDropdownOpen(false)
                              }}
                              className={`p-2 hover:bg-blue-50/80 rounded cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 font-bold text-[#004C97]'
                                  : 'text-slate-800'
                              }`}
                            >
                              <div>
                                <span className="block font-mono text-xs">
                                  {sapMrpService.formatMrpDisplay(g)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Origem: {g.origin_source || 'SAP_RFC'} • WERKS {g.werks}
                                </span>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-[#004C97]" />}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Critério 4: Vigência Técnica & Status */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                4. Vigência & Status
              </span>
              <div className="font-semibold text-emerald-700 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {selectedMatrix?.valid_from
                    ? new Date(selectedMatrix.valid_from).toLocaleDateString('pt-BR')
                    : '01/01/2026'}{' '}
                  até{' '}
                  {selectedMatrix?.valid_until
                    ? new Date(selectedMatrix.valid_until).toLocaleDateString('pt-BR')
                    : '31/12/2026'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Status Operacional:{' '}
                <strong className="text-slate-800">{selectedMatrix?.status || 'VIGENTE'}</strong>
              </div>
            </div>
          </div>

          {/* Linha de Sincronização SAP, Persistência e Avisos de Conflito */}
          <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
            {/* Indicador de Cache / Sincronização */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-[#004C97]" />
                Dados SAP atualizados em:
              </span>
              <Badge
                variant="outline"
                className="font-mono text-[11px] bg-white border-slate-300 text-slate-700"
              >
                {formatSyncDateDisplay(lastSyncDate)}
              </Badge>
              {sapOfflineMessage && (
                <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {sapOfflineMessage}
                </Badge>
              )}
            </div>

            {/* Ações: Atualizar SAP, Simular Offline e Salvar Associação */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSyncSap(false)}
                disabled={isSyncingSap}
                className="h-8 text-xs border-slate-300 text-[#004C97] hover:bg-blue-50 font-semibold"
                title="Forçar reconsulta dos Grupos MRP no SAP ECC via RFC"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isSyncingSap ? 'animate-spin' : ''}`} />
                Atualizar SAP
              </Button>

              {/* Botão de Teste / Diagnóstico de Indisponibilidade Graciosa */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSyncSap(true)}
                disabled={isSyncingSap}
                className="h-8 text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                title="Testar resiliência com simulação de SAP Indisponível"
              >
                Simular Offline
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAssociation}
                disabled={isSavingAssociation}
                className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingAssociation ? 'Salvando...' : 'Salvar Associação'}
              </Button>
            </div>
          </div>

          {/* Alerta de Conflito de Vigência */}
          {conflictWarning && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">
                  Conflito de Matriz de Referência Detectado
                </strong>
                <span>{conflictWarning}</span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Governança e Metadados Técnicos Oficiais */}
        <CardContent className="p-4 bg-white text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Documento de Referência
              </span>
              <span className="font-semibold text-slate-800">
                {selectedMatrix?.reference_doc || 'Matriz de Gargalos Oficial CIAFAL'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Autoridade / Engenharia
              </span>
              <span className="font-semibold text-slate-800">
                {selectedMatrix?.source_authority || 'Engenharia de Processos CIAFAL'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Responsável / Aprovador
              </span>
              <span className="font-semibold text-slate-800">
                {selectedMatrix?.responsible_name || 'Eng. Rodolfo Castro'} •{' '}
                {selectedMatrix?.approver_name || 'Ger. Fabrício Menezes'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Origem do Parâmetro
              </span>
              <span className="font-semibold text-slate-800">
                MARC-DISGR (SAP ECC / WERKS {currentWerks})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. CARDS DE RESUMO EXECUTIVO TOC / DBR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Gargalo Primário (DRUM) */}
        <Card className="bg-white border-l-4 border-l-rose-500 border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-rose-700 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> GARGALO PRIMÁRIO (DRUM)
              </span>
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                Restrição Ativa
              </Badge>
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-1">
              {dynamicCalc.primary_bottleneck.stageName}
            </div>
            <div className="text-2xl font-black font-mono text-rose-600 mt-1">
              {dynamicCalc.primary_bottleneck.capacity_th}{' '}
              <span className="text-xs font-normal text-slate-500">t/h</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Dita o ritmo global de produção da Linha {lineCode}.
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Gargalo Secundário & Gap */}
        <Card className="bg-white border-l-4 border-l-amber-500 border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> GARGALO SECUNDÁRIO
              </span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                Gap: +{dynamicCalc.gap_to_secondary_th} t/h
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-800 mt-1 truncate">
              {dynamicCalc.secondary_bottleneck.stageName}
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 mt-1">
              {dynamicCalc.secondary_bottleneck.capacity_th}{' '}
              <span className="text-xs font-normal text-slate-500">t/h</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Próxima restrição caso o gargalo primário seja elevado.
            </div>
          </CardContent>
        </Card>

        {/* Card 3: TOC Drum-Buffer-Rope */}
        <Card className="bg-white border-l-4 border-l-[#004C97] border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-[#004C97] flex items-center gap-1">
                <Workflow className="w-3.5 h-3.5" /> TOC / CADÊNCIA (ROPE)
              </span>
              <span className="text-[10px] font-mono text-slate-600">Buffer: 1.5 h</span>
            </div>
            <div className="text-base font-bold text-slate-800 mt-1">
              Alimentação de MP Subordinada
            </div>
            <div className="text-2xl font-black font-mono text-[#004C97] mt-1">
              {dynamicCalc.rope_cadence_th}{' '}
              <span className="text-xs font-normal text-slate-500">t/h autorizada</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Evita excesso de WIP e saturação do leito TCC.
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Robustez Operacional */}
        <Card className="bg-white border-l-4 border-l-emerald-500 border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> ROBUSTEZ OPERACIONAL
              </span>
              <Badge
                className={`text-[10px] font-bold ${
                  dynamicCalc.operational_robustness === 'ALTA'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : dynamicCalc.operational_robustness === 'MEDIA'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                {dynamicCalc.operational_robustness}
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-800 mt-1">Sensibilidade da Linha</div>
            <div className="text-xs text-slate-600 mt-1 line-clamp-2">
              {dynamicCalc.robustness_details}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>
                Risco Starvation:{' '}
                <strong className="text-slate-800">{dynamicCalc.starvation_risk}</strong>
              </span>{' '}
              •
              <span>
                Risco Blocking:{' '}
                <strong className="text-slate-800">{dynamicCalc.blocking_risk}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. TABELA DE CAPACIDADE POR ETAPA PRODUTIVA */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" />
              Capacidades Calculadas por Etapa do Fluxo Produtivo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              MP &rarr; Forno &rarr; Desbaste &rarr; Trem Contínuo &rarr; Tesoura TR2 &rarr; TCC
              Leito &rarr; Endireitamento &rarr; Empacotamento
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Etapa Produtiva</th>
                  <th className="p-3 text-right">Capacidade Teórica</th>
                  <th className="p-3 text-right">Capacidade Operacional</th>
                  <th className="p-3 text-right">Capacidade Líquida (TOC)</th>
                  <th className="p-3 text-center">Tempo de Ciclo</th>
                  <th className="p-3">Utilização %</th>
                  <th className="p-3">Fatores Limitantes / Fórmulas</th>
                  <th className="p-3 text-center">Papel TOC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dynamicCalc.stages.map((st) => (
                  <tr
                    key={st.stage}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      st.is_bottleneck
                        ? 'bg-rose-50/60 font-semibold'
                        : st.is_secondary_bottleneck
                          ? 'bg-amber-50/40'
                          : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {st.is_bottleneck && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        )}
                        {st.is_secondary_bottleneck && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                        <span className="font-bold text-slate-900">{st.stageName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {st.theoretical_capacity_th} t/h
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {st.operational_capacity_th} t/h
                    </td>
                    <td className="p-3 text-right font-mono font-black">
                      <span
                        className={
                          st.is_bottleneck
                            ? 'text-rose-600'
                            : st.is_secondary_bottleneck
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }
                      >
                        {st.effective_capacity_th} t/h
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {st.cycle_time_seconds} s
                    </td>
                    <td className="p-3 w-36">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-600">
                          <span>{st.utilization_pct}%</span>
                        </div>
                        <Progress
                          value={st.utilization_pct}
                          className={`h-1.5 ${
                            st.is_bottleneck
                              ? 'bg-rose-100 [&>div]:bg-rose-500'
                              : st.is_secondary_bottleneck
                                ? 'bg-amber-100 [&>div]:bg-amber-500'
                                : 'bg-slate-100 [&>div]:bg-[#004C97]'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-[11px] text-slate-600">
                      <div className="space-y-0.5">
                        {(st.limiting_factors || []).map((f, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="text-slate-400">•</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {st.is_bottleneck ? (
                        <Badge className="bg-rose-600 text-white font-bold text-[10px]">
                          GARGALO (DRUM)
                        </Badge>
                      ) : st.is_secondary_bottleneck ? (
                        <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                          2º GARGALO
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-500 border-slate-200 text-[10px]"
                        >
                          SUBORDINADO
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. REGRAS E RESTRIÇÕES CADASTRADAS */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Catálogo de Restrições Técnicas & Condições Operacionais
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Regras soberanas que governam a aprovação automática dos Planos de Corte e
            Sequenciamento PCP.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Código Regra</th>
                  <th className="p-3">Descrição da Restrição</th>
                  <th className="p-3">Etapa</th>
                  <th className="p-3">Nível da Restrição</th>
                  <th className="p-3">Limite Permitido</th>
                  <th className="p-3">Admite Bypass?</th>
                  <th className="p-3">Fonte / Norma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {constraints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">{c.rule_code}</td>
                    <td className="p-3 font-medium text-slate-800">{c.title}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] border-slate-300">
                        {c.stage}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {c.constraint_level === 'HARD_CONSTRAINT' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                          HARD CONSTRAINT (Soberana)
                        </Badge>
                      ) : c.constraint_level === 'SAFETY_CONSTRAINT' ? (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-[10px]">
                          SEGURANÇA (Inviolável)
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                          SOFT CONSTRAINT (Ressalva)
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {c.max_limit !== undefined && `≤ ${c.max_limit} ${c.unit}`}
                      {c.min_limit !== undefined && `≥ ${c.min_limit} ${c.unit}`}
                    </td>
                    <td className="p-3">
                      {c.bypass_allowed ? (
                        <span className="text-amber-700 font-medium">
                          Sim ({c.bypass_authority_required || 'PCP'})
                        </span>
                      ) : (
                        <span className="text-rose-700 font-bold">NÃO (Bloqueio Total)</span>
                      )}
                    </td>
                    <td className="p-3 text-[11px] text-slate-500">{c.source_doc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
