import React, { useState, useMemo } from 'react'
import { EntregasSubmenu } from '@/components/pcp/entregas/EntregasSubmenu'
import {
  CiafalPageHeader,
  CiafalKPICard,
  CiafalDataTable,
} from '@/components/common/CiafalDesignSystem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  History,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Search,
  Filter,
} from 'lucide-react'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

interface DeliveryHistoryItem {
  id: string
  orderCode: string
  clientName: string
  lineCode: string
  productDescription: string
  weightTons: number
  scheduledDate: string
  actualDeliveryDate: string
  varianceDays: number
  status: 'NO_PRAZO' | 'ATRASADA' | 'REPROGRAMADA'
  destinationCity: string
  nfNumber: string
}

const mockHistoryList: DeliveryHistoryItem[] = [
  {
    id: 'HIST-001',
    orderCode: 'OP-70821',
    clientName: 'Estruturas Metálicas Triângulo',
    lineCode: 'L1',
    productDescription: 'Tubo Redondo DIN 2440 2" x 3,00mm',
    weightTons: 42.5,
    scheduledDate: '04/05/2025',
    actualDeliveryDate: '04/05/2025',
    varianceDays: 0,
    status: 'NO_PRAZO',
    destinationCity: 'Betim / MG',
    nfNumber: 'NF-108291',
  },
  {
    id: 'HIST-002',
    orderCode: 'OP-70835',
    clientName: 'Siderúrgica Sul de Minas',
    lineCode: 'L1',
    productDescription: 'Tubo Retangular 80x40x2,65mm',
    weightTons: 68.0,
    scheduledDate: '07/05/2025',
    actualDeliveryDate: '07/05/2025',
    varianceDays: 0,
    status: 'NO_PRAZO',
    destinationCity: 'Pouso Alegre / MG',
    nfNumber: 'NF-108304',
  },
  {
    id: 'HIST-003',
    orderCode: 'OP-70849',
    clientName: 'AgroMáquinas do Centro-Oeste',
    lineCode: 'L2',
    productDescription: 'Perfil U Enrijecido 150x60x2,25mm',
    weightTons: 35.8,
    scheduledDate: '08/05/2025',
    actualDeliveryDate: '11/05/2025',
    varianceDays: 3,
    status: 'ATRASADA',
    destinationCity: 'Goiânia / GO',
    nfNumber: 'NF-108320',
  },
  {
    id: 'HIST-004',
    orderCode: 'OP-70860',
    clientName: 'Construtora Horizonte Verde',
    lineCode: 'ENDIR',
    productDescription: 'Barra Chata Laminada 2" x 1/4"',
    weightTons: 28.4,
    scheduledDate: '10/05/2025',
    actualDeliveryDate: '10/05/2025',
    varianceDays: 0,
    status: 'NO_PRAZO',
    destinationCity: 'Contagem / MG',
    nfNumber: 'NF-108345',
  },
  {
    id: 'HIST-005',
    orderCode: 'OP-70891',
    clientName: 'Distribuidora de Aço Planalto',
    lineCode: 'L2',
    productDescription: 'Perfil U Simples 100x40x2,00mm',
    weightTons: 31.2,
    scheduledDate: '14/05/2025',
    actualDeliveryDate: '18/05/2025',
    varianceDays: 4,
    status: 'REPROGRAMADA',
    destinationCity: 'Brasília / DF',
    nfNumber: 'NF-108378',
  },
  {
    id: 'HIST-006',
    orderCode: 'OP-70944',
    clientName: 'Armações & Vigas Centro',
    lineCode: 'ENDIR',
    productDescription: 'Barra Quadrada Trefilada 1" 1045',
    weightTons: 19.5,
    scheduledDate: '22/05/2025',
    actualDeliveryDate: '25/05/2025',
    varianceDays: 3,
    status: 'ATRASADA',
    destinationCity: 'Uberlândia / MG',
    nfNumber: 'NF-108412',
  },
  {
    id: 'HIST-007',
    orderCode: 'OP-70982',
    clientName: 'Montagens Industriais Vale',
    lineCode: 'ACAB_L2',
    productDescription: 'Perfil Especial Sob Medida ASTM A36',
    weightTons: 22.8,
    scheduledDate: '28/05/2025',
    actualDeliveryDate: '30/05/2025',
    varianceDays: 2,
    status: 'REPROGRAMADA',
    destinationCity: 'Nova Lima / MG',
    nfNumber: 'NF-108490',
  },
]

