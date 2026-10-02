/**
 * Tabela / Grid Consolidado — Peça 1: Dados IBGE
 *
 * Colunas obrigatórias:
 * Empresa | Linha | Centro | Tipo material | Material | Descrição | Período | Quantidade Produzida | UM | Status | Ações
 *
 * Botão "Visualizar" por linha abre o modal de detalhamento.
 */

import React from 'react'
import { LinhaConsolidadaIbge } from '@/types/dados-ibge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, FileSpreadsheet, Building2, GitBranch, Factory } from 'lucide-react'
import { formatNumberPTBR } from '@/lib/number-format'

interface Props {
  linhas: LinhaConsolidadaIbge[]
  onVisualizar: (linha: LinhaConsolidadaIbge) => void
  carregando?: boolean
}

export const DadosIbgeTable: React.FC<Props> = ({ linhas, onVisualizar, carregando = false }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enviada à Contabilidade':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px] font-semibold">
            Enviada
          </Badge>
        )
      case 'Conferida':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[11px] font-semibold">
            Conferida
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[11px] font-semibold">
            Pendente
          </Badge>
        )
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#004C97]" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Demonstrativo Consolidado de Produção IBGE
          </h3>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            ({linhas.length} linha(s) agrupada(s))
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-3">Empresa</th>
              <th className="py-3 px-3">Linha</th>
              <th className="py-3 px-3">Centro</th>
              <th className="py-3 px-3">Tipo material</th>
              <th className="py-3 px-3">Material</th>
              <th className="py-3 px-3">Descrição</th>
              <th className="py-3 px-3">Período</th>
              <th className="py-3 px-3 text-right">Quantidade Produzida</th>
              <th className="py-3 px-2 text-center">UM</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500">
                  <div className="max-w-md mx-auto space-y-2">
                    <p className="text-sm font-semibold text-slate-700">
                      Nenhum dado de produção encontrado para os filtros selecionados.
                    </p>
                    <p className="text-xs text-slate-400">
                      Verifique a Empresa, Linha, Centros selecionados ou altere o Período de
                      competência.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              linhas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Empresa */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-semibold text-slate-900">
                      <Building2 className="w-3 h-3 text-[#004C97] shrink-0" />
                      <span>{item.empresa_code}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">{item.empresa_nome}</span>
                  </td>

                  {/* Linha */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <GitBranch className="w-3 h-3 text-[#004C97] shrink-0" />
                      <span>{item.linha_code}</span>
                    </div>
                  </td>

                  {/* Centro */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-mono text-slate-800 font-medium">
                      <Factory className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{item.centro_code}</span>
                    </div>
                  </td>

                  {/* Tipo material (MTART) */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold bg-slate-50 border-slate-300"
                    >
                      {item.tipo_material}
                    </Badge>
                  </td>

                  {/* Material */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-[#004C97]">
                    {item.material_code}
                  </td>

                  {/* Descrição */}
                  <td
                    className="py-2.5 px-3 max-w-[240px] truncate text-slate-800"
                    title={item.material_descricao}
                  >
                    {item.material_descricao}
                  </td>

                  {/* Período */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-700">
                    {item.competencia}
                  </td>

                  {/* Quantidade Produzida */}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatNumberPTBR(item.quantidade_produzida, 3)}
                  </td>

                  {/* UM */}
                  <td className="py-2.5 px-2 text-center uppercase font-mono text-slate-600 font-semibold">
                    {item.unidade_medida}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {getStatusBadge(item.status_fechamento)}
                  </td>

                  {/* Ações: Somente "Visualizar" nesta Peça 1 */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onVisualizar(item)}
                      className="h-7 text-xs px-2.5 border-slate-300 text-slate-700 hover:text-[#004C97] hover:border-blue-300 hover:bg-blue-50/50 gap-1 font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DadosIbgeTable
