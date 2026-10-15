import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Briefcase,
  Boxes,
  Factory,
  Layers,
  FileCheck2,
  DollarSign,
  AlertTriangle,
  Scale,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Filter,
  RotateCcw,
  Database,
  ArrowRight,
  CheckCircle2,
  Info,
} from 'lucide-react'
import {
  FacaCardKpis,
  FacaItemAnalitico,
  FacaAlertaIA,
  FacaMpItemDisponibilidade,
} from '@/types/faca-analise'
import { formatNumberPtBr } from '@/lib/number-format'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface FacaCardDrilldownModalProps {
  cardKey: string | null
  isOpen: boolean
  onClose: () => void
  kpis: FacaCardKpis
  itens: FacaItemAnalitico[]
  alertas: FacaAlertaIA[]
}

export const FacaCardDrilldownModal: React.FC<FacaCardDrilldownModalProps> = ({
  cardKey,
  isOpen,
  onClose,
  kpis,
  itens,
  alertas,
}) => {
  // Filtros internos para o popup de MP
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('TODAS')
  const [filtroCentro, setFiltroCentro] = useState<string>('TODOS')
  const [filtroDeposito, setFiltroDeposito] = useState<string>('TODOS')
  const [filtroAco, setFiltroAco] = useState<string>('TODOS')
  const [filtroCodigoMp, setFiltroCodigoMp] = useState<string>('TODOS')
  const [filtroBitola, setFiltroBitola] = useState<string>('')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS')
  const [filtroSituacao, setFiltroSituacao] = useState<string>('TODAS')

  // Linhas expandidas na tabela de MP
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const mpConsolidado = kpis.mp_detalhe_consolidado
  const itensMp = useMemo(() => mpConsolidado?.itens_detalhados || [], [mpConsolidado])

  // Filtragem dos itens de MP
  const itensMpFiltrados = useMemo(() => {
    return itensMp.filter((item) => {
      if (filtroEmpresa !== 'TODAS' && item.empresa !== filtroEmpresa) return false
      if (filtroCentro !== 'TODOS' && item.centro !== filtroCentro) return false
      if (filtroDeposito !== 'TODOS' && item.deposito !== filtroDeposito) return false
      if (filtroAco !== 'TODOS' && item.tipo_aco !== filtroAco) return false
      if (filtroCodigoMp !== 'TODOS' && item.codigo_mp !== filtroCodigoMp) return false
      if (filtroBitola && !item.bitola.toLowerCase().includes(filtroBitola.toLowerCase()))
        return false
      if (filtroOrigem !== 'TODAS' && item.origem_saldo !== filtroOrigem) return false
      if (filtroSituacao !== 'TODAS') {
        if (filtroSituacao === 'DISPONIVEL' && item.estoque_livre_t <= 0) return false
        if (filtroSituacao === 'PROGRAMADA' && item.ks_saldo_a_cortar_t <= 0) return false
        if (filtroSituacao === 'POTENCIAL' && item.l2_saldo_a_produzir_t <= 0) return false
      }
      return true
    })
  }, [
    itensMp,
    filtroEmpresa,
    filtroCentro,
    filtroDeposito,
    filtroAco,
    filtroCodigoMp,
    filtroBitola,
    filtroOrigem,
    filtroSituacao,
  ])

  // Opções dinâmicas para comboboxes
  const opcoesEmpresa = Array.from(new Set(itensMp.map((i) => i.empresa))).sort()
  const opcoesCentro = Array.from(new Set(itensMp.map((i) => i.centro))).sort()
  const opcoesDeposito = Array.from(new Set(itensMp.map((i) => i.deposito))).sort()
  const opcoesAco = Array.from(new Set(itensMp.map((i) => i.tipo_aco))).sort()
  const opcoesCodigoMp = Array.from(new Set(itensMp.map((i) => i.codigo_mp))).sort()

  const resetFiltrosMp = () => {
    setFiltroEmpresa('TODAS')
    setFiltroCentro('TODOS')
    setFiltroDeposito('TODOS')
    setFiltroAco('TODOS')
    setFiltroCodigoMp('TODOS')
    setFiltroBitola('')
    setFiltroOrigem('TODAS')
    setFiltroSituacao('TODAS')
  }

  // Dados para o gráfico de barras comparativo por tipo de aço
  const chartDataPorAco = useMemo(() => {
    if (!mpConsolidado?.por_tipo_aco) return []
    return mpConsolidado.por_tipo_aco.map((aco) => ({
      aco: aco.tipo_aco,
      'Tarugos Disponíveis': aco.tarugos_disponiveis_t,
      'KS a Cortar': aco.ks_a_cortar_t,
      'L2 a Produzir': aco.l2_a_produzir_t,
      'Potencial Total': aco.potencial_total_t,
      'Demanda Carteira': aco.mp_necessaria_carteira_t,
    }))
  }, [mpConsolidado])

  if (!cardKey) return null

  // Se o card for MP Específica Disponível, renderiza o modal especializado e amplo
  if (cardKey === 'mp_disponivel') {
    const totalEstoqueLivre = itensMpFiltrados.reduce((acc, i) => acc + i.estoque_livre_t, 0)
    const totalKsCortar = itensMpFiltrados.reduce((acc, i) => acc + i.ks_saldo_a_cortar_t, 0)
    const totalL2Produzir = itensMpFiltrados.reduce((acc, i) => acc + i.l2_saldo_a_produzir_t, 0)
    const totalLiquido = itensMpFiltrados.reduce((acc, i) => acc + i.disponibilidade_liquida_t, 0)

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[94vh] overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    MP Específica Disponível — Balanço Físico e Potencial Técnico
                    <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                      SAP ECC RFC MB52 / MD04
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 pt-0.5">
                    Fonte oficial: {mpConsolidado?.fonte_identificada || 'SAP ECC • RFC MB52'}{' '}
                    &bull; Última sincronização:{' '}
                    <strong>{mpConsolidado?.ultima_atualizacao || 'Hoje'}</strong> &bull; Status:{' '}
                    <span className="text-emerald-700 font-bold">
                      {mpConsolidado?.status_sincronizacao || 'SINCRONIZADO'}
                    </span>
                  </DialogDescription>
                </div>
              </div>

              {/* Badges de destaque consolidados */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    MP Disponível Agora
                  </div>
                  <div className="text-sm font-extrabold text-indigo-700">
                    {formatNumberPtBr(kpis.mp_especifica_disponivel_t, 1)} t
                  </div>
                </div>
                <div className="bg-white border border-indigo-200 px-3 py-1.5 rounded-lg text-right">
                  <div className="text-[10px] uppercase font-bold text-indigo-600">
                    MP Potencial Total (sem sobreposição)
                  </div>
                  <div className="text-sm font-extrabold text-[#004C97]">
                    {formatNumberPtBr(kpis.mp_potencial_t ?? kpis.mp_especifica_disponivel_t, 1)} t
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* 4 Cards de Composição Consolidada da MP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>1. Tarugos Disponíveis</span>
                <Badge variant="outline" className="text-[9px] bg-slate-50">
                  Imediato
                </Badge>
              </div>
              <div className="text-lg font-extrabold text-slate-900 pt-1">
                {formatNumberPtBr(mpConsolidado?.tarugos_disponiveis_t || 0, 1)} t
              </div>
              <div className="text-[10px] text-slate-500 pt-0.5">
                Depósitos elegíveis:{' '}
                <strong>
                  {mpConsolidado?.depositos_considerados.join(', ') || 'DP07, DP04, DP18'}
                </strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>2. KS — Saldo a Cortar</span>
                <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700">
                  Líquido c/ perdas
                </Badge>
              </div>
              <div className="text-lg font-extrabold text-blue-700 pt-1">
                {formatNumberPtBr(mpConsolidado?.ks_saldo_a_cortar_t || 0, 1)} t
              </div>
              <div className="text-[10px] text-slate-500 pt-0.5">
                Rendimento médio de corte: <strong>94% a 96%</strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>3. L2 — MP a Produzir</span>
                <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700">
                  Futuro viável
                </Badge>
              </div>
              <div className="text-lg font-extrabold text-purple-700 pt-1">
                {formatNumberPtBr(mpConsolidado?.l2_mp_a_produzir_t || 0, 1)} t
              </div>
              <div className="text-[10px] text-slate-500 pt-0.5">
                Rendimento L2: <strong>91% a 93%</strong>
              </div>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <span>4. Total Potencial Sem Dupla Contagem</span>
                <Badge className="text-[9px] bg-emerald-600 text-white">Consolidado</Badge>
              </div>
              <div className="text-lg font-black text-emerald-700 pt-1">
                {formatNumberPtBr(mpConsolidado?.mp_potencial_total_t || 0, 1)} t
              </div>
              <div className="text-[10px] text-emerald-800 pt-0.5">
                Sobreposição L2 &rarr; KS deduzida:{' '}
                <strong>
                  -{formatNumberPtBr(mpConsolidado?.sobreposicoes_deduzidas_t || 0, 1)} t
                </strong>
              </div>
            </div>
          </div>

          {/* Gráfico Comparativo por Tipo de Aço */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BarChart className="w-4 h-4 text-[#004C97]" />
                Balanço de MP por Tipo de Aço (Segregação Estrita — Aços Não São Intercambiáveis)
              </div>
              <span className="text-[11px] text-slate-500">Valores em toneladas (t)</span>
            </div>
            <div className="h-64 w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataPorAco}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="aco" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    formatter={(val: any) => [`${formatNumberPtBr(Number(val), 1)} t`]}
                    contentStyle={{
                      fontSize: '11px',
                      borderRadius: '8px',
                      borderColor: '#CBD5E1',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="Tarugos Disponíveis"
                    fill="#4F46E5"
                    radius={[4, 4, 0, 0]}
                    name="Tarugos Disponíveis (Imediato)"
                  />
                  <Bar
                    dataKey="KS a Cortar"
                    fill="#0284C7"
                    radius={[4, 4, 0, 0]}
                    name="KS a Cortar (Líquido)"
                  />
                  <Bar
                    dataKey="L2 a Produzir"
                    fill="#9333EA"
                    radius={[4, 4, 0, 0]}
                    name="L2 a Produzir"
                  />
                  <Bar
                    dataKey="Demanda Carteira"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                    name="Demanda da Carteira FACA"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filtros Analíticos do Popup */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#004C97]" />
                <span>Filtros do Balanço de Matéria-Prima</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFiltrosMp}
                className="h-7 text-xs text-slate-500 hover:text-slate-900 gap-1 px-2"
              >
                <RotateCcw className="w-3 h-3" /> Limpar Filtros
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-end">
              {/* Empresa */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Empresa</Label>
                <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas</SelectItem>
                    {opcoesEmpresa.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Centro */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Centro</Label>
                <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {opcoesCentro.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Depósito */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Depósito</Label>
                <Select value={filtroDeposito} onValueChange={setFiltroDeposito}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {opcoesDeposito.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Aço */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Aço</Label>
                <Select value={filtroAco} onValueChange={setFiltroAco}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos os Aços</SelectItem>
                    {opcoesAco.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Código MP */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Código MP</Label>
                <Select value={filtroCodigoMp} onValueChange={setFiltroCodigoMp}>
                  <SelectTrigger className="h-8 text-xs font-mono truncate">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todas as MPs</SelectItem>
                    {opcoesCodigoMp.map((m) => (
                      <SelectItem key={m} value={m} className="font-mono text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bitola */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Bitola</Label>
                <Input
                  placeholder="Ex: 150x150"
                  className="h-8 text-xs font-mono"
                  value={filtroBitola}
                  onChange={(e) => setFiltroBitola(e.target.value)}
                />
              </div>

              {/* Origem */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Origem</Label>
                <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas</SelectItem>
                    <SelectItem value="ESTOQUE">Estoque Físico</SelectItem>
                    <SelectItem value="KS">Corte KS</SelectItem>
                    <SelectItem value="L2">Produção L2</SelectItem>
                    <SelectItem value="MISTO">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Situação */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Situação</Label>
                <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas</SelectItem>
                    <SelectItem value="DISPONIVEL">Disponível Imediata</SelectItem>
                    <SelectItem value="PROGRAMADA">Programada KS</SelectItem>
                    <SelectItem value="POTENCIAL">Potencial L2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tabela Principal Analítica com Linhas Expansíveis */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 flex justify-between items-center">
              <span>
                Itens de Matéria-Prima Elegíveis ({itensMpFiltrados.length} registros encontrados)
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Clique na linha para expandir origem dos saldos, fluxo produtivo e PAs vinculados
              </span>
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              <Table className="text-xs">
                <TableHeader className="bg-slate-100/80 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="font-bold text-slate-700">Código MP</TableHead>
                    <TableHead className="font-bold text-slate-700 min-w-[180px]">
                      Descrição
                    </TableHead>
                    <TableHead className="font-bold text-slate-700">Aço</TableHead>
                    <TableHead className="font-bold text-slate-700">Bitola</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Centro</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Depósito</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right text-indigo-700">
                      Estoque Livre (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-right text-blue-700">
                      KS a Cortar (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-right text-purple-700">
                      L2 a Produzir (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-right text-emerald-800 font-black">
                      Disp. Líquida (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Previsão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensMpFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-6 text-xs text-slate-500">
                        Nenhum material encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itensMpFiltrados.map((item) => {
                      const isExpanded = Boolean(expandedRows[item.id])
                      return (
                        <React.Fragment key={item.id}>
                          <TableRow
                            onClick={() => toggleRow(item.id)}
                            className="cursor-pointer hover:bg-slate-50/80 border-b border-slate-100 select-none"
                          >
                            <TableCell className="w-8 text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-indigo-900">
                              {item.codigo_mp}
                            </TableCell>
                            <TableCell className="text-slate-800 font-medium truncate max-w-[220px]">
                              {item.descricao_mp}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-700 whitespace-nowrap">
                              {item.tipo_aco}
                            </TableCell>
                            <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                              {item.bitola}
                            </TableCell>
                            <TableCell className="text-center font-mono text-slate-600">
                              {item.centro}
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-slate-800">
                              <Badge variant="outline" className="text-[10px] bg-slate-50">
                                {item.deposito}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-indigo-700">
                              {formatNumberPtBr(item.estoque_livre_t, 1)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-blue-700">
                              {item.ks_saldo_a_cortar_t > 0
                                ? formatNumberPtBr(item.ks_saldo_a_cortar_t, 1)
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-purple-700">
                              {item.l2_saldo_a_produzir_t > 0
                                ? formatNumberPtBr(item.l2_saldo_a_produzir_t, 1)
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-black text-emerald-800">
                              {formatNumberPtBr(item.disponibilidade_liquida_t, 1)}
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  item.previsao_disponibilidade.includes('Imediata')
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {item.previsao_disponibilidade}
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {/* Linha expansível com detalhes de rastreabilidade */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/70 border-b border-slate-200">
                              <TableCell colSpan={12} className="p-3">
                                <div className="space-y-3 bg-white border border-slate-200 rounded-lg p-3 text-xs">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* 1. Origem Física SAP */}
                                    <div className="space-y-1 border-r border-slate-100 pr-2">
                                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                        <Database className="w-3.5 h-3.5 text-indigo-600" />
                                        Estoque Físico em Depósito ({item.deposito})
                                      </div>
                                      <div className="text-[11px] text-slate-600 space-y-0.5">
                                        <div>
                                          Físico total:{' '}
                                          <strong>{item.quantidade_fisica_t.toFixed(1)} t</strong>
                                        </div>
                                        <div>
                                          Comprometido/Reservas:{' '}
                                          <span className="text-rose-700 font-bold">
                                            {item.quantidade_comprometida_t.toFixed(1)} t
                                          </span>
                                        </div>
                                        <div>
                                          Status CQ: <strong>{item.status_qualidade}</strong> &bull;
                                          Lote:{' '}
                                          <span className="font-mono">{item.lote || 'N/A'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 2. Programação KS e L2 */}
                                    <div className="space-y-1 border-r border-slate-100 pr-2">
                                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                        <Factory className="w-3.5 h-3.5 text-blue-600" />
                                        Fluxo Produtivo (KS / L2)
                                      </div>
                                      <div className="text-[11px] text-slate-600 space-y-0.5">
                                        <div>
                                          KS ({item.ks_status}):{' '}
                                          <strong>{item.ks_saldo_a_cortar_t.toFixed(1)} t</strong>{' '}
                                          (Rend. {item.ks_rendimento_corte_pct}%, Perda{' '}
                                          {item.ks_perdas_pct}%)
                                        </div>
                                        <div>
                                          L2 ({item.l2_status}):{' '}
                                          <strong>{item.l2_saldo_a_produzir_t.toFixed(1)} t</strong>{' '}
                                          (Rend. {item.l2_rendimento_pct}%)
                                        </div>
                                        {item.l2_passa_por_ks && (
                                          <div className="text-amber-800 font-bold">
                                            Fluxo L2 &rarr; KS: sobreposição de{' '}
                                            {item.sobreposicao_fluxo_t.toFixed(1)} t deduzida para
                                            evitar dupla contagem.
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* 3. Produtos FACA vinculados */}
                                    <div className="space-y-1">
                                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                                        Produtos FACA Compatíveis (
                                        {item.produtos_faca_compativeis.length})
                                      </div>
                                      {item.produtos_faca_compativeis.length === 0 ? (
                                        <div className="text-[11px] text-slate-500">
                                          Nenhum produto FACA com vínculo homologado para este
                                          material.
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          {item.produtos_faca_compativeis.map((pa) => (
                                            <div
                                              key={pa.codigo_pa}
                                              className="bg-slate-50 p-1.5 rounded border border-slate-200 flex justify-between items-center text-[11px]"
                                            >
                                              <span className="font-mono font-bold text-[#004C97]">
                                                {pa.codigo_pa}
                                              </span>
                                              <span
                                                className="text-slate-600 truncate max-w-[140px]"
                                                title={pa.descricao_pa}
                                              >
                                                {pa.descricao_pa}
                                              </span>
                                              <Badge variant="outline" className="text-[9px]">
                                                Rend: {(pa.rendimento * 100).toFixed(0)}%
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between pt-2 text-xs text-slate-500">
            <div>
              Total filtrado: <strong>{totalLiquido.toFixed(1)} t</strong> (Livre:{' '}
              {totalEstoqueLivre.toFixed(1)} t | KS: {totalKsCortar.toFixed(1)} t | L2:{' '}
              {totalL2Produzir.toFixed(1)} t)
            </div>
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
              Fechar Visualização
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Comportamento padrão para os outros 8 cards executivos
  const getDetalhes = () => {
    switch (cardKey) {
      case 'carteira_total':
        return {
          titulo: 'Carteira Total FACA — Detalhamento Analítico',
          icone: Briefcase,
          corIcone: 'text-[#004C97]',
          kpiValor: `${formatNumberPtBr(kpis.carteira_total_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.carteira_aberta_t > 0),
          diagnosticoIA:
            'A carteira aberta concentra-se principalmente em perfis para colhedoras de cana e lâminas picadoras industriais. 53% do volume total já possui ordens de produção ou estoque livre para faturamento imediato.',
        }
      case 'estoque_disponivel':
        return {
          titulo: 'Estoque Disponível de PA — Detalhamento de Cobertura',
          icone: Boxes,
          corIcone: 'text-emerald-700',
          kpiValor: `${formatNumberPtBr(kpis.estoque_disponivel_pa_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.estoque_livre_pa_t > 0),
          diagnosticoIA:
            'O estoque livre de produto acabado permite faturamento à pronta entrega no Centro 1100. Há 18,2 t sem pedido vinculado aguardando alocação comercial rápida.',
        }
      case 'necessidade_producao':
        return {
          titulo: 'Necessidade Líquida de Produção FACA',
          icone: Factory,
          corIcone: 'text-amber-700',
          kpiValor: `${formatNumberPtBr(kpis.necessidade_producao_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.saldo_a_produzir_t > 0),
          diagnosticoIA:
            'Necessidade líquida calculada após deduções de estoque livre de PA. Requer priorização de laminação nas linhas L1 e L2 na próxima campanha.',
        }
      case 'mp_necessaria':
        return {
          titulo: 'Necessidade Líquida de Matéria-Prima (com Rendimento)',
          icone: FileCheck2,
          corIcone: 'text-purple-700',
          kpiValor: `${formatNumberPtBr(kpis.mp_necessaria_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.mp_necessaria_t > 0),
          diagnosticoIA:
            'Cálculo estrito: MP Necessária = Saldo a Produzir / Rendimento de Transformação da Ficha Mestra. O rendimento varia de 89% a 92% conforme a bitola.',
        }
      case 'faturamento_potencial':
        return {
          titulo: 'Previsão de Faturamento FACA (Potencial vs Confirmado)',
          icone: DollarSign,
          corIcone: 'text-emerald-700',
          kpiValor: `R$ ${kpis.faturamento_potencial_brl.toLocaleString('pt-BR')}`,
          itensFiltrados: itens.filter((i) => i.valor_faturamento_previsto_brl > 0),
          diagnosticoIA:
            'Diferenciação mandatória: R$ ' +
            kpis.faturamento_confirmado_brl.toLocaleString('pt-BR') +
            ' é Faturamento Confirmado (coberto 100% por estoque livre), enquanto o restante é Potencial dependente de laminação.',
        }
      case 'estoque_sem_pedido':
        return {
          titulo: 'Estoque FACA Sem Pedido Ativo (Oportunidade Comercial)',
          icone: AlertTriangle,
          corIcone: 'text-orange-700',
          kpiValor: `${formatNumberPtBr(kpis.estoque_sem_pedido_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.status_atendimento === 'SEM_PEDIDO_ESTOQUE_LIVRE'),
          diagnosticoIA:
            'Materiais produzidos ou devolvidos que encontram-se liberados em estoque sem pedido comercial ativo. Recomenda-se oferta comercial proativa para evitar custo de estocagem.',
        }
      case 'carteira_minima':
        return {
          titulo: 'Materiais Abaixo da Carteira Mínima de Laminação',
          icone: Scale,
          corIcone: 'text-amber-700',
          kpiValor: `${formatNumberPtBr(kpis.carteira_minima_abaixo_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.status_atendimento === 'LOTE_MINIMO_PENDENTE'),
          diagnosticoIA:
            'Itens cujos pedidos isolados não atingem a campanha técnica mínima do centro (ex: 25 t a 35 t). A laminação isolada geraria perda excessiva de rendimento e custos de setup.',
        }
      case 'pedidos_criticos':
        return {
          titulo: 'Pedidos Críticos com Risco de Atendimento',
          icone: ShieldAlert,
          corIcone: 'text-rose-700',
          kpiValor: `${kpis.pedidos_criticos_count} pedidos`,
          itensFiltrados: itens.filter(
            (i) =>
              i.status_atendimento === 'MP_INSUFICIENTE' ||
              i.status_atendimento === 'LOTE_MINIMO_PENDENTE',
          ),
          diagnosticoIA:
            'Pedidos sob risco iminente de atraso decorrente de falta de MP técnica específica ou inviabilidade de laminação por volume insuficiente.',
        }
      default:
        return {
          titulo: 'Detalhamento do Indicador',
          icone: Briefcase,
          corIcone: 'text-slate-700',
          kpiValor: '',
          itensFiltrados: itens,
          diagnosticoIA: 'Visualização analítica detalhada dos materiais vinculados.',
        }
    }
  }

  const info = getDetalhes()
  const IconC = info.icone

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center ${info.corIcone}`}
            >
              <IconC className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {info.titulo}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Consolidação analítica &bull; Valor Total:{' '}
                <strong className="text-slate-800">{info.kpiValor}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Diagnóstico da IA */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Diagnóstico do Motor IA:</span> {info.diagnosticoIA}
          </div>
        </div>

        {/* Tabela dos materiais que compõem o KPI */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
            <span>Materiais Responsáveis pelo Indicador ({info.itensFiltrados.length})</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Valores em toneladas e R$
            </span>
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            <Table className="text-xs">
              <TableHeader className="bg-slate-100/70 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Código</TableHead>
                  <TableHead className="font-bold text-slate-700">Descrição</TableHead>
                  <TableHead className="font-bold text-slate-700">Cliente</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    Carteira (t)
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    Estoque PA (t)
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    A Produzir (t)
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">MP Nec. (t)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {info.itensFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-xs text-slate-500">
                      Nenhum material associado a este filtro no momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  info.itensFiltrados.map((it) => (
                    <TableRow key={it.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold text-[#004C97]">
                        {it.codigo_material}
                      </TableCell>
                      <TableCell
                        className="text-slate-700 truncate max-w-[200px]"
                        title={it.descricao}
                      >
                        {it.descricao}
                      </TableCell>
                      <TableCell
                        className="text-slate-800 font-medium truncate max-w-[160px]"
                        title={it.cliente}
                      >
                        {it.cliente}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {formatNumberPtBr(it.carteira_aberta_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        {formatNumberPtBr(it.estoque_livre_pa_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-700">
                        {formatNumberPtBr(it.saldo_a_produzir_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-700">
                        {formatNumberPtBr(it.mp_necessaria_t, 1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {it.status_atendimento}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
