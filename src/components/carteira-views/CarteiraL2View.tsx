import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, SlidersHorizontal } from 'lucide-react'
import { CarteiraItem } from '@/types/carteira-analise'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import { formatNumberPTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { CarteiraAnaliseEngine } from '@/services/carteira-analise-engine-unified'
import { AlertasIACarteiraCard } from './AlertasIACarteiraCard'

interface CarteiraL2ViewProps {
  itens: CarteiraItem[]
  entradasFuturas?: any[]
  onOpenMemoria: (item: CarteiraItem) => void
  onOpenDetalheMaterial?: (item: CarteiraItem) => void
}

export const CarteiraL2View: React.FC<CarteiraL2ViewProps> = ({
  itens,
  entradasFuturas = [],
  onOpenMemoria,
  onOpenDetalheMaterial,
}) => {
  const [filtroFamilia, setFiltroFamilia] = useState<string>('TODAS')
  const [mostrarColunasTemporais, setMostrarColunasTemporais] = useState(false)

  const itensL2 = itens.filter(
    (i) =>
      i.linha === 'L2' ||
      ['R', 'Q', 'B', 'S'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
  )

  const itensFiltrados = itensL2.filter((i) => {
    if (filtroFamilia !== 'TODAS' && i.familia !== filtroFamilia) return false
    return true
  })

  // Análise automática Alertas & IA da Carteira L2
  const analiseL2 = React.useMemo(() => {
    return CarteiraAnaliseEngine.analisarCarteiraGenerica('L2', itens, entradasFuturas)
  }, [itens, entradasFuturas])

  return (
    <div className="space-y-4">
      {/* Alertas & IA • Análise Automática da Carteira L2 */}
      <AlertasIACarteiraCard
        nomeCarteira="Carteira L2"
        subtitulo="Diagnóstico preditivo em tempo real • Laminação de Perfis Pesados e Blocos • Linha L2"
        indicadores={analiseL2.indicadores}
        alertas={analiseL2.alertas}
        analisesIA={analiseL2.analisesIA}
        onFiltrarMaterial={(mat) => {
          const item = itensL2.find((i) => i.codigo_material === mat)
          if (item && onOpenDetalheMaterial) onOpenDetalheMaterial(item)
        }}
      />

      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Painel Ciclo L2 &bull; Laminação de Perfis Pesados e Blocos
            </h3>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
              Substitui Planilha Ciclo L2
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Particularidade L2: Separação estrita de Semiacabado CIAFAL, Semiacabado Vallourec e
            ZSD24.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-amber-800 bg-amber-50 border-amber-300 text-xs font-semibold"
          >
            Regra Legada Ciclo L2 &bull; Sujeita a validação do PCP
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMostrarColunasTemporais(!mostrarColunasTemporais)}
            className={`h-7 text-xs gap-1 border-slate-300 ${
              mostrarColunasTemporais
                ? 'bg-blue-50 text-[#004C97] font-bold border-blue-300'
                : 'text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Colunas: Cobertura Temporal</span>
          </Button>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px]">
              <tr>
                <th className="p-2.5">Material</th>
                <th className="p-2.5">Descrição</th>
                <th className="p-2.5 text-center">Família</th>
                <th className="p-2.5 text-right">ZSD24 (t)</th>
                <th className="p-2.5 text-right">Carteira Vendas</th>
                <th className="p-2.5 text-right">Estoque Livre</th>
                <th className="p-2.5 text-right">Semi CIAFAL</th>
                <th className="p-2.5 text-right">Semi Vallourec</th>
                <th className="p-2.5 text-right">Carteira Negativa</th>
                <th className="p-2.5 text-right">Saldo Estoque</th>
                {mostrarColunasTemporais && (
                  <>
                    <th className="p-2.5 text-right bg-blue-900/40">Média (t/d)</th>
                    <th className="p-2.5 text-right bg-blue-900/40">Cobertura</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Fim Estoque</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Próx. Reposição</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Gap Dias</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Status Temporal</th>
                  </>
                )}
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensFiltrados.map((it, idx) => {
                const inputTemp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
                  it,
                  'L2',
                  entradasFuturas,
                )
                const resTemp = CoberturaTemporalEngine.calcular(inputTemp)

                return (
                  <tr
                    key={idx}
                    onClick={() =>
                      onOpenDetalheMaterial ? onOpenDetalheMaterial(it) : onOpenMemoria(it)
                    }
                    className="hover:bg-blue-50/40 text-[11px] cursor-pointer"
                  >
                    <td className="p-2.5 font-mono font-bold text-slate-900">
                      {it.codigo_material}
                    </td>
                    <td className="p-2.5 text-slate-700 max-w-[200px] truncate">
                      {it.descricao_material}
                    </td>
                    <td className="p-2.5 text-center font-semibold text-slate-600">{it.familia}</td>
                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {formatNumberPTBR(it.zsd24_tons ?? it.carteira_aberta_tons, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-800">
                      {formatNumberPTBR(it.carteira_aberta_tons, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {formatNumberPTBR(it.estoque_livre_tons, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-[#004C97]">
                      {formatNumberPTBR(
                        it.estoque_semiacabado_ciafal_tons || it.estoque_semiacabado_tons || 0,
                        2,
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono text-purple-800">
                      {formatNumberPTBR(it.estoque_semiacabado_vallourec_tons || 0, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                      {it.saldo_negativo_tons < 0
                        ? formatNumberPTBR(it.saldo_negativo_tons, 2)
                        : '-'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      {it.saldo_positivo_tons > 0
                        ? `+${formatNumberPTBR(it.saldo_positivo_tons, 2)}`
                        : '-'}
                    </td>
                    {mostrarColunasTemporais && (
                      <>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {resTemp.mediaDiariaFaturamentoT
                            ? formatNumberPTBR(resTemp.mediaDiariaFaturamentoT, 2)
                            : 'N/D'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                          {resTemp.diasCoberturaFormatado}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-700">
                          {resTemp.dataFimEstoqueFormatada}
                        </td>
                        <td
                          className="p-2.5 text-center font-mono text-[10px] text-blue-900 truncate max-w-[120px]"
                          title={resTemp.proximaDataPrevistaFormatada}
                        >
                          {resTemp.proximaDataPrevistaFormatada}
                        </td>
                        <td
                          className={`p-2.5 text-center font-mono font-bold ${resTemp.temGapRuptura ? 'text-rose-700' : 'text-emerald-700'}`}
                        >
                          {resTemp.diasEstoqueNegativoFormatado}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[9px] font-bold border ${resTemp.badgeCor.bg} ${resTemp.badgeCor.text} ${resTemp.badgeCor.border}`}
                          >
                            {resTemp.status}
                          </Badge>
                        </td>
                      </>
                    )}
                    <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onOpenDetalheMaterial ? onOpenDetalheMaterial(it) : onOpenMemoria(it)
                        }
                        className="h-6 px-1.5 text-[10px] text-[#004C97] hover:bg-blue-50 font-semibold gap-1"
                        title="Ver detalhe com Cobertura Temporal & Previsão"
                      >
                        <Eye className="w-3 h-3" /> Detalhe
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default CarteiraL2View
