import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, BarChart3, HelpCircle } from 'lucide-react'
import {
  IndicadorMatrizLinha,
  MESES_ANO,
  formatarValorPtBr,
} from '@/services/pcp-indicadores-service'

interface MatrizAnualIndicadoresProps {
  linhas: IndicadorMatrizLinha[]
  ano: number
  onAbrirDetalhe: (linha: IndicadorMatrizLinha) => void
  carregando?: boolean
}

export const MatrizAnualIndicadores: React.FC<MatrizAnualIndicadoresProps> = ({
  linhas,
  ano,
  onAbrirDetalhe,
  carregando = false,
}) => {
  return (
    <Card className="border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Cabeçalho com Legenda Oficial Ciafal */}
      <div className="px-3.5 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#004C97]" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Matriz Anual Jan–Dez/{ano} — Grade Corporativa Consolidada
          </span>
        </div>

        {/* Legenda de Status Obrigatória */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-500 font-semibold text-[11px] uppercase">Legenda:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            <span className="text-slate-700 text-[11px] font-medium">Atingida</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
            <span className="text-slate-700 text-[11px] font-medium">Fora da Meta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-2 ring-slate-100" />
            <span className="text-slate-700 text-[11px] font-medium">
              Meta Pendente / Sem dados
            </span>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Container com rolagem horizontal interna exclusiva */}
        <div className="overflow-x-auto w-full relative max-h-[72vh] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse border-spacing-0 select-text">
            {/* Cabeçalho Fixo (Sticky) */}
            <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs shadow-2xs border-b border-slate-200 text-slate-700">
              <tr>
                {/* Coluna 1: Indicador (Sticky lateral) */}
                <th className="sticky left-0 z-30 bg-slate-100/95 px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[11px] min-w-[260px] max-w-[280px] border-r border-slate-200 shadow-xs">
                  Indicador
                </th>
                <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px] text-right min-w-[80px]">
                  Meta
                </th>
                <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px] text-center min-w-[70px]">
                  Regra
                </th>
                {/* Colunas Mensais: Jan a Dez */}
                {MESES_ANO.map((m) => (
                  <th
                    key={m.index}
                    className="px-2 py-3 font-bold uppercase tracking-wider text-[11px] text-center min-w-[58px]"
                  >
                    {m.curto}
                  </th>
                ))}
                {/* Coluna de Ação */}
                <th className="px-3 py-3 font-bold uppercase tracking-wider text-[11px] text-center min-w-[65px] border-l border-slate-200">
                  Ação
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr>
                  <td colSpan={16} className="text-center py-12 text-slate-500 text-xs">
                    Carregando matriz anual de indicadores PCP...
                  </td>
                </tr>
              ) : linhas.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-center py-12 text-slate-500 text-xs italic">
                    Nenhum indicador encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                linhas.map((linha, idx) => {
                  const ind = linha.indicador
                  return (
                    <tr
                      key={ind.id || ind.codigo}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Coluna 1: Indicador (Sticky First Column) */}
                      <td className="sticky left-0 z-10 bg-inherit px-3 sm:px-4 py-2.5 border-r border-slate-200 shadow-xs">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 line-clamp-1 hover:text-[#004C97]">
                              {ind.nome}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {ind.codigo} • {ind.unidade}
                          </span>
                        </div>
                      </td>

                      {/* Coluna 2: Meta */}
                      <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-700">
                        {formatarValorPtBr(ind.meta, ind.unidade)}
                      </td>

                      {/* Coluna 3: Regra */}
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-600">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200">
                          {ind.regra_comparacao}
                        </span>
                      </td>

                      {/* Colunas 4-15: Jan–Dez com Cores Automáticas por Status */}
                      {linha.meses.map((m) => {
                        let celulaBg = 'bg-slate-50/60 text-slate-400' // Neutro / Sem dados / Pendente
                        let celulaBorder = 'border-slate-200/40'

                        if (m.status === 'ATINGIDA') {
                          celulaBg = 'bg-emerald-50 text-emerald-800 font-bold'
                          celulaBorder = 'border-emerald-200'
                        } else if (m.status === 'FORA_DA_META') {
                          celulaBg = 'bg-rose-50 text-rose-800 font-bold'
                          celulaBorder = 'border-rose-200'
                        }

                        return (
                          <td
                            key={m.mesIndex}
                            className="p-1 text-center font-mono align-middle"
                            title={`${m.mesNomeLongo}: ${formatarValorPtBr(m.realizado, ind.unidade)} (Meta: ${ind.regra_comparacao} ${formatarValorPtBr(ind.meta, ind.unidade)})`}
                          >
                            <div
                              className={`h-7 flex items-center justify-center rounded text-[11px] border ${celulaBg} ${celulaBorder} transition-colors`}
                            >
                              {formatarValorPtBr(m.realizado)}
                            </div>
                          </td>
                        )
                      })}

                      {/* Coluna 16: Ação (Ícone de Engrenagem) */}
                      <td className="px-2 py-2.5 text-center border-l border-slate-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onAbrirDetalhe(linha)}
                          title={`Ver detalhamento e análise de ${ind.nome}`}
                          className="h-7 w-7 text-slate-600 hover:text-[#004C97] hover:bg-blue-50 rounded"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé Informativo da Matriz */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Valores calculados de registros reais consolidados. Indicadores sem apontamentos no
              mês são exibidos como "—".
            </span>
          </div>
          <div className="font-mono text-slate-600">
            Total de Indicadores Cadastrados: {linhas.length}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
export default MatrizAnualIndicadores
