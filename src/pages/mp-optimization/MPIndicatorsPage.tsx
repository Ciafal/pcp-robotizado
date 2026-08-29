import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Award,
  BarChart3,
  RefreshCw,
  Calendar,
  Users,
  Factory,
  Target,
} from 'lucide-react'

export const MPIndicatorsPage: React.FC = () => {
  const [activeView, setActiveView] = useState<
    'MENSAL' | 'YTD' | 'ACO' | 'FORNECEDOR' | 'APLICACAO' | 'LINHA'
  >('MENSAL')
  const [isLoading, setIsLoading] = useState(false)

  return (
    <MPModuleLayout currentStep={14}>
      {/* Filtros de Visão Estratégica de Indicadores */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#004C97]" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Painel Executivo de KPIs Dimensional e Eficiência de MP
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {(['MENSAL', 'YTD', 'ACO', 'FORNECEDOR', 'APLICACAO', 'LINHA'] as const).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={activeView === v ? 'default' : 'ghost'}
              className={`h-7 px-2.5 text-xs font-semibold ${
                activeView === v ? 'bg-[#004C97] text-white font-bold' : 'text-slate-600'
              }`}
              onClick={() => setActiveView(v)}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid com 8 Cards de KPIs Executivos do Submódulo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Rendimento Médio
          </span>
          <div className="text-lg font-black text-emerald-800 mt-1">94.8%</div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            +2.4% vs meta
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            % Aproveitamento
          </span>
          <div className="text-lg font-black text-slate-900 mt-1">96.2%</div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
            Peças + Sobras
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            % Sucata Descarte
          </span>
          <div className="text-lg font-black text-slate-800 mt-1">3.8%</div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            -1.2% redução
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Sobra Reutilizável
          </span>
          <div className="text-lg font-black text-[#004C97] mt-1">12.4 t</div>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">Em estoque</span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Ton. Reaplicadas
          </span>
          <div className="text-lg font-black text-emerald-700 mt-1">38.6 t</div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">ZPP86</span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            R$ Recuperados
          </span>
          <div className="text-lg font-black text-emerald-700 mt-1">R$ 184k</div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            Custo evitado
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Aderência Plano x Real
          </span>
          <div className="text-lg font-black text-[#004C97] mt-1">98.1%</div>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            Massa e Bitola
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            IA Aprovada PCP
          </span>
          <div className="text-lg font-black text-slate-900 mt-1">93.5%</div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
            Aceitação IA
          </span>
        </Card>
      </div>

      {/* Visão Analítica Consolidada */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Performance Global e Governança do Motor Dimensional CIAFAL
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Indicadores consolidados a partir do histórico oficial de ordens integradas ao SAP e
          apontamentos de corte.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-mono">
            <span className="font-bold text-slate-800 text-[11px] uppercase block font-sans">
              Eficiência por Aço e Família
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>SAE 1020 / ASTM A36:</span>
                <span className="font-bold text-emerald-800">
                  96.4% Rendimento &bull; 2.1% Sucata
                </span>
              </div>
              <div className="flex justify-between">
                <span>SAE 1045 / 4140:</span>
                <span className="font-bold text-[#004C97]">
                  93.8% Rendimento &bull; 4.2% Sucata
                </span>
              </div>
              <div className="flex justify-between">
                <span>Aços Especiais / MTO:</span>
                <span className="font-bold text-slate-900">
                  97.1% Rendimento &bull; 1.8% Sucata
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-mono">
            <span className="font-bold text-slate-800 text-[11px] uppercase block font-sans">
              Tempos Médios de Elaboração e Governança
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>Tempo Médio Elaboração IA:</span>
                <span className="font-bold text-slate-900">4.2 segundos</span>
              </div>
              <div className="flex justify-between">
                <span>Tempo Médio Aprovação PCP:</span>
                <span className="font-bold text-[#004C97]">14 minutos</span>
              </div>
              <div className="flex justify-between">
                <span>Tempo Despacho Fila SAP:</span>
                <span className="font-bold text-emerald-800">&lt; 30 segundos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MPModuleLayout>
  )
}
