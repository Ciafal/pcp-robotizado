import React, { useState } from 'react'
import {
  X,
  FileSpreadsheet,
  Calendar,
  Building2,
  GitBranch,
  Layers,
  ArrowUpDown,
  Search,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { KpiMaterialDetail } from '@/services/kpis-carteira-service'

interface KpiMaterialDrilldownModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  materials: KpiMaterialDetail[]
  onSelectMaterial?: (material: KpiMaterialDetail) => void
}

type SortField =
  | 'material'
  | 'saldo_final_t'
  | 'dias_negativos'
  | 'curva_abc'
  | 'maior_saldo_negativo_t'

export const KpiMaterialDrilldownModal: React.FC<KpiMaterialDrilldownModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  materials,
  onSelectMaterial,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('saldo_final_t')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedCentro, setSelectedCentro] = useState<string>('Todos')

  if (!isOpen) return null

  const centrosUnicos = Array.from(new Set(materials.map((m) => m.centro).filter(Boolean)))

  const filteredMaterials = materials.filter((m) => {
    if (selectedCentro !== 'Todos' && m.centro !== selectedCentro) return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      m.material.toLowerCase().includes(term) ||
      m.material_descricao.toLowerCase().includes(term) ||
      m.familia.toLowerCase().includes(term)
    )
  })

  filteredMaterials.sort((a, b) => {
    let comp = 0
    if (sortField === 'material') {
      comp = a.material.localeCompare(b.material)
    } else if (sortField === 'saldo_final_t') {
      comp = a.saldo_final_t - b.saldo_final_t
    } else if (sortField === 'dias_negativos') {
      comp = a.dias_negativos - b.dias_negativos
    } else if (sortField === 'curva_abc') {
      comp = a.curva_abc.localeCompare(b.curva_abc)
    } else if (sortField === 'maior_saldo_negativo_t') {
      comp = a.maior_saldo_negativo_t - b.maior_saldo_negativo_t
    }
    return sortOrder === 'asc' ? comp : -comp
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder(field === 'material' || field === 'curva_abc' ? 'asc' : 'asc')
    }
  }

  const handleExportCsv = () => {
    const headers = [
      'Material',
      'Descrição',
      'Família',
      'Tipo',
      'Curva',
      'Centro',
      'Linha',
      'Saldo Inicial (t)',
      '1º Dia Negativo',
      'Dias Negativos',
      'Maior Saldo Neg (<0)',
      'Saldo Final (t)',
      'Estoque (t)',
      'Programação (t)',
      'Produção (t)',
      'Pedidos Cancel PCP',
      'Toneladas Cancel PCP',
      'Observação IA',
    ]

    const rows = filteredMaterials.map((m) => [
      `"${m.material}"`,
      `"${m.material_descricao.replace(/"/g, '""')}"`,
      `"${m.familia}"`,
      `"${m.tipo_material}"`,
      `"${m.curva_abc}"`,
      `"${m.centro}"`,
      `"${m.linha || ''}"`,
      m.saldo_inicial_t.toFixed(2).replace('.', ','),
      `"${m.primeiro_dia_negativo || '-'}"`,
      m.dias_negativos,
      m.maior_saldo_negativo_t.toFixed(2).replace('.', ','),
      m.saldo_final_t.toFixed(2).replace('.', ','),
      m.estoque_t.toFixed(2).replace('.', ','),
      m.programacao_t.toFixed(2).replace('.', ','),
      m.producao_t.toFixed(2).replace('.', ','),
      m.pedidos_cancelados_pcp,
      m.toneladas_canceladas_pcp.toFixed(2).replace('.', ','),
      `"${(m.observacao_ia || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `kpi_materiais_drilldown_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-[#004C97] border-blue-200 font-semibold"
                >
                  {filteredMaterials.length} materiais
                </Badge>
              </div>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs h-8 text-slate-700 border-slate-300 hover:bg-slate-100"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Exportar CSV
            </Button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Busca Local */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar material, descrição ou família..."
              className="pl-9 h-8 text-xs bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Centro:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedCentro('Todos')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  selectedCentro === 'Todos'
                    ? 'bg-[#004C97] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              {centrosUnicos.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCentro(c)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    selectedCentro === c
                      ? 'bg-[#004C97] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Materiais */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/80 transition-colors"
                    onClick={() => toggleSort('material')}
                  >
                    <div className="flex items-center gap-1">
                      Material <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Descrição & Família</th>
                  <th
                    className="py-2.5 px-2 text-center cursor-pointer hover:bg-slate-200/80 transition-colors"
                    onClick={() => toggleSort('curva_abc')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Curva <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-2 text-center">Centro / Linha</th>
                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
                    onClick={() => toggleSort('saldo_final_t')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Saldo Final <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-2 text-center cursor-pointer hover:bg-slate-200/80 transition-colors"
                    onClick={() => toggleSort('dias_negativos')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Dias Neg. <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
                    onClick={() => toggleSort('maior_saldo_negativo_t')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Maior Neg. <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right">Estoque (t)</th>
                  <th className="py-2.5 px-3 text-right">Prog. (t)</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Nenhum material encontrado com os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((m) => {
                    const isNeg = m.saldo_final_t < 0
                    return (
                      <tr
                        key={`${m.material}-${m.centro}`}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                        onClick={() => onSelectMaterial?.(m)}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {m.material}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900 leading-tight">
                            {m.material_descricao}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {m.familia} • {m.tipo_material}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-1.5 py-0 ${
                              m.curva_abc === 'A'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : m.curva_abc === 'B'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            }`}
                          >
                            {m.curva_abc}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-semibold text-slate-800">{m.centro}</span>
                          {m.linha && (
                            <span className="block text-[10px] text-slate-500 leading-none mt-0.5">
                              {m.linha}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={isNeg ? 'text-rose-600' : 'text-emerald-700'}>
                            {m.saldo_final_t.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            t
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              m.dias_negativos >= 15
                                ? 'bg-rose-100 text-rose-800'
                                : m.dias_negativos > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {m.dias_negativos}d
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {m.maior_saldo_negativo_t < 0
                            ? `${m.maior_saldo_negativo_t.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} t`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {m.estoque_t.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          t
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {m.programacao_t.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          t
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-[#004C97] hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectMaterial?.(m)
                            }}
                          >
                            Detalhes
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Dados consolidados via pcp_carteira_daily_snapshots • Sem compensação cruzada
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-7"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