export const EntregasHistoricoPage: React.FC = () => {
  const [lineFilter, setLineFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return mockHistoryList.filter((item) => {
      if (lineFilter !== 'ALL' && item.lineCode !== lineFilter) return false
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          item.orderCode.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          item.productDescription.toLowerCase().includes(q) ||
          item.destinationCity.toLowerCase().includes(q) ||
          item.nfNumber.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [lineFilter, statusFilter, search])

  const totalTons = filtered.reduce((acc, i) => acc + i.weightTons, 0)
  const onTimeCount = filtered.filter((i) => i.status === 'NO_PRAZO').length
  const adherence = filtered.length > 0 ? (onTimeCount / filtered.length) * 100 : 0

  return (
    <div className="space-y-4 max-w-full min-w-0" data-testid="entregas-historico-page">
      <EntregasSubmenu />

      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Histórico de Entregas"
        subtitle="Registro consolidado de ordens de produção concluídas, notas fiscais emitidas e aderência histórica ao SLA fabril."
        breadcrumbs={[{ label: 'Entregas PCP', href: '/pcp/entregas' }, { label: 'Histórico' }]}
        badge="Histórico Oficial"
        dataSource="SAP ECC ZSD28C / WMS / S/4HANA"
        lastUpdated={new Date()}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CiafalKPICard
          title="Ordens Históricas"
          value={filtered.length}
          unit="ordens"
          status="NORMAL"
          icon={History}
        />
        <CiafalKPICard
          title="Volume Histórico"
          value={totalTons}
          unit="t"
          decimals={1}
          status="NORMAL"
          icon={Building2}
        />
        <CiafalKPICard
          title="Aderência Acumulada"
          value={adherence}
          unit="%"
          decimals={1}
          target="95,0"
          targetLabel="Meta:"
          status={adherence >= 90 ? 'NORMAL' : 'ATENCAO'}
          icon={CheckCircle2}
        />
        <CiafalKPICard
          title="Entregas no Prazo"
          value={onTimeCount}
          unit="ordens"
          status="SUCESSO"
          icon={Calendar}
        />
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ordem, cliente, NF..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-700"
            >
              <option value="ALL">Todas as Linhas</option>
              <option value="L1">Linha L1</option>
              <option value="L2">Linha L2</option>
              <option value="ENDIR">Endireitadeira</option>
              <option value="ACAB_L2">Acabamento L2</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-700"
            >
              <option value="ALL">Todos os Status</option>
              <option value="NO_PRAZO">No Prazo</option>
              <option value="ATRASADA">Atrasada</option>
              <option value="REPROGRAMADA">Reprogramada</option>
            </select>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLineFilter('ALL')
            setStatusFilter('ALL')
            setSearch('')
          }}
          className="h-8 text-xs gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpar</span>
        </Button>
      </div>

      <CiafalDataTable
        title="Histórico de Ordens Faturadas e Entregues"
        subtitle={`Exibindo ${filtered.length} registro(s) históricos apurados.`}
        columns={[
          { key: 'orderCode', label: 'Ordem (OP)', width: '110px' },
          { key: 'nfNumber', label: 'Nota Fiscal', width: '110px' },
          { key: 'clientName', label: 'Cliente', width: '220px' },
          { key: 'lineCode', label: 'Linha', align: 'center', width: '80px' },
          { key: 'productDescription', label: 'Material SAP / Produto' },
          { key: 'weightTons', label: 'Peso (t)', align: 'right', width: '100px' },
          { key: 'scheduledDate', label: 'Prazo Prog.', align: 'center', width: '110px' },
          { key: 'actualDeliveryDate', label: 'Entrega Real', align: 'center', width: '110px' },
          { key: 'status', label: 'Status', align: 'center', width: '130px' },
        ]}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderCell={(item, key) => {
          if (key === 'weightTons') return `${formatNumberPTBR(item.weightTons, 1)} t`
          if (key === 'status') {
            if (item.status === 'NO_PRAZO') {
              return (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> No Prazo
                </Badge>
              )
            }
            if (item.status === 'ATRASADA') {
              return (
                <Badge
                  variant="outline"
                  className="bg-rose-50 text-rose-800 border-rose-300 text-[11px] gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Atrasada (+{item.varianceDays}
                  d)
                </Badge>
              )
            }
            return (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] gap-1"
              >
                <Clock className="w-3 h-3 text-amber-600" /> Reprogramada
              </Badge>
            )
          }
          return (item as any)[key]
        }}
      />
    </div>
  )
}
export default EntregasHistoricoPage
