import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MPL1RequirementRow, L1AutoStatus } from '@/types/mp-optimization'
import { useToast } from '@/hooks/use-toast'
import {
  Factory,
  Send,
  AlertTriangle,
  CheckCircle2,
  Truck,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  Layers,
  MapPin,
  Clock,
} from 'lucide-react'

export const MPL1BalanceAndConsumptionSubpage: React.FC = () => {
  const { toast } = useToast()

  // Estados de Filtros e Horizonte Dinâmico
  const [selectedHorizon, setSelectedHorizon] = useState<string>('4_SEMANAS')
  const [selectedSteel, setSelectedSteel] = useState<string>('TODOS')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Dados Oficiais da Matriz L1 (Base da planilha "Saldo MP para L1 - 8.1.001 - R018.xlsx")
  const [matrixRows, setMatrixRows] = useState<MPL1RequirementRow[]>([
    {
      id: 'l1-01',
      steel_grade: 'SAE 1020',
      dimension_desc: 'TARUGO 130X130 MM (525 KG)',
      stock_ks_tons: 140.0,
      stock_dp07_tons: 80.0,
      stock_dp04_tons: 60.0,
      stock_other_depots_tons: 35.0,
      ks_cut_tons: 25.0,
      l2_production_weekly_tons: 120.0,
      po_supplier_balance_tons: 80.0,
      l1_schedule_weekly_tons: 320.0,
      total_consumption_tons: 320.0,
      projected_balance_tons: 220.0,
      min_stock_tons: 60.0,
      need_produce_l2_tons: 0,
      auto_status: 'OK_SOBRA',
      human_observation: 'Saldo plenamente coberto pelo estoque KS e produção programada L2.',
      physical_location_summary: 'Pátio Central MP (DP01) + Mesa Corte KS',
      suppliers_breakdown_json: [
        {
          supplier: 'Gerdau Aços Especiais',
          poNumber: 'PO-45009182',
          orderedTons: 100,
          receivedTons: 20,
          balanceTons: 80,
          expectedDate: '2026-07-12',
          delayDays: 0,
        },
      ],
    },
    {
      id: 'l1-02',
      steel_grade: 'SAE 1045',
      dimension_desc: 'TARUGO 120X120 MM (510 KG)',
      stock_ks_tons: 45.0,
      stock_dp07_tons: 20.0,
      stock_dp04_tons: 30.0,
      stock_other_depots_tons: 10.0,
      ks_cut_tons: 15.0,
      l2_production_weekly_tons: 50.0,
      po_supplier_balance_tons: 40.0,
      l1_schedule_weekly_tons: 280.0,
      total_consumption_tons: 280.0,
      projected_balance_tons: -70.0,
      min_stock_tons: 50.0,
      need_produce_l2_tons: 120.0,
      need_l2_week: 'Semana 38',
      need_l2_deadline: '2026-07-20',
      impacted_l1_orders_json: ['OP-2026-8819', 'OP-2026-8820', 'OP-2026-8824'],
      auto_status: 'NECESSARIO_PRODUZIR_L2',
      human_observation: 'Déficit de 120 t para atender a programação L1 da Semana 38.',
      physical_location_summary: 'Pátio MP + Baia L2-02',
      suppliers_breakdown_json: [
        {
          supplier: 'Sinobrás S/A',
          poNumber: 'PO-45009040',
          orderedTons: 60,
          receivedTons: 20,
          balanceTons: 40,
          expectedDate: '2026-07-18',
          delayDays: 3,
        },
      ],
    },
    {
      id: 'l1-03',
      steel_grade: 'SAE 4140',
      dimension_desc: 'TARUGO REDONDO 100 MM',
      stock_ks_tons: 30.0,
      stock_dp07_tons: 15.0,
      stock_dp04_tons: 20.0,
      stock_other_depots_tons: 5.0,
      ks_cut_tons: 10.0,
      l2_production_weekly_tons: 25.0,
      po_supplier_balance_tons: 30.0,
      l1_schedule_weekly_tons: 95.0,
      total_consumption_tons: 95.0,
      projected_balance_tons: 35.0,
      min_stock_tons: 25.0,
      need_produce_l2_tons: 0,
      auto_status: 'DEPENDENTE_RECEBIMENTO',
      human_observation: 'Saldo depende da entrega do pedido Gerdau até 15/07.',
      physical_location_summary: 'Pátio Central DP01 Baia A-09',
      suppliers_breakdown_json: [
        {
          supplier: 'Gerdau Aços Especiais',
          poNumber: 'PO-45008890',
          orderedTons: 50,
          receivedTons: 20,
          balanceTons: 30,
          expectedDate: '2026-07-15',
          delayDays: 0,
        },
      ],
    },
    {
      id: 'l1-04',
      steel_grade: 'SAE 8620',
      dimension_desc: 'TARUGO 130X130 MM (525 KG)',
      stock_ks_tons: 20.0,
      stock_dp07_tons: 10.0,
      stock_dp04_tons: 15.0,
      stock_other_depots_tons: 5.0,
      ks_cut_tons: 5.0,
      l2_production_weekly_tons: 15.0,
      po_supplier_balance_tons: 20.0,
      l1_schedule_weekly_tons: 70.0,
      total_consumption_tons: 70.0,
      projected_balance_tons: 15.0,
      min_stock_tons: 20.0,
      need_produce_l2_tons: 0,
      auto_status: 'ESTOQUE_ABAIXO_MINIMO',
      human_observation:
        'Saldo projetado (15 t) ficará abaixo do estoque mínimo de segurança (20 t).',
      physical_location_summary: 'DP01 Baia A-11',
      suppliers_breakdown_json: [
        {
          supplier: 'ArcelorMittal',
          poNumber: 'PO-45007730',
          orderedTons: 30,
          receivedTons: 10,
          balanceTons: 20,
          expectedDate: '2026-07-22',
          delayDays: 0,
        },
      ],
    },
    {
      id: 'l1-05',
      steel_grade: '20MnCr5',
      dimension_desc: 'TARUGO 110X110 MM',
      stock_ks_tons: 25.0,
      stock_dp07_tons: 10.0,
      stock_dp04_tons: 12.0,
      stock_other_depots_tons: 5.0,
      ks_cut_tons: 0,
      l2_production_weekly_tons: 20.0,
      po_supplier_balance_tons: 15.0,
      l1_schedule_weekly_tons: 55.0,
      total_consumption_tons: 55.0,
      projected_balance_tons: 32.0,
      min_stock_tons: 15.0,
      need_produce_l2_tons: 0,
      auto_status: 'OK_SOBRA',
      human_observation: 'Atendimento pleno confirmado.',
      physical_location_summary: 'DP01 Baia A-08',
      suppliers_breakdown_json: [],
    },
  ])

  // Ação: Enviar Necessidade para Programação L2
  const handleSendToL2 = (row: MPL1RequirementRow) => {
    toast({
      title: 'Necessidade enviada para a Linha 2 (L2)',
      description: `Inclusão de ${row.need_produce_l2_tons} t de ${row.steel_grade} (${row.dimension_desc}) enviada para o Workflow de Versionamento do PCP Robotizado.`,
    })
  }

  // Filtros
  const filteredRows = matrixRows.filter((r) => {
    if (selectedSteel !== 'TODOS' && r.steel_grade !== selectedSteel) return false
    if (
      searchTerm &&
      !r.steel_grade.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !r.dimension_desc.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }
    return true
  })

  // Totais
  const totalL1Consumption = matrixRows.reduce((a, b) => a + b.total_consumption_tons, 0)
  const totalL2Need = matrixRows.reduce((a, b) => a + b.need_produce_l2_tons, 0)
  const totalKsStock = matrixRows.reduce((a, b) => a + b.stock_ks_tons, 0)
  const totalSupplierBalance = matrixRows.reduce((a, b) => a + b.po_supplier_balance_tons, 0)

  const getStatusBadge = (status: L1AutoStatus) => {
    switch (status) {
      case 'OK_SOBRA':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
            OK — Sobra
          </Badge>
        )
      case 'NECESSARIO_PRODUZIR_L2':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold animate-pulse">
            Necessário Produzir L2
          </Badge>
        )
      case 'DEPENDENTE_RECEBIMENTO':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-semibold">
            Dependente Recebimento
          </Badge>
        )
      case 'ESTOQUE_ABAIXO_MINIMO':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-semibold">
            Estoque Abaixo Mínimo
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-5">
      {/* Topo Oficial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Saldo MP para Linha 1 (L1) & Previsão de Consumo
            </h2>
            <Badge className="bg-[#004C97] hover:bg-[#003870] text-white text-[10px] uppercase font-bold tracking-wider">
              Subtópico 7
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Matriz Operacional L1 (KS, DP07, DP04, Corte KS, Produção L2 e Fornecedores Gerdau /
            Sinobrás)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs px-3 py-1 font-mono">
            Ref: Procedimento 8.1.001 - R018
          </Badge>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Consumo Total L1 ({selectedHorizon.replace('_', ' ')})
            </span>
            <div className="text-xl font-black text-slate-900 font-mono mt-1">
              {totalL1Consumption.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Ordens programadas</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Necessário Produzir na L2
            </span>
            <div className="text-xl font-black text-rose-600 font-mono mt-1">
              {totalL2Need.toFixed(1)} <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
              Demanda de abastecimento L1
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Estoque KS + Corte KS
            </span>
            <div className="text-xl font-black text-[#004C97] font-mono mt-1">
              {(totalKsStock + matrixRows.reduce((a, b) => a + b.ks_cut_tons, 0)).toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
              Pronto para laminação
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Saldo Pedidos Fornecedores
            </span>
            <div className="text-xl font-black text-emerald-700 font-mono mt-1">
              {totalSupplierBalance.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              Gerdau, Sinobrás, Arcelor
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 text-xs">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Filtrar por aço ou dimensão..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 w-52 text-xs bg-slate-50"
          />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Aço:</span>
            <Select value={selectedSteel} onValueChange={setSelectedSteel}>
              <SelectTrigger className="h-8 w-36 text-xs bg-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Aços</SelectItem>
                <SelectItem value="SAE 1020">SAE 1020</SelectItem>
                <SelectItem value="SAE 1045">SAE 1045</SelectItem>
                <SelectItem value="SAE 4140">SAE 4140</SelectItem>
                <SelectItem value="SAE 8620">SAE 8620</SelectItem>
                <SelectItem value="20MnCr5">20MnCr5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">Horizonte Dinâmico:</span>
          <Select value={selectedHorizon} onValueChange={setSelectedHorizon}>
            <SelectTrigger className="h-8 w-40 text-xs bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2_SEMANAS">2 Semanas</SelectItem>
              <SelectItem value="4_SEMANAS">4 Semanas (Padrão)</SelectItem>
              <SelectItem value="8_SEMANAS">8 Semanas</SelectItem>
              <SelectItem value="TRIMESTRE">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Matriz Principal Operacional L1 */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-200">
          <CardTitle className="text-sm font-bold text-slate-900">
            Matriz de Necessidade e Balanço de MP para L1 (Equação: Saldo = Estoque + Entradas −
            Consumo L1)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/70">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-800">Aço & Dimensão</TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    KS + Corte (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    DP07 + DP04 (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Prod L2 (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Saldo Fornecedor (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Consumo L1 (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-[#004C97] text-right bg-blue-50/70">
                    Saldo Projetado (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-rose-800 text-right bg-rose-50/50">
                    Necessário L2 (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-center">
                    Status Automático
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-center">
                    Ação L2
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/80">
                    <TableCell className="text-xs font-semibold text-slate-900">
                      <div>{r.steel_grade}</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {r.dimension_desc}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {r.physical_location_summary}
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-slate-800">
                      {(r.stock_ks_tons + r.ks_cut_tons).toFixed(1)}
                      <div className="text-[9px] text-slate-400">
                        Corte: {r.ks_cut_tons.toFixed(1)}t
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-slate-700">
                      {(r.stock_dp07_tons + r.stock_dp04_tons).toFixed(1)}
                      <div className="text-[9px] text-slate-400">
                        DP07: {r.stock_dp07_tons.toFixed(1)}t | DP04: {r.stock_dp04_tons.toFixed(1)}
                        t
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-emerald-700 font-semibold">
                      +{r.l2_production_weekly_tons.toFixed(1)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-blue-700 font-semibold">
                      +{r.po_supplier_balance_tons.toFixed(1)}
                      {r.suppliers_breakdown_json && r.suppliers_breakdown_json.length > 0 && (
                        <div className="text-[9px] text-slate-400">
                          {r.suppliers_breakdown_json[0].supplier.split(' ')[0]}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-amber-700 font-bold">
                      -{r.total_consumption_tons.toFixed(1)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-black bg-blue-50/40">
                      <span
                        className={
                          r.projected_balance_tons < r.min_stock_tons
                            ? 'text-rose-600'
                            : 'text-[#004C97]'
                        }
                      >
                        {r.projected_balance_tons.toFixed(1)} t
                      </span>
                      <div className="text-[9px] text-slate-400">
                        Mín: {r.min_stock_tons.toFixed(1)}t
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-black text-rose-600 bg-rose-50/40">
                      {r.need_produce_l2_tons > 0 ? `${r.need_produce_l2_tons.toFixed(1)} t` : '-'}
                      {r.need_l2_week && (
                        <div className="text-[9px] text-rose-500 font-semibold">
                          {r.need_l2_week}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">{getStatusBadge(r.auto_status)}</TableCell>

                    <TableCell className="text-center">
                      {r.need_produce_l2_tons > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleSendToL2(r)}
                          className="h-7 text-[10px] bg-[#004C97] hover:bg-[#003870] text-white gap-1 font-semibold"
                        >
                          <Send className="w-3 h-3" /> Enviar para L2
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MPL1BalanceAndConsumptionSubpage
