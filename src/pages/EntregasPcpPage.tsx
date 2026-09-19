import React, { useState, useMemo } from 'react'
import {
  CiafalPageHeader,
  CiafalKPICard,
  CiafalFilterBar,
  CiafalDataTable,
  CiafalChartContainer,
  CiafalEmptyState,
  formatAbntNumber,
} from '@/components/common/CiafalDesignSystem'
import { EntregasSubmenu } from '@/components/pcp/entregas/EntregasSubmenu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Search,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Truck,
  Building2,
  CalendarRange,
} from 'lucide-react'

export interface DeliveryItem {
  id: string
  orderCode: string
  clientName: string
  lineCode: string
  lineName: string
  productDescription: string
  weightTons: number
  scheduledDate: string // YYYY-MM-DD
  actualDate?: string // YYYY-MM-DD
  status: 'NO_PRAZO' | 'ATRASADA' | 'REPROGRAMADA'
  month: string // YYYY-MM
  destinyCity: string
}

const mockDeliveries: DeliveryItem[] = [
  {
    id: 'ENT-2025-001',
    orderCode: 'OP-70821',
    clientName: 'Estruturas Metálicas Triângulo',
    lineCode: 'L1',
    lineName: 'L1 - Laminação & Conformação',
    productDescription: 'Tubo Redondo DIN 2440 2" x 3,00mm',
    weightTons: 42.5,
    scheduledDate: '2025-05-04',
    actualDate: '2025-05-04',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Betim / MG',
  },
  {
    id: 'ENT-2025-002',
    orderCode: 'OP-70835',
    clientName: 'Siderúrgica Sul de Minas',
    lineCode: 'L1',
    lineName: 'L1 - Laminação & Conformação',
    productDescription: 'Tubo Retangular 80x40x2,65mm',
    weightTons: 68.0,
    scheduledDate: '2025-05-07',
    actualDate: '2025-05-07',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Pouso Alegre / MG',
  },
  {
    id: 'ENT-2025-003',
    orderCode: 'OP-70849',
    clientName: 'AgroMáquinas do Centro-Oeste',
    lineCode: 'L2',
    lineName: 'L2 - Perfis & Estruturais',
    productDescription: 'Perfil U Enrijecido 150x60x2,25mm',
    weightTons: 35.8,
    scheduledDate: '2025-05-08',
    actualDate: '2025-05-11',
    status: 'ATRASADA',
    month: '2025-05',
    destinyCity: 'Goiânia / GO',
  },
  {
    id: 'ENT-2025-004',
    orderCode: 'OP-70860',
    clientName: 'Construtora Horizonte Verde',
    lineCode: 'ENDIR',
    lineName: 'ENDIR - Endireitadeira',
    productDescription: 'Barra Chata Laminada 2" x 1/4"',
    weightTons: 28.4,
    scheduledDate: '2025-05-10',
    actualDate: '2025-05-10',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Contagem / MG',
  },
  {
    id: 'ENT-2025-005',
    orderCode: 'OP-70877',
    clientName: 'Indústria Metal-Mecânica Santos',
    lineCode: 'L1',
    lineName: 'L1 - Laminação & Conformação',
    productDescription: 'Tubo Quadrado 50x50x2,00mm SAE 1012',
    weightTons: 54.0,
    scheduledDate: '2025-05-12',
    actualDate: '2025-05-12',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Divinópolis / MG',
  },
  {
    id: 'ENT-2025-006',
    orderCode: 'OP-70891',
    clientName: 'Distribuidora de Aço Planalto',
    lineCode: 'L2',
    lineName: 'L2 - Perfis & Estruturais',
    productDescription: 'Perfil U Simples 100x40x2,00mm',
    weightTons: 31.2,
    scheduledDate: '2025-05-14',
    actualDate: '2025-05-18',
    status: 'REPROGRAMADA',
    month: '2025-05',
    destinyCity: 'Brasília / DF',
  },
  {
    id: 'ENT-2025-007',
    orderCode: 'OP-70905',
    clientName: 'Implementos Rodoviários Minas',
    lineCode: 'ACAB_L1',
    lineName: 'ACAB_L1 - Acabamento L1',
    productDescription: 'Tubo Redondo 3" x 3,75mm NBR 5580',
    weightTons: 47.6,
    scheduledDate: '2025-05-16',
    actualDate: '2025-05-16',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Sete Lagoas / MG',
  },
  {
    id: 'ENT-2025-008',
    orderCode: 'OP-70918',
    clientName: 'Metalúrgica Imperial Ltda',
    lineCode: 'L1',
    lineName: 'L1 - Laminação & Conformação',
    productDescription: 'Tubo Retangular 100x50x3,00mm',
    weightTons: 62.5,
    scheduledDate: '2025-05-18',
    actualDate: '2025-05-18',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Belo Horizonte / MG',
  },
  {
    id: 'ENT-2025-009',
    orderCode: 'OP-70932',
    clientName: 'Serralheria & Perfis Vale do Aço',
    lineCode: 'L2',
    lineName: 'L2 - Perfis & Estruturais',
    productDescription: 'Perfil U Enrijecido 127x50x2,65mm',
    weightTons: 39.0,
    scheduledDate: '2025-05-20',
    actualDate: '2025-05-20',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Ipatinga / MG',
  },
  {
    id: 'ENT-2025-010',
    orderCode: 'OP-70944',
    clientName: 'Armações & Vigas Centro',
    lineCode: 'ENDIR',
    lineName: 'ENDIR - Endireitadeira',
    productDescription: 'Barra Quadrada Trefilada 1" 1045',
    weightTons: 19.5,
    scheduledDate: '2025-05-22',
    actualDate: '2025-05-25',
    status: 'ATRASADA',
    month: '2025-05',
    destinyCity: 'Uberlândia / MG',
  },
  {
    id: 'ENT-2025-011',
    orderCode: 'OP-70956',
    clientName: 'Caldeiraria São Paulo',
    lineCode: 'L1',
    lineName: 'L1 - Laminação & Conformação',
    productDescription: 'Tubo Redondo 4" x 4,25mm Sch 40',
    weightTons: 71.0,
    scheduledDate: '2025-05-24',
    actualDate: '2025-05-24',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Campinas / SP',
  },
  {
    id: 'ENT-2025-012',
    orderCode: 'OP-70970',
    clientName: 'Estruturas Metálicas Triângulo',
    lineCode: 'L2',
    lineName: 'L2 - Perfis & Estruturais',
    productDescription: 'Perfil U Simples 150x50x3,00mm',
    weightTons: 44.0,
    scheduledDate: '2025-05-26',
    actualDate: '2025-05-26',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Uberaba / MG',
  },
  {
    id: 'ENT-2025-013',
    orderCode: 'OP-70982',
    clientName: 'Montagens Industriais Vale',
    lineCode: 'ACAB_L2',
    lineName: 'ACAB_L2 - Acabamento L2',
    productDescription: 'Perfil Especial Sob Medida ASTM A36',
    weightTons: 22.8,
    scheduledDate: '2025-05-28',
    actualDate: '2025-05-30',
    status: 'REPROGRAMADA',
    month: '2025-05',
    destinyCity: 'Nova Lima / MG',
  },
  {
    id: 'ENT-2025-014',
    orderCode: 'OP-70995',
    clientName: 'Indústria Metal-Mecânica Santos',
    lineCode: 'L1',
    lineName: 'L1 - Laminação & Conformação',
    productDescription: 'Tubo Retangular 120x60x3,20mm',
    weightTons: 58.2,
    scheduledDate: '2025-05-30',
    actualDate: '2025-05-30',
    status: 'NO_PRAZO',
    month: '2025-05',
    destinyCity: 'Divinópolis / MG',
  },
  // Mês anterior (Abril 2025) para permitir teste de filtro por mês
  {
    id: 'ENT-2025-015',
    orderCode: 'OP-70650',
    clientName: 'Siderúrgica Sul de Minas',
    lineCode: 'L1',
    lineName: 'L1 - Laminação & Conformação',
    productDescription: 'Tubo Redondo 2.1/2" x 3,00mm',
    weightTons: 50.0,
    scheduledDate: '2025-04-28',
    actualDate: '2025-04-28',
    status: 'NO_PRAZO',
    month: '2025-04',
    destinyCity: 'Pouso Alegre / MG',
  },
]

