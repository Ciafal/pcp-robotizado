import React from 'react'
import { Card } from '@/components/ui/card'
import { Layers, AlertTriangle } from 'lucide-react'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'
import { CarteiraItem } from '@/types/carteira-analise'

/**
 * Tooltip oficial do card Saldo Semiacabado (spec verbatim do usuário).
 */
export const TOOLTIP_SALDO_SEMIACABADO =
  'Saldo disponível de materiais semiacabados aplicáveis à carteira selecionada'

/**
 * Composição oficial do saldo semiacabado de um item de carteira:
 * Semi CIAFAL (ou campo consolidado) + Semi Vallourec.
 * Sem dupla contagem: usa _ciafal quando presente, senão o consolidado.
 */
export function saldoSemiacabadoItemTons(it: CarteiraItem): number {
  return (
    (it.estoque_semiacabado_ciafal_tons ?? it.estoque_semiacabado_tons ?? 0) +
    (it.estoque_semiacabado_vallourec_tons ?? 0)
  )
}

/**
 * Agregação padrão (total em toneladas + contagem de materiais com saldo > 0).
 */
export function agregarSaldoSemiacabado(itens: CarteiraItem[]): {
  totalTons: number
  materiaisCount: number
} {
  let totalTons = 0
  let materiaisCount = 0
  itens.forEach((it) => {
    const t = saldoSemiacabadoItemTons(it)
    if (t > 0) {
      totalTons += t
      materiaisCount += 1
    }
  })
  return { totalTons, materiaisCount }
}

interface SaldoSemiacabadoCardProps {
  /** Saldo em toneladas (formatado pt-BR com 2 decimais). */
  valorTons?: number
  /** Quantidade de materiais envolvidos (saldo semiacabado > 0). */
  materiaisCount?: number
  /** Quando a fonte SAP/RFC não disponibiliza o dado — nunca exibir 0,00 t silencioso. */
  indisponivel?: boolean
  /** Nota curta de composição exibida no rodapé do card. */
  notaComposicao?: string
  /** data-testid específico da visão. */
  testid?: string
}

/**
 * Card executivo "Saldo Semiacabado" — padrão visual dos cards de estoque das visões
 * de carteira (L1, L2, Geral e SDC). Não abre drill-down nesta fase.
 */
export const SaldoSemiacabadoCard: React.FC<SaldoSemiacabadoCardProps> = ({
  valorTons,
  materiaisCount,
  indisponivel = false,
  notaComposicao,
  testid,
}) => {
  return (
    <Card
      data-testid={testid || 'card-saldo-semiacabado'}
      title={TOOLTIP_SALDO_SEMIACABADO}
      className="p-3 bg-white rounded-xl border border-sky-200 hover:border-[#004C97] shadow-xs transition-all flex flex-col justify-between min-w-0 group"
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] uppercase font-bold text-slate-600 group-hover:text-[#004C97] block leading-tight transition-colors">
          Saldo Semiacabado
        </span>
        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </div>
      <div className="flex items-baseline gap-1 mt-1 min-h-[26px]">
        {indisponivel ? (
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 leading-snug py-0.5"
            title="Não foi possível atualizar este indicador através da integração SAP/RFC."
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>Dados SAP indisponíveis</span>
          </div>
        ) : (
          <>
            <strong className="text-base sm:text-lg font-bold font-mono text-[#004C97] tracking-tight">
              {formatNumberPTBR(valorTons ?? 0, 2)}
            </strong>
            <span className="text-xs font-semibold text-[#004C97]">t</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-medium gap-2">
        <span>{materiaisCount !== undefined ? `${materiaisCount} materiais` : ''}</span>
        {notaComposicao && (
          <span className="text-[9px] text-right truncate" title={notaComposicao}>
            {notaComposicao}
          </span>
        )}
      </div>
    </Card>
  )
}
export default SaldoSemiacabadoCard
