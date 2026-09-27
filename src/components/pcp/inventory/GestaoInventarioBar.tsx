import React from 'react'
import { Button } from '@/components/ui/button'
import { PlusCircle, ClipboardList, ClipboardCheck, History } from 'lucide-react'

interface GestaoInventarioBarProps {
  onGerarDemanda: () => void
  onToggleDemandas: () => void
  showingDemandas: boolean
  onLancarInventario: () => void
  onHistorico: () => void
}

export const GestaoInventarioBar: React.FC<GestaoInventarioBarProps> = ({
  onGerarDemanda,
  onToggleDemandas,
  showingDemandas,
  onLancarInventario,
  onHistorico,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 text-[#004C97] flex items-center justify-center font-bold">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Gestão de Inventário
            </h2>
            <p className="text-[11px] text-slate-500">
              Módulo de controle físico de matéria-prima, geração de demandas e conciliação DP07.
            </p>
          </div>
        </div>

        {/* 4 Ações sempre visíveis, responsivas, sem cortar texto */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ação 1: + Gerar Demanda de Inventário */}
          <Button
            type="button"
            onClick={onGerarDemanda}
            className="text-xs h-8 px-3 font-bold bg-[#004C97] hover:bg-[#003B75] text-white gap-1.5 shadow-xs shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />+ Gerar Demanda de Inventário
          </Button>

          {/* Ação 2: Demandas de Inventário */}
          <Button
            type="button"
            variant={showingDemandas ? 'default' : 'outline'}
            onClick={onToggleDemandas}
            className={`text-xs h-8 px-3 font-semibold gap-1.5 shrink-0 ${
              showingDemandas
                ? 'bg-slate-800 text-white hover:bg-slate-700'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Demandas de Inventário
          </Button>

          {/* Ação 3: Lançar Inventário */}
          <Button
            type="button"
            variant="outline"
            onClick={onLancarInventario}
            className="text-xs h-8 px-3 font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 shrink-0"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-[#004C97]" />
            Lançar Inventário
          </Button>

          {/* Ação 4: Histórico e Rastreabilidade */}
          <Button
            type="button"
            variant="outline"
            onClick={onHistorico}
            className="text-xs h-8 px-3 font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 shrink-0"
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            Histórico e Rastreabilidade
          </Button>
        </div>
      </div>
    </div>
  )
}
