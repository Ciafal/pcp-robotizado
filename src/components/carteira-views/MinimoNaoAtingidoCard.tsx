import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ArrowRight, HelpCircle } from 'lucide-react'
import { MinimoNaoAtingidoSummary } from '@/services/carteira-minimo-nao-atingido-engine'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

interface MinimoNaoAtingidoCardProps {
  summary: MinimoNaoAtingidoSummary
  onClick?: () => void
}

export const MinimoNaoAtingidoCard: React.FC<MinimoNaoAtingidoCardProps> = ({
  summary,
  onClick,
}) => {
  const {
    total_materiais_abaixo_minimo = 0,
    total_toneladas_faltantes = 0,
    total_toneladas_carteira_afetada = 0,
    total_materiais_sem_minimo_sap = 0,
    porCurvaAbc,
  } = summary

  const hasCriticos = total_materiais_abaixo_minimo > 0
  const hasSemParametrizacao = total_materiais_sem_minimo_sap > 0

  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${
        hasCriticos
          ? 'border-l-amber-500 bg-amber-50/20 hover:bg-amber-50/40 border-slate-200'
          : hasSemParametrizacao
            ? 'border-l-slate-400 bg-slate-50/40 hover:bg-slate-100/50 border-slate-200'
            : 'border-l-emerald-500 bg-emerald-50/10 hover:bg-emerald-50/30 border-slate-200'
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`p-1 rounded-md ${
                hasCriticos
                  ? 'bg-amber-100 text-amber-800'
                  : hasSemParametrizacao
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
              Mínimo não atingido
            </span>
          </div>

          <Badge
            variant="outline"
            className={`text-[9px] font-bold px-1.5 py-0 h-4 ${
              hasCriticos
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : hasSemParametrizacao
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            {hasCriticos
              ? `${total_materiais_abaixo_minimo} cód.`
              : hasSemParametrizacao
                ? `${total_materiais_sem_minimo_sap} s/ param.`
                : 'Conforme'}
          </Badge>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <div className="text-xl font-black font-mono tracking-tight text-slate-900">
              {formatNumberPTBR(total_materiais_abaixo_minimo, 0)}
              <span className="text-[11px] font-medium text-slate-500 ml-1">materiais</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {hasCriticos ? (
                <span>
                  Faltam{' '}
                  <strong className="text-amber-800 font-mono">
                    {formatNumberPTBR(total_toneladas_faltantes, 2)} t
                  </strong>{' '}
                  (carteira: {formatNumberPTBR(total_toneladas_carteira_afetada, 2)} t)
                </span>
              ) : (
                <span className="text-emerald-700 font-medium">Todos com mínimo SAP atingido</span>
              )}
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>

        {/* Linha de Apoio: Curva A e Itens sem parametrização SAP */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            {porCurvaAbc && porCurvaAbc.A.count > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 font-bold text-[9px]">
                {porCurvaAbc.A.count} Curva A
              </span>
            )}
            {hasSemParametrizacao && (
              <span
                className="inline-flex items-center gap-0.5 text-amber-700 font-medium"
                title="Códigos na carteira sem lote mínimo retornado da RFC SAP"
              >
                <HelpCircle className="w-3 h-3 text-amber-600 inline" />
                {total_materiais_sem_minimo_sap} sem retorno SAP
              </span>
            )}
          </div>
          <span className="text-[9px] text-slate-400">Origem: SAP / RFC</span>
        </div>
      </CardContent>
    </Card>
  )
}
