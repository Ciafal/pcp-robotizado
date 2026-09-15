import React, { useState, useEffect, useMemo } from 'react'
import {
  Layers,
  Building2,
  GitBranch,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Gauge,
  Clock,
  Layers as LayersIcon,
  Activity,
  Sliders,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { lineMasterService } from '@/services/line-master'
import type { ProductionLine, LineSequencingDependency } from '@/types/line-master'

interface CompanyRecord {
  id: string
  code: string
  name: string
  status: string
}

interface CenterSequenceItem {
  dependencyId?: string
  centerId: string
  centerCode: string
  centerName: string
  sequenceOrder: number
  isActive: boolean
  operationalStatus: string
  process: string
  nominalCapacity: number
  capacityUnit: string
  efficiency: number
  shiftsCount: number
  sapWorkCenter?: string
}

interface HierarchyLineStructure {
  id: string
  code: string
  name: string
  companyId: string
  companyCode: string
  companyName: string
  description?: string
  status: string
  centers: CenterSequenceItem[]
}

export default function LineCapacitiesSubpage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingSequence, setSavingSequence] = useState(false)
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [dependencies, setDependencies] = useState<LineSequencingDependency[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL')

  // Estado local editável da hierarquia (para reordenação e inclusão)
  const [hierarchyLines, setHierarchyLines] = useState<HierarchyLineStructure[]>([])

  // Modal de Adicionar Centro à Linha
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [targetLineIdForAdd, setTargetLineIdForAdd] = useState<string>('')
  const [selectedCenterIdToAdd, setSelectedCenterIdToAdd] = useState<string>('')
  const [addingCenter, setAddingCenter] = useState(false)

  // 1. Carregar dados das coleções existentes (companies, production_lines, line_sequencing_dependencies)
  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar Empresas existentes (NÃO duplicar)
      let compList: CompanyRecord[] = []
      try {
        compList = await pb.collection('companies').getFullList<CompanyRecord>({
          sort: 'code',
        })
      } catch (e) {
        console.warn('Erro ao carregar empresas:', e)
      }

      // Se lista vazia, mapear empresa padrão CIAFAL
      if (compList.length === 0) {
        compList = [
          { id: 'ciafal_default', code: 'CIAFAL', name: 'CIAFAL Wilson Santos', status: 'ACTIVE' },
          { id: 'ks_default', code: 'KS', name: 'KS - Ferradura / Ciafal', status: 'ACTIVE' },
        ]
      }
      setCompanies(compList)

      // Carregar todas as linhas/centros cadastrados
      const allLines = await pb.collection('production_lines').getFullList<ProductionLine>({
        sort: 'code',
      })
      setLines(allLines)

      // Carregar dependências de sequenciamento existentes
      const allDeps = await pb
        .collection('line_sequencing_dependencies')
        .getFullList<LineSequencingDependency>({
          sort: 'sequence_order',
        })
      setDependencies(allDeps)

      // 2. Montar Estrutura Hierárquica Empresa -> Linha Produtiva -> Centros de Produção
      // Linhas Mestras principais: L1, L2, BLOCOS KS, ENVIOKSF, ENVIOKSC
      const primaryLineCodes = ['L1', 'L2', 'BLOCOS KS', '01']
      const primaryLines = allLines.filter(
        (l) => primaryLineCodes.includes(l.code) || (!l.code.includes('_') && l.code.length <= 4),
      )

      // Se L1 e L2 não existirem como registros dedicados de linha, incluir
      const effectivePrimaryLines = primaryLines.length > 0 ? primaryLines : allLines.slice(0, 2)

      const structured: HierarchyLineStructure[] = effectivePrimaryLines.map((line) => {
        // Encontrar empresa vinculada ou inferida pelo código/planta
        const isKs = line.code.includes('KS') || (line.name && line.name.includes('KS'))
        const matchedComp =
          compList.find((c) => (isKs ? c.code.includes('KS') : c.code.includes('CIAFAL'))) ||
          compList[0]

        // Centros associados por dependência de sequenciamento
        const centerDeps = allDeps.filter(
          (d) => d.line_id === line.id || d.previous_line_id === line.id,
        )

        const centers: CenterSequenceItem[] = []

        if (centerDeps.length > 0) {
          centerDeps.forEach((dep) => {
            const centerLine = allLines.find(
              (l) => l.id === dep.next_line_id || l.id === dep.line_id,
            )
            if (centerLine && !centers.some((c) => c.centerId === centerLine.id)) {
              centers.push({
                dependencyId: dep.id,
                centerId: centerLine.id,
                centerCode: centerLine.code,
                centerName: centerLine.name,
                sequenceOrder: dep.sequence_order || (centers.length + 1) * 10,
                isActive: centerLine.is_active === true,
                operationalStatus: centerLine.status || 'running',
                process: centerLine.process || centerLine.programming_type || 'Não informado',
                nominalCapacity: centerLine.nominal_capacity || centerLine.current_rate || 0,
                capacityUnit: centerLine.capacity_unit || 't/h',
                efficiency: centerLine.efficiency || 90,
                shiftsCount: centerLine.shifts_count || 3,
                sapWorkCenter: centerLine.sap_work_center,
              })
            }
          })
        } else {
          // Centros nativos da linha por convenção industrial se não houver dependências registradas
          if (line.code === 'L1') {
            const enfCenter = allLines.find((l) => l.code === 'ENF_L1')
            if (enfCenter) {
              centers.push({
                centerId: enfCenter.id,
                centerCode: enfCenter.code,
                centerName: enfCenter.name,
                sequenceOrder: 10,
                isActive: enfCenter.is_active === true,
                operationalStatus: enfCenter.status || 'running',
                process: enfCenter.process || 'Enfornamento / Forno',
                nominalCapacity: enfCenter.nominal_capacity || 120,
                capacityUnit: enfCenter.capacity_unit || 't/h',
                efficiency: enfCenter.efficiency || 95,
                shiftsCount: enfCenter.shifts_count || 3,
                sapWorkCenter: enfCenter.sap_work_center,
              })
            }
            centers.push({
              centerId: line.id,
              centerCode: line.code,
              centerName: line.name,
              sequenceOrder: 20,
              isActive: line.is_active === true,
              operationalStatus: line.status || 'running',
              process: line.process || 'Laminação Contínua',
              nominalCapacity: line.nominal_capacity || 120,
              capacityUnit: line.capacity_unit || 't/h',
              efficiency: line.efficiency || 90,
              shiftsCount: line.shifts_count || 3,
              sapWorkCenter: line.sap_work_center,
            })
          } else if (line.code === 'L2') {
            centers.push({
              centerId: line.id,
              centerCode: line.code,
              centerName: line.name,
              sequenceOrder: 10,
              isActive: line.is_active === true,
              operationalStatus: line.status || 'running',
              process: line.process || 'Laminação L2',
              nominalCapacity: line.nominal_capacity || 95,
              capacityUnit: line.capacity_unit || 't/h',
              efficiency: line.efficiency || 88,
              shiftsCount: line.shifts_count || 3,
              sapWorkCenter: line.sap_work_center,
            })
            const acabCenter = allLines.find((l) => l.code === 'ACAB_L2')
            if (acabCenter) {
              centers.push({
                centerId: acabCenter.id,
                centerCode: acabCenter.code,
                centerName: acabCenter.name,
                sequenceOrder: 20,
                isActive: acabCenter.is_active === true,
                operationalStatus: acabCenter.status || 'running',
                process: acabCenter.process || 'Acabamento e Embalagem',
                nominalCapacity: acabCenter.nominal_capacity || 80,
                capacityUnit: acabCenter.capacity_unit || 't/h',
                efficiency: acabCenter.efficiency || 90,
                shiftsCount: acabCenter.shifts_count || 3,
                sapWorkCenter: acabCenter.sap_work_center,
              })
            }
          }
        }

        // Ordenar por sequenceOrder
        centers.sort((a, b) => a.sequenceOrder - b.sequenceOrder)

        return {
          id: line.id,
          code: line.code,
          name: line.name,
          companyId: matchedComp.id,
          companyCode: matchedComp.code,
          companyName: matchedComp.name,
          description: line.description || `Linha Produtiva Industrial ${line.code}`,
          status: line.status || 'running',
          centers,
        }
      })

      setHierarchyLines(structured)
    } catch (err: any) {
      console.error('Erro ao carregar dados da hierarquia:', err)
      toast({
        title: 'Erro ao carregar hierarquia',
        description: err.message || 'Falha ao sincronizar dados industriais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtragem por empresa
  const filteredHierarchy = useMemo(() => {
    if (selectedCompanyId === 'ALL') return hierarchyLines
    return hierarchyLines.filter((l) => l.companyId === selectedCompanyId)
  }, [hierarchyLines, selectedCompanyId])

  // Reordenação de centros dentro da linha
  const moveCenter = (lineId: string, centerIndex: number, direction: 'UP' | 'DOWN') => {
    setHierarchyLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const newCenters = [...l.centers]
        const targetIndex = direction === 'UP' ? centerIndex - 1 : centerIndex + 1
        if (targetIndex < 0 || targetIndex >= newCenters.length) return l

        const temp = newCenters[centerIndex]
        newCenters[centerIndex] = newCenters[targetIndex]
        newCenters[targetIndex] = temp

        // Reatribuir sequence_order com saltos 10, 20, 30...
        const updatedCenters = newCenters.map((c, idx) => ({
          ...c,
          sequenceOrder: (idx + 1) * 10,
        }))

        return {
          ...l,
          centers: updatedCenters,
        }
      }),
    )
  }

  // Persistir Sequência no Banco Real
  const handleSaveSequence = async (lineId: string) => {
    const lineStruct = hierarchyLines.find((l) => l.id === lineId)
    if (!lineStruct) return

    setSavingSequence(true)
    try {
      // Atualizar no banco cada dependência ou criar caso não exista
      for (let i = 0; i < lineStruct.centers.length; i++) {
        const item = lineStruct.centers[i]
        const seqVal = (i + 1) * 10
        if (item.dependencyId) {
          await lineMasterService.updateSequencingDependencyOrder(item.dependencyId, seqVal)
        } else {
          // Criar dependência se inexistente para fixar ordenação
          const newDep = await lineMasterService.addCenterToLineSequence({
            lineId: lineStruct.id,
            centerId: item.centerId,
            sequenceOrder: seqVal,
            notes: `Ordenação da Hierarquia Empresa -> ${lineStruct.code} -> ${item.centerCode}`,
          })
          item.dependencyId = newDep.id
        }
      }

      toast({
        title: 'Sequência Salva com Sucesso',
        description: `Fluxo sequencial da linha ${lineStruct.code} persistido no banco de dados.`,
      })
    } catch (err: any) {
      console.error('Erro ao salvar sequência:', err)
      toast({
        title: 'Não foi possível salvar a sequência',
        description: err.message || 'Verifique as dependências e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingSequence(false)
    }
  }

  // Remover Vínculo sem excluir o Centro
  const handleRemoveCenter = async (lineId: string, centerIndex: number) => {
    const lineStruct = hierarchyLines.find((l) => l.id === lineId)
    if (!lineStruct) return
    const targetCenter = lineStruct.centers[centerIndex]
    if (!targetCenter) return

    try {
      if (targetCenter.dependencyId) {
        await lineMasterService.removeCenterFromLineSequence(targetCenter.dependencyId)
      }

      setHierarchyLines((prev) =>
        prev.map((l) => {
          if (l.id !== lineId) return l
          const newCenters = l.centers.filter((_, idx) => idx !== centerIndex)
          const renumbered = newCenters.map((c, idx) => ({
            ...c,
            sequenceOrder: (idx + 1) * 10,
          }))
          return { ...l, centers: renumbered }
        }),
      )

      toast({
        title: 'Vínculo Removido',
        description: `O centro ${targetCenter.centerCode} foi desvinculado da linha ${lineStruct.code}. O cadastro mestre do centro foi preservado.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao remover vínculo',
        description: err.message || 'Falha ao desvincular centro.',
        variant: 'destructive',
      })
    }
  }

  // Adicionar Centro Existente à Linha (unicidade line_id + center_id)
  const handleAddCenterToLine = async () => {
    if (!targetLineIdForAdd || !selectedCenterIdToAdd) return
    const lineStruct = hierarchyLines.find((l) => l.id === targetLineIdForAdd)
    if (!lineStruct) return

    // Checar unicidade
    if (lineStruct.centers.some((c) => c.centerId === selectedCenterIdToAdd)) {
      toast({
        title: 'Centro Já Vinculado',
        description: 'Este centro já faz parte da sequência produtiva desta linha.',
        variant: 'destructive',
      })
      return
    }

    const centerToAdd = lines.find((l) => l.id === selectedCenterIdToAdd)
    if (!centerToAdd) return

    setAddingCenter(true)
    try {
      const nextSeq = (lineStruct.centers.length + 1) * 10
      const createdDep = await lineMasterService.addCenterToLineSequence({
        lineId: targetLineIdForAdd,
        centerId: selectedCenterIdToAdd,
        sequenceOrder: nextSeq,
        notes: `Adicionado à hierarquia da linha ${lineStruct.code}`,
      })

      const newItem: CenterSequenceItem = {
        dependencyId: createdDep.id,
        centerId: centerToAdd.id,
        centerCode: centerToAdd.code,
        centerName: centerToAdd.name,
        sequenceOrder: nextSeq,
        isActive: centerToAdd.is_active === true,
        operationalStatus: centerToAdd.status || 'running',
        process: centerToAdd.process || centerToAdd.programming_type || 'Não informado',
        nominalCapacity: centerToAdd.nominal_capacity || centerToAdd.current_rate || 0,
        capacityUnit: centerToAdd.capacity_unit || 't/h',
        efficiency: centerToAdd.efficiency || 90,
        shiftsCount: centerToAdd.shifts_count || 3,
        sapWorkCenter: centerToAdd.sap_work_center,
      }

      setHierarchyLines((prev) =>
        prev.map((l) => {
          if (l.id !== targetLineIdForAdd) return l
          return {
            ...l,
            centers: [...l.centers, newItem],
          }
        }),
      )

      toast({
        title: 'Centro Adicionado com Sucesso',
        description: `${centerToAdd.code} vinculado à linha ${lineStruct.code} na posição ${nextSeq}.`,
      })

      setIsAddModalOpen(false)
      setSelectedCenterIdToAdd('')
    } catch (err: any) {
      toast({
        title: 'Falha ao adicionar centro',
        description: err.message || 'Erro ao persistir vínculo de hierarquia.',
        variant: 'destructive',
      })
    } finally {
      setAddingCenter(false)
    }
  }

  // Centros disponíveis para adição na linha alvo
  const availableCentersToAdd = useMemo(() => {
    if (!targetLineIdForAdd) return []
    const lineStruct = hierarchyLines.find((l) => l.id === targetLineIdForAdd)
    if (!lineStruct) return []
    const boundCenterIds = new Set(lineStruct.centers.map((c) => c.centerId))
    return lines.filter((l) => !boundCenterIds.has(l.id))
  }, [targetLineIdForAdd, hierarchyLines, lines])

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Hierarquia */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#004C97] rounded-md text-white">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Hierarquia das Linhas e Centros de Produção
            </h1>
            <Badge
              variant="outline"
              className="text-xs border-blue-200 text-[#004C97] bg-blue-50 font-bold"
            >
              Governança Corporativa
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Estrutura Empresa &rarr; Linha Produtiva &rarr; Centros de Produção, com ordenação do
            fluxo industrial e parâmetros integrados da Ficha Mestra.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de Empresa existente */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <Building2 className="w-4 h-4 text-[#004C97]" />
            <span className="text-xs font-semibold text-slate-700">Empresa:</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
            >
              <option value="ALL">Todas as Empresas ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.code}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Conteúdo da Hierarquia */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#004C97]" />
          <span>Sincronizando hierarquia industrial com o banco de dados...</span>
        </div>
      ) : filteredHierarchy.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
          <GitBranch className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">
            Nenhuma linha produtiva vinculada à empresa.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Verifique as linhas cadastradas na aba de Centros e Ficha Mestra.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredHierarchy.map((lineStruct) => (
            <div
              key={lineStruct.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Header da Linha Produtiva */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#004C97] text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <GitBranch className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-950/80 rounded border border-blue-400/30 text-cyan-200">
                        {lineStruct.companyCode} &rarr; {lineStruct.code}
                      </span>
                      <h2 className="text-base font-black text-white">{lineStruct.name}</h2>
                      <Badge className="bg-emerald-600/90 text-white text-[10px] font-bold">
                        {lineStruct.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{lineStruct.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setTargetLineIdForAdd(lineStruct.id)
                      setIsAddModalOpen(true)
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold h-8 border border-white/20 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Centro à Linha
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleSaveSequence(lineStruct.id)}
                    disabled={savingSequence || lineStruct.centers.length === 0}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs h-8 gap-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar Sequência
                  </Button>
                </div>
              </div>

              {/* Lista Ordenada de Centros de Produção */}
              <div className="p-5">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#004C97]" /> Sequência Operacional de
                    Centros ({lineStruct.centers.length})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Saltos de sequência: 10 &bull; 20 &bull; 30... (arraste ou utilize os controles
                    para reordenar)
                  </span>
                </div>

                {lineStruct.centers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <p className="text-xs text-slate-600 font-medium">
                      Nenhum centro vinculado a esta linha produtiva.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clique em "Adicionar Centro à Linha" para vincular um centro existente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lineStruct.centers.map((center, idx) => (
                      <div
                        key={center.centerId}
                        className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-lg border transition-all ${
                          !center.isActive
                            ? 'bg-amber-50/60 border-amber-200'
                            : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                        }`}
                      >
                        {/* Posição e Identificação */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center justify-center w-8 h-8 rounded-md bg-[#004C97]/10 text-[#004C97] font-mono font-black text-xs shrink-0">
                            {String(center.sequenceOrder).padStart(2, '0')}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-slate-900">
                                {center.centerCode}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                {center.centerName}
                              </span>

                              {/* Badges de Status Cadastral e Operacional */}
                              {center.isActive ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0">
                                  Inativo
                                </Badge>
                              )}

                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono text-slate-600 border-slate-300"
                              >
                                {center.operationalStatus}
                              </Badge>
                            </div>

                            {/* Informações de Processo vindo do campo real */}
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                              <span>
                                Processo:{' '}
                                <strong className="text-slate-800 font-semibold">
                                  {center.process}
                                </strong>
                              </span>
                              {center.sapWorkCenter && (
                                <span className="font-mono text-slate-400">
                                  SAP: {center.sapWorkCenter}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Parâmetros Técnicos Leitura-Only vindos da Ficha Mestra */}
                        <div className="flex items-center gap-4 mt-3 md:mt-0">
                          <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 font-mono text-slate-700">
                            <span className="flex items-center gap-1" title="Capacidade Nominal">
                              <Gauge className="w-3.5 h-3.5 text-blue-600" />
                              <strong>{center.nominalCapacity}</strong> {center.capacityUnit}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="flex items-center gap-1" title="Eficiência OEE">
                              <Activity className="w-3.5 h-3.5 text-emerald-600" />
                              <strong>{center.efficiency}%</strong> OEE
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="flex items-center gap-1" title="Turnos Operacionais">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <strong>{center.shiftsCount}</strong> Turnos
                            </span>
                          </div>

                          {/* Controles de Reordenação e Remoção de Vínculo */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={idx === 0}
                              onClick={() => moveCenter(lineStruct.id, idx, 'UP')}
                              className="h-7 w-7 text-slate-600 hover:text-slate-900"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={idx === lineStruct.centers.length - 1}
                              onClick={() => moveCenter(lineStruct.id, idx, 'DOWN')}
                              className="h-7 w-7 text-slate-600 hover:text-slate-900"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveCenter(lineStruct.id, idx)}
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                              title="Remover vínculo sem excluir centro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Adicionar Centro Existente à Linha */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#004C97]" /> Adicionar Centro à Linha
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione um centro de produção já cadastrado na Ficha Mestra para incluí-lo no fluxo
              operacional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Selecione o Centro de Produção *
              </Label>
              <Select value={selectedCenterIdToAdd} onValueChange={setSelectedCenterIdToAdd}>
                <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-300">
                  <SelectValue placeholder="Selecione um centro existente..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-white">
                  {availableCentersToAdd.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <span className="font-mono font-bold mr-2 text-[#004C97]">[{c.code}]</span>{' '}
                      {c.name} {c.process ? `(${c.process})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-blue-700" /> Governança de Parâmetros
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                O centro herdará automaticamente os turnos, capacidades, produtividade e parâmetros
                da Ficha Mestra sem duplicar registros no banco de dados.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selectedCenterIdToAdd || addingCenter}
              onClick={handleAddCenterToLine}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 gap-1.5"
            >
              {addingCenter ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Vinculando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Vínculo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
