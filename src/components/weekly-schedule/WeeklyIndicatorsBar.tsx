import React from 'react'
import {
  Clock,
  Zap,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Sparkles,
  Activity,
  Flame,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WeeklyIndicators } from '@/types/weekly-schedule'

interface WeeklyIndicatorsBarProps {
  indicators: WeeklyIndicators
  lineCode: string
}

export const WeeklyIndicatorsBar: React.FC<WeeklyIndicatorsBarProps> = ({
  indicators,
  lineCode,
}) => {
  const isOverloaded = indicators.utilizationPct > 100
  const isHighUtilization = indicators.utilizationPct >= 85 && indicators.utilizationPct <= 100

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
      {/* 1. Capacidade Disponível */}
      <Card className="bg-white border-slate-200 p-2.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold tracking-wider">
          <span>Capac. Semanal</span>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="mt-1">
          <span className="text-base font-black font-mono text-slate-900">
            {indicators.availableCapacityHours.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] font-bold text-slate-500 ml-1">h</span>
        </div>
        <span className="text-[9px] text-slate-400 font-medium truncate mt-0.5">
          Linha {lineCode} (6 dias × turnos)
        </span>
      </Card>

      {/* 2. Quantidade Programada */}
      <Card className="bg-white border-blue-200 p-2.5 shadow-sm flex flex-col justify-between bg-blue-50/20">
        <div className="flex items-center justify-between text-[#004C97] text-[10px] uppercase font-bold tracking-wider">
          <span>Qtd Programada</span>
          <Boxes className="w-3.5 h-3.5 text-[#004C97]" />
        </div>
        <div className="mt-1">
          <span className="text-base font-black font-mono text-[#004C97]">
            {indicators.programmedQuantityTons.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] font-black text-[#004C97] ml-1">t</span>
        </div>
        <span className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
          {indicators.programmedProductsCount} produto(s)
        </span>
      </Card>

      {/* 3. Horas Produtivas */}
      <Card className="bg-white border-slate-200 p-2.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold tracking-wider">
          <span>Horas Produtivas</span>
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="mt-1">
          <span className="text-base font-black font-mono text-slate-900">
            {indicators.programmedProductiveHours.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] font-bold text-slate-500 ml-1">h</span>
        </div>
        <span className="text-[9px] text-emerald-700 font-medium truncate mt-0.5">
          Via Ficha Mestre
        </span>
      </Card>

      {/* 4. Horas de Setup / Troca */}
      <Card className="bg-white border-slate-200 p-2.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold tracking-wider">
          <span>Horas Setup</span>
          <Activity className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className="mt-1">
          <span className="text-base font-black font-mono text-slate-900">
            {indicators.setupHours.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] font-bold text-slate-500 ml-1">h</span>
        </div>
        <span className="text-[9px] text-amber-700 font-medium truncate mt-0.5">
          Matriz de Trocas
        </span>
      </Card>

      {/* 5. Horas de Paradas Programadas */}
      <Card className="bg-white border-slate-200 p-2.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold tracking-wider">
          <span>Paradas Previstas</span>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="mt-1">
          <span className="text-base font-black font-mono text-slate-900">
            {indicators.stoppedHours.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] font-bold text-slate-500 ml-1">h</span>
        </div>
        <span className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
          Manutenção / Limpeza
        </span>
      </Card>

      {/* 6. Horas Livres / Saldo */}
      <Card className="bg-white border-slate-200 p-2.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold tracking-wider">
          <span>Horas Livres</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <div className="mt-1">
          <span className="text-base font-black font-mono text-emerald-700">
            {indicators.freeHours.toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] font-bold text-slate-500 ml-1">h</span>
        </div>
        <span className="text-[9px] text-slate-400 font-medium truncate mt-0.5">
          Capacidade ociosa
        </span>
      </Card>

      {/* 7. Ocupação da Capacidade % */}
      <Card
        className={`p-2.5 shadow-sm flex flex-col justify-between border ${
          isOverloaded
            ? 'bg-rose-50 border-rose-300'
            : isHighUtilization
              ? 'bg-amber-50/50 border-amber-300'
              : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
          <span className={isOverloaded ? 'text-rose-800' : 'text-slate-600'}>Ocupação %</span>
          <Flame
            className={`w-3.5 h-3.5 ${
              isOverloaded
                ? 'text-rose-600 animate-pulse'
                : isHighUtilization
                  ? 'text-amber-500'
                  : 'text-[#004C97]'
            }`}
          />
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            className={`text-base font-black font-mono ${
              isOverloaded
                ? 'text-rose-700'
                : isHighUtilization
                  ? 'text-amber-800'
                  : 'text-[#004C97]'
            }`}
          >
            {indicators.utilizationPct}%
          </span>
        </div>
        <span
          className={`text-[9px] font-bold truncate mt-0.5 ${
            isOverloaded
              ? 'text-rose-600'
              : isHighUtilization
                ? 'text-amber-700'
                : 'text-emerald-700'
          }`}
        >
          {isOverloaded ? 'Sobrecarga' : isHighUtilization ? 'Capac. Ótima' : 'Dentro do Limite'}
        </span>
      </Card>

      {/* 8. Necessidade Total & Saldo de MP */}
      <Card
        className={`p-2.5 shadow-sm flex flex-col justify-between border ${
          (indicators.rawMaterialRedCount || 0) > 0
            ? 'bg-rose-50/70 border-rose-300'
            : (indicators.rawMaterialYellowCount || 0) > 0
              ? 'bg-amber-50/50 border-amber-300'
              : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
          <span
            className={
              (indicators.rawMaterialRedCount || 0) > 0
                ? 'text-rose-800'
                : (indicators.rawMaterialYellowCount || 0) > 0
                  ? 'text-amber-800'
                  : 'text-slate-600'
            }
          >
            Demanda MP / Saldo
          </span>
          <Boxes
            className={`w-3.5 h-3.5 ${
              (indicators.rawMaterialRedCount || 0) > 0
                ? 'text-rose-600'
                : (indicators.rawMaterialYellowCount || 0) > 0
                  ? 'text-amber-600'
                  : 'text-indigo-600'
            }`}
          />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <div>
            <span className="text-base font-black font-mono text-indigo-950">
              {indicators.rawMaterialRequiredTons.toLocaleString('pt-BR')}
            </span>
            <span className="text-[10px] font-black text-indigo-900 ml-1">t</span>
          </div>
          {indicators.rawMaterialBalanceTons !== undefined && (
            <span
              className={`text-xs font-mono font-bold ${
                indicators.rawMaterialBalanceTons >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
              title="Saldo Projetado Consolidado"
            >
              {indicators.rawMaterialBalanceTons >= 0 ? '+' : ''}
              {indicators.rawMaterialBalanceTons.toLocaleString('pt-BR')} t
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold">
          {(indicators.rawMaterialRedCount || 0) > 0 ? (
            <span className="text-rose-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
              {indicators.rawMaterialRedCount} com déficit
            </span>
          ) : (indicators.rawMaterialYellowCount || 0) > 0 ? (
            <span className="text-amber-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {indicators.rawMaterialYellowCount} com risco/PO
            </span>
          ) : (
            <span className="text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              100% MP Garantida
            </span>
          )}
        </div>
      </Card>

      {/* 9. Alertas Críticos & Score */}
      <Card
        className={`p-2.5 shadow-sm flex flex-col justify-between border ${
          indicators.criticalAlertsCount > 0
            ? 'bg-rose-50 border-rose-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
          <span className={indicators.criticalAlertsCount > 0 ? 'text-rose-800' : 'text-slate-500'}>
            Alertas / Score
          </span>
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span
            className={`text-base font-black font-mono ${
              indicators.criticalAlertsCount > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {indicators.criticalAlertsCount > 0
              ? `${indicators.criticalAlertsCount} Bloq`
              : `${indicators.sequenceScore} pts`}
          </span>
        </div>
        <span className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
          {indicators.criticalAlertsCount > 0 ? 'Exige intervenção' : 'Sequência Otimizada'}
        </span>
      </Card>
    </div>
  )
}
