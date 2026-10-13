import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { FacaItemAnalitico, FacaMateriaPrimaDetalhe } from '@/types/faca-analise'
import { formatNumberPtBr } from '@/lib/number-format'

interface FacaChartsSectionProps {
  itens: FacaItemAnalitico[]
  materiasPrimas: FacaMateriaPrimaDetalhe[]
}

export const FacaChartsSection: React.FC<FacaChartsSectionProps> = ({ itens, materiasPrimas }) => {
  // Gráfico 1: Carteira x Estoque x Necessidade Produção por Material
  const dataComparativo = itens
    .filter((i) => i.carteira_aberta_t > 0 || i.estoque_livre_pa_t > 0)
    .map((i) => ({
      name: i.codigo_material.replace('FACA-', ''),
      carteira: Number(i.carteira_aberta_t.toFixed(1)),
      estoque: Number(i.estoque_livre_pa_t.toFixed(1)),
      aProduzir: Number(i.saldo_a_produzir_t.toFixed(1)),
    }))

  // Gráfico 2: Cobertura de MP (Disponível x Necessária)
  const dataMp = materiasPrimas.map((mp) => ({
    name: mp.codigo_mp.replace('MP-', ''),
    disponivel: Number(mp.estoque_disponivel_t.toFixed(1)),
    necessaria: Number(mp.mp_necessaria_carteira_t.toFixed(1)),
    saldo: Number(mp.saldo_apos_atendimento_t.toFixed(1)),
  }))

  // Gráfico 3: Previsão de Faturamento Mensal/Semanal
  const dataFaturamento = [
    { periodo: 'Sem 42', confirmado: 123000, potencial: 221400 },
    { periodo: 'Sem 43', confirmado: 382200, potencial: 574900 },
    { periodo: 'Sem 44', confirmado: 68400, potencial: 273600 },
    { periodo: 'Novembro', confirmado: 420000, potencial: 850000 },
  ]

  // Gráfico 4: Distribuição por Status de Atendimento (Donut)
  const statusCounts: Record<string, number> = {}
  itens.forEach((i) => {
    statusCounts[i.status_atendimento] = (statusCounts[i.status_atendimento] || 0) + 1
  })

  const dataPizza = [
    { name: 'Atendido Estoque', value: statusCounts['ATENDIDO_ESTOQUE'] || 0, color: '#059669' },
    { name: 'Parcial Coberto', value: statusCounts['PARCIALMENTE_COBERTO'] || 0, color: '#2563EB' },
    {
      name: 'Necessita Produção',
      value: statusCounts['NECESSITA_PRODUCAO'] || 0,
      color: '#D97706',
    },
    { name: 'MP Insuficiente', value: statusCounts['MP_INSUFICIENTE'] || 0, color: '#E11D48' },
    {
      name: 'Lote Mínimo Pendente',
      value: statusCounts['LOTE_MINIMO_PENDENTE'] || 0,
      color: '#7C3AED',
    },
    {
      name: 'Sem Pedido (Livre)',
      value: statusCounts['SEM_PEDIDO_ESTOQUE_LIVRE'] || 0,
      color: '#475569',
    },
  ].filter((p) => p.value > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Gráfico 1: Carteira x Estoque x Necessidade Produção */}
      <Card className="border border-slate-200 bg-white shadow-xs">
        <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-xs font-bold text-slate-800">
            1. Carteira × Estoque PA × Necessidade de Produção (t)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataComparativo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(val: any) => [`${formatNumberPtBr(Number(val), 1)} t`]}
                contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="carteira" name="Carteira (t)" fill="#004C97" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="estoque"
                name="Estoque Livre (t)"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
              <Bar dataKey="aProduzir" name="A Produzir (t)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico 2: Cobertura de Matéria-Prima por Código Técnico */}
      <Card className="border border-slate-200 bg-white shadow-xs">
        <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-xs font-bold text-slate-800">
            2. Matéria-Prima FACA: Disponível vs Necessária (t)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataMp} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(val: any) => [`${formatNumberPtBr(Number(val), 1)} t`]}
                contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar
                dataKey="disponivel"
                name="MP Disponível (t)"
                fill="#4F46E5"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="necessaria"
                name="MP Necessária (t)"
                fill="#9333EA"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico 3: Previsão de Faturamento (Confirmado x Potencial) */}
      <Card className="border border-slate-200 bg-white shadow-xs">
        <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-xs font-bold text-slate-800">
            3. Previsão de Faturamento FACA (Confirmado vs Potencial)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataFaturamento} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`]}
                contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar
                dataKey="confirmado"
                name="Confirmado (Estoque PA)"
                fill="#059669"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="potencial"
                name="Potencial Total"
                fill="#0284C7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico 4: Status do Atendimento dos Pedidos e Materiais */}
      <Card className="border border-slate-200 bg-white shadow-xs">
        <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-xs font-bold text-slate-800">
            4. Distribuição de Itens por Status de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataPizza}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {dataPizza.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
