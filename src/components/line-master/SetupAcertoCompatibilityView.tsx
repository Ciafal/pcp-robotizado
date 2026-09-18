import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import {
  LineSetupMatrix,
  LineAdjustmentTimeRule,
  SetupAcertoComparisonItem,
  SetupAcertoCompatibilityStatus,
  SAMPLE_TYPE_LABELS,
} from '@/types/line-master'
import { SetupAcertoCompatibilityEngine } from '@/services/setup-acerto-compatibility-engine'

interface SetupAcertoCompatibilityViewProps {
  lineId: string
  lineCode?: string
  lineName?: string
  setupList: LineSetupMatrix[]
  acertoList: LineAdjustmentTimeRule[]
  loading?: boolean
  onRefresh?: () => void
  onOpenNewAcertoForSetup?: (setup: LineSetupMatrix | SetupAcertoComparisonItem) => void
  onOpenEditAcerto?: (acerto: LineAdjustmentTimeRule) => void
  onOpenEditSetup?: (setup: LineSetupMatrix) => void
}

export const SetupAcertoCompatibilityView: React.FC<SetupAcertoCompatibilityViewProps> = ({
  lineId,
  lineCode = '',
  lineName = '',
  setupList,
  acertoList,
  loading = false,
  onRefresh,
  onOpenNewAcertoForSetup,
  onOpenEditAcerto,
  onOpenEditSetup,
}) => {
  // Filtros
  const [filterText, setFilterText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL') // ALL, COMPATIBLE, MISSING_ACERTO, INACTIVE_ACERTO, EXPIRED_ACERTO, INCONSISTENT, INACTIVE_SETUP
  const [setupStatusFilter, setSetupStatusFilter] = useState<string>('ALL') // ALL, ACTIVE, INACTIVE
  const [acertoStatusFilter, setAcertoStatusFilter] = useState<string>('ALL') // ALL, ACTIVE, INACTIVE
  const [onlyPendencies, setOnlyPendencies] = useState(false)

  // Avaliação do Motor
  const compatibilityResult = useMemo(() => {
    return SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId,
      setupList,
      acertoList,
      referenceDate: new Date(),
    })
  }, [lineId, setupList, acertoList])

  // Filtragem da lista
  const filteredItems = useMemo(() => {
    return compatibilityResult.items.filter((item) => {
      // 1. Somente pendências
      if (onlyPendencies && !item.isPending) {
        return false
      }

      // 2. Filtro de compatibilidade
      if (statusFilter !== 'ALL' && item.compatibility !== statusFilter) {
        return false
      }

      // 3. Status Setup
      if (setupStatusFilter !== 'ALL' && item.setupStatus !== setupStatusFilter) {
        return false
      }

      // 4. Status Acerto
      if (acertoStatusFilter !== 'ALL') {
        if (acertoStatusFilter === 'ACTIVE' && item.acertoStatus !== 'ACTIVE') return false
        if (acertoStatusFilter === 'INACTIVE' && item.acertoStatus !== 'INACTIVE') return false
      }

      // 5. Busca textual (código setup, descrição, DE, PARA, material destino)
      if (filterText.trim()) {
        const q = filterText.trim().toLowerCase()
        const matchCode = item.setupCode.toLowerCase().includes(q)
        const matchDesc = item.setupDescription.toLowerCase().includes(q)
        const matchFrom = item.fromCode.toLowerCase().includes(q)
        const matchTo = item.toCode.toLowerCase().includes(q)
        const matchTarget = item.targetMaterialOrFamily.toLowerCase().includes(q)
        const matchAcertoMat =
          item.associatedAcerto?.material_code?.toLowerCase().includes(q) || false
        if (!matchCode && !matchDesc && !matchFrom && !matchTo && !matchTarget && !matchAcertoMat) {
          return false
        }
      }

      return true
    })
  }, [
    compatibilityResult,
    filterText,
    statusFilter,
    setupStatusFilter,
    acertoStatusFilter,
    onlyPendencies,
  ])

  // Renderizador do badge de situação de compatibilidade (padronizado com os 8 status do requisito)
  const renderStatusBadge = (status: SetupAcertoCompatibilityStatus) => {
    switch (status) {
      case 'COMPATIBLE':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 inline-flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            COMPATÍVEL
          </Badge>
        )
      case 'MISSING_ACERTO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 inline-flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <XCircle className="w-3 h-3 text-rose-600" />
            SEM ACERTO
          </Badge>
        )
      case 'INACTIVE_ACERTO':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 inline-flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            ACERTO INATIVO
          </Badge>
        )
      case 'SETUP_EXPIRED':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 inline-flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <Clock className="w-3 h-3 text-rose-600" />
            SETUP VENCIDO
          </Badge>
        )
      case 'EXPIRED_ACERTO':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100 inline-flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <Clock className="w-3 h-3 text-orange-600" />
            ACERTO VENCIDO
          </Badge>
        )
      case 'INCOMPLETE_VIGENCY':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 inline-flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            VIGÊNCIA INCOMPLETA
          </Badge>
        )
      case 'INCONSISTENT':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100 inline-flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <ShieldAlert className="w-3 h-3 text-purple-600" />
            INCONSISTENTE
          </Badge>
        )
      case 'SETUP_INACTIVE':
      case 'INACTIVE_SETUP':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-500 border-slate-300 font-normal text-[11px] py-0.5 px-2"
          >
            SETUP INATIVO
          </Badge>
        )
    }
  }

  const {
    totalActiveSetups,
    totalActiveAcertos,
    compatibleSetupsCount,
    setupsWithoutAcertoCount,
    orphanAcertosCount,
    compatibilityRatePct,
    overallStatus,
    overallStatusLabel,
    overallStatusDesc,
  } = compatibilityResult

  return (
    <div className="space-y-4">
      {/* 1. INDICADOR GERAL + CARDS DE RESUMO (Grid responsivo: até 3 por linha em desktop para leitura folgada) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Card 1: SETUPS ATIVOS */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Setups Ativos
              </span>
              <div className="p-1 rounded bg-slate-100 text-slate-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-slate-900">
              {totalActiveSetups}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Total de transições ativas na linha</p>
          </CardContent>
        </Card>

        {/* Card 2: ACERTOS ATIVOS */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Acertos Ativos
              </span>
              <div className="p-1 rounded bg-slate-100 text-slate-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-slate-900">
              {totalActiveAcertos}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Amostras técnicas vigentes</p>
          </CardContent>
        </Card>

        {/* Card 3: SETUPS COMPATÍVEIS */}
        <Card className="bg-emerald-50/30 border-emerald-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                Compatíveis
              </span>
              <div className="p-1 rounded bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-emerald-700">
              {compatibleSetupsCount}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Setup e Acerto ativos e vigentes
            </p>
          </CardContent>
        </Card>

        {/* Card 4: SETUPS SEM ACERTO */}
        <Card
          className={`shadow-xs ${
            setupsWithoutAcertoCount > 0
              ? 'bg-rose-50/40 border-rose-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span
                className={`text-xs uppercase tracking-wide ${
                  setupsWithoutAcertoCount > 0
                    ? 'text-rose-800 font-bold'
                    : 'text-slate-600 font-semibold'
                }`}
              >
                Sem Acerto
              </span>
              <div
                className={`p-1 rounded ${
                  setupsWithoutAcertoCount > 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`mt-2 text-2xl font-extrabold font-mono ${
                setupsWithoutAcertoCount > 0 ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              {setupsWithoutAcertoCount}
            </div>
            <p
              className={`text-[11px] mt-0.5 ${
                setupsWithoutAcertoCount > 0 ? 'text-rose-700 font-medium' : 'text-slate-500'
              }`}
            >
              Pendência de parametrização
            </p>
          </CardContent>
        </Card>

        {/* Card 5: ACERTOS SEM VÍNCULO */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Acertos Órfãos
              </span>
              <div className="p-1 rounded bg-slate-100 text-slate-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-slate-800">
              {orphanAcertosCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Sem setup correspondente cadastrado</p>
          </CardContent>
        </Card>

        {/* Card 6: TAXA DE COMPATIBILIDADE */}
        <Card
          className={`shadow-xs ${
            overallStatus === 'GREEN'
              ? 'bg-emerald-50/40 border-emerald-300'
              : overallStatus === 'YELLOW'
                ? 'bg-amber-50/40 border-amber-300'
                : 'bg-rose-50/40 border-rose-300'
          }`}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                Taxa de Cobertura
              </span>
              <span
                className={`w-3 h-3 rounded-full ${
                  overallStatus === 'GREEN'
                    ? 'bg-emerald-500'
                    : overallStatus === 'YELLOW'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
              />
            </div>
            <div
              className={`mt-2 text-2xl font-black font-mono ${
                overallStatus === 'GREEN'
                  ? 'text-emerald-700'
                  : overallStatus === 'YELLOW'
                    ? 'text-amber-700'
                    : 'text-rose-700'
              }`}
            >
              {compatibilityRatePct}%
            </div>
            <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{overallStatusLabel}</p>
          </CardContent>
        </Card>
      </div>

      {/* BANNER DO INDICADOR GERAL */}
      <div
        className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          overallStatus === 'GREEN'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : overallStatus === 'YELLOW'
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {overallStatus === 'GREEN' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : overallStatus === 'YELLOW' ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div>
            <div className="font-bold uppercase tracking-wide flex items-center gap-2">
              <span>INDICADOR GERAL: {overallStatusLabel}</span>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-2 font-mono ${
                  overallStatus === 'GREEN'
                    ? 'border-emerald-300 text-emerald-800'
                    : overallStatus === 'YELLOW'
                      ? 'border-amber-300 text-amber-800'
                      : 'border-rose-300 text-rose-800'
                }`}
              >
                {lineCode ? `Linha ${lineCode}` : 'Linha Selecionada'}
              </Badge>
            </div>
            <p className="text-[11px] opacity-90 mt-0.5">{overallStatusDesc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant={onlyPendencies ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOnlyPendencies(!onlyPendencies)}
            className={`h-8 text-xs font-semibold ${
              onlyPendencies
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-transparent'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            {onlyPendencies ? 'Exibindo Somente Pendências' : 'Exibir somente pendências'}
          </Button>

          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 text-xs bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          )}
        </div>
      </div>

      {/* 2. BARRA DE FILTROS E BUSCA */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Busca textual: ocupa a maior largura */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por código de setup, descrição, material DE ou PARA..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-8 text-xs pl-8 bg-white border-slate-300 w-full"
              />
            </div>

            {/* Filtro Situação de Compatibilidade */}
            <div className="w-full sm:w-64 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Situação de Compatibilidade" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50 text-xs">
                  <SelectItem value="ALL">Todas as Situações</SelectItem>
                  <SelectItem value="COMPATIBLE">Compatível (OK)</SelectItem>
                  <SelectItem value="MISSING_ACERTO">Sem Acerto</SelectItem>
                  <SelectItem value="INACTIVE_ACERTO">Acerto Inativo</SelectItem>
                  <SelectItem value="SETUP_EXPIRED">Setup Vencido</SelectItem>
                  <SelectItem value="EXPIRED_ACERTO">Acerto Vencido</SelectItem>
                  <SelectItem value="INCOMPLETE_VIGENCY">Vigência Incompleta</SelectItem>
                  <SelectItem value="INCONSISTENT">Inconsistente</SelectItem>
                  <SelectItem value="SETUP_INACTIVE">Setup Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Status Setup */}
            <div className="w-full sm:w-48 shrink-0">
              <Select value={setupStatusFilter} onValueChange={setSetupStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Status do Setup" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50 text-xs">
                  <SelectItem value="ALL">Status Setup: Todos</SelectItem>
                  <SelectItem value="ACTIVE">Setup Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Setup Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. TABELA DE COMPARAÇÃO E DETALHAMENTO */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="p-3 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
              Matriz Comparativa: Setup DE→PARA × Acerto Técnico
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500 mt-0.5">
              Validação estruturada de correspondência para garantia de parametrização no PCP
              Robotizado.
            </CardDescription>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Mostrando {filteredItems.length} de {compatibilityResult.items.length} combinações
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow className="hover:bg-slate-50 text-xs font-semibold text-slate-700">
                <TableHead className="w-28">Cód. Setup</TableHead>
                <TableHead className="w-32">DE</TableHead>
                <TableHead className="w-32">PARA</TableHead>
                <TableHead className="text-right w-24">Setup (min)</TableHead>
                <TableHead className="w-24 text-center">Status Setup</TableHead>
                <TableHead className="w-36">Material/Família Destino</TableHead>
                <TableHead className="w-36">Acerto</TableHead>
                <TableHead className="w-28 text-center">Tipo Amostra</TableHead>
                <TableHead className="text-right w-24">Acerto (min)</TableHead>
                <TableHead className="w-24 text-center">Status Acerto</TableHead>
                <TableHead className="w-32 text-center">Vigência</TableHead>
                <TableHead className="w-36 text-center">Compatibilidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-xs text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#004C97] mx-auto mb-2" />
                    Calculando compatibilidade Setup × Acerto...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center py-8 text-xs text-slate-500 bg-slate-50/40"
                  >
                    {onlyPendencies
                      ? 'Nenhuma pendência encontrada! Todos os setups ativos possuem tempo de acerto correspondente.'
                      : 'Nenhuma combinação encontrada para os filtros selecionados.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const isSetupActive = item.setupStatus === 'ACTIVE'
                  const isPending = item.isPending
                  const rowBg = isPending
                    ? 'bg-rose-50/30 hover:bg-rose-50/60'
                    : !isSetupActive
                      ? 'bg-slate-50/60 text-slate-400 opacity-80'
                      : 'hover:bg-blue-50/40'

                  return (
                    <TableRow
                      key={item.setupId}
                      onClick={() => {
                        const realSetup = setupList.find((s) => s.id === item.setupId)
                        if (realSetup && onOpenEditSetup) onOpenEditSetup(realSetup)
                      }}
                      title="Clique na linha para ver/editar o Setup (ou use botões de atalho)"
                      className={`text-xs transition-colors cursor-pointer group ${rowBg}`}
                    >
                      {/* Código Setup */}
                      <TableCell className="font-mono font-semibold text-slate-800 py-2.5">
                        <span
                          title={item.setupDescription}
                          className="group-hover:text-[#004C97] transition-colors"
                        >
                          {item.setupCode}
                        </span>
                      </TableCell>

                      {/* DE */}
                      <TableCell className="font-mono text-slate-700 py-2.5">
                        <span className="font-semibold">{item.fromCode}</span>
                        {item.fromFamily && (
                          <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">
                            {item.fromFamily}
                          </span>
                        )}
                      </TableCell>

                      {/* PARA */}
                      <TableCell className="font-mono text-slate-700 py-2.5">
                        <span className="font-semibold text-blue-900">{item.toCode}</span>
                        {item.toFamily && (
                          <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">
                            {item.toFamily}
                          </span>
                        )}
                      </TableCell>

                      {/* Duração Setup (Tempo independente) */}
                      <TableCell className="text-right font-semibold text-slate-800 py-2.5">
                        <Badge
                          variant="outline"
                          className="font-mono bg-blue-50 text-[#004C97] border-blue-200"
                        >
                          {item.setupDurationMinutes} min
                        </Badge>
                      </TableCell>

                      {/* Status Setup: Ativo / Inativo */}
                      <TableCell className="text-center py-2.5">
                        {isSetupActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-normal text-[10px] py-0 px-2">
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

                      {/* Material/Família Destino */}
                      <TableCell className="py-2.5">
                        <span className="font-mono text-slate-800 text-[11px] font-medium">
                          {item.targetMaterialOrFamily}
                        </span>
                      </TableCell>

                      {/* Acerto */}
                      <TableCell className="py-2.5">
                        {item.associatedAcerto ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-semibold text-slate-900">
                              {item.associatedAcerto.material_code}
                            </span>
                            {item.associatedAcerto.material_description && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                {item.associatedAcerto.material_description}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 italic text-[11px]">- Nenhum -</span>
                            {onOpenNewAcertoForSetup && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onOpenNewAcertoForSetup(item)
                                }}
                                className="h-5 px-1.5 text-[10px] bg-[#004C97] hover:bg-[#003870] text-white"
                              >
                                + Acerto
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Tipo Amostra */}
                      <TableCell className="text-center py-2.5">
                        {item.sampleType ? (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-medium py-0 px-1.5"
                          >
                            {SAMPLE_TYPE_LABELS[item.sampleType as any] || item.sampleType}
                          </Badge>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>

                      {/* Duração Acerto (Tempo independente) */}
                      <TableCell className="text-right font-semibold text-slate-800 py-2.5">
                        {item.acertoDurationMinutes !== undefined ? (
                          <Badge
                            variant="outline"
                            className="font-mono bg-purple-50 text-purple-700 border-purple-200"
                          >
                            {item.acertoDurationMinutes} min
                          </Badge>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>

                      {/* Status Acerto: Ativo / Inativo */}
                      <TableCell className="text-center py-2.5">
                        {item.acertoStatus ? (
                          item.acertoStatus === 'ACTIVE' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-normal text-[10px] py-0 px-2">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-slate-100 text-slate-500 border-slate-300 font-normal text-[10px] py-0 px-2"
                            >
                              Inativo
                            </Badge>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>

                      {/* Vigência (Vigente / Futuro / Vencido / Vigência incompleta) */}
                      <TableCell className="text-center py-2.5">
                        {item.setupVigencyStatus === 'Vigência incompleta' ||
                        item.acertoVigencyStatus === 'Vigência incompleta' ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-300 font-normal text-[10px] py-0 px-1.5"
                          >
                            Vigência incompleta
                          </Badge>
                        ) : item.setupVigencyStatus === 'Vencido' ||
                          item.acertoVigencyStatus === 'Vencido' ? (
                          <Badge
                            variant="outline"
                            className="bg-rose-50 text-rose-700 border-rose-200 font-normal text-[10px] py-0 px-1.5"
                          >
                            Vencido
                          </Badge>
                        ) : item.setupVigencyStatus === 'Futuro' ||
                          item.acertoVigencyStatus === 'Futuro' ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 font-normal text-[10px] py-0 px-1.5"
                          >
                            Futuro
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-normal text-[10px] py-0 px-1.5">
                            Vigente
                          </Badge>
                        )}
                      </TableCell>

                      {/* Situação de Compatibilidade */}
                      <TableCell className="text-center py-2.5">
                        {renderStatusBadge(item.compatibility)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
