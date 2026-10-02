/**
 * Tabela / Grid Consolidado — Dados IBGE
 *
 * Colunas obrigatórias:
 * Checkbox | Empresa | Linha | Centro | Tipo material | Material | Descrição | Período | Quantidade Produzida | UM | Status | Ações
 *
 * Ações por linha:
 * - Botão "Visualizar" (abre modal detalhado)
 * - Botão "Enviar p/ Contabilidade" (abre modal de confirmação individual)
 *
 * Cabeçalho do grid:
 * - À esquerda: título "Demonstrativo Consolidado de Produção IBGE" + quantidade de linhas agrupadas
 * - À direita: botão "Enviar Selecionados p/ Contabilidade" (desabilitado se nada marcado; com contagem real se selecionado)
 */

import React from 'react'
import { LinhaConsolidadaIbge } from '@/types/dados-ibge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Eye,
  FileSpreadsheet,
  Building2,
  GitBranch,
  Factory,
  Send,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

interface Props {
  linhas: LinhaConsolidadaIbge[]
  onVisualizar: (linha: LinhaConsolidadaIbge) => void
  onEnviarIndividual: (linha: LinhaConsolidadaIbge) => void
  onEnviarSelecionados: (linhas: LinhaConsolidadaIbge[]) => void
  linhasSelecionadasIds: string[]
  onToggleLinha: (id: string) => void
  onToggleTodos: (selecionar: boolean, idsVisiveis: string[]) => void
  carregando?: boolean
  isEnviando?: boolean
}

