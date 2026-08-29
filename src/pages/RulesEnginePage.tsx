import React, { useState, useEffect, useMemo } from 'react'
import {
  Cpu,
  Layers,
  Clock,
  ThermometerSnowflake,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Building2,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Sparkles,
  Info,
  Check,
  X,
  ChevronRight,
  Database,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  pcpRulesService,
  SetupAcertoRecord,
  ScheduledStopRecord,
  CoolingTimeRecord,
  SequencingRuleRecord,
  PendingRevisionRecord,
  RuleAuditLogRecord,
} from '@/services/pcp-rules-service'
import { lineMasterService } from '@/services/line-master'
import { ProductionLine } from '@/types/line-master'

export const RulesEnginePage: React.FC = () => {
  const { can, user } = useAuth()
  const { toast } = useToast()

  // Permissões RBAC
  const canEdit = can('pcp.rules.edit') || can('pcp.rules.manage')
  const canApprove = can('pcp.rules.approve')

  // Filtros Globais
  const [selectedPlant, setSelectedPlant] = useState<string>('ALL')
  const [selectedLine, setSelectedLine] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('setup-acerto')

  // Estados de Dados do Backend
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [setupList, setSetupList] = useState<SetupAcertoRecord[]>([])
  const [stopsList, setStopsList] = useState<ScheduledStopRecord[]>([])
  const [coolingList, setCoolingList] = useState<CoolingTimeRecord[]>([])
  const [sequencingList, setSequencingList] = useState<SequencingRuleRecord[]>([])
  const [pendingList, setPendingList] = useState<PendingRevisionRecord[]>([])
  const [auditList, setAuditList] = useState<RuleAuditLogRecord[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Carrega todos os dados do Backend PocketBase
  const loadAllData = async () => {
    setIsLoading(true)
    try {
      const [lineData, setups, stops, coolings, sequencings, pendings, audits] = await Promise.all([
        lineMasterService.listLines(),
        pcpRulesService.listSetupAcerto(),
        pcpRulesService.listScheduledStops(),
        pcpRulesService.listCoolingTimes(),
        pcpRulesService.listSequencingRules(),
        pcpRulesService.listPendingRevisions(),
        pcpRulesService.listRuleAuditLogs(),
      ])

      setLines(lineData)
      setSetupList(setups)
      setStopsList(stops)
      setCoolingList(coolings)
      setSequencingList(sequencings)
      setPendingList(pendings)
      setAuditList(audits)
    } catch (err) {
      console.error('Erro ao carregar dados do motor de regras:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao conectar ao Backend',
        description: 'Não foi possível buscar as parametrizações oficiais do PocketBase.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Filtros aplicados na lista de Setup
  const filteredSetups = useMemo(() => {
    return setupList.filter((item) => {
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.line_code.toLowerCase().includes(q) ||
          item.to_family_code.toLowerCase().includes(q) ||
          item.to_description_gauge.toLowerCase().includes(q) ||
          item.work_center.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [setupList, selectedLine, searchTerm])

  // Filtros aplicados nas Paradas Programadas
  const filteredStops = useMemo(() => {
    return stopsList.filter((item) => {
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.line_code.toLowerCase().includes(q) ||
          item.stop_type.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [stopsList, selectedLine, searchTerm])

  // Filtros aplicados em Tempos de Resfriamento
  const filteredCoolings = useMemo(() => {
    return coolingList.filter((item) => {
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.line_code.toLowerCase().includes(q) ||
          (item.material_code && item.material_code.toLowerCase().includes(q)) ||
          (item.family_code && item.family_code.toLowerCase().includes(q)) ||
          item.gauge_dimension.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [coolingList, selectedLine, searchTerm])

  // Filtros aplicados em Regras de Sequenciamento
  const filteredSequencings = useMemo(() => {
    return sequencingList.filter((item) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.scope_level.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [sequencingList, searchTerm])

  // Filtros aplicados em Revisões Pendentes
  const filteredPendings = useMemo(() => {
    return pendingList.filter((item) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.entity_type.toLowerCase().includes(q) ||
          item.line_code.toLowerCase().includes(q) ||
          item.change_reason.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [pendingList, searchTerm])

  // Filtros aplicados em Histórico de Alterações
  const filteredAudits = useMemo(() => {
    return auditList.filter((item) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.parameter_name.toLowerCase().includes(q) ||
          item.user_name.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [auditList, searchTerm])

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen text-slate-900">
      {/* 1. CABEÇALHO PADRÃO CIAFAL COM KPIs COMPACTOS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-sm">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Motor de Regras & Setup
              </h1>
              <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[10px] font-mono">
                PCP Robotizado &bull; Hub CIAFAL
              </Badge>
              {canEdit ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Perfil Gravador
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] gap-1">
                  <Lock className="w-3 h-3 text-amber-600" />
                  Somente Consulta
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Governança centralizada de tempos de transição, matrizes de setup, paradas de linha,
              resfriamento metalúrgico e parâmetros CP-SAT.
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadAllData}
            disabled={isLoading}
            className="text-xs border-slate-300 gap-1.5 h-8 bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar Dados</span>
          </Button>

          <Button
            size="sm"
            disabled
            className="bg-[#004C97] text-white text-xs gap-1.5 h-8 opacity-90 cursor-not-allowed shadow-sm"
            title="Importação em lote será habilitada na próxima fase de integração SAP/MES"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Carga / Template SAP</span>
          </Button>
        </div>
      </div>

      {/* 2. CARDS COMPACTOS DE GOVERNANÇA INDUSTRIAL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-slate-200 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Setups Cadastrados</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{setupList.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Matriz De/Para</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Paradas Programadas</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{stopsList.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Preventivas/Limpeza</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-600" />
            <span>Resfriamentos</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {coolingList.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Regras de Cura</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Rule Packs</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {sequencingList.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Herança Hierárquica</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Revisões Pendentes</span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
            {pendingList.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Aprovação 2 Fases</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-purple-600" />
            <span>Logs de Alteração</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{auditList.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Trilha de Auditoria</div>
        </Card>
      </div>

      {/* 3. BARRA DE FILTROS RÁPIDOS */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <Input
            placeholder="Filtrar por linha, bitola, motivo ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Linha:</span>
          </div>
          <Select value={selectedLine} onValueChange={setSelectedLine}>
            <SelectTrigger className="h-8 w-44 text-xs bg-white border-slate-200">
              <SelectValue placeholder="Todas as Linhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Linhas</SelectItem>
              {lines.map((l) => (
                <SelectItem key={l.id} value={l.code}>
                  {l.code} - {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. ÁREA CENTRAL: 6 ABAS FUNCIONAIS SEM TELA EM BRANCO */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-slate-200 px-4 pt-3 bg-slate-50/50 rounded-t-xl overflow-x-auto">
            <TabsList className="h-9 bg-slate-200/60 p-0.5 gap-1">
              <TabsTrigger
                value="setup-acerto"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>1. Setup & Acerto</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {setupList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="paradas-programadas"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>2. Paradas Programadas</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {stopsList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="resfriamento"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <ThermometerSnowflake className="w-3.5 h-3.5" />
                <span>3. Tempo de Resfriamento</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {coolingList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="sequenciamento"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>4. Regras de Sequenciamento</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {sequencingList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="revisoes-pendentes"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>5. Revisões Pendentes</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {pendingList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="historico-alteracoes"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                <span>6. Histórico de Alterações</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {auditList.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========================================================================= */}
          {/* ABA 1 — SETUP & ACERTO                                                    */}
          {/* ========================================================================= */}
          <TabsContent value="setup-acerto" className="m-0 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Matriz de Transição e Tempos de Setup & Acerto
                </h3>
                <p className="text-xs text-slate-500">
                  Parâmetros de troca de ferramental, ajuste de esquadro e tempos de calibração
                  consumidos pelo CP-SAT.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredSetups.length} registro(s) exibido(s)
              </div>
            </div>

            {filteredSetups.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Nenhum registro encontrado</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                  Nenhuma matriz de setup cadastrada para o filtro selecionado — aguardando carga
                  oficial SAP/MES.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th className="p-2.5">Centro</th>
                      <th className="p-2.5">Linha</th>
                      <th className="p-2.5">Centro de Trabalho</th>
                      <th className="p-2.5">Família PARA</th>
                      <th className="p-2.5">Início Código PARA</th>
                      <th className="p-2.5">Descrição / Bitola PARA</th>
                      <th className="p-2.5 text-right">Tempo Setup (min)</th>
                      <th className="p-2.5 text-right">Tempo Acerto (min)</th>
                      <th className="p-2.5 text-center">Origem</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Validade</th>
                      <th className="p-2.5">Responsável</th>
                      <th className="p-2.5">Última Revisão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredSetups.map((row) => (
                      <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-2.5 font-mono text-slate-600">{row.center_code}</td>
                        <td className="p-2.5 font-bold text-[#004C97]">{row.line_code}</td>
                        <td className="p-2.5 font-mono text-slate-600">{row.work_center}</td>
                        <td className="p-2.5 font-medium">{row.to_family_code}</td>
                        <td className="p-2.5 font-mono text-slate-700">{row.to_code_prefix}</td>
                        <td className="p-2.5 text-slate-800 font-medium">
                          {row.to_description_gauge}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {row.setup_time_minutes} min
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">
                          {row.tuning_time_minutes} min
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              row.origin === 'SAP'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {row.origin}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[10px] ${
                              row.status === 'ATIVO'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px]">
                          {row.validity_start} &rarr; {row.validity_end}
                        </td>
                        <td className="p-2.5 text-slate-600">{row.responsible_name}</td>
                        <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                          {row.last_revision}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2 — PARADAS PROGRAMADAS                                               */}
          {/* ========================================================================= */}
          <TabsContent value="paradas-programadas" className="m-0 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Paradas Programadas de Linha & Manutenção Preventiva
                </h3>
                <p className="text-xs text-slate-500">
                  Janelas de indisponibilidade planejada: manutenção, limpeza autônoma, troca de
                  discos e aferição de sensores.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredStops.length} parada(s) programada(s)
              </div>
            </div>

            {filteredStops.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Nenhum registro encontrado</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                  Nenhuma parada programada cadastrada — aguardando carga oficial SAP/MES.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th className="p-2.5">Centro</th>
                      <th className="p-2.5">Linha</th>
                      <th className="p-2.5">Centro de Trabalho</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Motivo</th>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5 text-right">Duração</th>
                      <th className="p-2.5 text-center">Início</th>
                      <th className="p-2.5 text-center">Término</th>
                      <th className="p-2.5">Recorrência</th>
                      <th className="p-2.5">Turno</th>
                      <th className="p-2.5">Validade</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Responsável</th>
                      <th className="p-2.5">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredStops.map((row) => (
                      <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-2.5 font-mono text-slate-600">{row.center_code}</td>
                        <td className="p-2.5 font-bold text-[#004C97]">{row.line_code}</td>
                        <td className="p-2.5 font-mono text-slate-600">{row.work_center}</td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]"
                          >
                            {row.stop_type}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-mono font-medium text-slate-700">{row.reason}</td>
                        <td className="p-2.5 text-slate-800 font-medium">{row.description}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-amber-900">
                          {row.duration_minutes} min
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-700">
                          {row.start_time}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-500">
                          {row.end_time}
                        </td>
                        <td className="p-2.5 text-slate-700">{row.recurrence}</td>
                        <td className="p-2.5 text-slate-600">{row.shift}</td>
                        <td className="p-2.5 text-slate-500 text-[11px]">{row.validity}</td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[10px] ${
                              row.status === 'ATIVO'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-slate-600">{row.responsible_name}</td>
                        <td
                          className="p-2.5 text-slate-500 italic max-w-xs truncate"
                          title={row.observation}
                        >
                          {row.observation || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 3 — TEMPO DE RESFRIAMENTO                                             */}
          {/* ========================================================================= */}
          <TabsContent value="resfriamento" className="m-0 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tempo de Resfriamento & Cura Metalúrgica
                </h3>
                <p className="text-xs text-slate-500">
                  Restrições térmicas para movimentação e processos subsequentes (Laminação &rarr;
                  Endireitamento / Trefilação).
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredCoolings.length} regra(s) de resfriamento
              </div>
            </div>

            {filteredCoolings.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <ThermometerSnowflake className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Nenhum registro encontrado</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                  Nenhum tempo de resfriamento cadastrado — aguardando carga oficial SAP/MES.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th className="p-2.5">Centro</th>
                      <th className="p-2.5">Linha</th>
                      <th className="p-2.5">Centro de Trabalho</th>
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5">Família</th>
                      <th className="p-2.5">Bitola</th>
                      <th className="p-2.5 text-right">Tempo Resfriamento (h)</th>
                      <th className="p-2.5">Regra / Condição</th>
                      <th className="p-2.5">Validade</th>
                      <th className="p-2.5 text-center">Origem</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Responsável</th>
                      <th className="p-2.5 text-center">Revisão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredCoolings.map((row) => (
                      <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-2.5 font-mono text-slate-600">{row.center_code}</td>
                        <td className="p-2.5 font-bold text-[#004C97]">{row.line_code}</td>
                        <td className="p-2.5 font-mono text-slate-600">{row.work_center}</td>
                        <td className="p-2.5 font-mono font-medium text-slate-700">
                          {row.material_code}
                        </td>
                        <td className="p-2.5 font-medium">{row.family_code}</td>
                        <td className="p-2.5 text-slate-800">{row.gauge_dimension}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-cyan-800">
                          {row.cooling_time_hours} h
                        </td>
                        <td className="p-2.5 text-slate-600">{row.rule_condition}</td>
                        <td className="p-2.5 text-slate-500 text-[11px]">
                          {row.valid_from
                            ? `${row.valid_from} -> ${row.valid_until || 'Vigente'}`
                            : 'Vigente'}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono bg-slate-50 text-slate-700"
                          >
                            {row.origin}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[10px] ${
                              row.status === 'ATIVO'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-slate-600">{row.responsible_name}</td>
                        <td className="p-2.5 text-center font-mono text-slate-500">
                          v{row.revision_number}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 4 — REGRAS DE SEQUENCIAMENTO                                          */}
          {/* ========================================================================= */}
          <TabsContent value="sequenciamento" className="m-0 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Regras de Sequenciamento & Hierarquia de Rule Packs
                </h3>
                <p className="text-xs text-slate-500">
                  Herança em cascata (Global &rarr; Empresa &rarr; Planta &rarr; Linha) com pesos
                  para o Solver CP-SAT.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredSequencings.length} rule pack(s) ativo(s)
              </div>
            </div>

            {filteredSequencings.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <Sliders className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Nenhum registro encontrado</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                  Nenhuma regra de sequenciamento cadastrada — aguardando carga oficial SAP/MES.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSequencings.map((pack) => (
                  <Card
                    key={pack.id}
                    className="border-slate-200 bg-white hover:border-blue-300 transition-colors"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-[#004C97] border-blue-200 font-mono text-[10px]"
                        >
                          {pack.scope_level}
                        </Badge>
                        <Badge
                          className={`text-[10px] ${
                            pack.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {pack.status} &bull; {pack.version}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                        {pack.name}
                      </CardTitle>
                      <CardDescription className="font-mono text-[11px] text-slate-500">
                        Código: {pack.code}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 font-mono text-[11px]">
                        {pack.rules_payload.maxSetupDurationMinutes !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Setup Máximo:</span>
                            <span className="font-bold text-slate-800">
                              {pack.rules_payload.maxSetupDurationMinutes} min
                            </span>
                          </div>
                        )}
                        {pack.rules_payload.minBatchSizeTons !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Lote Mínimo:</span>
                            <span className="font-bold text-slate-800">
                              {pack.rules_payload.minBatchSizeTons} t
                            </span>
                          </div>
                        )}
                        {pack.rules_payload.bufferSafetyHours !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Buffer Térmico/Segurança:</span>
                            <span className="font-bold text-slate-800">
                              {pack.rules_payload.bufferSafetyHours} h
                            </span>
                          </div>
                        )}
                        {pack.rules_payload.preferredFamilyOrder && (
                          <div className="flex flex-col gap-1 pt-1 border-t border-slate-200">
                            <span className="text-slate-500">Ordem de Famílias Preferencial:</span>
                            <div className="flex flex-wrap gap-1">
                              {pack.rules_payload.preferredFamilyOrder.map((fam, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 bg-slate-200"
                                >
                                  {i + 1}º {fam}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 5 — REVISÕES PENDENTES                                                */}
          {/* ========================================================================= */}
          <TabsContent value="revisoes-pendentes" className="m-0 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Esteira de Aprovação Dupla (PCP + Gestor da Linha)
                </h3>
                <p className="text-xs text-slate-500">
                  Alterações cadastrais e técnicas que exigem homologação em duas etapas antes de
                  publicação oficial.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredPendings.length} revisão(ões) pendente(s)
              </div>
            </div>

            {filteredPendings.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Nenhuma revisão pendente</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                  Todas as parametrizações de regras e setup estão vigentes e homologadas no
                  sistema.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th className="p-2.5">Tipo de Entidade</th>
                      <th className="p-2.5">Linha / Recurso</th>
                      <th className="p-2.5">Versão</th>
                      <th className="p-2.5">Motivo da Alteração</th>
                      <th className="p-2.5 text-center">Fase 1: PCP</th>
                      <th className="p-2.5 text-center">Fase 2: Gestor Linha</th>
                      <th className="p-2.5 text-center">Status Geral</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredPendings.map((row) => (
                      <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-[#004C97] border-blue-200 font-mono text-[10px]"
                          >
                            {row.entity_type}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-bold text-slate-800">{row.line_code}</td>
                        <td className="p-2.5 font-mono text-slate-600">{row.version}</td>
                        <td className="p-2.5 text-slate-700">{row.change_reason}</td>
                        <td className="p-2.5 text-center">
                          {row.pcp_approver_name ? (
                            <div className="text-[10px]">
                              <span className="font-bold text-emerald-700 block">
                                {row.pcp_approver_name}
                              </span>
                              <span className="text-slate-400">{row.pcp_approved_at}</span>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-amber-50 text-amber-700 border-amber-200"
                            >
                              Aguardando PCP
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {row.line_manager_name ? (
                            <div className="text-[10px]">
                              <span className="font-bold text-emerald-700 block">
                                {row.line_manager_name}
                              </span>
                              <span className="text-slate-400">{row.line_manager_approved_at}</span>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-slate-50 text-slate-500 border-slate-200"
                            >
                              Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[10px] ${
                              row.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 6 — HISTÓRICO DE ALTERAÇÕES                                           */}
          {/* ========================================================================= */}
          <TabsContent value="historico-alteracoes" className="m-0 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Trilha de Auditoria & Histórico de Alterações de Regras
                </h3>
                <p className="text-xs text-slate-500">
                  Rastreabilidade completa: parâmetro, valor anterior, novo valor, usuário, motivo,
                  validação MES e recomendações IA.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredAudits.length} log(s) registrado(s)
              </div>
            </div>

            {filteredAudits.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Nenhum registro encontrado</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                  Nenhuma alteração registrada até o momento — aguardando operações ou carga
                  oficial.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th className="p-2.5">Parâmetro</th>
                      <th className="p-2.5">Valor Anterior</th>
                      <th className="p-2.5">Valor Novo</th>
                      <th className="p-2.5">Usuário</th>
                      <th className="p-2.5">Data / Hora</th>
                      <th className="p-2.5">Motivo</th>
                      <th className="p-2.5 text-center">Origem</th>
                      <th className="p-2.5 text-center">Validação MES</th>
                      <th className="p-2.5">Recomendação IA</th>
                      <th className="p-2.5">Aprovador</th>
                      <th className="p-2.5">Data Publicação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredAudits.map((row) => (
                      <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-2.5 font-bold text-slate-900">{row.parameter_name}</td>
                        <td className="p-2.5 font-mono text-slate-500 line-through">
                          {row.previous_value || '-'}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-[#004C97]">
                          {row.new_value || '-'}
                        </td>
                        <td className="p-2.5 text-slate-700">{row.user_name}</td>
                        <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                          {row.change_date}
                        </td>
                        <td className="p-2.5 text-slate-800">{row.reason}</td>
                        <td className="p-2.5 text-center">
                          <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                            {row.origin}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[10px] ${
                              row.mes_validation_status === 'VALIDADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.mes_validation_status}
                          </Badge>
                        </td>
                        <td
                          className="p-2.5 text-slate-600 italic max-w-xs truncate"
                          title={row.ai_recommendation}
                        >
                          {row.ai_recommendation || '-'}
                        </td>
                        <td className="p-2.5 text-slate-600">{row.approver_name || '-'}</td>
                        <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                          {row.published_at || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
export default RulesEnginePage