/**
 * Converte data ISO YYYY-MM-DD para o formato pt-BR DD/MM/AAAA
 */
function formatIsoToPtBrDate(isoDate?: string): string {
  if (!isoDate) return '—'
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export const EntregasPcpPage: React.FC = () => {
  const { toast } = useToast()
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-05')
  const [selectedLine, setSelectedLine] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isTriggeringDraft, setIsTriggeringDraft] = useState<boolean>(false)

  // Gatilho Automático: quando uma programação for marcada como entregue, gera rascunho de resumo
  const handleMarkProgramAsDelivered = async (lineCode: string = 'L1') => {
    setIsTriggeringDraft(true)
    try {
      const summary = await pcpMonthlySummaryService.triggerDraftFromDelivery({
        empresaCode: 'CIAFAL',
        centroCode: '1010',
        centroNome: '1010 - Usina Divinópolis Matriz',
        linhaCode: lineCode,
        linhaNome: `Linha ${lineCode}`,
        ano: 2025,
        mes: 5,
        programacaoVersionCode: `WS-${lineCode}-2025-W19-V01`,
        responsavelNome: 'Carlos Mendes',
        responsavelEmail: 'carlos.mendes@ciafal.com.br',
      })
      toast({
        title: 'Programação Marcada como ENTREGUE',
        description: `Rascunho de Resumo Mensal gerado com sucesso: ${summary.summary_code}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar rascunho',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsTriggeringDraft(false)
    }
  }

  // Filtragem dos dados
  const filteredData = useMemo(() => {
    return mockDeliveries.filter((item) => {
      if (selectedMonth !== 'ALL' && item.month !== selectedMonth) return false
      if (selectedLine !== 'ALL' && item.lineCode !== selectedLine) return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesOrder = item.orderCode.toLowerCase().includes(query)
        const matchesClient = item.clientName.toLowerCase().includes(query)
        const matchesProd = item.productDescription.toLowerCase().includes(query)
        const matchesCity = item.destinyCity.toLowerCase().includes(query)
        if (!matchesOrder && !matchesClient && !matchesProd && !matchesCity) return false
      }
      return true
    })
  }, [selectedMonth, selectedLine, selectedStatus, searchQuery])

  // Cálculo de KPIs
  const totalCount = filteredData.length
  const onTimeCount = filteredData.filter((i) => i.status === 'NO_PRAZO').length
  const delayedCount = filteredData.filter((i) => i.status === 'ATRASADA').length
  const rescheduledCount = filteredData.filter((i) => i.status === 'REPROGRAMADA').length
  const adherencePct = totalCount > 0 ? (onTimeCount / totalCount) * 100 : 0
  const totalWeightTons = filteredData.reduce((acc, i) => acc + i.weightTons, 0)

  // Resumo agrupado por linha de produção
  const lineSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        lineCode: string
        lineName: string
        total: number
        noPrazo: number
        atrasadas: number
        reprogramadas: number
        totalTons: number
      }
    >()

    filteredData.forEach((item) => {
      const existing = map.get(item.lineCode) || {
        lineCode: item.lineCode,
        lineName: item.lineName,
        total: 0,
        noPrazo: 0,
        atrasadas: 0,
        reprogramadas: 0,
        totalTons: 0,
      }
      existing.total += 1
      existing.totalTons += item.weightTons
      if (item.status === 'NO_PRAZO') existing.noPrazo += 1
      else if (item.status === 'ATRASADA') existing.atrasadas += 1
      else if (item.status === 'REPROGRAMADA') existing.reprogramadas += 1

      map.set(item.lineCode, existing)
    })

    return Array.from(map.values())
  }, [filteredData])

  const handleClearFilters = () => {
    setSelectedMonth('2025-05')
    setSelectedLine('ALL')
    setSelectedStatus('ALL')
    setSearchQuery('')
  }

  // Renderiza badge com cores do design system
  const renderStatusBadge = (status: DeliveryItem['status']) => {
    switch (status) {
      case 'NO_PRAZO':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-[11px] gap-1 shrink-0 whitespace-nowrap"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            No Prazo
          </Badge>
        )
      case 'ATRASADA':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-800 border-rose-300 font-semibold text-[11px] gap-1 shrink-0 whitespace-nowrap"
          >
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Atrasada
          </Badge>
        )
      case 'REPROGRAMADA':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-300 font-semibold text-[11px] gap-1 shrink-0 whitespace-nowrap"
          >
            <Clock className="w-3 h-3 text-amber-600" />
            Reprogramada
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4 max-w-full min-w-0" data-testid="entregas-pcp-page">
      <EntregasSubmenu />

      {/* Cabeçalho da Página com Padrão CIAFAL */}
      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Entregas PCP"
        subtitle="Gestão mensal de atendimento e entregas da programação fabril com rastreabilidade por linha e status de expedição."
        breadcrumbs={[{ label: 'Programação', href: '/pcp/cockpit' }, { label: 'Entregas PCP' }]}
        badge="Mês Vigente: Maio/2025"
        dataSource="SAP ECC ZSD28C / WMS Expedição"
        lastUpdated={new Date()}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkProgramAsDelivered('L1')}
              disabled={isTriggeringDraft}
              className="h-8 gap-1.5 border-[#004C97] text-[#004C97] bg-white hover:bg-[#004C97]/5 text-xs font-semibold"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Marcar como Entregue (Gatilho Resumo)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 gap-1.5 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Redefinir</span>
            </Button>
          </div>
        }
      />

      {/* Grid de KPIs do Mês (Formatação pt-BR garantida) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
        <CiafalKPICard
          title="Aderência às Entregas"
          value={adherencePct}
          unit="%"
          decimals={1}
          target="95,0"
          targetLabel="Meta SLA:"
          status={adherencePct >= 90 ? 'NORMAL' : 'ATENCAO'}
          infoTooltip="Percentual de ordens entregues rigorosamente dentro do prazo acordado com o cliente."
          icon={TrendingUp}
        />
        <CiafalKPICard
          title="Entregas no Prazo"
          value={onTimeCount}
          unit="ordens"
          decimals={0}
          status="SUCESSO"
          infoTooltip="Total de pedidos programados e faturados no prazo programado."
          icon={CheckCircle2}
        />
        <CiafalKPICard
          title="Entregas Atrasadas"
          value={delayedCount}
          unit="ordens"
          decimals={0}
          status={delayedCount === 0 ? 'NORMAL' : 'CRITICO'}
          infoTooltip="Ordens que ultrapassaram a data de entrega prometida ao cliente."
          icon={AlertTriangle}
        />
        <CiafalKPICard
          title="Total Programado"
          value={totalCount}
          unit="ordens"
          decimals={0}
          target={`${formatAbntNumber(totalWeightTons, 1)} t`}
          targetLabel="Volume Total:"
          status="NORMAL"
          infoTooltip="Volume global de entregas cadastradas no horizonte selecionado."
          icon={Truck}
        />
      </div>

      {/* Barra de Filtros Combináveis (CiafalFilterBar com min-w-0 e truncamento seguro) */}
      <CiafalFilterBar
        totalCount={mockDeliveries.length}
        filteredCount={filteredData.length}
        onClear={handleClearFilters}
      >
        {/* Filtro de Mês */}
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarRange className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Filtro de Mês"
            className="bg-slate-50 border border-slate-300 rounded-md text-slate-800 text-xs px-2.5 py-1.5 outline-none font-medium min-w-0 max-w-[170px] truncate"
          >
            <option value="ALL">Todos os Meses</option>
            <option value="2025-05">Maio / 2025 (Atual)</option>
            <option value="2025-04">Abril / 2025</option>
          </select>
        </div>

        {/* Filtro de Linha */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            aria-label="Filtro de Linha de Produção"
            className="bg-slate-50 border border-slate-300 rounded-md text-slate-800 text-xs px-2.5 py-1.5 outline-none font-medium min-w-0 w-full sm:w-auto sm:max-w-[260px] truncate"
          >
            <option value="ALL">Todas as Linhas</option>
            <option value="L1">L1 - Laminação & Conformação</option>
            <option value="L2">L2 - Perfis & Estruturais</option>
            <option value="ENDIR">ENDIR - Endireitadeira</option>
            <option value="ACAB_L1">ACAB_L1 - Acabamento L1</option>
            <option value="ACAB_L2">ACAB_L2 - Acabamento L2</option>
          </select>
        </div>

        {/* Filtro de Status */}
        <div className="flex items-center gap-1.5 min-w-0">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filtro de Status"
            className="bg-slate-50 border border-slate-300 rounded-md text-slate-800 text-xs px-2.5 py-1.5 outline-none font-medium min-w-0 max-w-[180px] truncate"
          >
            <option value="ALL">Todos os Status</option>
            <option value="NO_PRAZO">No Prazo</option>
            <option value="ATRASADA">Atrasada</option>
            <option value="REPROGRAMADA">Reprogramada</option>
          </select>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="relative min-w-0 flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar OP, cliente, produto, cidade..."
            className="bg-slate-50 border-slate-300 text-slate-800 text-xs pl-8 h-8 rounded-md min-w-0"
          />
        </div>
      </CiafalFilterBar>

      {/* Resumo por Linha de Produção */}
      <CiafalChartContainer
        title="Resumo de Entregas por Linha Fabril"
        subtitle="Distribuição do volume programado, entregas no prazo e índice de aderência operacional por recurso"
        height="auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {lineSummary.map((line) => {
            const lineAdherence = line.total > 0 ? (line.noPrazo / line.total) * 100 : 0
            return (
              <div
                key={line.lineCode}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2 min-w-0"
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="font-bold text-slate-900 text-xs truncate" title={line.lineName}>
                    {line.lineName}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      lineAdherence >= 90
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {formatAbntNumber(lineAdherence, 1)} % SLA
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Total
                    </span>
                    <strong className="text-slate-800 font-mono">{line.total}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-600 block text-[10px] uppercase font-bold">
                      No Prazo
                    </span>
                    <strong className="text-emerald-700 font-mono">{line.noPrazo}</strong>
                  </div>
                  <div>
                    <span className="text-rose-600 block text-[10px] uppercase font-bold">
                      Desvios
                    </span>
                    <strong className="text-rose-700 font-mono">
                      {line.atrasadas + line.reprogramadas}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1">
                  <span>Volume:</span>
                  <strong className="text-slate-800">
                    {formatAbntNumber(line.totalTons, 1)} t
                  </strong>
                </div>
              </div>
            )
          })}
        </div>
      </CiafalChartContainer>

      {/* Tabela Detalhada de Entregas (com datas em DD/MM/AAAA) */}
      <CiafalDataTable
        title="Detalhamento das Ordens de Entrega Programadas"
        subtitle="Registro analítico de OPs com validação de datas contratuais, efetivas e apontamentos WMS"
        columns={[
          { key: 'orderCode', label: 'Ordem (OP)', width: '100px' },
          { key: 'clientName', label: 'Cliente', width: '220px' },
          { key: 'lineName', label: 'Linha', width: '180px' },
          { key: 'productDescription', label: 'Material / Descrição', width: '240px' },
          { key: 'weightTons', label: 'Peso (t)', align: 'right', width: '90px' },
          { key: 'scheduledDate', label: 'Data Programada', align: 'center', width: '120px' },
          { key: 'actualDate', label: 'Data Efetiva', align: 'center', width: '120px' },
          { key: 'status', label: 'Status', align: 'center', width: '130px' },
          { key: 'destinyCity', label: 'Destino', width: '140px' },
        ]}
        isEmpty={filteredData.length === 0}
        emptyMessage="Nenhuma entrega encontrada para a combinação de filtros selecionada."
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-slate-500">
              Mostrando <strong>{filteredData.length}</strong> de{' '}
              <strong>{mockDeliveries.length}</strong> entregas registradas
            </span>
            <span className="text-slate-600 font-medium">
              Volume total listado:{' '}
              <strong className="text-[#004C97] font-mono">
                {formatAbntNumber(totalWeightTons, 1)} t
              </strong>
            </span>
          </div>
        }
      >
        {filteredData.map((item) => (
          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
            <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
              {item.orderCode}
            </td>
            <td className="px-3 py-2.5 text-slate-800 font-medium whitespace-nowrap">
              {item.clientName}
            </td>
            <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{item.lineName}</td>
            <td
              className="px-3 py-2.5 text-slate-700 max-w-[240px] truncate"
              title={item.productDescription}
            >
              {item.productDescription}
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
              {formatAbntNumber(item.weightTons, 1)}
            </td>
            <td className="px-3 py-2.5 text-center font-mono text-slate-700 whitespace-nowrap">
              {formatIsoToPtBrDate(item.scheduledDate)}
            </td>
            <td className="px-3 py-2.5 text-center font-mono text-slate-700 whitespace-nowrap">
              {formatIsoToPtBrDate(item.actualDate)}
            </td>
            <td className="px-3 py-2.5 text-center whitespace-nowrap">
              {renderStatusBadge(item.status)}
            </td>
            <td className="px-3 py-2.5 text-slate-600 text-[11px] whitespace-nowrap">
              {item.destinyCity}
            </td>
          </tr>
        ))}
      </CiafalDataTable>
    </div>
  )
}

export default EntregasPcpPage
