import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Boxes,
  Factory,
  CheckCircle2,
} from 'lucide-react'
import { FacaAlertaIA } from '@/types/faca-analise'
import { formatNumberPtBr } from '@/lib/number-format'

interface FacaAlertasIASectionProps {
  alertas: FacaAlertaIA[]
  onFiltrarMaterial?: (codigoMaterial: string) => void
}

export const FacaAlertasIASection: React.FC<FacaAlertasIASectionProps> = ({
  alertas,
  onFiltrarMaterial,
}) => {
  const getCorPrioridade = (p: FacaAlertaIA['prioridade']) => {
    switch (p) {
      case 'ALTA':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'MEDIA':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'BAIXA':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  const getAreaBadge = (area: FacaAlertaIA['area_responsavel']) => {
    switch (area) {
      case 'PCP':
        return 'bg-[#004C97] text-white'
      case 'Comercial':
        return 'bg-emerald-700 text-white'
      case 'Produção':
        return 'bg-amber-700 text-white'
      case 'Gestão de MP':
        return 'bg-[#004C97] text-white'
      default:
        return 'bg-slate-700 text-white'
    }
  }

  return (
    <Card className="border border-blue-200 bg-gradient-to-r from-blue-50/50 via-white to-slate-50/50 shadow-xs">
      <CardHeader className="py-3 px-4 border-b border-blue-100 bg-white/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-[#004C97]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                Alertas & IA — Diagnóstico Automático FACA
              </CardTitle>
              <div className="text-[10px] text-slate-500">
                Situações A–F monitoradas em tempo real com recomendações objetivas e sem
                inferências fictícias
              </div>
            </div>
          </div>
          <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
            {alertas.length} diagnósticos ativos
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              onClick={() => onFiltrarMaterial?.(alerta.codigo_material)}
              className="border border-slate-200 rounded-lg p-3 bg-white hover:border-[#004C97] hover:shadow-xs transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-start justify-between gap-2">
                <Badge
                  variant="outline"
                  className={`text-[9px] font-bold ${getCorPrioridade(alerta.prioridade)}`}
                >
                  Prioridade {alerta.prioridade}
                </Badge>
                <Badge
                  className={`text-[9px] font-semibold ${getAreaBadge(alerta.area_responsavel)}`}
                >
                  {alerta.area_responsavel}
                </Badge>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-[#004C97] transition-colors line-clamp-1">
                  {alerta.titulo}
                </div>
                <div className="text-[11px] font-mono text-[#004C97] font-semibold pt-0.5">
                  {alerta.codigo_material} &bull;{' '}
                  <span className="text-slate-500 font-normal">{alerta.descricao_material}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 leading-snug">
                <strong>Motivo Técnico:</strong> {alerta.motivo_tecnico}
              </div>

              <div className="bg-slate-50 p-2 rounded border border-slate-100 text-[11px] text-slate-700">
                <span className="font-bold text-[#004C97]">Ação Sugerida:</span>{' '}
                {alerta.acao_sugerida}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                <span>
                  Volume: <strong>{formatNumberPtBr(alerta.quantidade_envolvida_t, 1)} t</strong>
                </span>
                {alerta.impacto_financeiro_brl ? (
                  <span className="text-emerald-700 font-bold">
                    R$ {alerta.impacto_financeiro_brl.toLocaleString('pt-BR')}
                  </span>
                ) : (
                  <span className="text-slate-400">Técnico / Industrial</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
