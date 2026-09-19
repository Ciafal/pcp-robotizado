import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  AlertTriangle,
  Bot,
  ChevronRight,
  ShieldCheck,
  TrendingDown,
  Layers,
  Flame,
} from 'lucide-react'
import { CurvaAbcResultadoConsolidado } from '@/services/curva-abc-faturamento-engine'
import { formatNumberPTBR, formatCurrencyPTBR, formatPercentagePTBR } from '@/lib/formatters-ptbr'

interface PortfolioAISectionProps {
  resultadoABC: CurvaAbcResultadoConsolidado
  onFiltrarMaterial?: (material: string) => void
  onOpenCurvaAbcModal?: () => void
}

export const PortfolioAISection: React.FC<PortfolioAISectionProps> = ({
  resultadoABC,
  onFiltrarMaterial,
  onOpenCurvaAbcModal,
}) => {
  const {
    itens,
    resumoA,
    faturamentoTotal_brl,
    tonelagemTotal_t,
    alertasPrioritariosCurvaA,
    parametrosAplicados,
    fonteFaturamentoParametrizada,
  } = resultadoABC

  // Cálculos consolidados para a análise IA
  const itensComDeficit = itens.filter((i) => i.deficit_tons > 0)
  const itensSemProgramacao = itens.filter((i) => i.deficit_tons > 0 && i.programado_tons === 0)
  const itensCriticos = itens.filter((i) => i.risco === 'CRITICO')
  const itensCurvaA = itens.filter((i) => i.curva_abc === 'A')
  const curvaAEmRisco = itensCurvaA.filter((i) => i.deficit_tons > 0 && i.saldo_projetado_tons < 0)
  const curvaAExposicao = curvaAEmRisco.reduce((acc, i) => acc + i.faturamento_brl, 0)
  const curvaAPercentualFat =
    faturamentoTotal_brl > 0 ? (curvaAExposicao / faturamentoTotal_brl) * 100 : 0

  // Diagnósticos automáticos consolidados
  const diagnosticos: {
    titulo: string
    descricao: string
    severidade: 'CRITICO' | 'ALERTA' | 'INFO'
    material?: string
  }[] = []

  // 1. Alerta Prioritário Curva A
  if (curvaAEmRisco.length > 0) {
    diagnosticos.push({
      titulo: 'Curva A Comercial em Risco de Ruptura',
      descricao: `Existem ${curvaAEmRisco.length} materiais Curva A com risco de ruptura nos próximos 7 dias. Esses itens representam ${formatPercentagePTBR(
        curvaAPercentualFat,
        2,
      )} do faturamento analisado (${formatCurrencyPTBR(curvaAExposicao)}).`,
      severidade: 'CRITICO',
      material: curvaAEmRisco[0]?.codigo_material,
    })
  }

  // 2. Materiais com déficit sem programação PCP
  if (itensSemProgramacao.length > 0) {
    const deficitSemProgT = itensSemProgramacao.reduce((acc, i) => acc + i.deficit_tons, 0)
    diagnosticos.push({
      titulo: 'Déficits sem Programação Industrial Vinculada',
      descricao: `${itensSemProgramacao.length} produtos apresentam déficit físico somando ${formatNumberPTBR(
        deficitSemProgT,
        2,
      )} t sem nenhuma ordem de produção (OP) programada no sequenciamento ativo.`,
      severidade: 'ALERTA',
      material: itensSemProgramacao[0]?.codigo_material,
    })
  }

  // 3. Concentração comercial da carteira
  diagnosticos.push({
    titulo: 'Concentração Comercial da Carteira (Pareto)',
    descricao: `A Curva A concentra ${formatPercentagePTBR(
      resumoA.percentual_faturamento,
      2,
    )} do faturamento (${formatCurrencyPTBR(resumoA.faturamento_brl)}) em ${resumoA.quantidade_itens} materiais (${formatNumberPTBR(
      resumoA.toneladas,
      2,
    )} t). A estabilidade comercial depende da garantia de entrega desses itens prioritários.`,
    severidade: 'INFO',
  })

  // 4. Se a fonte SAP de faturamento está pendente de parametrização
  if (!fonteFaturamentoParametrizada) {
    diagnosticos.push({
      titulo: 'Parametrização da Fonte de Faturamento SAP',
      descricao:
        'Fonte de faturamento SAP pendente de parametrização. Os valores utilizam a tabela de preços médios por família da referência ZSD28C.',
      severidade: 'INFO',
    })
  }

  return (
    <Card className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border-blue-900 shadow-md overflow-hidden">
      <CardHeader className="p-4 pb-2 border-b border-blue-900/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                Alertas & IA &bull; Análise Automática da Carteira Geral
                <Badge className="bg-blue-600 text-white text-[9px] font-bold">
                  ZSD28C &bull; RFC
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-slate-300">
                Diagnóstico preditivo em tempo real cruzando Faturamento Comercial (Curva ABC),
                Déficits Físicos e Cobertura PCP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCurvaAbcModal && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenCurvaAbcModal}
                className="h-7 text-xs bg-blue-900/60 border-blue-400 text-blue-100 hover:bg-blue-800/80 font-bold gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-300" /> Curva ABC Detalhada
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Alertas Prioritários em Destaque do Motor Curva ABC */}
        {alertasPrioritariosCurvaA.length > 0 && (
          <div className="space-y-1.5">
            {alertasPrioritariosCurvaA.slice(0, 3).map((alerta, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-rose-950/80 border border-rose-500/70 rounded-lg text-rose-100 flex items-start gap-2 shadow-xs"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1 text-xs leading-relaxed font-sans font-medium">{alerta}</div>
              </div>
            ))}
          </div>
        )}

        {/* Grid de 3 Blocos Diagnósticos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {diagnosticos.map((d, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                d.severidade === 'CRITICO'
                  ? 'bg-rose-900/30 border-rose-700/60 text-rose-100'
                  : d.severidade === 'ALERTA'
                    ? 'bg-amber-900/30 border-amber-700/60 text-amber-100'
                    : 'bg-blue-900/30 border-blue-700/60 text-blue-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs">{d.titulo}</span>
                  <Badge
                    className={`text-[9px] font-bold ${
                      d.severidade === 'CRITICO'
                        ? 'bg-rose-600 text-white'
                        : d.severidade === 'ALERTA'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white'
                    }`}
                  >
                    {d.severidade}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-200 leading-relaxed mt-1 font-sans">
                  {d.descricao}
                </p>
              </div>

              {d.material && onFiltrarMaterial && (
                <button
                  onClick={() => onFiltrarMaterial(d.material!)}
                  className="mt-2 text-[10px] text-cyan-300 hover:text-cyan-100 font-bold inline-flex items-center gap-1 self-start pt-1"
                >
                  Filtrar material {d.material} <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
          <span>
            * A IA do HUB CIAFAL analisa padrões comerciais e sugere priorização industrial.
            Decisões de sequenciamento e emissão de OPs permanecem sob governança estrita do
            programador PCP.
          </span>
          <span className="text-slate-500 font-mono">Motor Curva ABC v2.0 • SAP ECC RFC</span>
        </div>
      </CardContent>
    </Card>
  )
}
export default PortfolioAISection
