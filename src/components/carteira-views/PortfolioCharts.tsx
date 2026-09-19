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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { ItemCurvaAbcCalculado } from '@/services/curva-abc-faturamento-engine'
import { formatNumberPTBR, formatCurrencyPTBR } from '@/lib/formatters-ptbr'

export interface PortfolioChartsProps {
  isOpen: boolean
  onClose: () => void
  tituloCarteira?: string
  itens: ItemCurvaAbcCalculado[]
  onSelectMaterial?: (item: ItemCurvaAbcCalculado) => void
  onDrilldownGrupo?: (nomeGrupo: string, itensGrupo: ItemCurvaAbcCalculado[]) => void
}

type TabGrafico =
  | 'CARTEIRA_X_ESTOQUE'
  | 'DEFICIT_MATERIAL'
  | 'POR_LINHA'
  | 'POR_CENTRO'
  | 'POR_FAMILIA'
  | 'COBERTURA'
  | 'CRITICIDADE'

const CORES_PALETA = ['#004C97', '#00A3E0', '#008080', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B']

export const PortfolioCharts: React.FC<PortfolioChartsProps> = ({
  isOpen,
  onClose,
  tituloCarteira = 'Carteira Consolidada',
  itens,
  onSelectMaterial,
  onDrilldownGrupo,
}) => {
  const [tabAtiva, setTabAtiva] = useState<TabGrafico>('CARTEIRA_X_ESTOQUE')

  // 1. Dados: Carteira x Estoque x Programação x Saldo Projetado (Top 10 Materiais)
  const dadosCarteiraEstoque = useMemo(() => {
    return [...itens]
      .sort((a, b) => b.carteira_tons - a.carteira_tons)
      .slice(0, 10)
      .map((i) => ({
        material: i.codigo_material,
        descricao: i.descricao_material,
        carteira: Number(i.carteira_tons.toFixed(2)),
        estoqueDisp: Number(i.estoque_disponivel_tons.toFixed(2)),
        programado: Number(i.programado_tons.toFixed(2)),
        saldoProjetado: Number(i.saldo_projetado_tons.toFixed(2)),
        itemOriginal: i,
      }))
  }, [itens])

  // 2. Dados: Top Déficits por Material
  const dadosDeficitPorMaterial = useMemo(() => {
    return [...itens]
      .filter((i) => i.deficit_tons > 0)
      .sort((a, b) => b.deficit_tons - a.deficit_tons)
      .slice(0, 12)
      .map((i) => ({
        material: i.codigo_material,
        descricao: i.descricao_material,
        deficit: Number(i.deficit_tons.toFixed(2)),
        curva: i.curva_abc,
        itemOriginal: i,
      }))
  }, [itens])

  // 3. Dados: Carteira por Linha
  const dadosPorLinha = useMemo(() => {
    const mapa = new Map<
      string,
      { linha: string; toneladas: number; itens: ItemCurvaAbcCalculado[] }
    >()
    itens.forEach((i) => {
      const l = i.linha || 'N/D'
      const atual = mapa.get(l) || { linha: l, toneladas: 0, itens: [] }
      atual.toneladas += i.carteira_tons
      atual.itens.push(i)
      mapa.set(l, atual)
    })
    return Array.from(mapa.values())
      .map((g) => ({
        ...g,
        toneladas: Number(g.toneladas.toFixed(2)),
      }))
      .sort((a, b) => b.toneladas - a.toneladas)
  }, [itens])

  // 4. Dados: Carteira por Centro
  const dadosPorCentro = useMemo(() => {
    const mapa = new Map<
      string,
      { centro: string; toneladas: number; itens: ItemCurvaAbcCalculado[] }
    >()
    itens.forEach((i) => {
      const c = i.centro || '1000'
      const atual = mapa.get(c) || { centro: c, toneladas: 0, itens: [] }
      atual.toneladas += i.carteira_tons
      atual.itens.push(i)
      mapa.set(c, atual)
    })
    return Array.from(mapa.values())
      .map((g) => ({
        ...g,
        toneladas: Number(g.toneladas.toFixed(2)),
      }))
      .sort((a, b) => b.toneladas - a.toneladas)
  }, [itens])

  // 5. Dados: Carteira por Família de Produto
  const dadosPorFamilia = useMemo(() => {
    const mapa = new Map<
      string,
      { familia: string; toneladas: number; itens: ItemCurvaAbcCalculado[] }
    >()
    itens.forEach((i) => {
      const f = i.familia || 'OUTROS'
      const atual = mapa.get(f) || { familia: f, toneladas: 0, itens: [] }
      atual.toneladas += i.carteira_tons
      atual.itens.push(i)
      mapa.set(f, atual)
    })
    return Array.from(mapa.values())
      .map((g) => ({
        ...g,
        toneladas: Number(g.toneladas.toFixed(2)),
      }))
      .sort((a, b) => b.toneladas - a.toneladas)
      .slice(0, 8)
  }, [itens])

  // 6. Dados: Cobertura (Sem Cobertura, Baixa, Adequada, Excesso)
  const dadosCobertura = useMemo(() => {
    let semCobertura = 0
    let baixa = 0
    let adequada = 0
    let excesso = 0
    const itensSemCob: ItemCurvaAbcCalculado[] = []
    const itensBaixa: ItemCurvaAbcCalculado[] = []
    const itensAdequada: ItemCurvaAbcCalculado[] = []
    const itensExcesso: ItemCurvaAbcCalculado[] = []

    itens.forEach((i) => {
      if (i.deficit_tons > 0 && i.programado_tons === 0) {
        semCobertura++
        itensSemCob.push(i)
      } else if (i.deficit_tons > 0 && i.saldo_projetado_tons < 0) {
        baixa++
        itensBaixa.push(i)
      } else if (i.saldo_projetado_tons >= 0 && i.saldo_projetado_tons <= i.carteira_tons * 1.5) {
        adequada++
        itensAdequada.push(i)
      } else {
        excesso++
        itensExcesso.push(i)
      }
    })

    return [
      { name: 'Sem Cobertura', value: semCobertura, cor: '#EF4444', itens: itensSemCob },
      { name: 'Baixa Cobertura', value: baixa, cor: '#F59E0B', itens: itensBaixa },
      { name: 'Adequada', value: adequada, cor: '#10B981', itens: itensAdequada },
      { name: 'Excesso de Estoque', value: excesso, cor: '#004C97', itens: itensExcesso },
    ]
  }, [itens])

  // 7. Dados: Criticidade x Impacto Financeiro
  const dadosCriticidade = useMemo(() => {
    const mapa = new Map<
      string,
      {
        criticidade: string
        quantidade: number
        faturamento: number
        cor: string
        itens: ItemCurvaAbcCalculado[]
      }
    >([
      [
        'CRITICA',
        { criticidade: 'Crítica', quantidade: 0, faturamento: 0, cor: '#EF4444', itens: [] },
      ],
      ['ALTA', { criticidade: 'Alta', quantidade: 0, faturamento: 0, cor: '#F59E0B', itens: [] }],
      ['MEDIA', { criticidade: 'Média', quantidade: 0, faturamento: 0, cor: '#3B82F6', itens: [] }],
      ['BAIXA', { criticidade: 'Baixa', quantidade: 0, faturamento: 0, cor: '#10B981', itens: [] }],
    ])

    itens.forEach((i) => {
      const c = mapa.get(i.criticidade) || mapa.get('BAIXA')!
      c.quantidade++
      c.faturamento += i.faturamento_brl
      c.itens.push(i)
    })

    return Array.from(mapa.values())
  }, [itens])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                  Painel Analítico
                </Badge>
                <DialogTitle className="text-base sm:text-lg font-bold text-white">
                  Análise Gráfica &bull; {tituloCarteira}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-300">
                Visualização comparativa de carteira, estoques, déficits, linhas, centros e
                criticidade. Clique nas barras ou fatias para abrir os materiais correspondentes.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs font-mono">
              Base: {itens.length} materiais
            </Badge>
          </div>
        </DialogHeader>

        {/* Abas dos Gráficos */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto text-xs">
          <Button
            size="sm"
            variant={tabAtiva === 'CARTEIRA_X_ESTOQUE' ? 'default' : 'ghost'}
            onClick={() => setTabAtiva('CARTEIRA_X_ESTOQUE')}
            className={`h-7 text-xs font-bold gap-1 ${
              tabAtiva === 'CARTEIRA_X_ESTOQUE' ? 'bg-[#004C97] text-white' : 'text-slate-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Carteira x Estoque
          </Button>
          <Button
            size="sm"
            variant={tabAtiva === 'DEFICIT_MATERIAL' ? 'default' : 'ghost'}
            onClick={() => setTabAtiva('DEFICIT_MATERIAL')}
            className={`h-7 text-xs font-bold gap-1 ${
              tabAtiva === 'DEFICIT_MATERIAL' ? 'bg-[#004C97] text-white' : 'text-slate-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Déficit por Material
          </Button>
          <Button
            size="sm"
            variant={tabAtiva === 'POR_LINHA' ? 'default' : 'ghost'}
            onClick={() => setTabAtiva('POR_LINHA')}
            className={`h-7 text-xs font-bold gap-1 ${
              tabAtiva === 'POR_LINHA' ? 'bg-[#004C97] text-white' : 'text-slate-700'
            }`}
          >
            Por Linha
          </Button>
          <Button
            size="sm"
            variant={tabAtiva === 'POR_CENTRO' ? 'default' : 'ghost'}
            onClick={() => setTabAtiva('POR_CENTRO')}
            className={`h-7 text-xs font-bold gap-1 ${
              tabAtiva === 'POR_CENTRO' ? 'bg-[#004C97] text-white' : 'text-slate-700'
            }`}
          >
            Por Centro
          </Button>
          <Button
            size="sm"
            variant={tabAtiva === 'POR_FAMILIA' ? 'default' : 'ghost'}
            onClick={() => setTabAtiva('POR_FAMILIA')}
            className={`h-7 text-xs font-bold gap-1 ${
              tabAtiva === 'POR_FAMILIA' ? 'bg-[#004C97] text-white' : 'text-slate-700'
            }`}
          >
            Por Família
          </Button>
          <Button
            size="sm"
            variant={tabAtiva === 'COBERTURA' ? 'default' : 'ghost'}
            onClick={() => setTabAtiva('COBERTURA')}
            className={`h-7 text-xs font-bold gap-1 ${
              tabAtiva === 'COBERTURA' ? 'bg-[#004C97] text-white' : 'text-slate-700'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            Cobertura
          </Button>
          <Button
            size="sm"
            variant={tabAtiva === 'CRITICIDADE' ? 'default' : 'ghost'}
            onClick={() => setTabAtiva('CRITICIDADE')}
            className={`h-7 text-xs font-bold gap-1 ${
              tabAtiva === 'CRITICIDADE' ? 'bg-[#004C97] text-white' : 'text-slate-700'
            }`}
          >
            Criticidade
          </Button>
        </div>

        {/* Área do Gráfico */}
        <div className="flex-1 p-4 overflow-y-auto">
          {tabAtiva === 'CARTEIRA_X_ESTOQUE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Top 10 Materiais em Demanda: Carteira (t), Estoque Disponível (t), Programado (t)
                  e Saldo Projetado (t)
                </span>
                <span className="text-[11px] text-slate-400">Valores em toneladas (t)</span>
              </div>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosCarteiraEstoque}
                    margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="material"
                      angle={-25}
                      textAnchor="end"
                      height={50}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <YAxis
                      tickFormatter={(v) => formatNumberPTBR(v, 0)}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        `${formatNumberPTBR(val, 2)} t`,
                        name === 'carteira'
                          ? 'Carteira'
                          : name === 'estoqueDisp'
                            ? 'Estoque Disp.'
                            : name === 'programado'
                              ? 'Programado PCP'
                              : 'Saldo Projetado',
                      ]}
                      labelFormatter={(label) => `Material: ${label}`}
                    />
                    <Legend
                      formatter={(val) =>
                        val === 'carteira'
                          ? 'Carteira (t)'
                          : val === 'estoqueDisp'
                            ? 'Estoque Disponível (t)'
                            : val === 'programado'
                              ? 'Programado PCP (t)'
                              : 'Saldo Projetado (t)'
                      }
                    />
                    <Bar
                      dataKey="carteira"
                      fill="#004C97"
                      radius={[3, 3, 0, 0]}
                      onClick={(entry: any) =>
                        entry.itemOriginal &&
                        onSelectMaterial &&
                        onSelectMaterial(entry.itemOriginal)
                      }
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="estoqueDisp"
                      fill="#10B981"
                      radius={[3, 3, 0, 0]}
                      onClick={(entry: any) =>
                        entry.itemOriginal &&
                        onSelectMaterial &&
                        onSelectMaterial(entry.itemOriginal)
                      }
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="programado"
                      fill="#8B5CF6"
                      radius={[3, 3, 0, 0]}
                      onClick={(entry: any) =>
                        entry.itemOriginal &&
                        onSelectMaterial &&
                        onSelectMaterial(entry.itemOriginal)
                      }
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="saldoProjetado"
                      fill="#F59E0B"
                      radius={[3, 3, 0, 0]}
                      onClick={(entry: any) =>
                        entry.itemOriginal &&
                        onSelectMaterial &&
                        onSelectMaterial(entry.itemOriginal)
                      }
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tabAtiva === 'DEFICIT_MATERIAL' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Ranking dos Maiores Déficits Físicos de Estoque (t) — Materiais com saldo negativo
                </span>
                <span className="text-[11px] text-slate-400">
                  Clique na barra para ver a ficha do item
                </span>
              </div>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosDeficitPorMaterial}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${formatNumberPTBR(v, 0)} t`}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="material"
                      tick={{ fontSize: 10, fill: '#1E293B' }}
                      width={100}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${formatNumberPTBR(val, 2)} t`, 'Déficit Atual']}
                      labelFormatter={(label) => `Material: ${label}`}
                    />
                    <Bar
                      dataKey="deficit"
                      fill="#EF4444"
                      radius={[0, 4, 4, 0]}
                      onClick={(entry: any) =>
                        entry.itemOriginal &&
                        onSelectMaterial &&
                        onSelectMaterial(entry.itemOriginal)
                      }
                      cursor="pointer"
                    >
                      {dadosDeficitPorMaterial.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.curva === 'A'
                              ? '#DC2626'
                              : entry.curva === 'B'
                                ? '#EA580C'
                                : '#F59E0B'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tabAtiva === 'POR_LINHA' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Volume de Carteira Consolidado por Linha Produtiva (t)
                </span>
                <span className="text-[11px] text-slate-400">
                  Clique na barra para drill-down dos materiais
                </span>
              </div>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosPorLinha}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="linha"
                      tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `${formatNumberPTBR(v, 0)} t`}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${formatNumberPTBR(val, 2)} t`, 'Volume Carteira']}
                    />
                    <Bar
                      dataKey="toneladas"
                      fill="#004C97"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(entry: any) =>
                        onDrilldownGrupo && onDrilldownGrupo(`Linha ${entry.linha}`, entry.itens)
                      }
                    >
                      {dadosPorLinha.map((_, idx) => (
                        <Cell
                          key={`cell-l-${idx}`}
                          fill={CORES_PALETA[idx % CORES_PALETA.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tabAtiva === 'POR_CENTRO' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Volume de Carteira por Centro SAP (t)</span>
                <span className="text-[11px] text-slate-400">
                  Clique para detalhar os itens do centro
                </span>
              </div>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosPorCentro}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="centro"
                      tickFormatter={(c) => `Centro ${c}`}
                      tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `${formatNumberPTBR(v, 0)} t`}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${formatNumberPTBR(val, 2)} t`, 'Volume Carteira']}
                      labelFormatter={(l) => `Centro: ${l}`}
                    />
                    <Bar
                      dataKey="toneladas"
                      fill="#008080"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(entry: any) =>
                        onDrilldownGrupo && onDrilldownGrupo(`Centro ${entry.centro}`, entry.itens)
                      }
                    >
                      {dadosPorCentro.map((_, idx) => (
                        <Cell
                          key={`cell-c-${idx}`}
                          fill={CORES_PALETA[idx % CORES_PALETA.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tabAtiva === 'POR_FAMILIA' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Distribuição da Carteira por Família de Produtos (Top 8)
                </span>
                <span className="text-[11px] text-slate-400">Valores em toneladas</span>
              </div>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosPorFamilia}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${formatNumberPTBR(v, 0)} t`}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="familia"
                      tick={{ fontSize: 10, fill: '#1E293B' }}
                      width={120}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${formatNumberPTBR(val, 2)} t`, 'Carteira']}
                    />
                    <Bar
                      dataKey="toneladas"
                      fill="#004C97"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(entry: any) =>
                        onDrilldownGrupo &&
                        onDrilldownGrupo(`Família ${entry.familia}`, entry.itens)
                      }
                    >
                      {dadosPorFamilia.map((_, idx) => (
                        <Cell
                          key={`cell-fam-${idx}`}
                          fill={CORES_PALETA[idx % CORES_PALETA.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tabAtiva === 'COBERTURA' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosCobertura}
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      dataKey="value"
                      label={({ name, percent }: any) =>
                        percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name
                      }
                      cursor="pointer"
                      onClick={(entry: any) =>
                        onDrilldownGrupo &&
                        onDrilldownGrupo(`Cobertura: ${entry.name}`, entry.itens)
                      }
                    >
                      {dadosCobertura.map((entry, index) => (
                        <Cell key={`cell-cob-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`${val} materiais`, 'Quantidade']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-900 block text-sm">
                  Resumo da Cobertura de Estoque
                </span>
                <p className="text-slate-500 leading-relaxed">
                  Avaliação da capacidade de atendimento com estoque disponível e produção
                  programada:
                </p>
                <div className="space-y-1.5 pt-2">
                  {dadosCobertura.map((c) => (
                    <div
                      key={c.name}
                      onClick={() =>
                        onDrilldownGrupo && onDrilldownGrupo(`Cobertura: ${c.name}`, c.itens)
                      }
                      className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: c.cor }}
                        />
                        <span className="font-semibold text-slate-800">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {c.value} materiais
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tabAtiva === 'CRITICIDADE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Materiais por Nível de Criticidade e Impacto Financeiro Estimado (R$)
                </span>
                <span className="text-[11px] text-slate-400">
                  Clique para abrir os itens da faixa
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {dadosCriticidade.map((crit) => (
                  <div
                    key={crit.criticidade}
                    onClick={() =>
                      onDrilldownGrupo &&
                      onDrilldownGrupo(`Criticidade ${crit.criticidade}`, crit.itens)
                    }
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-[#004C97] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs uppercase font-bold text-slate-500">
                        {crit.criticidade}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: crit.cor }}
                      />
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900">
                      {crit.quantidade}{' '}
                      <span className="text-xs text-slate-500 font-normal">materiais</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 font-mono">
                      {formatCurrencyPTBR(crit.faturamento)}
                    </div>
                    <span className="text-[10px] text-[#004C97] font-semibold mt-2 inline-flex items-center gap-1">
                      Ver materiais <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botão fechar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="text-[11px]">
            Dados sincronizados da RFC SAP ECC ZSD28C. Formatações em padrão brasileiro (pt-BR).
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="h-7 text-xs border-slate-300"
          >
            Fechar Gráficos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default PortfolioCharts
