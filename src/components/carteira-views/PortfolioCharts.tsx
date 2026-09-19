import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Layers,
  Building2,
  Calendar,
  AlertTriangle,
  Bot,
  PieChart as PieIcon,
  Download,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { ItemCurvaAbcCalculado } from '@/services/curva-abc-faturamento-engine'
import { formatNumberPTBR, formatCurrencyPTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { AnalyticalModal } from '@/components/common/AnalyticalModal'

interface PortfolioChartsProps {
  isOpen: boolean
  onClose: () => void
  tituloCarteira: string
  itens: ItemCurvaAbcCalculado[]
  onSelectMaterial?: (item: ItemCurvaAbcCalculado) => void
  onDrilldownGrupo?: (grupoNome: string, grupoItens: ItemCurvaAbcCalculado[]) => void
}

type TabTipo = 'LINHA' | 'CENTRO' | 'FAMILIA' | 'COBERTURA' | 'CRITICIDADE'

export const PortfolioCharts: React.FC<PortfolioChartsProps> = ({
  isOpen,
  onClose,
  tituloCarteira,
  itens,
  onSelectMaterial,
  onDrilldownGrupo,
}) => {
  const [activeTab, setActiveTab] = useState<TabTipo>('LINHA')

  // Agregações determinísticas
  const dadosPorLinha = useMemo(() => {
    const mapa = new Map<
      string,
      {
        carteira: number
        estoque: number
        programado: number
        deficit: number
        faturamento: number
      }
    >()

    itens.forEach((it) => {
      const linha = it.linha || 'Outros'
      const atual = mapa.get(linha) || {
        carteira: 0,
        estoque: 0,
        programado: 0,
        deficit: 0,
        faturamento: 0,
      }
      atual.carteira += it.carteira_tons
      atual.estoque += it.estoque_disponivel_tons
      atual.programado += it.programado_tons
      atual.deficit += it.deficit_tons
      atual.faturamento += it.faturamento_brl
      mapa.set(linha, atual)
    })

    return Array.from(mapa.entries())
      .map(([linha, dados]) => ({
        linha,
        ...dados,
      }))
      .sort((a, b) => b.carteira - a.carteira)
  }, [itens])

  const dadosPorCentro = useMemo(() => {
    const mapa = new Map<
      string,
      { carteira: number; estoque: number; deficit: number; faturamento: number }
    >()

    itens.forEach((it) => {
      const centro = it.centro || 'SDPL'
      const atual = mapa.get(centro) || { carteira: 0, estoque: 0, deficit: 0, faturamento: 0 }
      atual.carteira += it.carteira_tons
      atual.estoque += it.estoque_disponivel_tons
      atual.deficit += it.deficit_tons
      atual.faturamento += it.faturamento_brl
      mapa.set(centro, atual)
    })

    return Array.from(mapa.entries()).map(([centro, dados]) => ({
      centro,
      ...dados,
    }))
  }, [itens])

  const dadosPorFamilia = useMemo(() => {
    const mapa = new Map<
      string,
      { carteira: number; estoque: number; deficit: number; faturamento: number; itens: number }
    >()

    itens.forEach((it) => {
      const familia = it.familia || 'Geral'
      const atual = mapa.get(familia) || {
        carteira: 0,
        estoque: 0,
        deficit: 0,
        faturamento: 0,
        itens: 0,
      }
      atual.carteira += it.carteira_tons
      atual.estoque += it.estoque_disponivel_tons
      atual.deficit += it.deficit_tons
      atual.faturamento += it.faturamento_brl
      atual.itens += 1
      mapa.set(familia, atual)
    })

    return Array.from(mapa.entries())
      .map(([familia, dados]) => ({
        familia,
        ...dados,
      }))
      .sort((a, b) => b.carteira - a.carteira)
  }, [itens])

  const dadosPorCobertura = useMemo(() => {
    const faixas = [
      { faixa: 'Sem Estoque (0d)', qtd: 0, tons: 0, cor: '#E11D48' },
      { faixa: 'Crítica (<7d)', qtd: 0, tons: 0, cor: '#F97316' },
      { faixa: 'Parcial (7-15d)', qtd: 0, tons: 0, cor: '#FBBF24' },
      { faixa: 'Equilibrada (15-30d)', qtd: 0, tons: 0, cor: '#059669' },
      { faixa: 'Alta (>30d)', qtd: 0, tons: 0, cor: '#004C97' },
    ]

    itens.forEach((it) => {
      const d = it.dias_cobertura
      if (d === 0 || it.estoque_disponivel_tons <= 0) {
        faixas[0].qtd += 1
        faixas[0].tons += it.carteira_tons
      } else if (d < 7) {
        faixas[1].qtd += 1
        faixas[1].tons += it.carteira_tons
      } else if (d < 15) {
        faixas[2].qtd += 1
        faixas[2].tons += it.carteira_tons
      } else if (d <= 30) {
        faixas[3].qtd += 1
        faixas[3].tons += it.carteira_tons
      } else {
        faixas[4].qtd += 1
        faixas[4].tons += it.carteira_tons
      }
    })

    return faixas
  }, [itens])

  const dadosPorCriticidade = useMemo(() => {
    const niveis = [
      { nivel: 'Crítico (Curva A c/ Déficit)', qtd: 0, tons: 0, cor: '#DC2626' },
      { nivel: 'Atenção (Curva B c/ Déficit)', qtd: 0, tons: 0, cor: '#D97706' },
      { nivel: 'Normal (Curva C c/ Déficit)', qtd: 0, tons: 0, cor: '#475569' },
      { nivel: 'Coberto / Sem Risco', qtd: 0, tons: 0, cor: '#16A34A' },
    ]

    itens.forEach((it) => {
      if (it.curva_abc === 'A' && it.deficit_tons > 0) {
        niveis[0].qtd += 1
        niveis[0].tons += it.deficit_tons
      } else if (it.curva_abc === 'B' && it.deficit_tons > 0) {
        niveis[1].qtd += 1
        niveis[1].tons += it.deficit_tons
      } else if (it.curva_abc === 'C' && it.deficit_tons > 0) {
        niveis[2].qtd += 1
        niveis[2].tons += it.deficit_tons
      } else {
        niveis[3].qtd += 1
        niveis[3].tons += it.carteira_tons
      }
    })

    return niveis
  }, [itens])

  // Métricas agregadas de topo
  const totalCarteira = itens.reduce((s, i) => s + i.carteira_tons, 0)
  const totalEstoque = itens.reduce((s, i) => s + i.estoque_disponivel_tons, 0)
  const totalDeficit = itens.reduce((s, i) => s + i.deficit_tons, 0)
  const totalFat = itens.reduce((s, i) => s + i.faturamento_brl, 0)

  // Altura dinâmica para tabelas/barras horizontais para evitar corte
  const alturaGraficoFamilia = Math.max(380, Math.min(650, dadosPorFamilia.length * 42))

  const exportarCSVGraficos = () => {
    const cabecalho = 'Categoria;Carteira (t);Estoque (t);Déficit (t);Faturamento (R$)\n'
    let linhas = ''
    if (activeTab === 'LINHA') {
      linhas = dadosPorLinha
        .map(
          (d) =>
            `"${d.linha}";${d.carteira.toFixed(2)};${d.estoque.toFixed(2)};${d.deficit.toFixed(2)};${d.faturamento.toFixed(2)}`,
        )
        .join('\n')
    } else if (activeTab === 'CENTRO') {
      linhas = dadosPorCentro
        .map(
          (d) =>
            `"${d.centro}";${d.carteira.toFixed(2)};${d.estoque.toFixed(2)};${d.deficit.toFixed(2)};${d.faturamento.toFixed(2)}`,
        )
        .join('\n')
    } else if (activeTab === 'FAMILIA') {
      linhas = dadosPorFamilia
        .map(
          (d) =>
            `"${d.familia}";${d.carteira.toFixed(2)};${d.estoque.toFixed(2)};${d.deficit.toFixed(2)};${d.faturamento.toFixed(2)}`,
        )
        .join('\n')
    } else if (activeTab === 'COBERTURA') {
      linhas = dadosPorCobertura.map((d) => `"${d.faixa}";${d.tons.toFixed(2)};0;0;0`).join('\n')
    } else {
      linhas = dadosPorCriticidade.map((d) => `"${d.nivel}";${d.tons.toFixed(2)};0;0;0`).join('\n')
    }

    const blob = new Blob(['\uFEFF' + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `analise_grafica_${activeTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const headerKpis = [
    { label: 'Carteira Total', value: `${formatNumberPTBR(totalCarteira, 2)} t` },
    { label: 'Estoque Livre', value: `${formatNumberPTBR(totalEstoque, 2)} t` },
    { label: 'Déficit Geral', value: `${formatNumberPTBR(totalDeficit, 2)} t` },
    { label: 'Faturamento Total', value: formatCurrencyPTBR(totalFat) },
  ]

  const tabsConfig = {
    activeTab,
    onTabChange: (id: string) => setActiveTab(id as TabTipo),
    items: [
      { id: 'LINHA', label: 'Por Linha de Produção', icon: <Layers className="w-3.5 h-3.5" /> },
      {
        id: 'CENTRO',
        label: 'Por Centro SAP (WERKS)',
        icon: <Building2 className="w-3.5 h-3.5" />,
      },
      {
        id: 'FAMILIA',
        label: 'Por Família de Produtos',
        icon: <BarChart3 className="w-3.5 h-3.5" />,
      },
      { id: 'COBERTURA', label: 'Faixas de Cobertura', icon: <Calendar className="w-3.5 h-3.5" /> },
      {
        id: 'CRITICIDADE',
        label: 'Matriz de Criticidade',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
      },
    ],
  }

  return (
    <AnalyticalModal
      isOpen={isOpen}
      onClose={onClose}
      size="analytical"
      badge="Painel Analítico"
      title={`Análise Gráfica • ${tituloCarteira}`}
      subtitle="Visualização consolidada de demandas, capacidades, estoques e gargalos industriais por dimensões estruturais"
      headerKpis={headerKpis}
      tabs={tabsConfig}
      scrollMode="auto"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-[#004C97]" />
            <span>Dados sincronizados via RFC SAP ECC – ZSD28C</span>
            <span className="text-slate-300">•</span>
            <span>Última sincronização: {formatDatePTBR(new Date().toISOString())}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportarCSVGraficos}
              className="h-7 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#004C97]" /> Exportar Dimensão Atual
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              className="h-7 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white"
            >
              Fechar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ABA: POR LINHA */}
        {activeTab === 'LINHA' && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#004C97]" />
                    Demandas e Estoques por Linha de Laminação
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comparativo entre Carteira em aberto, Estoque disponível e Déficit físico por
                    linha produtiva
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded-xs bg-[#004C97] inline-block" /> Carteira (t)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded-xs bg-[#059669] inline-block" /> Estoque (t)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded-xs bg-[#E11D48] inline-block" /> Déficit (t)
                  </span>
                </div>
              </div>

              {dadosPorLinha.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                  Nenhum registro encontrado para a dimensão Linha de Produção.
                </div>
              ) : (
                <div className="w-full h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosPorLinha}
                      margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="linha"
                        tick={{ fontSize: 12, fill: '#334155', fontWeight: 'bold' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickFormatter={(v) => `${v} t`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="p-3 bg-white border border-slate-200 shadow-xl rounded-xl text-xs space-y-1">
                                <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                                  {d.linha}
                                </span>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Carteira:</span>
                                  <strong className="text-[#004C97] font-sans">
                                    {formatNumberPTBR(d.carteira, 2)} t
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Estoque:</span>
                                  <strong className="text-emerald-700 font-sans">
                                    {formatNumberPTBR(d.estoque, 2)} t
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Déficit:</span>
                                  <strong className="text-rose-600 font-sans">
                                    {formatNumberPTBR(d.deficit, 2)} t
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4 pt-1 border-t border-slate-100">
                                  <span className="text-slate-600">Faturamento:</span>
                                  <strong className="text-slate-900 font-sans">
                                    {formatCurrencyPTBR(d.faturamento)}
                                  </strong>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                      <Bar
                        dataKey="carteira"
                        name="Carteira (t)"
                        fill="#004C97"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="estoque"
                        name="Estoque (t)"
                        fill="#059669"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="deficit"
                        name="Déficit (t)"
                        fill="#E11D48"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: POR CENTRO */}
        {activeTab === 'CENTRO' && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#004C97]" />
                    Distribuição Geográfica e Operacional por Centro SAP (WERKS)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Volumes acumulados por plantas produtivas e centros de armazenagem
                  </p>
                </div>
              </div>

              {dadosPorCentro.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                  Nenhum centro SAP identificado no conjunto de dados.
                </div>
              ) : (
                <div className="w-full h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosPorCentro}
                      margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="centro"
                        tick={{ fontSize: 12, fill: '#334155', fontWeight: 'bold' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickFormatter={(v) => `${v} t`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="p-3 bg-white border border-slate-200 shadow-xl rounded-xl text-xs space-y-1">
                                <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                                  Centro {d.centro}
                                </span>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Carteira:</span>
                                  <strong className="text-[#004C97] font-sans">
                                    {formatNumberPTBR(d.carteira, 2)} t
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Estoque:</span>
                                  <strong className="text-emerald-700 font-sans">
                                    {formatNumberPTBR(d.estoque, 2)} t
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Déficit:</span>
                                  <strong className="text-rose-600 font-sans">
                                    {formatNumberPTBR(d.deficit, 2)} t
                                  </strong>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                      <Bar
                        dataKey="carteira"
                        name="Carteira (t)"
                        fill="#004C97"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="estoque"
                        name="Estoque (t)"
                        fill="#059669"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="deficit"
                        name="Déficit (t)"
                        fill="#E11D48"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: POR FAMÍLIA (BARRAS HORIZONTAIS COM LABELS INTEGRAIS) */}
        {activeTab === 'FAMILIA' && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#004C97]" />
                    Demandas por Família de Produtos (Barras Horizontais com Labels Integrais)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Leitura executiva das principais linhas de produto sem sobreposição ou corte de
                    texto
                  </p>
                </div>
              </div>

              {dadosPorFamilia.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                  Nenhuma família identificada.
                </div>
              ) : (
                <div style={{ height: `${alturaGraficoFamilia}px` }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={dadosPorFamilia}
                      margin={{ top: 10, right: 40, left: 140, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickFormatter={(v) => `${v} t`}
                      />
                      <YAxis
                        type="category"
                        dataKey="familia"
                        tick={{ fontSize: 12, fill: '#1E293B', fontWeight: 'bold' }}
                        width={130}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="p-3 bg-white border border-slate-200 shadow-xl rounded-xl text-xs space-y-1">
                                <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                                  {d.familia} ({d.itens} materiais)
                                </span>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Carteira:</span>
                                  <strong className="text-[#004C97] font-sans">
                                    {formatNumberPTBR(d.carteira, 2)} t
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Estoque:</span>
                                  <strong className="text-emerald-700 font-sans">
                                    {formatNumberPTBR(d.estoque, 2)} t
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Déficit:</span>
                                  <strong className="text-rose-600 font-sans">
                                    {formatNumberPTBR(d.deficit, 2)} t
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4 pt-1 border-t border-slate-100">
                                  <span className="text-slate-600">Faturamento:</span>
                                  <strong className="text-slate-900 font-sans">
                                    {formatCurrencyPTBR(d.faturamento)}
                                  </strong>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                      <Bar
                        dataKey="carteira"
                        name="Carteira (t)"
                        fill="#004C97"
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        dataKey="estoque"
                        name="Estoque (t)"
                        fill="#059669"
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        dataKey="deficit"
                        name="Déficit (t)"
                        fill="#E11D48"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: FAIXAS DE COBERTURA */}
        {activeTab === 'COBERTURA' && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#004C97]" />
                    Distribuição da Carteira por Faixa de Cobertura Física
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Classificação por dias de cobertura do estoque em relação à demanda da carteira
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosPorCobertura}
                      margin={{ top: 20, right: 30, left: 20, bottom: 45 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="faixa"
                        angle={-25}
                        textAnchor="end"
                        height={55}
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 'bold' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickFormatter={(v) => `${v} t`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="p-3 bg-white border border-slate-200 shadow-xl rounded-xl text-xs space-y-1">
                                <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                                  {d.faixa}
                                </span>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Quantidade:</span>
                                  <strong className="text-slate-900 font-sans">
                                    {d.qtd} materiais
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Volume:</span>
                                  <strong className="text-[#004C97] font-sans">
                                    {formatNumberPTBR(d.tons, 2)} t
                                  </strong>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="tons" name="Toneladas (t)" radius={[4, 4, 0, 0]}>
                        {dadosPorCobertura.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.cor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Resumo em cards */}
                <div className="space-y-2 flex flex-col justify-center">
                  {dadosPorCobertura.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.cor }}
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {item.faixa}
                          </span>
                          <span className="text-[11px] text-slate-500">{item.qtd} materiais</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="text-sm font-bold font-sans text-slate-900 block">
                          {formatNumberPTBR(item.tons, 2)} t
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          {totalCarteira > 0 ? ((item.tons / totalCarteira) * 100).toFixed(1) : 0}%
                          da carteira
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: CRITICIDADE */}
        {activeTab === 'CRITICIDADE' && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Matriz de Criticidade • Cruzamento Curva ABC x Déficit Físico
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Classificação por severidade de ruptura cruzando impacto comercial e déficit na
                    programação
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosPorCriticidade}
                      margin={{ top: 20, right: 30, left: 20, bottom: 45 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="nivel"
                        angle={-25}
                        textAnchor="end"
                        height={55}
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 'bold' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickFormatter={(v) => `${v} t`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="p-3 bg-white border border-slate-200 shadow-xl rounded-xl text-xs space-y-1">
                                <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                                  {d.nivel}
                                </span>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Quantidade:</span>
                                  <strong className="text-slate-900 font-sans">
                                    {d.qtd} materiais
                                  </strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Volume:</span>
                                  <strong className="text-[#004C97] font-sans">
                                    {formatNumberPTBR(d.tons, 2)} t
                                  </strong>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="tons" name="Volume (t)" radius={[4, 4, 0, 0]}>
                        {dadosPorCriticidade.map((entry, index) => (
                          <Cell key={`cell-crit-${index}`} fill={entry.cor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Resumo da Matriz */}
                <div className="space-y-2 flex flex-col justify-center">
                  {dadosPorCriticidade.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.cor }}
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {item.nivel}
                          </span>
                          <span className="text-[11px] text-slate-500">{item.qtd} materiais</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="text-sm font-bold font-sans text-slate-900 block">
                          {formatNumberPTBR(item.tons, 2)} t
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BLOCO DE INTERPRETAÇÃO OPERACIONAL IA */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#004C97] text-white rounded-lg">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Análise &amp; IA &bull; Interpretação Operacional da Carteira
                </h4>
                <p className="text-xs text-slate-500">
                  Diagnóstico determinístico dos dados agregados para apoio ao programador
                </p>
              </div>
            </div>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">Consultivo</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Diagnóstico
              </span>
              <p className="text-slate-800 mt-1 font-medium leading-relaxed">
                A carteira analisada totaliza {formatNumberPTBR(totalCarteira, 2)} t com{' '}
                {formatNumberPTBR(totalEstoque, 2)} t em estoque livre.
              </p>
            </div>
            <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">
                Déficit Crítico
              </span>
              <p className="text-rose-950 mt-1 font-medium leading-relaxed">
                Existe um déficit agregado de {formatNumberPTBR(totalDeficit, 2)} t necessitando
                cobertura via OP nas linhas de laminação.
              </p>
            </div>
            <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Gargalos</span>
              <p className="text-amber-950 mt-1 font-medium leading-relaxed">
                Verificar restrições de bitola e campanhas térmicas em L1/L2 antes de liberar ordens
                de produção.
              </p>
            </div>
            <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-[#004C97] block">
                Ação Recomendada
              </span>
              <p className="text-blue-950 mt-1 font-medium leading-relaxed">
                Priorizar materiais com ruptura iminente na aba Matriz de Criticidade no
                sequenciamento semanal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AnalyticalModal>
  )
}

export default PortfolioCharts
