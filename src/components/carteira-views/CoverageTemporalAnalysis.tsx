import React, { useState } from 'react'
import {
  TrendingDown,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Calculator,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ResultadoCoberturaTemporal,
  CoberturaTemporalEngine,
  InputAnaliseCobertura,
} from '@/services/cobertura-temporal-engine'

interface CoverageTemporalAnalysisProps {
  analise?: ResultadoCoberturaTemporal
  input?: InputAnaliseCobertura
  compacto?: boolean
  className?: string
}

export const CoverageTemporalAnalysis: React.FC<CoverageTemporalAnalysisProps> = ({
  analise: analiseProp,
  input,
  compacto = false,
  className = '',
}) => {
  const [mostrarMemoria, setMostrarMemoria] = useState(false)

  // Se não recebeu análise pré-calculada, calcula dinamicamente com o motor
  const analise = analiseProp || (input ? CoberturaTemporalEngine.calcular(input) : null)

  if (!analise) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
        Dados insuficientes para cálculo de cobertura temporal.
      </div>
    )
  }

  // Ícones e cores para o status padronizado
  const renderStatusIcon = () => {
    switch (analise.status) {
      case 'COBERTURA PRESERVADA':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      case 'ATENÇÃO':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
      case 'RISCO DE RUPTURA':
      case 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
      case 'SEM REPOSIÇÃO PREVISTA':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
      case 'SEM CARTEIRA':
        return <Package className="w-3.5 h-3.5 text-slate-600" />
      case 'SEM HISTÓRICO':
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
    }
  }

  return (
    <div
      className={`bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all ${className}`}
    >
      {/* Cabeçalho Oficial do Bloco */}
      <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#004C97] text-white rounded">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              COBERTURA TEMPORAL &amp; PREVISÃO
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Origem: <strong>{analise.origemCarteira}</strong> &bull; {analise.baseHistoricoTexto}
            </span>
          </div>
        </div>

        {/* Badge de Status Padronizado (Texto + Ícone + Cor) */}
        <Badge
          className={`text-[10px] font-bold gap-1 px-2 py-0.5 border shadow-2xs ${analise.badgeCor.bg} ${analise.badgeCor.text} ${analise.badgeCor.border}`}
        >
          {renderStatusIcon()}
          <span>{analise.textoStatus}</span>
        </Badge>
      </div>

      {/* Alerta de Risco Específico se Houver */}
      {analise.alertaRecomendado && (
        <div className="mx-3.5 mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="text-rose-950 font-bold block text-[11px]">
              {analise.alertaRecomendado.titulo}
            </strong>
            <p className="text-rose-800 text-[11px] leading-snug">
              {analise.alertaRecomendado.mensagem}
            </p>
            <p className="text-[10px] text-rose-700 italic">
              <strong>Recomendação:</strong> {analise.alertaRecomendado.recomendacao}
            </p>
          </div>
        </div>
      )}

      {/* Grade Compacta de 6 Indicadores Oficiais */}
      <div className="p-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* 1. Média diária faturamento */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              1. Média Diária Faturamento
            </span>
            <div className="mt-1">
              <strong
                className={`font-mono text-sm block leading-tight ${
                  analise.temHistoricoFaturamento
                    ? 'text-slate-900 font-black'
                    : 'text-slate-500 text-[11px]'
                }`}
              >
                {analise.mediaDiariaFaturamentoFormatada}
              </strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                Base {analise.baseDiasFaturamento} dias
              </span>
            </div>
          </div>

          {/* 2. Dias cobertura estoque */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              2. Dias Cobertura Estoque
            </span>
            <div className="mt-1">
              <strong
                className={`font-mono text-sm block leading-tight ${
                  analise.diasCobertura === null
                    ? 'text-slate-500'
                    : analise.diasCobertura === 0
                      ? 'text-rose-700 font-black'
                      : analise.diasCobertura <= 5
                        ? 'text-amber-700 font-black'
                        : 'text-emerald-700 font-black'
                }`}
              >
                {analise.diasCoberturaFormatado}
              </strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {analise.estoqueDisponivelUtilizavelT.toFixed(2)} t utilizável
              </span>
            </div>
          </div>

          {/* 3. Data fim estoque */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              3. Data Fim Estoque
            </span>
            <div className="mt-1">
              <strong
                className={`font-mono text-xs block leading-tight ${
                  analise.dataFimEstoqueFormatada.includes('Imediata')
                    ? 'text-rose-700 font-bold'
                    : 'text-slate-900 font-bold'
                }`}
              >
                {analise.dataFimEstoqueFormatada}
              </strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">Término projetado</span>
            </div>
          </div>

          {/* 4. Dias estoque negativo */}
          <div
            className={`p-2.5 rounded-lg border flex flex-col justify-between ${
              analise.temGapRuptura
                ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              4. Dias Estoque Negativo
            </span>
            <div className="mt-1">
              <strong
                className={`font-mono text-sm block leading-tight ${
                  analise.temGapRuptura ? 'text-rose-700 font-black' : 'text-emerald-700 font-bold'
                }`}
              >
                {analise.diasEstoqueNegativoFormatado}
              </strong>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {analise.temGapRuptura ? 'Período sem estoque' : 'Sem gap temporal'}
              </span>
            </div>
          </div>

          {/* 5. Próxima data (Demanda) */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              5. Próxima Data (Demanda)
            </span>
            <div className="mt-1">
              <strong className="font-mono text-xs text-slate-900 block font-bold leading-tight">
                {analise.proximaDataDemandaFormatada}
              </strong>
              <span
                className="text-[9px] text-slate-500 truncate block mt-0.5"
                title={analise.proximaDemandaDetalhe?.cliente || ''}
              >
                {analise.proximaDemandaDetalhe
                  ? `${analise.proximaDemandaDetalhe.quantidadeTons.toFixed(1)}t · ${analise.proximaDemandaDetalhe.ordemVenda || 'Pedido'}`
                  : 'Necessidade carteira'}
              </span>
            </div>
          </div>

          {/* 6. Próxima data prevista (Reposição) */}
          <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-200 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[#004C97] block leading-tight">
              6. Próxima Prevista (Reposição)
            </span>
            <div className="mt-1">
              <strong
                className="font-mono text-xs text-[#004C97] block font-bold leading-tight truncate"
                title={analise.proximaDataPrevistaFormatada}
              >
                {analise.proximaDataPrevistaFormatada}
              </strong>
              <span className="text-[9px] text-slate-500 block mt-0.5 truncate">
                {analise.proximaReposicaoDetalhe
                  ? `Qtd: ${analise.proximaReposicaoDetalhe.quantidadeTons.toFixed(1)} t`
                  : 'Entrada disponível'}
              </span>
            </div>
          </div>
        </div>

        {/* Botão para Expandir / Recolher Memória de Cálculo Passo a Passo */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMostrarMemoria(!mostrarMemoria)}
            className="h-6 px-2 text-[10px] text-[#004C97] hover:bg-blue-50 font-semibold gap-1"
          >
            <Calculator className="w-3 h-3 text-[#004C97]" />
            <span>
              {mostrarMemoria ? 'Ocultar Memória de Cálculo' : 'Ver Memória de Cálculo Auditável'}
            </span>
            {mostrarMemoria ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </Button>

          <span className="text-[10px] text-slate-400 font-mono">
            {analise.resumoAuditoria ? analise.resumoAuditoria.split('·')[0] : analise.material}
          </span>
        </div>

        {/* Bloco Expandido da Memória de Cálculo Passo a Passo */}
        {mostrarMemoria && (
          <div className="mt-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-[#004C97]" />
              Memória de Cálculo Auditável &bull; Motor Central de Cobertura Temporal
            </div>

            <div className="space-y-1 font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded border border-slate-200">
              {analise.memoriaCalculo.passos.map((passo, idx) => (
                <div key={idx} className="flex items-start gap-1.5 py-0.5">
                  <span className="text-[#004C97] font-bold">&bull;</span>
                  <span>{passo}</span>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-slate-500 font-sans italic">
              Metodologia corporativa única aplicada a todas as carteiras (Geral, L1, L2, MTO,
              Revenda, Importado e SDC).
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CoverageTemporalAnalysis
