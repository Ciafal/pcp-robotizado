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
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

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
          <FileSpreadsheet className="w-4 h-4 text-[#004C97] shrink-0" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Demonstrativo Consolidado de Produção IBGE
          </h3>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            ({linhas.length} linha(s) agrupada(s))
          </span>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="py-12 px-4 text-center text-slate-500">
          <div className="max-w-md mx-auto space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              Nenhum dado de produção encontrado para os filtros selecionados.
            </p>
            <p className="text-xs text-slate-400">
              Verifique a Empresa, Linha, Centros selecionados ou altere o Período de competência.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* VISÃO DESKTOP / TABLET: Tabela com scroll horizontal interno estrito e cabeçalho fixo */}
          <div className="hidden md:block overflow-x-auto max-w-full">
            <table className="min-w-[1100px] w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[110px]">Empresa</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[70px]">Linha</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[80px]">Centro</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[95px]">Tipo material</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[120px]">Material</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Descrição</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[80px]">Período</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap min-w-[130px]">
                    Quantidade Produzida
                  </th>
                  <th className="py-3 px-2 text-center whitespace-nowrap min-w-[45px]">UM</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap min-w-[95px]">Status</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap min-w-[100px] pr-4">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {linhas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 1. Empresa */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-semibold text-slate-900">
                        <Building2 className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
                        <span>{item.empresa_code}</span>
                      </div>
                      <span
                        className="text-[10px] text-slate-400 block truncate max-w-[110px]"
                        title={item.empresa_nome}
                      >
                        {item.empresa_nome}
                      </span>
                    </td>

                    {/* 2. Linha */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <GitBranch className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
                        <span>{item.linha_code}</span>
                      </div>
                    </td>

                    {/* 3. Centro */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-mono text-slate-800 font-medium">
                        <Factory className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.centro_code}</span>
                      </div>
                    </td>

                    {/* 4. Tipo material (MTART) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold bg-slate-50 border-slate-300"
                      >
                        {item.tipo_material}
                      </Badge>
                    </td>

                    {/* 5. Material */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-[#004C97]">
                      {item.material_code}
                    </td>

                    {/* 6. Descrição */}
                    <td
                      className="py-2.5 px-3.5 max-w-[260px] truncate text-slate-800"
                      title={item.material_descricao}
                    >
                      {item.material_descricao}
                    </td>

                    {/* 7. Período */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-700">
                      {item.competencia}
                    </td>

                    {/* 8. Quantidade Produzida */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatNumberPTBR(item.quantidade_produzida, 3)}
                    </td>

                    {/* 9. UM */}
                    <td className="py-2.5 px-2 text-center uppercase font-mono text-slate-600 font-semibold">
                      {item.unidade_medida}
                    </td>

                    {/* 10. Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(item.status_fechamento)}
                    </td>

                    {/* 11. Ações: Visualizar (sem corte da última coluna) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap pr-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onVisualizar(item)}
                        className="h-7 text-xs px-2.5 border-slate-300 text-slate-700 hover:text-[#004C97] hover:border-blue-300 hover:bg-blue-50/50 gap-1 font-semibold shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Visualizar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VISÃO MOBILE: Cards responsivos estruturados sem perda de nenhuma das 11 informações */}
          <div className="md:hidden divide-y divide-slate-100 bg-slate-50/40 p-3 space-y-3">
            {linhas.map((item) => (
              <div
                key={`mobile-${item.id}`}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
              >
                {/* Cabeçalho do Card Mobile: Material + Status */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-[#004C97] text-sm">
                        {item.material_code}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold bg-slate-50 border-slate-300"
                      >
                        {item.tipo_material}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-800 font-medium mt-0.5 leading-snug">
                      {item.material_descricao}
                    </p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(item.status_fechamento)}</div>
                </div>

                {/* Metadados: Empresa, Linha, Centro, Período */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Empresa & Linha
                    </span>
                    <span className="font-semibold text-slate-900 block truncate">
                      {item.empresa_code} • {item.linha_code}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {item.empresa_nome}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Centro & Período
                    </span>
                    <span className="font-mono font-semibold text-slate-900 block">
                      {item.centro_code}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Competência: {item.competencia}
                    </span>
                  </div>
                </div>

                {/* Quantidade Produzida + Botão Ações */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Quantidade Produzida
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900">
                      {formatNumberPTBR(item.quantidade_produzida, 3)}{' '}
                      <span className="text-xs text-slate-500 uppercase font-normal">
                        {item.unidade_medida}
                      </span>
                    </span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onVisualizar(item)}
                    className="h-8 text-xs px-3 border-slate-300 text-slate-700 hover:text-[#004C97] hover:border-blue-300 hover:bg-blue-50/50 gap-1.5 font-semibold shadow-2xs shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visualizar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default DadosIbgeTable
