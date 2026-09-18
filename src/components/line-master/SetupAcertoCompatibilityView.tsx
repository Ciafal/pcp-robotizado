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

  // Renderizador do badge de situação de compatibilidade
  const renderStatusBadge = (status: SetupAcertoCompatibilityStatus) => {
    switch (status) {
      case 'COMPATIBLE':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            COMPATÍVEL
          </Badge>
        )
      case 'MISSING_ACERTO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <XCircle className="w-3 h-3 text-rose-600" />
            SEM ACERTO
          </Badge>
        )
      case 'INACTIVE_ACERTO':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            ACERTO INATIVO
          </Badge>
        )
      case 'EXPIRED_ACERTO':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100 flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <Clock className="w-3 h-3 text-orange-600" />
            ACERTO VENCIDO
          </Badge>
        )
      case 'INCONSISTENT':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100 flex items-center gap-1 font-semibold text-[11px] py-0.5 px-2">
            <ShieldAlert className="w-3 h-3 text-purple-600" />
            INCONSISTENTE
          </Badge>
        )
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
      {/* 1. INDICADOR GERAL + CARDS DE RESUMO (Compactos) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: SETUPS ATIVOS */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Setups Ativos
              </span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
              {totalActiveSetups}
            </div>
            <span className="text-[10px] text-slate-400">Total cadastrado ativo</span>
          </CardContent>
        </Card>

        {/* Card 2: ACERTOS ATIVOS */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Acertos Ativos
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
              {totalActiveAcertos}
            </div>
            <span className="text-[10px] text-slate-400">Amostras ativas vigentes</span>
          </CardContent>
        </Card>

        {/* Card 3: SETUPS COMPATÍVEIS */}
        <Card className="bg-white border-emerald-200 bg-emerald-50/20 shadow-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
                Compatíveis
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-700">
              {compatibleSetupsCount}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Com acerto ativo</span>
          </CardContent>
        </Card>

        {/* Card 4: SETUPS SEM ACERTO */}
        <Card
          className={`border-slate-200 shadow-xs ${
            setupsWithoutAcertoCount > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-white'
          }`}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-medium uppercase tracking-wider ${
                  setupsWithoutAcertoCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'
                }`}
              >
                Sem Acerto
              </span>
              <XCircle
                className={`w-4 h-4 ${
                  setupsWithoutAcertoCount > 0 ? 'text-rose-600' : 'text-slate-400'
                }`}
              />
            </div>
            <div
              className={`mt-1 text-2xl font-bold font-mono ${
                setupsWithoutAcertoCount > 0 ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              {setupsWithoutAcertoCount}
            </div>
            <span
              className={`text-[10px] ${
                setupsWithoutAcertoCount > 0 ? 'text-rose-600 font-medium' : 'text-slate-400'
              }`}
            >
              Pendência de cadastro
            </span>
          </CardContent>
        </Card>

        {/* Card 5: ACERTOS SEM VÍNCULO */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Acertos Órfãos
              </span>
              <AlertTriangle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-700">
              {orphanAcertosCount}
            </div>
            <span className="text-[10px] text-slate-400">Sem setup correspondente</span>
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
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">
                Taxa de Cobertura
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  overallStatus === 'GREEN'
                    ? 'bg-emerald-500'
                    : overallStatus === 'YELLOW'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
              />
            </div>
            <div
              className={`mt-1 text-2xl font-black font-mono ${
                overallStatus === 'GREEN'
                  ? 'text-emerald-700'
                  : overallStatus === 'YELLOW'
                    ? 'text-amber-700'
                    : 'text-rose-700'
              }`}
            >
              {compatibilityRatePct}%
            </div>
            <span className="text-[10px] font-semibold tracking-tight text-slate-600">
              {overallStatusLabel}
            </span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Busca textual */}
            <div className="relative md:col-span-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por código de setup, descrição, material DE ou PARA..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-8 text-xs pl-8 bg-white border-slate-200"
              />
            </div>

            {/* Filtro Situação de Compatibilidade */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Situação de Compatibilidade" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50 text-xs">
                  <SelectItem value="ALL">Todas as Situações</SelectItem>
                  <SelectItem value="COMPATIBLE">Compatível (OK)</SelectItem>
                  <SelectItem value="MISSING_ACERTO">Sem Acerto (Pendência)</SelectItem>
                  <SelectItem value="INACTIVE_ACERTO">Acerto Inativo</SelectItem>
                  <SelectItem value="EXPIRED_ACERTO">Acerto Vencido</SelectItem>
                  <SelectItem value="INCONSISTENT">Inconsistente</SelectItem>
                  <SelectItem value="INACTIVE_SETUP">Setup Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Status Setup */}
            <div>
              <Select value={setupStatusFilter} onValueChange={setSetupStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
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
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow className="hover:bg-slate-50 text-xs font-semibold text-slate-700">
                <TableHead className="w-28">Cód. Setup</TableHead>
                <TableHead className="min-w-[130px]">DE</TableHead>
                <TableHead className="min-w-[130px]">PARA</TableHead>
                <TableHead className="text-right w-24">Setup (min)</TableHead>
                <TableHead className="w-20 text-center">Status Setup</TableHead>
                <TableHead className="min-w-[140px]">Material/Família Destino</TableHead>
                <TableHead className="min-w-[150px]">Acerto Associado</TableHead>
                <TableHead className="w-24 text-center">Tipo Amostra</TableHead>
                <TableHead className="text-right w-24">Acerto (min)</TableHead>
                <TableHead className="w-24 text-center">Vigência Acerto</TableHead>
                <TableHead className="w-20 text-center">Status Acerto</TableHead>
                <TableHead className="w-32 text-center">Compatibilidade</TableHead>
                <TableHead className="w-36 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8 text-xs text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#004C97] mx-auto mb-2" />
                    Calculando compatibilidade Setup × Acerto...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={13}
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
                    <TableRow key={item.setupId} className={`text-xs transition-colors ${rowBg}`}>
                      {/* Código Setup */}
                      <TableCell className="font-mono font-semibold text-slate-800 py-2.5">
                        <span title={item.setupDescription}>{item.setupCode}</span>
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

                      {/* Status Setup */}
                      <TableCell className="text-center py-2.5">
                        {isSetupActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-normal text-[10px] py-0 px-1.5">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-500 border-slate-300 font-normal text-[10px] py-0 px-1.5"
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

                      {/* Acerto Associado */}
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
                          <span className="text-slate-400 italic text-[11px]">- Nenhum -</span>
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

                      {/* Vigência Acerto */}
                      <TableCell className="text-center font-mono text-[11px] text-slate-600 py-2.5">
                        {item.acertoValidFrom ? (
                          <span>
                            {item.acertoValidFrom.slice(0, 10)}
                            {item.acertoValidUntil
                              ? ` → ${item.acertoValidUntil.slice(0, 10)}`
                              : ''}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>

                      {/* Status Acerto */}
                      <TableCell className="text-center py-2.5">
                        {item.acertoStatus ? (
                          item.acertoStatus === 'ACTIVE' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-normal text-[10px] py-0 px-1.5">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-slate-100 text-slate-500 border-slate-300 font-normal text-[10px] py-0 px-1.5"
                            >
                              Inativo
                            </Badge>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>

                      {/* Situação de Compatibilidade */}
                      <TableCell className="text-center py-2.5">
                        {renderStatusBadge(item.compatibility)}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-center py-2.5">
                        <div className="inline-flex items-center gap-1">
                          {item.compatibility === 'MISSING_ACERTO' && onOpenNewAcertoForSetup ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => onOpenNewAcertoForSetup(item)}
                              className="h-6 px-2 text-[11px] bg-[#004C97] hover:bg-[#003870] text-white font-medium flex items-center gap-1 shadow-xs"
                            >
                              <Plus className="w-3 h-3" />
                              Cadastrar Acerto
                            </Button>
                          ) : item.associatedAcerto && onOpenEditAcerto ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenEditAcerto(item.associatedAcerto!)}
                              className="h-6 px-2 text-[11px] text-[#004C97] hover:bg-blue-50 font-medium"
                            >
                              Editar Acerto
                            </Button>
                          ) : null}

                          {onOpenEditSetup && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const realSetup = setupList.find((s) => s.id === item.setupId)
                                if (realSetup) onOpenEditSetup(realSetup)
                              }}
                              className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              title="Editar Setup"
                            >
                              Setup
                            </Button>
                          )}
                        </div>
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
