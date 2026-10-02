import React from 'react'
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export const IndicadoresControlePage: React.FC = () => {
  return (
    <div className="space-y-4 p-1 sm:p-2">
      {/* Cabeçalho */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#004C97] text-white rounded-xl shadow-xs">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Indicadores do Controle de Produção
              </h1>
              <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-xs font-semibold">
                Etapa 1 / Preparado
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Consolidação de indicadores de fechamento mensal, pontualidade do 2º dia útil e
              aderência operacional.
            </p>
          </div>
        </div>

        <Link to="/pcp/controle-producao/checklist-fechamento">
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-2xs font-medium"
          >
            Ir para Check-list Fechamento
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Cards de Métricas Preliminares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            Pontualidade no Fechamento
          </span>
          <span className="text-2xl font-bold text-emerald-700 block mt-1">100%</span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Até o 2º dia útil do mês subsequente
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            Rendimento Médio Fechamento L1
          </span>
          <span className="text-2xl font-bold text-[#004C97] block mt-1">95,4%</span>
          <span className="text-[11px] text-slate-400 mt-1 block">Faixa padrão: 94% a 97%</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            Rendimento Médio Fechamento L2
          </span>
          <span className="text-2xl font-bold text-[#004C97] block mt-1">96,1%</span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Faixa padrão Ciafal: 95% a 96,7%
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">
            Pendências SAP (COGI / CO1P)
          </span>
          <span className="text-2xl font-bold text-emerald-700 block mt-1">0</span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Zero pendências antes do encerramento
          </span>
        </div>
      </div>

      {/* Card Informativo da Etapa 2 */}
      <div className="p-6 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
        <div className="flex items-center gap-2 text-[#004C97] font-bold text-sm">
          <Sparkles className="w-4 h-4 text-[#004C97]" />
          <span>Evolução Planejada — Etapa 2</span>
        </div>
        <p className="text-slate-700 leading-relaxed">
          Os gráficos analíticos consolidados, exportação executiva em PDF, envio automatizado para
          os grupos de destinatários (Contabilidade, PCP, Produção) e análise diagnóstica com IA
          serão entregues na Etapa 2. O modelo de dados já está estruturado e integrado às 25
          atividades mestre do fechamento.
        </p>
      </div>
    </div>
  )
}

export default IndicadoresControlePage