export const DadosIbgeTable: React.FC<Props> = ({
  linhas,
  onVisualizar,
  onEnviarIndividual,
  onEnviarSelecionados,
  linhasSelecionadasIds,
  onToggleLinha,
  onToggleTodos,
  carregando = false,
  isEnviando = false,
}) => {
  const idsVisiveis = linhas.map((l) => l.id)
  const todosVisiveisSelecionados =
    idsVisiveis.length > 0 && idsVisiveis.every((id) => linhasSelecionadasIds.includes(id))

  const algumVisivelSelecionado =
    idsVisiveis.some((id) => linhasSelecionadasIds.includes(id)) && !todosVisiveisSelecionados

  const itensSelecionados = linhas.filter((l) => linhasSelecionadasIds.includes(l.id))

  const labelBotaoLote =
    itensSelecionados.length > 0
      ? `Enviar ${itensSelecionados.length} selecionados p/ Contabilidade`
      : 'Enviar Selecionados p/ Contabilidade'

  const getStatusBadge = (item: LinhaConsolidadaIbge) => {
    const { status_fechamento, data_envio_formatada, data_reenvio_formatada } = item

    switch (status_fechamento) {
      case 'Enviada à Contabilidade':
        return (
          <div className="flex flex-col items-center gap-0.5">
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Enviado à Contabilidade
            </Badge>
            {data_reenvio_formatada ? (
              <span className="text-[10px] text-slate-500 font-mono">{data_reenvio_formatada}</span>
            ) : data_envio_formatada ? (
              <span className="text-[10px] text-slate-500 font-mono">
                Enviado em {data_envio_formatada}
              </span>
            ) : null}
          </div>
        )
      case 'Conferida':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[11px] font-semibold">
            Conferido
          </Badge>
        )
      case 'Em processamento':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[11px] font-semibold">
            Em processamento
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
      {/* Barra superior do grid conforme Requisito 3 */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#004C97] shrink-0" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Demonstrativo Consolidado de Produção IBGE
          </h3>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            ({linhas.length} linha(s) agrupada(s))
          </span>
          {linhasSelecionadasIds.length > 0 && (
            <span className="text-[11px] text-blue-600 font-semibold ml-1">
              • {linhasSelecionadasIds.length} selecionada(s)
            </span>
          )}
        </div>

        {/* Botão de Envio em Lote no cabeçalho */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="bg-[#004C97] hover:bg-blue-800 text-white font-medium text-xs h-9 px-3.5 gap-2 shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={itensSelecionados.length === 0 || isEnviando}
            onClick={() => onEnviarSelecionados(itensSelecionados)}
            title={
              itensSelecionados.length === 0
                ? 'Selecione uma ou mais linhas no grid para habilitar o envio em lote'
                : `Enviar ${itensSelecionados.length} selecionados p/ Contabilidade`
            }
          >
            <Send className="w-3.5 h-3.5" />
            <span>{labelBotaoLote}</span>
          </Button>
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
            <table className="min-w-[1240px] w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  {/* Checkbox cabeçalho */}
                  <th className="py-3 px-3 text-center whitespace-nowrap w-[44px]">
                    <Checkbox
                      checked={
                        todosVisiveisSelecionados
                          ? true
                          : algumVisivelSelecionado
                            ? 'indeterminate'
                            : false
                      }
                      onCheckedChange={(checked) => {
                        onToggleTodos(checked === true, idsVisiveis)
                      }}
                      aria-label="Selecionar todos os resultados visíveis"
                      className="translate-y-[1px]"
                    />
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[100px]">Empresa</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[70px]">Linha</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[80px]">Centro</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[95px]">Tipo material</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[120px]">Material</th>
                  <th className="py-3 px-3.5 min-w-[190px]">Descrição</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[80px]">Período</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap min-w-[130px]">
                    Quantidade Produzida
                  </th>
                  <th className="py-3 px-2 text-center whitespace-nowrap min-w-[45px]">UM</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap min-w-[140px]">Status</th>
                  {/* Coluna Ações com Visualizar e Enviar p/ Contabilidade */}
                  <th className="py-3 px-3 text-center whitespace-nowrap min-w-[210px] pr-4">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {linhas.map((item) => {
                  const isChecked = linhasSelecionadasIds.includes(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Checkbox linha */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => onToggleLinha(item.id)}
                          aria-label={`Selecionar material ${item.material_code}`}
                          className="translate-y-[1px]"
                        />
                      </td>

                      {/* 1. Empresa */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
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
                        className="py-2.5 px-3.5 max-w-[240px] truncate text-slate-800"
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
                        {getStatusBadge(item)}
                      </td>

                      {/* 11. Ações: Visualizar e Enviar p/ Contabilidade */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap pr-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onVisualizar(item)}
                            className="h-7 text-xs px-2.5 border-slate-300 text-slate-700 hover:text-[#004C97] hover:border-blue-300 hover:bg-blue-50/50 gap-1 font-semibold shadow-2xs"
                            title="Visualizar detalhes do apontamento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onEnviarIndividual(item)}
                            disabled={isEnviando}
                            className="h-7 text-xs px-2.5 border-blue-200 text-[#004C97] hover:text-white hover:bg-[#004C97] hover:border-[#004C97] gap-1 font-semibold shadow-2xs transition-colors"
                            title="Enviar dados desta linha para a Contabilidade"
                          >
                            <Send className="w-3 h-3" />
                            Enviar p/ Contabilidade
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* VISÃO MOBILE: Cards responsivos estruturados */}
          <div className="md:hidden divide-y divide-slate-100 bg-slate-50/40 p-3 space-y-3">
            {linhas.map((item) => {
              const isChecked = linhasSelecionadasIds.includes(item.id)
              return (
                <div
                  key={`mobile-${item.id}`}
                  className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 transition-colors ${
                    isChecked ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'
                  }`}
                >
                  {/* Cabeçalho do Card Mobile: Checkbox + Material + Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => onToggleLinha(item.id)}
                        aria-label={`Selecionar ${item.material_code}`}
                        className="mt-1"
                      />
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
                    </div>
                    <div className="shrink-0">{getStatusBadge(item)}</div>
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

                  {/* Quantidade Produzida + Botões Ações */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
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

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onVisualizar(item)}
                        className="h-8 text-xs px-2.5 border-slate-300 text-slate-700 hover:text-[#004C97] hover:border-blue-300 hover:bg-blue-50/50 gap-1 font-semibold shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Visualizar
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onEnviarIndividual(item)}
                        disabled={isEnviando}
                        className="h-8 text-xs px-2.5 border-blue-200 text-[#004C97] hover:bg-[#004C97] hover:text-white gap-1 font-semibold shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar p/ Contabilidade
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default DadosIbgeTable
