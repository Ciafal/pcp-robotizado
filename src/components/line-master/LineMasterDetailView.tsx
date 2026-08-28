import React, { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  GitCommit,
  Layers,
  Lock,
  PauseCircle,
  Play,
  Plus,
  RefreshCw,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Unlock,
  UserCheck,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  LineBlockedProduct,
  LineManagerAssignment,
  LineMaster,
  LineOrgHierarchy,
  LineOverviewData,
  LineProductivityRate,
  LineRawMaterialPriority,
  LineSequencingDependency,
  LineSetupMatrix,
  ProductionLine,
  ProductionShift,
  ProductFamily,
  SapIntegrationDefinition,
  StandardScheduledStop,
} from '@/types/line-master'
import { UserProfile } from '@/types/pcp-auth'
import { lineMasterService } from '@/services/line-master'
import { Can } from '@/components/auth/Can'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LineMasterDetailViewProps {
  overview: LineOverviewData
  users: UserProfile[]
  productFamilies: ProductFamily[]
  allLines: ProductionLine[]
  sapCatalog: SapIntegrationDefinition[]
  onRefresh: () => void
  onOpenSapCatalog: () => void
}

export const LineMasterDetailView: React.FC<LineMasterDetailViewProps> = ({
  overview,
  users,
  productFamilies,
  allLines,
  sapCatalog,
  onRefresh,
  onOpenSapCatalog,
}) => {
  const { toast } = useToast()
  const {
    line,
    master,
    hierarchy,
    managers,
    approvers,
    sequencing,
    productivity,
    rawMaterials,
    blockedProducts,
    setupMatrix,
    scheduledStops,
    shifts,
    calendar,
    capabilities,
    constraints,
    history,
    alerts,
    completeness,
    readyForScheduling,
  } = overview

  // Sub-aba ativa no agrupamento de Governança/Processo/Ficha Mestre
  const [mainGroup, setMainGroup] = useState<
    'OVERVIEW' | 'ORGANIZATION' | 'PROCESS' | 'MASTERDATA' | 'GOVERNANCE'
  >('OVERVIEW')
  const [masterSubTab, setMasterSubTab] = useState<
    | 'CAPACITY'
    | 'PRODUCTIVITY'
    | 'RAW_MATERIALS'
    | 'BLOCKED'
    | 'SETUP_MATRIX'
    | 'CAPABILITIES'
    | 'SHIFTS'
    | 'CONSTRAINTS'
  >('CAPACITY')

  // Modais de Criação Rápida
  const [isProdModalOpen, setIsProdModalOpen] = useState<boolean>(false)
  const [isRawModalOpen, setIsRawModalOpen] = useState<boolean>(false)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState<boolean>(false)
  const [isSetupMatrixModalOpen, setIsSetupMatrixModalOpen] = useState<boolean>(false)
  const [isScheduledStopModalOpen, setIsScheduledStopModalOpen] = useState<boolean>(false)
  const [isManagerModalOpen, setIsManagerModalOpen] = useState<boolean>(false)
  const [isApproverModalOpen, setIsApproverModalOpen] = useState<boolean>(false)
  const [isSeqModalOpen, setIsSeqModalOpen] = useState<boolean>(false)

  // Estados dos formulários de modais
  // Produtividade
  const [prodMaterialCode, setProdMaterialCode] = useState<string>('')
  const [prodMaterialName, setProdMaterialName] = useState<string>('')
  const [prodDim, setProdDim] = useState<string>('')
  const [prodUnit, setProdUnit] = useState<'t/h' | 'peça/h' | 'm/h'>('t/h')
  const [prodNominal, setProdNominal] = useState<number>(12.0)
  const [prodPlanned, setProdPlanned] = useState<number>(11.5)
  const [prodSource, setProdSource] = useState<'MANUAL' | 'SAP'>('MANUAL')
  const [prodSapId, setProdSapId] = useState<string>('')
  const [prodFamilyId, setProdFamilyId] = useState<string>('')

  // Matéria-Prima
  const [rawCode, setRawCode] = useState<string>('')
  const [rawDesc, setRawDesc] = useState<string>('')
  const [rawGroup, setRawGroup] = useState<string>('Bobinas BQ')
  const [rawOrigin, setRawOrigin] = useState<string>('CSN')
  const [rawPriority, setRawPriority] = useState<number>(1)
  const [rawCond, setRawCond] = useState<string>('')
  const [rawSource, setRawSource] = useState<'MANUAL' | 'SAP'>('MANUAL')
  const [rawSapId, setRawSapId] = useState<string>('')

  // Produto Bloqueado
  const [blkCode, setBlkCode] = useState<string>('')
  const [blkDesc, setBlkDesc] = useState<string>('')
  const [blkReason, setBlkReason] = useState<string>('')
  const [blkType, setBlkType] = useState<any>('TECHNICAL')
  const [blkUser, setBlkUser] = useState<string>('')

  // Parada de Setup Matriz
  const [stpCode, setStpCode] = useState<string>('')
  const [stpDesc, setStpDesc] = useState<string>('')
  const [stpCat, setStpCat] = useState<any>('TOOL_CHANGE')
  const [stpFromFam, setStpFromFam] = useState<string>('')
  const [stpToFam, setStpToFam] = useState<string>('')
  const [stpDuration, setStpDuration] = useState<number>(60)
  const [stpImpact, setStpImpact] = useState<string>('')

  // Parada Programada (Dentro de Capacidade)
  const [schCode, setSchCode] = useState<string>('')
  const [schDesc, setSchDesc] = useState<string>('')
  const [schCat, setSchCat] = useState<any>('PREVENTIVE')
  const [schRec, setSchRec] = useState<any>('DAILY')
  const [schDur, setSchDur] = useState<number>(30)
  const [schTime, setSchTime] = useState<string>('12:00')
  const [schImpact, setSchImpact] = useState<string>(
    'Redução direta da capacidade útil disponível no turno.',
  )

  // Handlers de Gravação
  const handleSaveProductivity = async () => {
    if (!prodMaterialCode || !prodMaterialName) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe código e descrição do produto.',
      })
      return
    }
    if (prodSource === 'SAP' && !prodSapId) {
      toast({
        variant: 'destructive',
        title: 'Origem SAP exige configuração',
        description: 'Vincule obrigatoriamente uma integração RFC/BAPI cadastrada no Catálogo SAP.',
      })
      return
    }

    try {
      await lineMasterService.saveProductivity({
        line_id: line.id,
        line_master_id: master?.id,
        product_family_id: prodFamilyId || undefined,
        material_product_code: prodMaterialCode.trim().toUpperCase(),
        material_product_name: prodMaterialName.trim(),
        dimension_spec: prodDim.trim(),
        productivity_unit: prodUnit,
        nominal_productivity: Number(prodNominal),
        planned_productivity: Number(prodPlanned),
        expected_efficiency_pct: Math.round((Number(prodPlanned) / Number(prodNominal)) * 100),
        source_mode: prodSource,
        sap_integration_id: prodSource === 'SAP' ? prodSapId : undefined,
        active: true,
      })

      toast({
        title: 'Produtividade Cadastrada',
        description: `${prodMaterialCode} (${prodNominal} ${prodUnit}) homologada.`,
      })
      setIsProdModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  const handleSaveRawMaterial = async () => {
    if (!rawCode || !rawDesc) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe código e descrição do material.',
      })
      return
    }
    if (rawSource === 'SAP' && !rawSapId) {
      toast({
        variant: 'destructive',
        title: 'Origem SAP exige configuração',
        description: 'Vincule uma integração BAPI/Z do Catálogo SAP.',
      })
      return
    }

    try {
      await lineMasterService.saveRawMaterialPriority({
        line_id: line.id,
        line_master_id: master?.id,
        material_code: rawCode.trim().toUpperCase(),
        material_description: rawDesc.trim(),
        material_group: rawGroup,
        material_origin: rawOrigin,
        priority_order: Number(rawPriority),
        condition_rule: rawCond,
        source_mode: rawSource,
        sap_integration_id: rawSource === 'SAP' ? rawSapId : undefined,
        active: true,
      })

      toast({
        title: 'Prioridade de Matéria-Prima Cadastrada',
        description: `Material ${rawCode} cadastrado com prioridade #${rawPriority}.`,
      })
      setIsRawModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  const handleSaveBlockedProduct = async () => {
    if (!blkCode || !blkReason) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe código do produto e motivo do bloqueio.',
      })
      return
    }

    try {
      await lineMasterService.saveBlockedProduct({
        line_id: line.id,
        line_master_id: master?.id,
        product_code: blkCode.trim().toUpperCase(),
        product_description: blkDesc.trim() || blkCode,
        block_reason: blkReason.trim(),
        block_type: blkType,
        responsible_user_id: blkUser || undefined,
        source_mode: 'MANUAL',
        active: true,
      })

      toast({
        title: 'Bloqueio de Produto Ativado',
        description: `Produto ${blkCode} bloqueado na linha ${line.code}. Restrição forte de programação.`,
      })
      setIsBlockModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  const handleSaveSetupMatrix = async () => {
    if (!stpCode || !stpDesc) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe código e descrição da transição de setup.',
      })
      return
    }

    try {
      await lineMasterService.saveSetupMatrix({
        line_id: line.id,
        line_master_id: master?.id,
        setup_code: stpCode.trim().toUpperCase(),
        setup_description: stpDesc.trim(),
        setup_category: stpCat,
        from_family_id: stpFromFam || undefined,
        to_family_id: stpToFam || undefined,
        setup_duration_minutes: Number(stpDuration),
        capacity_loss_impact: stpImpact.trim() || 'Troca programada de ferramental',
        source_mode: 'MANUAL',
        active: true,
      })

      toast({
        title: 'Matriz de Setup Cadastrada',
        description: `Transição ${stpCode} (${stpDuration} min) homologada.`,
      })
      setIsSetupMatrixModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  const handleSaveScheduledStop = async () => {
    if (!schCode || !schDesc) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe código e descrição da parada programada.',
      })
      return
    }

    try {
      await lineMasterService.saveScheduledStop({
        line_id: line.id,
        code: schCode.trim().toUpperCase(),
        description: schDesc.trim(),
        category: schCat,
        recurrence: schRec,
        expected_duration_minutes: Number(schDur),
        scheduled_time: schTime,
        impact: schImpact,
        active: true,
      })

      toast({
        title: 'Parada Programada Adicionada à Capacidade',
        description: `Parada ${schCode} cadastrada no cálculo de capacidade líquida.`,
      })
      setIsScheduledStopModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header da Linha em Pantone 2945 (#004C97) */}
      <div className="p-5 bg-gradient-to-r from-[#004C97] via-[#003870] to-slate-950 rounded-xl border border-blue-900/80 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-black text-2xl tracking-tight text-white">
              {line.code}
            </span>
            <span className="text-sm font-semibold text-blue-200">&bull; {line.name}</span>
            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-500 font-bold text-xs">
              {line.status}
            </Badge>
            {master && (
              <Badge className="bg-blue-950 text-cyan-300 border-cyan-600 font-mono text-xs">
                Ficha Mestre v{master.version}
              </Badge>
            )}
            <Badge
              className={`text-xs font-bold ${
                readyForScheduling
                  ? 'bg-emerald-900 text-emerald-200 border-emerald-500'
                  : 'bg-amber-900 text-amber-200 border-amber-500'
              }`}
            >
              {readyForScheduling ? 'Pronta para Programação (Ready)' : 'Ajustes Pendentes'}
            </Badge>
          </div>
          <p className="text-xs text-blue-100/80">
            {line.description ||
              'Linha de produção industrial configurada para o PCP Robotizado CIAFAL.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={onOpenSapCatalog}
            className="bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800 text-xs font-bold h-8 gap-1.5"
          >
            <Database className="w-3.5 h-3.5" /> Catálogo SAP
          </Button>
          <Button
            size="sm"
            onClick={onRefresh}
            variant="outline"
            className="border-blue-700 bg-blue-950/40 text-white hover:bg-blue-900 text-xs h-8 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* 2. Menu Interno de Navegação por Grupos (Regra 46 - Evitar excesso de tabs horizontais) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
        <button
          onClick={() => setMainGroup('OVERVIEW')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'OVERVIEW'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> VISÃO GERAL DA LINHA
        </button>

        <button
          onClick={() => setMainGroup('ORGANIZATION')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'ORGANIZATION'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> ORGANIZAÇÃO & APROVADORES (
          {managers.length + approvers.length})
        </button>

        <button
          onClick={() => setMainGroup('PROCESS')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'PROCESS'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" /> PROCESSO & SEQUENCIAMENTO ({sequencing.length})
        </button>

        <button
          onClick={() => setMainGroup('MASTERDATA')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'MASTERDATA'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> FICHA MESTRE EXPANDIDA
        </button>

        <button
          onClick={() => setMainGroup('GOVERNANCE')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'GOVERNANCE'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> GOVERNANÇA & FONTES SAP ({sapCatalog.length})
        </button>
      </div>

      {/* 3. CONTEÚDO: GRUPO 1 - VISÃO GERAL */}
      {mainGroup === 'OVERVIEW' && (
        <div className="space-y-5">
          {/* Alertas de Configuração (Regra 41) */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Diagnóstico & Alertas de Configuração ({alerts.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                      alt.level === 'CRITICAL'
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : alt.level === 'WARNING'
                          ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                          : 'bg-cyan-950/40 border-cyan-800 text-cyan-200'
                    }`}
                  >
                    {alt.level === 'CRITICAL' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    ) : alt.level === 'WARNING' ? (
                      <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <span className="font-bold block">{alt.title}</span>
                      <p className="text-[11px] opacity-90">{alt.description}</p>
                      {alt.resolutionAction && (
                        <span className="text-[10px] uppercase font-mono font-bold text-cyan-300 block pt-0.5">
                          &rarr; {alt.resolutionAction}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cards Principais 360 (Regra 40) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Gestor Responsável Titular
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {managers.length > 0 ? (
                  <div>
                    <span className="text-base font-bold text-white block">
                      {managers[0].expand?.user_id?.name || 'Gestor Vinculado'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {managers[0].role_title}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-rose-400 italic">Nenhum gestor cadastrado</span>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Aprovador Homologador
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {approvers.length > 0 ? (
                  <div>
                    <span className="text-base font-bold text-white block">
                      {approvers[0].expand?.user_id?.name || 'Aprovador PCP'}
                    </span>
                    <span className="text-[11px] text-cyan-400 font-mono">
                      {approvers[0].role_title} ({approvers[0].requirement_type})
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-amber-400 italic">
                    Aprovação Não Requerida / Opcional
                  </span>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Capacidade Nominal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white font-mono">
                    {master?.nominal_hourly_capacity || line.current_rate || 0}
                  </span>
                  <span className="text-xs text-cyan-400 font-bold">
                    {master?.capacity_unit || 't/h'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Eficiência Esperada: {master?.planned_efficiency_pct || line.efficiency || 90}%
                </span>
              </CardContent>
            </Card>

            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Completude da Linha
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-black text-cyan-300 font-mono">
                    {completeness}%
                  </span>
                  <Badge className="bg-slate-800 text-slate-300 text-[10px]">
                    {completeness >= 80 ? 'Excelente' : 'Parcial'}
                  </Badge>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      completeness >= 80
                        ? 'bg-emerald-500'
                        : completeness >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${completeness}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dados Técnicos e Mapeamento SAP / MES */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                Mapeamento de Centros e Sistemas Corporativos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Centro SAP (Werk):</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {line.sap_plant_code || master?.sap_plant_code || '1000 (CIAFAL)'}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Centro de Trabalho SAP:</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {line.sap_work_center || 'CRHD_LAM_L1'}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Equipamento SAP:</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {line.sap_equipment_id || 'EQ-100293'}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Identificador Telemetria MES:</span>
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    {line.mes_identifier || 'MES_OPC_L1'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. CONTEÚDO: GRUPO 2 - ORGANIZAÇÃO & APROVADORES */}
      {mainGroup === 'ORGANIZATION' && (
        <div className="space-y-6">
          {/* Hierarquia Organizacional (Regras 6 e 7) */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Hierarquia Organizacional Associada à Linha
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Estrutura corporativa do HUB CIAFAL (Diretoria &rarr; Gerência &rarr; Supervisão
                  &rarr; Gestor &rarr; Operação).
                </CardDescription>
              </div>
              <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px]">
                CONECTADO_HUB
              </Badge>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="space-y-2">
                {hierarchy.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-950 text-cyan-300 border border-blue-800 flex items-center justify-center font-bold text-xs">
                        #{h.org_level_order}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{h.org_level_name}</span>
                        <span className="text-[11px] text-slate-400">
                          {h.area_name} &bull; Cargo:{' '}
                          <strong className="text-slate-300">{h.job_title}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-semibold text-cyan-300 block">
                        {h.expand?.user_id?.name || 'Pendente de Atribuição'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {h.expand?.user_id?.email || 'HUB Central'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gestores da Linha (Regra 8) */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Gestores Operacionais da Linha
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Gestor Titular, Substituto e Adicionais vinculados aos usuários do HUB.
                </CardDescription>
              </div>
              <Can permission="pcp.admin.access">
                <Button
                  size="sm"
                  onClick={() => setIsManagerModalOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Gestor
                </Button>
              </Can>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {managers.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        {m.expand?.user_id?.name || 'Gestor'}
                      </span>
                      <Badge
                        className={`text-[10px] ${
                          m.responsibility_type === 'PRIMARY_MANAGER'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                        }`}
                      >
                        {m.responsibility_type}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 block">{m.role_title}</span>
                    <p className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
                      {m.scope_description || 'Responsável operacional pela linha.'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Matriz de Aprovadores (Regras 9 e 10) */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Matriz de Aprovadores da Linha (Workflow de Aprovação)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Definição de alçadas: Estágio 1 (PCP) &rarr; Estágio 2 (Gestor de Linha) &rarr;
                  Qualidade / Diretor.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Ordem</th>
                      <th className="p-2.5">Estágio / Tipo</th>
                      <th className="p-2.5">Aprovador Homologador</th>
                      <th className="p-2.5">Substituto Homologado</th>
                      <th className="p-2.5">Exigência</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {approvers.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-900/60">
                        <td className="p-2.5 font-bold text-cyan-300">#{a.sequence_order}</td>
                        <td className="p-2.5">
                          <span className="font-semibold text-white block">{a.approval_stage}</span>
                          <span className="text-[10px] text-slate-400">{a.approval_type}</span>
                        </td>
                        <td className="p-2.5 font-medium text-white">
                          {a.expand?.user_id?.name || 'Aprovador'}
                        </td>
                        <td className="p-2.5 text-slate-400">
                          {a.expand?.substitute_user_id?.name || 'Não cadastrado'}
                        </td>
                        <td className="p-2.5">
                          <Badge
                            className={`text-[10px] ${
                              a.requirement_type === 'MANDATORY'
                                ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {a.requirement_type}
                          </Badge>
                        </td>
                        <td className="p-2.5">
                          <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">
                            Ativo
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. CONTEÚDO: GRUPO 3 - PROCESSO & SEQUENCIAMENTO */}
      {mainGroup === 'PROCESS' && (
        <div className="space-y-6">
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-cyan-400" />
                Sequenciamento Estrutural no Fluxo Produtivo (Regras 11 e 12)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Dependências físicas e fluxos entre linhas (Predecessores &rarr; Esta Linha &rarr;
                Sucessores & Pulmões).
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-4">
              {sequencing.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Nenhum sequenciamento produtivo cadastrado para esta linha.
                </div>
              ) : (
                sequencing.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#004C97] text-white font-mono text-xs">
                          Etapa #{s.sequence_order}
                        </Badge>
                        <span className="text-xs font-bold text-white">
                          Relação {s.relation_nature} ({s.dependency_type})
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[11px] border-cyan-800 text-cyan-300 font-mono"
                      >
                        Lead Time Padrão: {s.standard_lead_time_minutes || 0} min
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Predecessor */}
                      <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                        <span className="text-slate-400 block uppercase text-[10px] font-bold text-amber-400">
                          &larr; Origem / Predecessor
                        </span>
                        <span className="font-bold text-white block">
                          {s.previous_process_name || 'Processo Externo / Matéria-Prima'}
                        </span>
                        {s.expand?.previous_line_id && (
                          <span className="text-cyan-400 font-mono text-[11px]">
                            Linha: {s.expand.previous_line_id.code} (
                            {s.expand.previous_line_id.name})
                          </span>
                        )}
                      </div>

                      {/* Sucessor */}
                      <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                        <span className="text-slate-400 block uppercase text-[10px] font-bold text-emerald-400">
                          &rarr; Destino / Sucessor
                        </span>
                        <span className="font-bold text-white block">
                          {s.next_process_name || 'Expedição / Estoque Intermediário'}
                        </span>
                        {s.expand?.next_line_id && (
                          <span className="text-cyan-400 font-mono text-[11px]">
                            Linha: {s.expand.next_line_id.code} ({s.expand.next_line_id.name})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pulmão Intermediário */}
                    {s.intermediate_buffer_type && (
                      <div className="p-2.5 bg-blue-950/30 rounded border border-blue-900/60 text-xs flex items-center justify-between">
                        <span className="text-blue-200">
                          Pulmão: <strong>{s.intermediate_buffer_type}</strong>
                        </span>
                        <span className="font-mono font-bold text-cyan-300">
                          Capacidade: {s.intermediate_buffer_capacity} {s.intermediate_buffer_unit}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. CONTEÚDO: GRUPO 4 - FICHA MESTRE EXPANDIDA */}
      {mainGroup === 'MASTERDATA' && (
        <div className="space-y-4">
          {/* Sub-Tabs da Ficha Mestre Expandida */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
            <Button
              size="sm"
              variant={masterSubTab === 'CAPACITY' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('CAPACITY')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'CAPACITY' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Capacidade & Paradas Programadas
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'PRODUCTIVITY' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('PRODUCTIVITY')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'PRODUCTIVITY' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Produtividade ({productivity.length})
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'RAW_MATERIALS' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('RAW_MATERIALS')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'RAW_MATERIALS' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Prioridades de Matéria-Prima ({rawMaterials.length}
              )
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'BLOCKED' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('BLOCKED')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'BLOCKED' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Produtos Bloqueados ({blockedProducts.length})
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'SETUP_MATRIX' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('SETUP_MATRIX')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'SETUP_MATRIX' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" /> Matriz de Setup De&rarr;Para ({setupMatrix.length})
            </Button>
          </div>

          {/* SUB-ABA 1: CAPACIDADE & PARADAS PROGRAMADAS (Regra 15) */}
          {masterSubTab === 'CAPACITY' && (
            <div className="space-y-4">
              <Card className="bg-slate-950 border-slate-800 text-slate-100">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Capacidades Nominais da Linha
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block">Capacidade Horária:</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {master?.nominal_hourly_capacity || 0} {master?.capacity_unit || 't/h'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block">Capacidade por Turno:</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {master?.nominal_shift_capacity || 0} {master?.capacity_unit || 't'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block">Capacidade Diária (3T):</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {master?.nominal_daily_capacity || 0} {master?.capacity_unit || 't'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block">Capacidade Mensal:</span>
                      <span className="text-lg font-mono font-bold text-cyan-300">
                        {master?.nominal_monthly_capacity || 0} {master?.capacity_unit || 't'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bloco: Paradas Programadas que Reduzem Capacidade (Regra 15 e 16) */}
              <Card className="bg-slate-950 border-slate-800 text-slate-100">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <PauseCircle className="w-4 h-4 text-amber-400" />
                      Paradas Programadas que Reduzem Capacidade (Regra 15)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Paradas padrão de rotina que abatem capacidade líquida (Manutenção preventiva,
                      limpeza, reuniões).
                      <strong className="text-amber-300 block pt-0.5">
                        * Nota de Governança (Regra 16): Paradas extraordinárias NÃO possuem
                        cadastro manual — alimentadas via SAP ZPP003.
                      </strong>
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsScheduledStopModalOpen(true)}
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-7 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova Parada
                  </Button>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Categoria</th>
                          <th className="p-2.5">Recorrência</th>
                          <th className="p-2.5">Duração (min)</th>
                          <th className="p-2.5">Impacto na Capacidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {scheduledStops.map((ss) => (
                          <tr key={ss.id} className="hover:bg-slate-900/60">
                            <td className="p-2.5 font-mono font-bold text-white">{ss.code}</td>
                            <td className="p-2.5 text-slate-200">{ss.description}</td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="text-[10px] border-slate-700">
                                {ss.category}
                              </Badge>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-cyan-300">
                              {ss.recurrence}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-amber-300">
                              {ss.expected_duration_minutes} min
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-400">{ss.impact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SUB-ABA 2: PRODUTIVIDADE (Regras 23, 24, 25) */}
          {masterSubTab === 'PRODUCTIVITY' && (
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    Tabela de Produtividade & Cadência de Materiais (Regra 23 e 24)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Cadência nominal e planejada por produto, família e dimensão (Unidades: t/h,
                    peça/h, m/h).
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsProdModalOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Cadastrar Produtividade
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Produto / Material</th>
                        <th className="p-2.5">Dimensão</th>
                        <th className="p-2.5">Unidade</th>
                        <th className="p-2.5">Prod. Nominal</th>
                        <th className="p-2.5">Prod. Planejada</th>
                        <th className="p-2.5">Eficiência</th>
                        <th className="p-2.5">Fonte Oficial</th>
                        <th className="p-2.5">Status Fonte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {productivity.map((p) => {
                        const isSap = p.source_mode === 'SAP'
                        return (
                          <tr key={p.id} className="hover:bg-slate-900/60">
                            <td className="p-2.5">
                              <span className="font-mono font-bold text-white block">
                                {p.material_product_code}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {p.material_product_name}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-300">
                              {p.dimension_spec || '-'}
                            </td>
                            <td className="p-2.5 font-bold text-cyan-300">{p.productivity_unit}</td>
                            <td className="p-2.5 font-mono font-bold text-white">
                              {p.nominal_productivity}
                            </td>
                            <td className="p-2.5 font-mono text-slate-200">
                              {p.planned_productivity}
                            </td>
                            <td className="p-2.5 font-mono text-emerald-400 font-bold">
                              {p.expected_efficiency_pct}%
                            </td>
                            <td className="p-2.5">
                              <Badge
                                className={`text-[10px] ${
                                  isSap
                                    ? 'bg-blue-950 text-cyan-300 border-blue-700'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {p.source_mode}
                              </Badge>
                            </td>
                            <td className="p-2.5">
                              {isSap ? (
                                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-600 text-[10px]">
                                  {p.expand?.sap_integration_id?.last_status || 'CONECTADO'}
                                </Badge>
                              ) : (
                                <span className="text-slate-500 font-mono text-[10px]">
                                  Manual Homologado
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SUB-ABA 3: PRIORIDADES DE MATÉRIA-PRIMA (Regras 17 e 18) */}
          {masterSubTab === 'RAW_MATERIALS' && (
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Prioridades de Matéria-Prima & Bobinas (Regra 17 e 18)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Materiais preferenciais para a programação (1 = Prioridade Máxima).
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsRawModalOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Matéria-Prima
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Prioridade</th>
                        <th className="p-2.5">Material</th>
                        <th className="p-2.5">Origem / Fornecedor</th>
                        <th className="p-2.5">Regra / Condição</th>
                        <th className="p-2.5">Fonte</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {rawMaterials.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/60">
                          <td className="p-2.5">
                            <Badge className="bg-amber-950 text-amber-300 border-amber-600 font-mono font-bold text-xs">
                              #{r.priority_order}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <span className="font-mono font-bold text-white block">
                              {r.material_code}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {r.material_description}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-300 font-medium">
                            {r.material_origin || 'CSN / Gerdau'}
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-400">
                            {r.condition_rule || 'Uso Padrão'}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] border-slate-700">
                              {r.source_mode}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">
                              Ativo
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SUB-ABA 4: PRODUTOS BLOQUEADOS (Regras 19 e 20) */}
          {masterSubTab === 'BLOCKED' && (
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-400" />
                    Produtos Bloqueados na Linha (Restrição Forte de Programação)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Materiais que NÃO podem ser alocados nesta linha sob nenhuma circunstância.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsBlockModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-7 gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Bloqueio
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Produto</th>
                        <th className="p-2.5">Tipo do Bloqueio</th>
                        <th className="p-2.5">Motivo Técnico do Bloqueio</th>
                        <th className="p-2.5">Responsável</th>
                        <th className="p-2.5">Fonte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {blockedProducts.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-900/60">
                          <td className="p-2.5">
                            <span className="font-mono font-bold text-rose-400 block">
                              {b.product_code}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {b.product_description}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px]">
                              {b.block_type}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-xs text-slate-300 max-w-md">
                            {b.block_reason}
                          </td>
                          <td className="p-2.5 text-slate-400">
                            {b.expand?.responsible_user_id?.name || 'Sistema'}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] border-slate-700">
                              {b.source_mode}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SUB-ABA 5: MATRIZ DE SETUP (Regras 21 e 22) */}
          {masterSubTab === 'SETUP_MATRIX' && (
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-cyan-400" />
                    Matriz De &rarr; Para de Trocas de Setup (Regra 21 e 22)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Tempos de transição entre famílias, produtos e cassetes de conformação.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsSetupMatrixModalOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Transição de Setup
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Código Setup</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5">Categoria</th>
                        <th className="p-2.5">Transição (De &rarr; Para)</th>
                        <th className="p-2.5">Duração Padrão</th>
                        <th className="p-2.5">Fonte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {setupMatrix.map((sm) => (
                        <tr key={sm.id} className="hover:bg-slate-900/60">
                          <td className="p-2.5 font-mono font-bold text-cyan-300">
                            {sm.setup_code}
                          </td>
                          <td className="p-2.5 text-slate-200">{sm.setup_description}</td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] border-slate-700">
                              {sm.setup_category}
                            </Badge>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-300">
                            {sm.expand?.from_family_id?.name || 'Qualquer'} &rarr;{' '}
                            {sm.expand?.to_family_id?.name || 'Qualquer'}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-amber-300">
                            {sm.setup_duration_minutes} min
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] border-slate-700">
                              {sm.source_mode}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 7. CONTEÚDO: GRUPO 5 - GOVERNANÇA & FONTES SAP */}
      {mainGroup === 'GOVERNANCE' && (
        <div className="space-y-6">
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Fontes de Dados Conectadas à Linha (SAP vs MANUAL)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Governança das integrações RFC/BAPI e trilha auditável de alteração de origem.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={onOpenSapCatalog}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 font-bold gap-1.5"
              >
                <Server className="w-3.5 h-3.5" /> Abrir Catálogo Central SAP
              </Button>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-300 uppercase block text-[11px]">
                    Extrator de Produtividade SAP
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Sincronização de cadências e tempos de roteiro a partir do módulo standard RFC.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <Badge className="bg-blue-950 text-cyan-300 border-blue-700 font-mono text-[10px]">
                      BAPI_ROUTING_GET_DETAIL
                    </Badge>
                    <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">CONECTADO</Badge>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-amber-300 uppercase block text-[11px]">
                    Extrator Customizado CIAFAL (Z)
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Prioridades de bobinas e matérias-primas homologadas no SAP ECC.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <Badge className="bg-amber-950 text-amber-300 border-amber-700 font-mono text-[10px]">
                      Z_CIAFAL_PCP_RAW_MAT_PRIORITY
                    </Badge>
                    <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">
                      CUSTOM CIAFAL
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-rose-300 uppercase block text-[11px]">
                    Bloqueios de Qualidade QM/PP
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Restrições fortes e bloqueios de engenharia importados do SAP.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <Badge className="bg-rose-950 text-rose-300 border-rose-700 font-mono text-[10px]">
                      Z_CIAFAL_PP_BLOCKED_MATERIALS
                    </Badge>
                    <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">
                      CUSTOM CIAFAL
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histórico & Trilha de Versões (Regra 44 e 45) */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Histórico de Versões & Auditoria da Linha
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2">
                {history.length === 0 ? (
                  <span className="text-xs text-slate-500">Nenhum histórico registrado ainda.</span>
                ) : (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 bg-slate-900/70 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[#004C97] text-white font-mono text-[10px]">
                          v{h.version}
                        </Badge>
                        <div>
                          <span className="font-bold text-white block">{h.action}</span>
                          <span className="text-[11px] text-slate-400">{h.change_reason}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <span className="block font-medium text-slate-300">
                          {h.expand?.changed_by?.name || 'Sistema'}
                        </span>
                        <span>{new Date(h.created).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Cadastrar Produtividade */}
      <Dialog open={isProdModalOpen} onOpenChange={setIsProdModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              Cadastrar Produtividade de Material
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Código do Produto / Material</Label>
                <Input
                  placeholder="Ex: TQ-50x50x2.0"
                  value={prodMaterialCode}
                  onChange={(e) => setProdMaterialCode(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white font-mono uppercase font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Família de Produtos</Label>
                <select
                  value={prodFamilyId}
                  onChange={(e) => setProdFamilyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="">Selecione a família...</option>
                  {productFamilies.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} - {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Descrição do Material</Label>
              <Input
                placeholder="Ex: Tubo Quadrado 50x50x2.00mm SAE 1012"
                value={prodMaterialName}
                onChange={(e) => setProdMaterialName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Unidade de Medida</Label>
                <select
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="t/h">t/h (Toneladas/h)</option>
                  <option value="peça/h">peça/h</option>
                  <option value="m/h">m/h</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Prod. Nominal</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={prodNominal}
                  onChange={(e) => setProdNominal(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-white font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Prod. Planejada</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={prodPlanned}
                  onChange={(e) => setProdPlanned(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            {/* Origem: SAP vs MANUAL (Regras 25, 26, 27) */}
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-cyan-400">
                  Origem do Cadastro (Regra 25)
                </Label>
                <select
                  value={prodSource}
                  onChange={(e) => setProdSource(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded text-xs text-white p-1"
                >
                  <option value="MANUAL">MANUAL (Auditável)</option>
                  <option value="SAP">SAP (RFC / BAPI)</option>
                </select>
              </div>

              {prodSource === 'SAP' && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">
                    Integração do Catálogo SAP (Obrigatório)
                  </Label>
                  <select
                    value={prodSapId}
                    onChange={(e) => setProdSapId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-cyan-300 p-2"
                  >
                    <option value="">Selecione a BAPI / Integração homologada...</option>
                    {sapCatalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} ({s.function_name} - {s.standard_or_z})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProdModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveProductivity}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              Homologar Produtividade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastrar Prioridade de Matéria-Prima */}
      <Dialog open={isRawModalOpen} onOpenChange={setIsRawModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Cadastrar Prioridade de Matéria-Prima
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Código do Material (Bobina/Aço)</Label>
                <Input
                  placeholder="Ex: BOB_CSN_BQ_1012"
                  value={rawCode}
                  onChange={(e) => setRawCode(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white font-mono uppercase font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Ordem de Prioridade (1 = Máx)</Label>
                <Input
                  type="number"
                  min="1"
                  value={rawPriority}
                  onChange={(e) => setRawPriority(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-amber-300 font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Descrição do Material</Label>
              <Input
                placeholder="Ex: Bobina Laminada a Quente SAE 1012"
                value={rawDesc}
                onChange={(e) => setRawDesc(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Origem / Usina Fornecedora</Label>
                <Input
                  placeholder="Ex: CSN Volta Redonda"
                  value={rawOrigin}
                  onChange={(e) => setRawOrigin(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Grupo do Material</Label>
                <Input
                  value={rawGroup}
                  onChange={(e) => setRawGroup(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-cyan-400">Origem do Cadastro</Label>
                <select
                  value={rawSource}
                  onChange={(e) => setRawSource(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded text-xs text-white p-1"
                >
                  <option value="MANUAL">MANUAL</option>
                  <option value="SAP">SAP</option>
                </select>
              </div>

              {rawSource === 'SAP' && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Integração SAP</Label>
                  <select
                    value={rawSapId}
                    onChange={(e) => setRawSapId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-cyan-300 p-2"
                  >
                    <option value="">Selecione a BAPI / Função Z...</option>
                    {sapCatalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} ({s.function_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRawModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveRawMaterial}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              Salvar Prioridade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastrar Produto Bloqueado */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              Bloquear Produto na Linha (Restrição Forte)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Código do Produto a Bloquear</Label>
              <Input
                placeholder="Ex: TQ-100x100x8.0"
                value={blkCode}
                onChange={(e) => setBlkCode(e.target.value)}
                className="bg-slate-900 border-slate-700 text-rose-400 font-mono uppercase font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Tipo de Bloqueio</Label>
              <select
                value={blkType}
                onChange={(e) => setBlkType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="TECHNICAL">TECHNICAL (Restrição de Ferramental / Espessura)</option>
                <option value="CAPACITY">CAPACITY (Excesso de Carga / Força Mecânica)</option>
                <option value="QUALITY">QUALITY (Problema de Homologação / Solda)</option>
                <option value="PROCESS">PROCESS (Incompatibilidade com o Processo)</option>
                <option value="TEMPORARY">TEMPORARY (Bloqueio Temporário)</option>
                <option value="TOTAL">TOTAL (Bloqueio Permanente)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">
                Motivo / Justificativa Técnica do Bloqueio
              </Label>
              <Input
                placeholder="Ex: Espessura 8.0mm excede tração máxima dos roletes conformadores."
                value={blkReason}
                onChange={(e) => setBlkReason(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Usuário Responsável pelo Bloqueio</Label>
              <select
                value={blkUser}
                onChange={(e) => setBlkUser(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="">Selecione o responsável...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBlockModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBlockedProduct}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastrar Parada Programada (Capacidade) */}
      <Dialog open={isScheduledStopModalOpen} onOpenChange={setIsScheduledStopModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <PauseCircle className="w-4 h-4 text-amber-400" />
              Adicionar Parada Programada à Capacidade
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Código da Parada</Label>
                <Input
                  placeholder="Ex: STOP_PREV_L1"
                  value={schCode}
                  onChange={(e) => setSchCode(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white font-mono uppercase font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Categoria</Label>
                <select
                  value={schCat}
                  onChange={(e) => setSchCat(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="PREVENTIVE">PREVENTIVE (Manutenção Preventiva)</option>
                  <option value="CLEANING">CLEANING (Limpeza e 5S)</option>
                  <option value="MEETING">MEETING (DDS / Reunião de Turno)</option>
                  <option value="TOOLING_CHANGE">TOOLING_CHANGE (Ajuste Periódico)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Descrição da Atividade</Label>
              <Input
                placeholder="Ex: Lubrificação diária e inspeção de cabeçotes"
                value={schDesc}
                onChange={(e) => setSchDesc(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Recorrência</Label>
                <select
                  value={schRec}
                  onChange={(e) => setSchRec(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="DAILY">DAILY (Diária)</option>
                  <option value="PER_SHIFT">PER_SHIFT (Por Turno)</option>
                  <option value="WEEKLY">WEEKLY (Semanal)</option>
                  <option value="MONTHLY">MONTHLY (Mensal)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Duração (min)</Label>
                <Input
                  type="number"
                  value={schDur}
                  onChange={(e) => setSchDur(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-amber-300 font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Horário Programado</Label>
                <Input
                  type="time"
                  value={schTime}
                  onChange={(e) => setSchTime(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScheduledStopModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveScheduledStop}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs"
            >
              Gravar Parada Programada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
