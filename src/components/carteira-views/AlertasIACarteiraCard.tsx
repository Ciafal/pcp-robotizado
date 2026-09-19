import React from 'react'
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Layers,
  Factory,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertaCarteiraItem,
  IndicadoresCarteira,
  SeveridadeAlertaCarteira,
} from '@/services/carteira-analise-engine-unified'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

interface AlertasIACarteiraCardProps {
  nomeCarteira: string // ex: "Carteira Geral", "Carteira L1", "Carteira MTO", etc.
  subtitulo?: string
  indicadores?: IndicadoresCarteira
  alertas: AlertaCarteiraItem[]
  analisesIA: string[]
  onFiltrarMaterial?: (material: string) => void
  onCardClick?: (tipoCard: string) => void
  cardAtivo?: string
}

export const AlertasIACarteiraCard: React.FC<AlertasIACarteiraCardProps> = ({
  nomeCarteira,
  subtitulo,
  indicadores,
  alertas,
  analisesIA,
  onFiltrarMaterial,
  onCardClick,
  cardAtivo,
}) => {
  const getBadgeClassificacao = (classe: SeveridadeAlertaCarteira) => {
    switch (classe) {
      case 'CRITICO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold gap-1 shrink-0">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            CRÍTICO
          </Badge>
        )
      case 'ATENCAO':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold gap-1 shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            ATENÇÃO
          </Badge>
        )
      case 'POSITIVO':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            POSITIVO
          </Badge>
        )
      case 'INFORMATIVO':
      default:
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[10px] font-bold gap-1 shrink-0">
            <Info className="w-3 h-3 text-[#004C97]" />
            INFORMATIVO
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-3">
      {/* 1. SEÇÃO DE CARDS DE INDICADORES (quando fornecidos) */}
      {indicadores && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Carteira Total */}
          <div
            onClick={() => onCardClick?.('CARTEIRA_TOTAL')}
            className={`p-3 bg-white rounded-xl border cursor-pointer shadow-xs transition-all ${
              cardAtivo === 'CARTEIRA_TOTAL'
                ? 'border-[#004C97] ring-1 ring-[#004C97]'
                : 'border-slate-200 hover:border-blue-400'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
              Carteira Total
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <strong className="text-base sm:text-lg font-bold font-mono text-slate-900">
                {formatNumberPTBR(indicadores.carteiraTotal_t, 2)}
              </strong>
              <span className="text-xs font-semibold text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              {indicadores.totalItens} itens
            </span>
          </div>

          {/* Estoque Total */}
          <div
            onClick={() => onCardClick?.('ESTOQUE_TOTAL')}
            className={`p-3 bg-white rounded-xl border cursor-pointer shadow-xs transition-all ${
              cardAtivo === 'ESTOQUE_TOTAL'
                ? 'border-emerald-500 ring-1 ring-emerald-500'
                : 'border-emerald-200 hover:border-emerald-400'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-emerald-700 block truncate">
              Estoque Disponível
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <strong className="text-base sm:text-lg font-bold font-mono text-emerald-700">
                {formatNumberPTBR(indicadores.estoqueTotal_t, 2)}
              </strong>
              <span className="text-xs font-semibold text-emerald-600">t</span>
            </div>
            <span className="text-[10px] text-emerald-600 block mt-0.5 truncate">
              Físico apurado
            </span>
          </div>

          {/* Déficit Atual */}
          <div
            onClick={() => onCardClick?.('DEFICIT_ATUAL')}
            className={`p-3 rounded-xl border cursor-pointer shadow-xs transition-all ${
              cardAtivo === 'DEFICIT_ATUAL'
                ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400'
                : 'bg-white border-rose-200 hover:border-rose-400'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-rose-700 block truncate">
              Déficit Atual (-)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <strong className="text-base sm:text-lg font-bold font-mono text-rose-700">
                {formatNumberPTBR(indicadores.deficitAtual_t, 2)}
              </strong>
              <span className="text-xs font-semibold text-rose-600">t</span>
            </div>
            <span className="text-[10px] text-rose-600 block mt-0.5 truncate">
              Demanda sem estoque
            </span>
          </div>

          {/* Itens com Déficit */}
          <div
            onClick={() => onCardClick?.('ITENS_DEFICIT')}
            className={`p-3 bg-white rounded-xl border cursor-pointer shadow-xs transition-all ${
              cardAtivo === 'ITENS_DEFICIT'
                ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/40'
                : 'border-rose-200 hover:border-rose-400'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-rose-700 block truncate">
              Itens com Déficit
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <strong className="text-base sm:text-lg font-bold font-mono text-rose-700">
                {indicadores.itensComDeficit_count}
              </strong>
              <span className="text-xs font-semibold text-rose-600">itens</span>
            </div>
            <span className="text-[10px] text-rose-600 block mt-0.5 truncate">
              Necessitam cobertura
            </span>
          </div>

          {/* Em Produção / Programado */}
          <div
            onClick={() => onCardClick?.('EM_PRODUCAO')}
            className={`p-3 rounded-xl border cursor-pointer shadow-xs transition-all ${
              cardAtivo === 'EM_PRODUCAO'
                ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400'
                : 'bg-white border-indigo-200 hover:border-indigo-400'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-indigo-700 block truncate">
              Em Produção
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <strong className="text-base sm:text-lg font-bold font-mono text-indigo-700">
                {formatNumberPTBR(indicadores.emProducao_t, 2)}
              </strong>
              <span className="text-xs font-semibold text-indigo-600">t</span>
            </div>
            <span className="text-[10px] text-indigo-600 block mt-0.5 truncate">
              OP / Programação PCP
            </span>
          </div>

          {/* Cobertura Programada */}
          <div
            onClick={() => onCardClick?.('COBERTURA_PROGRAMADA')}
            className={`p-3 bg-white rounded-xl border cursor-pointer shadow-xs transition-all ${
              cardAtivo === 'COBERTURA_PROGRAMADA'
                ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50/40'
                : 'border-blue-200 hover:border-blue-400'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-[#004C97] block truncate">
              Cobertura Programada
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <strong className="text-base sm:text-lg font-bold font-mono text-[#004C97]">
                {formatNumberPTBR(indicadores.coberturaProgramada_t, 2)}
              </strong>
              <span className="text-xs font-semibold text-[#004C97]">t</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
              Saldo proj. ≥ 0
            </span>
          </div>

          {/* Itens Críticos */}
          <div
            onClick={() => onCardClick?.('ITENS_CRITICOS')}
            className={`p-3 bg-white rounded-xl border cursor-pointer shadow-xs transition-all ${
              cardAtivo === 'ITENS_CRITICOS'
                ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/60'
                : 'border-amber-200 hover:border-rose-400'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-rose-700 block truncate">
              Itens Críticos
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <strong className="text-base sm:text-lg font-bold font-mono text-rose-700">
                {indicadores.itensCriticos_count}
              </strong>
              <span className="text-xs font-semibold text-rose-600">itens</span>
            </div>
            <span className="text-[10px] text-rose-600 block mt-0.5 truncate">
              Sem prog / Ruptura
            </span>
          </div>
        </div>
      )}

      {/* 2. BLOCO DE ALERTAS & IA CONFORME REFERÊNCIA FUNCIONAL SDC */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#004C97] text-white rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-none">
                Alertas & IA &bull; Análise Automática da {nomeCarteira}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {subtitulo ||
                  'Diagnóstico preditivo em tempo real &bull; Detecção de déficit, ruptura e cobertura PCP'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">Motor IA Ativo</Badge>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
              {alertas.length} alertas detectados
            </span>
          </div>
        </div>

        {/* Análises diagnósticas geradas automaticamente */}
        {analisesIA.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            {analisesIA.map((msg, idx) => (
              <div
                key={idx}
                className="text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-blue-100 flex items-start gap-2 shadow-xs"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-normal">{msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Grid dos Alertas Detalhados da Carteira */}
        {alertas.length > 0 && (
          <div className="pt-1">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Alertas e Materiais em Foco ({alertas.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {alertas.slice(0, 6).map((al) => (
                <div
                  key={al.id}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      {getBadgeClassificacao(al.classificacao)}
                      <span className="font-mono text-slate-800 font-bold text-xs truncate">
                        {al.material}
                      </span>
                    </div>

                    {al.descricao && (
                      <p className="text-[10px] text-slate-500 truncate" title={al.descricao}>
                        {al.descricao}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-700 leading-snug">{al.mensagem}</p>
                  </div>

                  {onFiltrarMaterial && (
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onFiltrarMaterial(al.material)}
                        className="h-6 px-1.5 text-[10px] text-[#004C97] hover:bg-blue-50 font-semibold"
                      >
                        Filtrar Item <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-2 bg-white/70 rounded-lg border border-blue-100 text-[10px] text-slate-600 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            Classificação determinística: CRÍTICO &bull; ATENÇÃO &bull; INFORMATIVO &bull; POSITIVO
          </span>
          <span className="font-mono text-slate-400 text-[9px]">PCP Robotizado &bull; pt-BR</span>
        </div>
      </div>
    </div>
  )
}

export default AlertasIACarteiraCard
