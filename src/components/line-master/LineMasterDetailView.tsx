import React, { useState } from 'react'
import {
  LineMaster,
  FullLineMasterBundle,
  ProductionShift,
  StandardScheduledStop,
  LineSetup,
  LineCapability,
  LineStructuralConstraint,
  ResourceType,
  CapacityUnit,
} from '@/types/line-master'
import { UserProfile } from '@/types/pcp-auth'
import { useAuth } from '@/contexts/AuthContext'
import {
  Sliders,
  ShieldCheck,
  History,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Wrench,
  Cpu,
  Plus,
  Edit,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  Building,
  Gauge,
  Box,
  CornerDownRight,
  ChevronRight,
  GitCommit,
  Info,
  Check,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { lineMasterService } from '@/services/line-master'

interface LineMasterDetailViewProps {
  bundle: FullLineMasterBundle
  users: UserProfile[]
  onRefresh: () => void
  onBack: () => void
}

export const LineMasterDetailView: React.FC<LineMasterDetailViewProps> = ({
  bundle,
  users,
  onRefresh,
  onBack,
}) => {
  const { can, hasLineScope } = useAuth()
  const { toast } = useToast()
  const canEdit = can('pcp.masterdata.edit') && hasLineScope(bundle.line.id)

  const active = bundle.activeMaster
  const [selectedTab, setSelectedTab] = useState<string>('resumo')

  // Modais de Edição / Nova Versão
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false)
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false)
  const [diffTargetVersion, setDiffTargetVersion] = useState<LineMaster | null>(null)
  const [isAiContextOpen, setIsAiContextOpen] = useState(false)
  const [aiContextJson, setAiContextJson] = useState<string>('')

  // Form de Nova Versão
  const [formData, setFormData] = useState<Partial<LineMaster>>({
    code: active?.code || bundle.line.code,
    name: active?.name || bundle.line.name,
    description: active?.description || '',
    resource_type: active?.resource_type || 'PRODUCTION_LINE',
    unit: active?.unit || 'Planta Principal CIAFAL',
    sap_plant_code: active?.sap_plant_code || '1000',
    sector: active?.sector || '',
    process_step: active?.process_step || '',
    primary_responsible_id: active?.primary_responsible_id || '',
    substitute_responsible_id: active?.substitute_responsible_id || '',
    capacity_unit: active?.capacity_unit || 't/h',
    nominal_hourly_capacity: active?.nominal_hourly_capacity || 10,
    nominal_shift_capacity: active?.nominal_shift_capacity || 80,
    nominal_daily_capacity: active?.nominal_daily_capacity || 240,
    nominal_monthly_capacity: active?.nominal_monthly_capacity || 5000,
    planned_efficiency_pct: active?.planned_efficiency_pct || 90,
    max_recommended_utilization_pct: active?.max_recommended_utilization_pct || 85,
    min_batch_size: active?.min_batch_size || 5,
    max_batch_size: active?.max_batch_size || 100,
    capacity_notes: active?.capacity_notes || '',
    input_buffer_type: active?.input_buffer_type || '',
    input_buffer_capacity: active?.input_buffer_capacity || 0,
    input_buffer_unit: active?.input_buffer_unit || 't',
    output_buffer_type: active?.output_buffer_type || '',
    output_buffer_capacity: active?.output_buffer_capacity || 0,
    output_buffer_unit: active?.output_buffer_unit || 't',
    change_reason: '',
    status: 'ACTIVE',
  })

  const handleOpenNewVersion = () => {
    if (!active) return
    setFormData({
      ...active,
      version: (active.version || 1) + 1,
      change_reason: '',
      status: 'ACTIVE',
    })
    setIsNewVersionOpen(true)
  }

  const handleSaveNewVersion = async () => {
    if (!formData.change_reason?.trim()) {
      toast({
        title: 'Justificativa Obrigatória',
        description: 'Informe a justificativa técnica para gerar a nova versão da Ficha Mestre.',
        variant: 'destructive',
      })
      return
    }

    if (Number(formData.nominal_hourly_capacity) <= 0) {
      toast({
        title: 'Capacidade Inválida',
        description: 'A capacidade nominal horária deve ser maior que zero (> 0).',
        variant: 'destructive',
      })
      return
    }

    if (
      formData.min_batch_size &&
      formData.max_batch_size &&
      Number(formData.min_batch_size) > Number(formData.max_batch_size)
    ) {
      toast({
        title: 'Lote Inválido',
        description: 'O lote mínimo não pode ser superior ao lote máximo.',
        variant: 'destructive',
      })
      return
    }

    try {
      const nextVersion = (active?.version || 1) + 1
      await lineMasterService.createNewVersion({
        ...formData,
        line_id: bundle.line.id,
        version: nextVersion,
        completeness_score: active?.completeness_score || 90,
        ready_for_scheduling: true,
        source_type: 'MANUAL_CONFIG',
        change_reason: formData.change_reason,
      })

      toast({
        title: `Versão ${nextVersion} Homologada`,
        description: 'Nova versão da Ficha Mestre cadastrada e ativada com sucesso.',
      })
      setIsNewVersionOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({
        title: 'Falha ao Salvar Versão',
        description: err.message || 'Erro ao registrar nova versão.',
        variant: 'destructive',
      })
    }
  }

  const handleFetchAiContext = async () => {
    try {
      const data = await lineMasterService.fetchLineMasterContext(bundle.line.id)
      setAiContextJson(JSON.stringify(data, null, 2))
      setIsAiContextOpen(true)
    } catch (err: any) {
      toast({
        title: 'Falha ao Obter DTO de Contexto',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleOpenDiff = (version: LineMaster) => {
    setDiffTargetVersion(version)
    setIsDiffModalOpen(true)
  }

  const primaryResp = users.find((u) => u.id === active?.primary_responsible_id)
  const substituteResp = users.find((u) => u.id === active?.substitute_responsible_id)

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#004C97]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="h-8 border-slate-700 bg-slate-950 text-slate-300 hover:text-white"
              >
                &larr; Voltar
              </Button>

              <Badge className="bg-[#004C97] text-white font-mono text-xs border border-blue-400/40">
                {active?.code || bundle.line.code}
              </Badge>

              <h1 className="text-xl font-black text-white tracking-tight">
                {active?.name || bundle.line.name}
              </h1>

              {active?.ready_for_scheduling ? (
                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-xs flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PRONTA PARA PROGRAMAÇÃO
                </Badge>
              ) : (
                <Badge className="bg-amber-950 text-amber-300 border-amber-700 text-xs flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  CONFIGURAÇÃO INCOMPLETA
                </Badge>
              )}

              <Badge
                variant="outline"
                className="text-xs border-slate-700 bg-slate-950 text-slate-300"
              >
                Versão Atual: V{active?.version || 1} ({active?.status || 'ACTIVE'})
              </Badge>
            </div>

            <p className="text-xs text-slate-400">
              {active?.description || 'Cadastro técnico estrutural e versionado do recurso.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchAiContext}
              className="border-slate-700 bg-slate-950 text-slate-300 hover:text-cyan-400 text-xs gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Ver DTO IA / Motor
            </Button>

            {canEdit && (
              <Button
                size="sm"
                onClick={handleOpenNewVersion}
                className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-bold gap-1.5 shadow-md"
              >
                <GitCommit className="w-3.5 h-3.5" />
                Criar Nova Versão (V{(active?.version || 1) + 1})
              </Button>
            )}
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Capacidade Nominal
            </span>
            <span className="text-sm font-black text-white">
              {active?.nominal_hourly_capacity || 0} {active?.capacity_unit || 't/h'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Eficiência Planejada
            </span>
            <span className="text-sm font-black text-emerald-400">
              {active?.planned_efficiency_pct || 0}%
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Turnos Ativos
            </span>
            <span className="text-sm font-black text-white">{bundle.shifts.length} turnos</span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Famílias / Capabilities
            </span>
            <span className="text-sm font-black text-cyan-400">
              {bundle.capabilities.length} homologadas
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Paradas Programadas
            </span>
            <span className="text-sm font-black text-amber-400">{bundle.stops.length} padrão</span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Completude Técnica
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-black text-white">
                {active?.completeness_score || 0}%
              </span>
              <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#004C97] h-full"
                  style={{ width: `${active?.completeness_score || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 flex flex-wrap h-auto gap-1 text-xs">
          <TabsTrigger
            value="resumo"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Resumo & Alertas
          </TabsTrigger>
          <TabsTrigger
            value="identificacao"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Identificação
          </TabsTrigger>
          <TabsTrigger
            value="capacidade"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Capacidade Produtiva
          </TabsTrigger>
          <TabsTrigger
            value="turnos"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Turnos & Jornada ({bundle.shifts.length})
          </TabsTrigger>
          <TabsTrigger
            value="calendario"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Calendário Produtivo
          </TabsTrigger>
          <TabsTrigger
            value="capabilities"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Famílias & Capabilities ({bundle.capabilities.length})
          </TabsTrigger>
          <TabsTrigger
            value="setups"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Setups ({bundle.setups.length})
          </TabsTrigger>
          <TabsTrigger
            value="restricoes"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Restrições Técnicas ({bundle.constraints.length})
          </TabsTrigger>
          <TabsTrigger
            value="paradas"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Paradas Programadas ({bundle.stops.length})
          </TabsTrigger>
          <TabsTrigger
            value="dependencias"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Dependências
          </TabsTrigger>
          <TabsTrigger
            value="regras"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Regras de Programação
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-slate-300"
          >
            Histórico & Versões ({bundle.versions.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Resumo */}
        <TabsContent value="resumo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#004C97]" />
                  Configuração & Governança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Versão Homologada:</span>
                  <span className="font-bold text-white">V{active?.version || 1}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Vigência Inicial:</span>
                  <span className="text-slate-200">
                    {active?.valid_from
                      ? new Date(active.valid_from).toLocaleDateString()
                      : '01/01/2026'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Origem dos Dados:</span>
                  <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-950">
                    {active?.source_type || 'ENGINEERING'}
                  </Badge>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Pronta p/ Sequenciamento:</span>
                  <span
                    className={`font-bold ${active?.ready_for_scheduling ? 'text-emerald-400' : 'text-amber-400'}`}
                  >
                    {active?.ready_for_scheduling ? 'SIM' : 'NÃO'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  Operação & Capacidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Capacidade Horária:</span>
                  <span className="font-bold text-white">
                    {active?.nominal_hourly_capacity || 0} {active?.capacity_unit}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Capacidade Turno:</span>
                  <span className="text-slate-200">
                    {active?.nominal_shift_capacity || 0} {active?.capacity_unit}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Lote Recomendado:</span>
                  <span className="text-slate-200">
                    {active?.min_batch_size || 0} a {active?.max_batch_size || 0}{' '}
                    {active?.capacity_unit}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Utilização Máxima Rec.:</span>
                  <span className="font-bold text-cyan-400">
                    {active?.max_recommended_utilization_pct || 85}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Diagnóstico de Prontidão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {active?.missing_requirements && active.missing_requirements.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-amber-400 font-semibold">
                      Itens Pendentes para Programação:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {active.missing_requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-emerald-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Todos os Requisitos Atendidos
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Identificação, capacidades, turnos, calendários, capabilities e limites
                      dimensionais estão devidamente parametrizados e prontos para o motor de
                      programação.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Destaque das diferenças estruturais (Ficha Mestre vs Rule Pack vs ZPP003) */}
          <Card className="bg-slate-900/60 border-slate-800 text-slate-300 text-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#004C97]" />
                Arquitetura de Segregação de Dados CIAFAL (Prompt 03)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="font-bold text-white block mb-1">
                    ✓ Ficha Mestre (Este Módulo)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    O que a linha é, seus limites físicos/térmicos, parâmetros estruturais e
                    capacidades nominais.
                  </p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="font-bold text-slate-400 block mb-1">
                    ✕ Rule Packs (Prompt 04)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Regras de sequenciamento industrial e preferências de campanha (ex: transição A
                    &rarr; B).
                  </p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="font-bold text-slate-400 block mb-1">
                    ✕ SAP ZPP003 (Futuro/Histórico)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Paradas extraordinárias não programadas (quebras, faltas de energia, sinistros).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Identificação */}
        <TabsContent value="identificacao">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">
                Identificação Estrutural do Recurso
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Parâmetros cadastrais e alocação hierárquica na planta CIAFAL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-400">Código do Recurso</Label>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono font-bold text-white mt-1">
                    {active?.code || bundle.line.code}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400">Nome Oficial</Label>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 font-bold text-white mt-1">
                    {active?.name || bundle.line.name}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400">Tipo de Recurso (Enum)</Label>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 text-cyan-300 font-semibold mt-1">
                    {active?.resource_type || 'PRODUCTION_LINE'}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400">Unidade Operacional</Label>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-200 mt-1">
                    {active?.unit || 'Planta Principal CIAFAL'}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400">Centro SAP ECC</Label>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-slate-200 mt-1">
                    {active?.sap_plant_code || '1000'}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400">Setor Fabril</Label>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-200 mt-1">
                    {active?.sector || 'Conformação Mecânica'}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400">Etapa de Processo</Label>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-200 mt-1">
                    {active?.process_step || 'Processamento Primário'}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400">Responsável Principal (Gestor)</Label>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-200 mt-1">
                    {primaryResp ? `${primaryResp.name} (${primaryResp.email})` : 'Não vinculado'}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400">Responsável Substituto</Label>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-200 mt-1">
                    {substituteResp
                      ? `${substituteResp.name} (${substituteResp.email})`
                      : 'Não vinculado'}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-slate-400">Descrição Técnica Estrutural</Label>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-300 mt-1">
                  {active?.description || 'Sem descrição adicional.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Capacidade */}
        <TabsContent value="capacidade">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">
                Capacidade Produtiva Estrutural
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Parâmetros estruturais e nominais. (Nota: Disponível é calculada dinamicamente;
                Realizada provém de MES/Histórico).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Unidade Padrão</span>
                  <span className="text-base font-black text-white font-mono">
                    {active?.capacity_unit || 't/h'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Capacidade Nominal / Hora</span>
                  <span className="text-base font-black text-white">
                    {active?.nominal_hourly_capacity || 0} {active?.capacity_unit}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Capacidade Nominal / Turno</span>
                  <span className="text-base font-black text-white">
                    {active?.nominal_shift_capacity || 0} {active?.capacity_unit}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Capacidade Nominal / Mês</span>
                  <span className="text-base font-black text-white">
                    {active?.nominal_monthly_capacity || 0} {active?.capacity_unit}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Eficiência Planejada Base</span>
                  <span className="text-base font-black text-emerald-400">
                    {active?.planned_efficiency_pct || 0}%
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Utilização Máxima Recomendada</span>
                  <span className="text-base font-black text-cyan-400">
                    {active?.max_recommended_utilization_pct || 0}%
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Lote Mínimo de Campanha</span>
                  <span className="text-base font-black text-white">
                    {active?.min_batch_size || 0} {active?.capacity_unit}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Lote Máximo de Campanha</span>
                  <span className="text-base font-black text-white">
                    {active?.max_batch_size || 0} {active?.capacity_unit}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-slate-400">Observações Técnicas de Capacidade</Label>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-300 mt-1">
                  {active?.capacity_notes || 'Sem observações técnicas adicionais.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Turnos */}
        <TabsContent value="turnos">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white">
                  Turnos e Jornadas da Linha
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Configuração de horários, intervalos e turnos cruzando meia-noite.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Nome do Turno</th>
                      <th className="p-3">Horário Início/Fim</th>
                      <th className="p-3">Duração</th>
                      <th className="p-3">Intervalo</th>
                      <th className="p-3">Dias Aplicáveis</th>
                      <th className="p-3">Meia-Noite</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bundle.shifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-white">{s.code}</td>
                        <td className="p-3 text-slate-200">{s.name}</td>
                        <td className="p-3 font-mono text-slate-300">
                          {s.start_time} - {s.end_time}
                        </td>
                        <td className="p-3 text-slate-300">{s.duration_hours}h</td>
                        <td className="p-3 text-slate-300">{s.break_minutes || 0} min</td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {(s.applicable_days || []).map((d) => (
                              <Badge
                                key={d}
                                variant="outline"
                                className="text-[9px] px-1 py-0 border-slate-700 bg-slate-950 text-slate-300"
                              >
                                {d}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          {s.crosses_midnight ? (
                            <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px]">
                              Sim (Noturno)
                            </Badge>
                          ) : (
                            <span className="text-slate-500">Não</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
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
        </TabsContent>

        {/* 5. Calendário */}
        <TabsContent value="calendario">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">
                Calendário Produtivo Estrutural
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Dias de operação, feriados e regras de disponibilidade anual/mensal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {bundle.calendar ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-400 block mb-1">Ano de Vigência</span>
                      <span className="text-base font-bold text-white">{bundle.calendar.year}</span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-400 block mb-1">Dias Operacionais / Mês</span>
                      <span className="text-base font-bold text-white">
                        {bundle.calendar.operating_days_count} dias
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-400 block mb-1">Trabalha Sábados</span>
                      <span className="text-base font-bold text-slate-200">
                        {bundle.calendar.work_saturdays ? 'SIM' : 'NÃO'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-400 block mb-1">
                        Trabalha Domingos / Feriados
                      </span>
                      <span className="text-base font-bold text-slate-200">
                        {bundle.calendar.work_sundays ? 'SIM' : 'NÃO'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-400">Feriados e Paradas Globais Cadastradas</Label>
                    <div className="flex gap-2 flex-wrap mt-1.5">
                      {(bundle.calendar.holidays_dates || []).map((h) => (
                        <Badge
                          key={h}
                          variant="outline"
                          className="border-slate-700 bg-slate-950 text-slate-300 font-mono text-xs"
                        >
                          {h}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400">
                  Nenhum calendário produtivo associado.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Capabilities */}
        <TabsContent value="capabilities">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">
                Famílias Produtivas & Capabilities Dimensionais
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Responde: "Esta linha consegue processar este produto?". Inclui limites dimensionais
                físicos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Família</th>
                      <th className="p-3">Tipo Produto / Seção</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Dimensão (mm)</th>
                      <th className="p-3">Espessura (mm)</th>
                      <th className="p-3">Comprimento (mm)</th>
                      <th className="p-3">Peso (kg)</th>
                      <th className="p-3">Capacidade Específica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bundle.capabilities.map((c) => {
                      const fam =
                        c.expand?.product_family_id ||
                        bundle.families.find((f) => f.id === c.product_family_id)
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40">
                          <td className="p-3">
                            <span className="font-bold text-white block">
                              {fam?.name || fam?.code}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {fam?.code}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">
                            {c.product_type} ({c.section_type})
                          </td>
                          <td className="p-3">
                            <Badge
                              className={`text-[10px] ${
                                c.status === 'ALLOWED'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : c.status === 'RESTRICTED'
                                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                                    : 'bg-rose-950 text-rose-300 border-rose-800'
                              }`}
                            >
                              {c.status}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {c.min_dimension_mm} - {c.max_dimension_mm} mm
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {c.min_thickness_mm} - {c.max_thickness_mm} mm
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {c.min_length_mm} - {c.max_length_mm} mm
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {c.min_weight_kg} - {c.max_weight_kg} kg
                          </td>
                          <td className="p-3 text-cyan-300 font-semibold">
                            {c.specific_capacity || '-'} {c.specific_capacity_unit || ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Setups */}
        <TabsContent value="setups">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Setups Estruturais</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                A Ficha Mestre define "quanto normalmente custa o setup", NÃO "quando deve ocorrer"
                (regra de sequenciamento).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Descrição do Setup</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Duração Padrão</th>
                      <th className="p-3">Tipo Troca</th>
                      <th className="p-3">Recurso Afetado</th>
                      <th className="p-3">Família De &rarr; Para</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bundle.setups.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-white">{st.code}</td>
                        <td className="p-3 text-slate-200">{st.description}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="border-slate-700 bg-slate-950 text-slate-300"
                          >
                            {st.category}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-amber-400">
                          {st.standard_duration_minutes} min
                        </td>
                        <td className="p-3 text-slate-300">{st.setup_type || 'COMBINED'}</td>
                        <td className="p-3 text-slate-300">{st.affected_resource || '-'}</td>
                        <td className="p-3 text-slate-400">
                          {st.expand?.from_family_id?.code || 'Qualquer'} &rarr;{' '}
                          {st.expand?.to_family_id?.code || 'Qualquer'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. Restrições Técnicas */}
        <TabsContent value="restricoes">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">
                Restrições Estruturais da Linha
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Limites físicos intransponíveis (ex: capacidade do motor, limite térmico, largura de
                mesa).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bundle.constraints.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{c.title}</span>
                        <Badge className="bg-[#004C97]/30 text-blue-300 border-blue-600/40 text-[10px]">
                          {c.classification}
                        </Badge>
                        <span className="font-mono text-slate-500 text-[10px]">({c.code})</span>
                      </div>
                      <p className="text-slate-300">{c.description}</p>
                      {c.impact && (
                        <p className="text-[11px] text-amber-400 font-medium">
                          Impacto: {c.impact}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-slate-400 block text-[10px]">Faixa Admissível</span>
                      <span className="font-mono font-bold text-white">
                        {c.min_value ?? '-'} até {c.max_value ?? '-'} {c.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. Paradas Programadas Padrão */}
        <TabsContent value="paradas">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">
                Paradas Programadas Padrão
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Manutenções preventivas, calibrações e limpezas recorrentes da Ficha Mestre.
                (Atenção: Paradas extraordinárias virão do SAP ZPP003).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Descrição da Parada</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Recorrência</th>
                      <th className="p-3">Duração Prevista</th>
                      <th className="p-3">Horário / Turno</th>
                      <th className="p-3">Impacto Previsto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bundle.stops.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-white">{st.code}</td>
                        <td className="p-3 text-slate-200">{st.description}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="border-slate-700 bg-slate-950 text-slate-300"
                          >
                            {st.category}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-300">{st.recurrence}</td>
                        <td className="p-3 font-bold text-amber-400">
                          {st.expected_duration_minutes} min
                        </td>
                        <td className="p-3 text-slate-400 font-mono">
                          {st.scheduled_time || '-'} ({st.applicable_shift || 'Geral'})
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">{st.expected_impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 10. Dependências */}
        <TabsContent value="dependencias">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">
                Dependências de Fluxo & Pulmões Intermediários
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Visão resumida das conexões estruturais (o editor completo pertencerá ao Prompt 04 -
                Mapa Produtivo).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Box className="w-4 h-4 text-[#004C97]" />
                    Estoque / Pulmão de Entrada (Input Buffer)
                  </span>
                  <div className="space-y-1 text-slate-300">
                    <p>Tipo: {active?.input_buffer_type || 'Pátio Padrão'}</p>
                    <p>
                      Capacidade Física: {active?.input_buffer_capacity || 0}{' '}
                      {active?.input_buffer_unit || 't'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Box className="w-4 h-4 text-emerald-400" />
                    Estoque / Pulmão de Saída (Output Buffer)
                  </span>
                  <div className="space-y-1 text-slate-300">
                    <p>Tipo: {active?.output_buffer_type || 'Pulmão Intermediário'}</p>
                    <p>
                      Capacidade Física: {active?.output_buffer_capacity || 0}{' '}
                      {active?.output_buffer_unit || 't'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 11. Regras de Programação (Empty State conforme especificação) */}
        <TabsContent value="regras">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">
                Rule Packs Associados
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                A Ficha Mestre não armazena regras de sequenciamento industrial livres.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bundle.rulePacks.length > 0 ? (
                <div className="space-y-2">
                  {bundle.rulePacks.map((rp) => (
                    <div
                      key={rp.id}
                      className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{rp.rule_pack_name}</span>
                        <span className="text-slate-400 ml-2 font-mono">({rp.rule_pack_code})</span>
                      </div>
                      <Badge className="bg-[#004C97] text-white text-[10px]">
                        Versão {rp.version}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-3">
                  <Sliders className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="max-w-md mx-auto space-y-1">
                    <p className="font-semibold text-white text-sm">Nenhum Rule Pack associado.</p>
                    <p className="text-xs text-slate-400">
                      As regras de programação industrial serão administradas de forma versionada na
                      Matriz Mestre de Regras (Prompt 04).
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 12. Histórico & Versões */}
        <TabsContent value="historico">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">
                Linha do Tempo de Versões da Ficha Mestre
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Histórico imutável de alterações estruturais e justificativas técnicas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Versão</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Autor</th>
                      <th className="p-3">Capacidade</th>
                      <th className="p-3">Justificativa Técnica</th>
                      <th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bundle.versions.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-white">V{v.version}</td>
                        <td className="p-3">
                          <Badge
                            className={`text-[10px] ${
                              v.status === 'ACTIVE'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {v.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-300 font-mono">
                          {v.created ? new Date(v.created).toLocaleString() : '-'}
                        </td>
                        <td className="p-3 text-slate-300">
                          {v.author_email || 'Engenharia CIAFAL'}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {v.nominal_hourly_capacity} {v.capacity_unit}
                        </td>
                        <td className="p-3 text-slate-300 max-w-xs truncate">{v.change_reason}</td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDiff(v)}
                            className="h-6 px-2 text-[10px] text-slate-300 hover:text-white border border-slate-700 bg-slate-950"
                          >
                            Ver / Comparar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Criar Nova Versão */}
      <Dialog open={isNewVersionOpen} onOpenChange={setIsNewVersionOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-[#004C97]" />
              Criar Nova Versão da Ficha Mestre (V{(active?.version || 1) + 1})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Alterações em parâmetros estruturais geram uma nova versão versionada no HUB CIAFAL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300">Capacidade Nominal Horária *</Label>
                <Input
                  type="number"
                  value={formData.nominal_hourly_capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, nominal_hourly_capacity: Number(e.target.value) })
                  }
                  className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-slate-300">Unidade de Medida *</Label>
                <Select
                  value={formData.capacity_unit}
                  onValueChange={(val: any) => setFormData({ ...formData, capacity_unit: val })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {['t/h', 't', 'kg', 'peça', 'm', 'mm', 'h', 'min'].map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Eficiência Planejada Base (%)</Label>
                <Input
                  type="number"
                  value={formData.planned_efficiency_pct}
                  onChange={(e) =>
                    setFormData({ ...formData, planned_efficiency_pct: Number(e.target.value) })
                  }
                  className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-slate-300">Utilização Máxima Recomendada (%)</Label>
                <Input
                  type="number"
                  value={formData.max_recommended_utilization_pct}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_recommended_utilization_pct: Number(e.target.value),
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-slate-300">Lote Mínimo de Campanha</Label>
                <Input
                  type="number"
                  value={formData.min_batch_size}
                  onChange={(e) =>
                    setFormData({ ...formData, min_batch_size: Number(e.target.value) })
                  }
                  className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-slate-300">Lote Máximo de Campanha</Label>
                <Input
                  type="number"
                  value={formData.max_batch_size}
                  onChange={(e) =>
                    setFormData({ ...formData, max_batch_size: Number(e.target.value) })
                  }
                  className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">
                Justificativa Técnica da Alteração (Obrigatória) *
              </Label>
              <Textarea
                placeholder="Descreva o motivo da revisão técnica (ex: Laudo de engenharia nº 402, retrofit de motor, calibração)..."
                value={formData.change_reason}
                onChange={(e) => setFormData({ ...formData, change_reason: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white mt-1 text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewVersionOpen(false)}
              className="border-slate-800 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNewVersion}
              className="bg-[#004C97] hover:bg-[#003B75] text-white font-bold"
            >
              Homologar e Publicar Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Comparador de Versões (Diff) */}
      <Dialog open={isDiffModalOpen} onOpenChange={setIsDiffModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#004C97]" />
              Comparativo de Ficha Mestre (V{active?.version} vs V{diffTargetVersion?.version})
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Parâmetro</th>
                  <th className="p-2.5">Versão Atual (V{active?.version})</th>
                  <th className="p-2.5">Versão Selecionada (V{diffTargetVersion?.version})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="p-2.5 text-slate-400 font-semibold">Status</td>
                  <td className="p-2.5 font-bold text-emerald-400">{active?.status}</td>
                  <td className="p-2.5 text-slate-300">{diffTargetVersion?.status}</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-400 font-semibold">Capacidade Horária</td>
                  <td className="p-2.5 font-bold text-white">
                    {active?.nominal_hourly_capacity} {active?.capacity_unit}
                  </td>
                  <td className="p-2.5 text-slate-300">
                    {diffTargetVersion?.nominal_hourly_capacity} {diffTargetVersion?.capacity_unit}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-400 font-semibold">Eficiência Planejada</td>
                  <td className="p-2.5 text-slate-200">{active?.planned_efficiency_pct}%</td>
                  <td className="p-2.5 text-slate-300">
                    {diffTargetVersion?.planned_efficiency_pct}%
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-400 font-semibold">Lote Mínimo / Máximo</td>
                  <td className="p-2.5 text-slate-200">
                    {active?.min_batch_size} - {active?.max_batch_size}
                  </td>
                  <td className="p-2.5 text-slate-300">
                    {diffTargetVersion?.min_batch_size} - {diffTargetVersion?.max_batch_size}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-400 font-semibold">Justificativa</td>
                  <td className="p-2.5 text-slate-200">{active?.change_reason}</td>
                  <td className="p-2.5 text-slate-300">{diffTargetVersion?.change_reason}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setIsDiffModalOpen(false)}
              className="bg-[#004C97] text-white text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: DTO de Contexto IA / Motor */}
      <Dialog open={isAiContextOpen} onOpenChange={setIsAiContextOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              DTO Estruturado de Contexto (Context API para IA & Motores)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Payload oficial gerado pelo backend (GET /backend/v1/pcp/line-master-context/
              {bundle.line.id}).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300">
            <pre>{aiContextJson}</pre>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setIsAiContextOpen(false)}
              className="bg-[#004C97] text-white text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
