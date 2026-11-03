import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, BarChart3, HelpCircle } from 'lucide-react'
import {
  IndicadorMatrizLinha,
  MESES_ANO,
  formatarValorPtBr,
} from '@/services/pcp-indicadores-service'

/**
 * Tokens de Z-Index centralizados para a Matriz Corporativa.
 * Garante a regra rigorosa de camadas e integridade física contra sobreposição:
 * - Camada 0: Células roláveis do corpo (Jan–Dez e Ação)
 * - Camada 10: Colunas fixas do corpo (Indicador, Meta, Regra)
 * - Camada 20: Cabeçalho rolável dos meses (Sticky Top)
 * - Camada 30: Interseção cabeçalho + colunas congeladas (Sticky Top + Left)
 */
export const MATRIZ_Z_INDEX = {
  BASE: 'z-0',
  STICKY_BODY: 'z-10',
  STICKY_HEADER: 'z-20',
  STICKY_CORNER: 'z-30',
} as const

/**
 * Larguras e posições 'left' acumuladas fixas das 3 colunas congeladas:
 * 1. Indicador: 260px (left 0)
 * 2. Meta: 90px (left 260px)
 * 3. Regra: 70px (left 350px)
 * Total congelado: 420px
 */
export const MATRIZ_COL_CONFIG = {
  INDICADOR_WIDTH: 260,
  META_WIDTH: 90,
  REGRA_WIDTH: 70,
  INDICADOR_LEFT: 0,
  META_LEFT: 260,
  REGRA_LEFT: 350,
} as const

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
      <div className="px-3.5 sm:px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
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
        {/* Container com rolagem horizontal interna exclusiva (overflow isolado na matriz) */}
        <div
          data-testid="matriz-scroll-container"
          className="overflow-x-auto w-full relative max-h-[72vh] overflow-y-auto"
        >
          {/* border-separate com border-spacing-0 garante comportamento estável de colunas sticky sem sangramento */}
          <table className="w-full text-xs text-left border-separate border-spacing-0 select-text">
            {/* Cabeçalho Fixo (Sticky Top) */}
            <thead>
              <tr className="text-slate-700">
                {/* Coluna 1: Indicador (Sticky Top + Left: 0) */}
                <th
                  data-testid="th-indicador"
                  style={{
                    left: `${MATRIZ_COL_CONFIG.INDICADOR_LEFT}px`,
                    width: `${MATRIZ_COL_CONFIG.INDICADOR_WIDTH}px`,
                    minWidth: `${MATRIZ_COL_CONFIG.INDICADOR_WIDTH}px`,
                    maxWidth: `${MATRIZ_COL_CONFIG.INDICADOR_WIDTH}px`,
                  }}
                  className={`sticky top-0 ${MATRIZ_Z_INDEX.STICKY_CORNER} bg-[#f1f5f9] px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[11px] border-b border-r border-slate-200 text-left`}
                >
                  Indicador
                </th>

                {/* Coluna 2: Meta (Sticky Top + Left: 260px) - Destaque visual isolado sem sombra sobreposta */}
                <th
                  data-testid="th-meta"
                  style={{
                    left: `${MATRIZ_COL_CONFIG.META_LEFT}px`,
                    width: `${MATRIZ_COL_CONFIG.META_WIDTH}px`,
                    minWidth: `${MATRIZ_COL_CONFIG.META_WIDTH}px`,
                    maxWidth: `${MATRIZ_COL_CONFIG.META_WIDTH}px`,
                  }}
                  className={`sticky top-0 ${MATRIZ_Z_INDEX.STICKY_CORNER} bg-[#f1f5f9] px-3 py-3 font-bold uppercase tracking-wider text-[11px] text-right border-b border-r border-slate-200 text-slate-800`}
                >
                  Meta
                </th>

                {/* Coluna 3: Regra (Sticky Top + Left: 350px) - Borda divisória nítida com sombra contida à direita */}
                <th
                  data-testid="th-regra"
                  style={{
                    left: `${MATRIZ_COL_CONFIG.REGRA_LEFT}px`,
                    width: `${MATRIZ_COL_CONFIG.REGRA_WIDTH}px`,
                    minWidth: `${MATRIZ_COL_CONFIG.REGRA_WIDTH}px`,
                    maxWidth: `${MATRIZ_COL_CONFIG.REGRA_WIDTH}px`,
                  }}
                  className={`sticky top-0 ${MATRIZ_Z_INDEX.STICKY_CORNER} bg-[#f1f5f9] px-2 py-3 font-bold uppercase tracking-wider text-[11px] text-center border-b border-r-2 border-slate-300 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]`}
                >
                  Regra
                </th>

                {/* Colunas Mensais: Jan a Dez (Sticky Top apenas, rolam livremente sob as fixas) */}
                {MESES_ANO.map((m) => (
                  <th
                    key={m.index}
                    className={`sticky top-0 ${MATRIZ_Z_INDEX.STICKY_HEADER} bg-[#f1f5f9] px-2 py-3 font-bold uppercase tracking-wider text-[11px] text-center min-w-[62px] border-b border-slate-200`}
                  >
                    {m.curto}
                  </th>
                ))}

                {/* Coluna de Ação */}
                <th
                  className={`sticky top-0 ${MATRIZ_Z_INDEX.STICKY_HEADER} bg-[#f1f5f9] px-3 py-3 font-bold uppercase tracking-wider text-[11px] text-center min-w-[65px] border-b border-l border-slate-200`}
                >
                  Ação
                </th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={16} className="text-center py-12 text-slate-500 text-xs bg-white">
                    Carregando matriz anual de indicadores PCP...
                  </td>
                </tr>
              ) : linhas.length === 0 ? (
                <tr>
                  <td
                    colSpan={16}
                    className="text-center py-12 text-slate-500 text-xs italic bg-white"
                  >
                    Nenhum indicador encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                linhas.map((linha, idx) => {
                  const ind = linha.indicador
                  // Fundos 100% sólidos sem transparência ou canal alfa (impedem renderização sobreposta)
                  const solidBg = idx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#f8fafc]'

                  return (
                    <tr key={ind.id || ind.codigo} className="group transition-colors">
                      {/* Coluna 1: Indicador (Sticky Left: 0) - Fundo 100% opaco */}
                      <td
                        data-testid={`td-indicador-${ind.codigo}`}
                        style={{
                          left: `${MATRIZ_COL_CONFIG.INDICADOR_LEFT}px`,
                          width: `${MATRIZ_COL_CONFIG.INDICADOR_WIDTH}px`,
                          minWidth: `${MATRIZ_COL_CONFIG.INDICADOR_WIDTH}px`,
                          maxWidth: `${MATRIZ_COL_CONFIG.INDICADOR_WIDTH}px`,
                        }}
                        className={`sticky ${MATRIZ_Z_INDEX.STICKY_BODY} ${solidBg} group-hover:bg-[#f1f5f9] px-3 sm:px-4 py-2.5 border-b border-r border-slate-200 transition-colors`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 line-clamp-1 group-hover:text-[#004C97] transition-colors">
                              {ind.nome}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {ind.codigo} • {ind.unidade}
                          </span>
                        </div>
                      </td>

                      {/* Coluna 2: Meta (Sticky Left: 260px) - Fundo 100% opaco, alinhamento à direita, destaque limpo */}
                      <td
                        data-testid={`td-meta-${ind.codigo}`}
                        style={{
                          left: `${MATRIZ_COL_CONFIG.META_LEFT}px`,
                          width: `${MATRIZ_COL_CONFIG.META_WIDTH}px`,
                          minWidth: `${MATRIZ_COL_CONFIG.META_WIDTH}px`,
                          maxWidth: `${MATRIZ_COL_CONFIG.META_WIDTH}px`,
                        }}
                        className={`sticky ${MATRIZ_Z_INDEX.STICKY_BODY} ${solidBg} group-hover:bg-[#f1f5f9] px-3 py-2.5 text-right font-mono font-semibold text-slate-800 border-b border-r border-slate-200 transition-colors`}
                      >
                        {formatarValorPtBr(ind.meta, ind.unidade)}
                      </td>

                      {/* Coluna 3: Regra (Sticky Left: 350px) - Fundo 100% opaco, divisor nítido com Jan */}
                      <td
                        data-testid={`td-regra-${ind.codigo}`}
                        style={{
                          left: `${MATRIZ_COL_CONFIG.REGRA_LEFT}px`,
                          width: `${MATRIZ_COL_CONFIG.REGRA_WIDTH}px`,
                          minWidth: `${MATRIZ_COL_CONFIG.REGRA_WIDTH}px`,
                          maxWidth: `${MATRIZ_COL_CONFIG.REGRA_WIDTH}px`,
                        }}
                        className={`sticky ${MATRIZ_Z_INDEX.STICKY_BODY} ${solidBg} group-hover:bg-[#f1f5f9] px-2 py-2.5 text-center font-mono border-b border-r-2 border-slate-300 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] transition-colors`}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                          {ind.regra_comparacao}
                        </span>
                      </td>

                      {/* Colunas 4-15: Jan–Dez (Camada Base Z-0 - Rolam sob as colunas congeladas) */}
                      {linha.meses.map((m) => {
                        let celulaBg = 'bg-slate-50 text-slate-400'
                        let celulaBorder = 'border-slate-200/60'

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
                            className={`relative ${MATRIZ_Z_INDEX.BASE} ${solidBg} group-hover:bg-[#f1f5f9] p-1 text-center font-mono align-middle border-b border-slate-100 transition-colors`}
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
                      <td
                        className={`relative ${MATRIZ_Z_INDEX.BASE} ${solidBg} group-hover:bg-[#f1f5f9] px-2 py-2.5 text-center border-b border-l border-slate-200 transition-colors`}
                      >
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
