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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MPDestinationItem, MPBatchClassificationHistory } from '@/types/mp-optimization'
import {
  Building2,
  Package,
  Layers,
  History,
  AlertOctagon,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  ArrowUpDown,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const MPDestinationAndAvailabilitySubpage: React.FC = () => {
  const navigate = useNavigate()

  // Estados de Filtros
  const [activeTab, setActiveTab] = useState<
    'LOTES' | 'INDUSTRIALIZADORES' | 'SOBRAS' | 'MATRIZ' | 'HISTORICO'
  >('LOTES')
  const [selectedDestinationType, setSelectedDestinationType] = useState<string>('TODOS')
  const [selectedClient, setSelectedClient] = useState<string>('TODOS')
  const [selectedSteel, setSelectedSteel] = useState<string>('TODOS')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [leftoverLimitTons, setLeftoverLimitTons] = useState<number>(0.35) // Parâmetro versionado (0,35 t)

  // Dados Oficiais de Lotes (Base concebida da planilha "08 - AGO - Saldo MP 13.08.2026.xlsx")
  const mockLots: MPDestinationItem[] = [
    {
      id: 'lot-101',
      batch_number: 'LOTE-2026-8841',
      material_code: 'MP-TG-1020-130',
      material_text: 'TARUGO SAE 1020 130X130 MM 525KG',
      steel_grade: 'SAE 1020',
      mp_shape: 'TARUGO',
      storage_location: 'DP01',
      storage_name: 'Pátio Central MP',
      qty_unrestricted_tons: 42.5,
      qty_quality_tons: 0.0,
      qty_blocked_tons: 0.0,
      qty_total_tons: 42.5,
      destination_type: 'PRODUCAO_PROPRIA',
      destination_name: 'Linha 1 (L1)',
      physical_location: 'BAIA A-04',
      status: 'DISPONÍVEL LIVRE',
      is_leftover: false,
      coverage_days: 48,
    },
    {
      id: 'lot-102',
      batch_number: 'LOTE-2026-9023',
      material_code: 'MP-TG-1020-130',
      material_text: 'TARUGO SAE 1020 130X130 MM 525KG',
      steel_grade: 'SAE 1020',
      mp_shape: 'TARUGO',
      storage_location: 'DP07',
      storage_name: 'Depósito Industrializadores',
      qty_unrestricted_tons: 35.0,
      qty_quality_tons: 5.0,
      qty_blocked_tons: 0.0,
      qty_total_tons: 40.0,
      destination_type: 'CLIENTE_INDUSTRIALIZADOR',
      destination_name: 'SDC - Termomecânica',
      client_name: 'Termomecânica S/A',
      client_code: 'CLI-84920',
      qty_reserved_tons: 25.0,
      qty_committed_tons: 25.0,
      qty_effectively_free_tons: 10.0,
      physical_location: 'BAIA IND-02',
      status: 'COMPROMETIDO PARCIAL',
      is_leftover: false,
      coverage_days: 22,
    },
    {
      id: 'lot-103',
      batch_number: 'LOTE-2026-7734',
      material_code: 'MP-PQ-1045-120',
      material_text: 'PALANQUILHA SAE 1045 120X120 MM',
      steel_grade: 'SAE 1045',
      mp_shape: 'PALANQUILHA',
      storage_location: 'DP04',
      storage_name: 'Depósito Laminação L2',
      qty_unrestricted_tons: 58.2,
      qty_quality_tons: 12.0,
      qty_blocked_tons: 0.0,
      qty_total_tons: 70.2,
      destination_type: 'LINHA_INTERNA',
      destination_name: 'Linha 2 (L2)',
      physical_location: 'BAIA L2-01',
      status: 'AGUARDANDO CQ PARCIAL',
      is_leftover: false,
      coverage_days: 19,
    },
    {
      id: 'lot-104',
      batch_number: 'LOTE-2026-6411',
      material_code: 'MP-TG-4140-100',
      material_text: 'TARUGO SAE 4140 REDONDO 100MM',
      steel_grade: 'SAE 4140',
      mp_shape: 'TARUGO',
      storage_location: 'DP07',
      storage_name: 'Depósito Industrializadores',
      qty_unrestricted_tons: 18.0,
      qty_quality_tons: 0.0,
      qty_blocked_tons: 0.0,
      qty_total_tons: 18.0,
      destination_type: 'CLIENTE_INDUSTRIALIZADOR',
      destination_name: 'Usiminas Mecânica',
      client_name: 'Usiminas Mecânica',
      client_code: 'CLI-73910',
      qty_reserved_tons: 18.0,
      qty_committed_tons: 18.0,
      qty_effectively_free_tons: 0.0,
      physical_location: 'BAIA IND-05',
      status: '100% RESERVADO',
      is_leftover: false,
      coverage_days: 35,
    },
    {
      id: 'lot-105',
      batch_number: 'LOTE-2026-9912',
      material_code: 'MP-PL-8620-80',
      material_text: 'PLACA SAE 8620 CORTE ESPECIAL',
      steel_grade: 'SAE 8620',
      mp_shape: 'PLACA',
      storage_location: 'DP02',
      storage_name: 'Pátio Sobras / Separação',
      qty_unrestricted_tons: 0.28,
      qty_quality_tons: 0.0,
      qty_blocked_tons: 0.0,
      qty_total_tons: 0.28,
      destination_type: 'SEM_APLICACAO',
      destination_name: 'Sem Aplicação Definida',
      physical_location: 'RACK SOBRAS-03',
      status: 'SOBRA REAPROVEITÁVEL',
      is_leftover: true,
      leftover_age_days: 42,
    },
    {
      id: 'lot-106',
      batch_number: 'LOTE-2026-9918',
      material_code: 'MP-TG-1045-130',
      material_text: 'TARUGO SAE 1045 PONTA DE CORTE',
      steel_grade: 'SAE 1045',
      mp_shape: 'TARUGO',
      storage_location: 'DP02',
      storage_name: 'Pátio Sobras / Separação',
      qty_unrestricted_tons: 0.31,
      qty_quality_tons: 0.0,
      qty_blocked_tons: 0.0,
      qty_total_tons: 0.31,
      destination_type: 'SEM_APLICACAO',
      destination_name: 'Sem Aplicação Definida',
      physical_location: 'RACK SOBRAS-01',
      status: 'SOBRA REAPROVEITÁVEL',
      is_leftover: true,
      leftover_age_days: 28,
    },
    {
      id: 'lot-107',
      batch_number: 'LOTE-2026-5520',
      material_code: 'MP-TG-20MNCR5-110',
      material_text: 'TARUGO 20MnCr5 USINAGEM',
      steel_grade: '20MnCr5',
      mp_shape: 'TARUGO',
      storage_location: 'DP01',
      storage_name: 'Pátio Central MP',
      qty_unrestricted_tons: 22.4,
      qty_quality_tons: 0.0,
      qty_blocked_tons: 0.0,
      qty_total_tons: 22.4,
      destination_type: 'PRODUCAO_PROPRIA',
      destination_name: 'Linha 1 (L1)',
      physical_location: 'BAIA A-08',
      status: 'DISPONÍVEL LIVRE',
      is_leftover: false,
      coverage_days: 45,
    },
    {
      id: 'lot-108',
      batch_number: 'LOTE-2026-4401',
      material_code: 'MP-TG-1020-130',
      material_text: 'TARUGO SAE 1020 KS CORTE',
      steel_grade: 'SAE 1020',
      mp_shape: 'TARUGO',
      storage_location: 'DP05',
      storage_name: 'Pátio Separadora KS',
      qty_unrestricted_tons: 14.8,
      qty_quality_tons: 0.0,
      qty_blocked_tons: 0.0,
      qty_total_tons: 14.8,
      destination_type: 'SEPARACAO',
      destination_name: 'Separadora / Corte KS',
      physical_location: 'MESA KS-02',
      status: 'EM SEPARAÇÃO',
      is_leftover: false,
      coverage_days: 12,
    },
  ]

  // Histórico de Alterações de Classificação e Destino
  const mockHistory: MPBatchClassificationHistory[] = [
    {
      id: 'hist-01',
      batch_number: 'LOTE-2026-9023',
      material_code: 'MP-TG-1020-130',
      change_type: 'ALTERAÇÃO DE DESTINO',
      previous_destination: 'PRODUÇÃO PRÓPRIA (L1)',
      current_destination: 'CLIENTE INDUSTRIALIZADOR (SDC)',
      previous_steel: 'SAE 1020',
      current_steel: 'SAE 1020',
      previous_tons: 40.0,
      current_tons: 40.0,
      delta_tons: 0,
      changed_at: '2026-06-18 14:32',
      responsible_user_or_system: 'SAP BAPI RFC (ZPP_TRANSF_MP)',
      alert_severity: 'AVISO',
      notes: 'Transferência de saldo autorizada para contrato de industrialização Termomecânica.',
    },
    {
      id: 'hist-02',
      batch_number: 'LOTE-2026-9912',
      material_code: 'MP-PL-8620-80',
      change_type: 'RECLASSIFICAÇÃO PARA SEM APLICAÇÃO',
      previous_destination: 'PRODUÇÃO PRÓPRIA (L1)',
      current_destination: 'SEM APLICAÇÃO (SOBRA < 0,35t)',
      previous_steel: 'SAE 8620',
      current_steel: 'SAE 8620',
      previous_tons: 12.5,
      current_tons: 0.28,
      delta_tons: -12.22,
      changed_at: '2026-06-17 09:15',
      responsible_user_or_system: 'PCP Robotizado (Motor de Sobras)',
      alert_severity: 'INFO',
      notes:
        'Apontamento de corte gerou sobra abaixo do limite de 0,35t. Enviado para Otimizar Aplicações.',
    },
    {
      id: 'hist-03',
      batch_number: 'LOTE-2026-4401',
      material_code: 'MP-TG-1020-130',
      change_type: 'MOVIMENTAÇÃO DE DEPÓSITO',
      previous_destination: 'DEPÓSITO DP01',
      current_destination: 'SEPARADORA KS (DP05)',
      previous_steel: 'SAE 1020',
      current_steel: 'SAE 1020',
      previous_tons: 14.8,
      current_tons: 14.8,
      delta_tons: 0,
      changed_at: '2026-06-16 16:40',
      responsible_user_or_system: 'WMS CIAFAL Integrado',
      alert_severity: 'INFO',
      notes: 'Lote movimentado para fila de corte da separadora KS.',
    },
  ]

  // Filtros aplicados
  const filteredLots = mockLots.filter((lot) => {
    if (selectedDestinationType !== 'TODOS' && lot.destination_type !== selectedDestinationType)
      return false
    if (selectedClient !== 'TODOS' && lot.client_name !== selectedClient) return false
    if (selectedSteel !== 'TODOS' && lot.steel_grade !== selectedSteel) return false
    if (
      searchTerm &&
      !lot.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !lot.material_code.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !lot.material_text?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }
    return true
  })

  // Industrializadores
  const industrializerLots = mockLots.filter(
    (l) => l.destination_type === 'CLIENTE_INDUSTRIALIZADOR',
  )
  const totalIndustrializerTons = industrializerLots.reduce((acc, l) => acc + l.qty_total_tons, 0)
  const freeIndustrializerTons = industrializerLots.reduce(
    (acc, l) => acc + (l.qty_effectively_free_tons || 0),
    0,
  )

  // Sobras Sem Aplicação
  const leftoverLots = mockLots.filter(
    (l) => l.destination_type === 'SEM_APLICACAO' || l.qty_total_tons <= leftoverLimitTons,
  )
  const totalLeftoverTons = leftoverLots.reduce((acc, l) => acc + l.qty_total_tons, 0)

  // Matriz Consolidada Aço x Destino
  const steelsList = ['SAE 1020', 'SAE 1045', 'SAE 4140', 'SAE 8620', '20MnCr5']
  const matrixData = steelsList.map((st) => {
    const stLots = mockLots.filter((l) => l.steel_grade === st)
    const l1 = stLots
      .filter((l) => l.destination_name.includes('L1'))
      .reduce((a, b) => a + b.qty_total_tons, 0)
    const l2 = stLots
      .filter((l) => l.destination_name.includes('L2'))
      .reduce((a, b) => a + b.qty_total_tons, 0)
    const sdc = stLots
      .filter((l) => l.destination_type === 'CLIENTE_INDUSTRIALIZADOR')
      .reduce((a, b) => a + b.qty_total_tons, 0)
    const semApl = stLots
      .filter((l) => l.destination_type === 'SEM_APLICACAO')
      .reduce((a, b) => a + b.qty_total_tons, 0)
    const separadora = stLots
      .filter((l) => l.destination_type === 'SEPARACAO')
      .reduce((a, b) => a + b.qty_total_tons, 0)
    const total = l1 + l2 + sdc + semApl + separadora
    return { steel: st, shape: 'TARUGO', l1, l2, sdc, semApl, separadora, total }
  })

  return (
    <div className="space-y-5">
      {/* Topo Oficial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Saldo e Disponibilidade de MP por Destino & Industrializadores
            </h2>
            <Badge className="bg-[#004C97] hover:bg-[#003870] text-white text-[10px] uppercase font-bold tracking-wider">
              Subtópico 5
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cockpit de rastreabilidade física lote a lote, segregação de industrializadores (SDC) e
            gestão de sobras
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/pcp/gestao-materia-prima/otimizar-aplicacoes')}
            className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 h-8 font-semibold shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Otimizar Sobras Sem Aplicação ({leftoverLots.length})
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              MP para Industrializadores
            </span>
            <div className="text-xl font-black text-[#004C97] font-mono mt-1">
              {totalIndustrializerTons.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              Efetivamente livre: {freeIndustrializerTons.toFixed(1)} t
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              MP Sem Aplicação (Sobras)
            </span>
            <div className="text-xl font-black text-amber-700 font-mono mt-1">
              {totalLeftoverTons.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
              {leftoverLots.length} lotes &lt; {leftoverLimitTons} t
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Destino Produção Própria (L1/L2)
            </span>
            <div className="text-xl font-black text-slate-900 font-mono mt-1">
              {mockLots
                .filter(
                  (l) =>
                    l.destination_type === 'PRODUCAO_PROPRIA' ||
                    l.destination_type === 'LINHA_INTERNA',
                )
                .reduce((a, b) => a + b.qty_total_tons, 0)
                .toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Abastecimento direto de laminação
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Rastreabilidade de Lotes
            </span>
            <div className="text-xl font-black text-emerald-700 font-mono mt-1">
              {mockLots.length}{' '}
              <span className="text-xs font-normal text-slate-500">lotes ativos</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              100% integrados ao SAP MB52
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Visualização */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="w-full space-y-4"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="LOTES" className="text-xs font-semibold">
              <Package className="w-3.5 h-3.5 mr-1.5" />
              Visão por Lote
            </TabsTrigger>
            <TabsTrigger value="INDUSTRIALIZADORES" className="text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Industrializadores (SDC)
            </TabsTrigger>
            <TabsTrigger value="SOBRAS" className="text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Sem Aplicação / Sobras
            </TabsTrigger>
            <TabsTrigger value="MATRIZ" className="text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Matriz Aço × Destino
            </TabsTrigger>
            <TabsTrigger value="HISTORICO" className="text-xs font-semibold">
              <History className="w-3.5 h-3.5 mr-1.5" />
              Histórico & Fotografia
            </TabsTrigger>
          </TabsList>

          {/* Filtros no Topo da Lista */}
          <div className="flex items-center gap-2 text-xs">
            <Input
              placeholder="Filtrar lote, material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-44 text-xs bg-slate-50"
            />
            <Select value={selectedDestinationType} onValueChange={setSelectedDestinationType}>
              <SelectTrigger className="h-8 w-36 text-xs bg-slate-50">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Destinos</SelectItem>
                <SelectItem value="PRODUCAO_PROPRIA">Produção Própria</SelectItem>
                <SelectItem value="CLIENTE_INDUSTRIALIZADOR">Industrializador</SelectItem>
                <SelectItem value="LINHA_INTERNA">Linha Interna</SelectItem>
                <SelectItem value="SEM_APLICACAO">Sem Aplicação</SelectItem>
                <SelectItem value="SEPARACAO">Separação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TAB 1: VISÃO DETALHADA POR LOTE */}
        <TabsContent value="LOTES" className="m-0">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-200">
              <CardTitle className="text-sm font-bold text-slate-900">
                Rastreabilidade Lote a Lote de Matéria-Prima (Regra: Total = Livre + CQ)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100/70">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-800">Lote SAP</TableHead>
                      <TableHead className="text-xs font-bold text-slate-800">
                        Material & Aço
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800">Forma</TableHead>
                      <TableHead className="text-xs font-bold text-slate-800">
                        Depósito / Local
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800 text-right">
                        Uso Livre (t)
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800 text-right">
                        CQ (t)
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800 text-right">
                        Total (t)
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800">
                        Destino Oficial
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800 text-center">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLots.map((lot) => (
                      <TableRow key={lot.id} className="hover:bg-slate-50/80">
                        <TableCell className="font-mono font-bold text-xs text-[#004C97]">
                          {lot.batch_number}
                        </TableCell>
                        <TableCell className="text-xs text-slate-900">
                          <div className="font-semibold">{lot.steel_grade}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {lot.material_code}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {lot.mp_shape}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          <div>
                            {lot.storage_location} - {lot.storage_name}
                          </div>
                          <div className="text-[10px] text-slate-400">{lot.physical_location}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-slate-800">
                          {lot.qty_unrestricted_tons.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-amber-700">
                          {(lot.qty_quality_tons || 0) > 0
                            ? (lot.qty_quality_tons || 0).toFixed(2)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-slate-900 bg-slate-50/50">
                          {lot.qty_total_tons.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-semibold text-slate-800">
                            {lot.destination_name}
                          </span>
                          <div className="text-[10px] text-slate-400">{lot.destination_type}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={`text-[10px] font-semibold ${
                              lot.status?.includes('DISPONÍVEL')
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : lot.status?.includes('RESERVADO')
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {lot.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: INDUSTRIALIZADORES */}
        <TabsContent value="INDUSTRIALIZADORES" className="m-0 space-y-4">
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
            <div>
              <strong>Segregação CIAFAL:</strong> O código SDC representa estoques físicos alocados
              a clientes industrializadores. Responde: quanto de MP realmente existe disponível e
              quanto já está comprometido por ordens vinculadas?
            </div>
            <Badge className="bg-[#004C97] text-white text-xs">
              Total SDC: {totalIndustrializerTons.toFixed(1)} t
            </Badge>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-100/70">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-800">
                      Cliente Industrializador
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800">
                      Material / Aço
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800">Lote SAP</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-right">
                      Qtd Total (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-right">
                      Comprometida (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-emerald-800 text-right bg-emerald-50/60">
                      Efetivamente Livre (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-center">
                      Cobertura
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {industrializerLots.map((l) => (
                    <TableRow key={l.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        <div>{l.client_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{l.client_code}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-800">
                        <div className="font-semibold">{l.steel_grade}</div>
                        <div className="text-[10px] text-slate-400">{l.material_text}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#004C97] font-semibold">
                        {l.batch_number}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                        {l.qty_total_tons.toFixed(2)} t
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-700">
                        {(l.qty_committed_tons || 0).toFixed(2)} t
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-emerald-700 bg-emerald-50/40">
                        {(l.qty_effectively_free_tons || 0).toFixed(2)} t
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-700">
                        {l.coverage_days} dias
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SOBRAS SEM APLICAÇÃO */}
        <TabsContent value="SOBRAS" className="m-0 space-y-4">
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Regra de Classificação de Sobras:</strong> Itens com saldo inferior a{' '}
                <strong>{leftoverLimitTons} t</strong> são categorizados automaticamente como "Sem
                Aplicação" para reaproveitamento via IA no submódulo "Otimizar Aplicações".
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-slate-500">Limite Sobra:</span>
              <Input
                type="number"
                step="0.05"
                value={leftoverLimitTons}
                onChange={(e) => setLeftoverLimitTons(parseFloat(e.target.value) || 0.35)}
                className="h-7 w-20 text-xs bg-white text-right font-mono"
              />
              <span className="text-xs text-slate-500">t</span>
            </div>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-100/70">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-800">Lote Sobra</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800">
                      Material & Aço
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800">
                      Depósito / Rack
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-right">
                      Peso da Sobra (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-center">
                      Idade da Sobra
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-center">
                      Ação Recomendada IA
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leftoverLots.map((l) => (
                    <TableRow key={l.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs font-bold text-[#004C97]">
                        {l.batch_number}
                      </TableCell>
                      <TableCell className="text-xs text-slate-900">
                        <div className="font-semibold">{l.steel_grade}</div>
                        <div className="text-[10px] text-slate-400">{l.material_text}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        <div>{l.storage_location}</div>
                        <div className="text-[10px] text-slate-400">{l.physical_location}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-amber-700">
                        {l.qty_total_tons.toFixed(3)} t
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-600">
                        {l.leftover_age_days || 15} dias
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/pcp/gestao-materia-prima/otimizar-aplicacoes')}
                          className="h-7 text-[11px] text-[#004C97] border-[#004C97]/30 hover:bg-blue-50 gap-1"
                        >
                          Buscar Encaixe IA <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: MATRIZ CONSOLIDADA AÇO X DESTINO */}
        <TabsContent value="MATRIZ" className="m-0">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-200">
              <CardTitle className="text-sm font-bold text-slate-900">
                Matriz Consolidada: Aço × Destino da MP (Toneladas)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-100/70">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-800">Aço</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800">Forma</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-right">
                      L1 (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-right">
                      L2 (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-right">
                      SDC / Ind (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-right">
                      Sem Aplicação (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-right">
                      Separadora (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-[#004C97] text-right bg-blue-50/70">
                      Total Consolidado (t)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrixData.map((m) => (
                    <TableRow key={m.steel} className="hover:bg-slate-50/80">
                      <TableCell className="font-bold text-xs text-slate-900">{m.steel}</TableCell>
                      <TableCell className="text-xs text-slate-500">{m.shape}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-700">
                        {m.l1.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-700">
                        {m.l2.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-blue-700 font-semibold">
                        {m.sdc.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-700">
                        {m.semApl.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-700">
                        {m.separadora.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-[#004C97] bg-blue-50/50">
                        {m.total.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: HISTÓRICO & FOTOGRAFIA */}
        <TabsContent value="HISTORICO" className="m-0">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-200">
              <CardTitle className="text-sm font-bold text-slate-900">
                Histórico de Alterações de Classificação, Destino e Fotografia de Lotes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-100/70">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-800">Lote</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800">
                      Tipo de Alteração
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800">
                      Destino Anterior → Atual
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 text-center">
                      Data / Hora
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-800">Responsável</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockHistory.map((h) => (
                    <TableRow key={h.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs font-bold text-[#004C97]">
                        {h.batch_number}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800">
                        {h.change_type}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        <span className="text-slate-400">{h.previous_destination}</span> →{' '}
                        <span className="font-bold text-slate-900">{h.current_destination}</span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-600">
                        {h.changed_at}
                      </TableCell>
                      <TableCell className="text-xs text-slate-800 font-medium">
                        {h.responsible_user_or_system}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{h.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MPDestinationAndAvailabilitySubpage
