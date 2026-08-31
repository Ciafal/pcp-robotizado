import React, { useState, useMemo } from 'react'
import {
  RollShopDemand,
  RollShopIndicators,
  RollShopReadinessStatus,
  SetupExecutionStatus,
} from '@/types/roll-shop'
import { rollShopSetupService } from '@/services/roll-shop-service'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Calendar,
  Layers,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react'

interface RollShopDemandsViewProps {
  lineCode?: string
  onOpenSetupDetail?: (demand: RollShopDemand) => void
  onRefresh?: () => void
}

export const RollShopDemandsView: React.FC<RollShopDemandsViewProps> = ({
  lineCode = 'L1',
  onOpenSetupDetail,
  onRefresh,
}) => {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<'TABELA' | 'SEMANAL' | 'MENSAL'>('TABELA')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDemand, setSelectedDemand] = useState<RollShopDemand | null>(null)
  const [feedbackNote, setFeedbackNote] = useState('')

  const demands = useMemo(() => {
    return rollShopSetupService.getDemands(lineCode)
  }, [lineCode, onRefresh])

  const indicators = useMemo(() => {
    return rollShopSetupService.getRollShopIndicators(lineCode)
  }, [lineCode, demands])

  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      if (statusFilter !== 'ALL' && d.readiness_status !== statusFilter) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        return (
          d.to_material_code.toLowerCase().includes(term) ||
          d.from_material_code.toLowerCase().includes(term) ||
          d.tooling.cylinder_set_code.toLowerCase().includes(term) ||
          d.line_code.toLowerCase().includes(term)
        )
      }
      return true
    })
  }, [demands, statusFilter, searchTerm])

  const handleUpdateStatus = (demandId: string, status: RollShopReadinessStatus) => {
    rollShopSetupService.updateDemandStatus(demandId, status, feedbackNote || undefined)
    toast({
      title: 'Status Atualizado na Oficina',
      description: `Demanda atualizada para ${status}. Feedback enviado ao PCP.`,
    })
    setFeedbackNote('')
    setSelectedDemand(null)
    if (onRefresh) onRefresh()
  }

  const getReadinessBadge = (st: RollShopReadinessStatus) => {
    switch (st) {
      case 'READY':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 🟢 PRONTO
          </Badge>
        )
      case 'IN_PREPARATION':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> 🟡 EM PREPARAÇÃO
          </Badge>
        )
      case 'DELAY_RISK':
        return (
          <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> 🔴 RISCO DE ATRASO
          </Badge>
        )
      case 'BLOCKED_UNAVAILABLE':
        return (
          <Badge className="bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1">
            ⛔ NÃO VIÁVEL
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-slate-600 text-[10px]">
            ⚫ NÃO INICIADO
          </Badge>
        )
    }
  }

  return (
    <div className="w-full space-y-4 font-sans text-slate-800">
      {/* 1. TOPO: TÍTULO, SELETORES E INDICADORES DA OFICINA (Requisito 14, 32) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004C97]/10 border border-[#004C97]/20 flex items-center justify-center text-[#004C97]">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Oficina de Cilindros — Setups Programados pelo PCP
              <Badge className="bg-[#004C97] text-white text-[10px]">Linha {lineCode}</Badge>
            </h2>
            <p className="text-xs text-slate-500">
              Gestão de Ferramental, Preparação Antecipada SMED e Prontidão de Troca para Laminação
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de Visão (Tabela / Semanal / Mensal) */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
            <Button
              size="sm"
              variant={viewMode === 'TABELA' ? 'default' : 'ghost'}
              className={`h-7 text-xs ${viewMode === 'TABELA' ? 'bg-[#004C97] text-white' : 'text-slate-600'}`}
              onClick={() => setViewMode('TABELA')}
            >
              Tabela
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'SEMANAL' ? 'default' : 'ghost'}
              className={`h-7 text-xs ${viewMode === 'SEMANAL' ? 'bg-[#004C97] text-white' : 'text-slate-600'}`}
              onClick={() => setViewMode('SEMANAL')}
            >
              Visão Semanal
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'MENSAL' ? 'default' : 'ghost'}
              className={`h-7 text-xs ${viewMode === 'MENSAL' ? 'bg-[#004C97] text-white' : 'text-slate-600'}`}
              onClick={() => setViewMode('MENSAL')}
            >
              Visão Mensal
            </Button>
          </div>
        </div>
      </div>

      {/* 2. FAIXA DE INDICADORES DA OFICINA (Requisito 32) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Setups Próx. 7 Dias
          </span>
          <div className="text-lg font-black text-slate-900 mt-0.5">
            {indicators.setups_next_7_days}
          </div>
          <span className="text-[10px] text-slate-500">{indicators.setups_month} no mês</span>
        </div>

        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase block">A Preparar</span>
          <div className="text-lg font-black text-amber-700 mt-0.5">
            {indicators.sets_to_prepare}
          </div>
          <span className="text-[10px] text-slate-500">Cilindros na oficina</span>
        </div>

        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase block">
            Conjuntos Prontos
          </span>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{indicators.sets_ready}</div>
          <span className="text-[10px] text-slate-500">Liberados p/ troca</span>
        </div>

        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase block">
            Risco / Atraso
          </span>
          <div className="text-lg font-black text-rose-700 mt-0.5">
            {indicators.delayed_preparations}
          </div>
          <span className="text-[10px] text-rose-600 font-medium">Requer atenção</span>
        </div>

        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Média Troca + Acerto
          </span>
          <div className="text-lg font-black text-[#004C97] mt-0.5">
            {indicators.avg_total_setup_minutes} <span className="text-xs font-normal">min</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {indicators.avg_change_time_minutes}m troca + {indicators.avg_tuning_time_minutes}m
            acerto
          </span>
        </div>

        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block">
            Ganho SMED Acum.
          </span>
          <div className="text-lg font-black text-emerald-700 mt-0.5">
            {indicators.accumulated_smed_gain_hours} h
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">
            Conversão interna &rarr; externa
          </span>
        </div>

        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg shadow-xs">
          <span className="text-[10px] font-bold text-amber-900 uppercase block flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-700" /> Perda Gargalo
          </span>
          <div className="text-lg font-black text-rose-700 mt-0.5">
            {indicators.potential_throughput_loss_tons}{' '}
            <span className="text-xs font-normal">t</span>
          </div>
          <span className="text-[10px] text-amber-900 font-medium">Capacidade nominal</span>
        </div>
      </div>

      {/* 3. FILTROS DA LISTA */}
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por produto, família, conjunto de cilindros..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-md py-1.5 px-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="ALL">Todos os Status</option>
              <option value="READY">🟢 Apenas Prontos</option>
              <option value="IN_PREPARATION">🟡 Em Preparação</option>
              <option value="DELAY_RISK">🔴 Risco de Atraso</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Exibindo {filteredDemands.length} de {demands.length} setups recebidos do PCP
        </div>
      </div>

      {/* 4. VISÃO TABELA / SEMANAL / MENSAL */}
      {viewMode === 'TABELA' ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Data / Horário Setup</th>
                <th className="py-2.5 px-3">Linha / Versão</th>
                <th className="py-2.5 px-3">De &rarr; Para (Produto / Bitola)</th>
                <th className="py-2.5 px-3">Conjunto de Cilindros</th>
                <th className="py-2.5 px-3 text-center">Troca Prev.</th>
                <th className="py-2.5 px-3 text-center">Acerto Prev.</th>
                <th className="py-2.5 px-3 text-center">Prazo Limite Prep.</th>
                <th className="py-2.5 px-3 text-center">Prontidão Oficina</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDemands.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    Nenhum setup cadastrado ou correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                filteredDemands.map((dem) => {
                  return (
                    <tr key={dem.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">
                        {dem.scheduled_setup_datetime}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-[#004C97]">{dem.line_code}</span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          v{dem.schedule_version}
                        </span>
                        {dem.has_schedule_change_impact && (
                          <Badge className="ml-1 bg-amber-500 text-white text-[9px]">
                            Reprogramado
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-mono text-[11px]">
                            {dem.from_material_code}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-bold text-slate-900 font-mono text-[11px]">
                            {dem.to_material_code}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">{dem.to_family_code}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-800">
                          {dem.tooling.cylinder_set_code}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {dem.tooling.cylinder_set_name}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold text-slate-800">
                        {dem.times.planned_change_duration_minutes} min
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold text-[#004C97]">
                        {dem.times.planned_tuning_duration_minutes} min
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600 bg-slate-50">
                        {dem.preparation_deadline_datetime.split(' ')[1] || '08:00'}
                        <span className="block text-[9px] text-slate-400">
                          {dem.preparation_deadline_datetime.split(' ')[0]}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {getReadinessBadge(dem.readiness_status)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-[#004C97] hover:bg-blue-100/50"
                            onClick={() => setSelectedDemand(dem)}
                          >
                            Atualizar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'SEMANAL' ? (
        /* VISÃO CALENDÁRIO SEMANAL DA OFICINA (Requisito 15) */
        <div className="grid grid-cols-7 gap-3">
          {[
            'SEG 24/08',
            'TER 25/08',
            'QUA 26/08',
            'QUI 27/08',
            'SEX 28/08',
            'SÁB 29/08',
            'DOM 30/08',
          ].map((dayHeader, idx) => {
            const dayDemands = filteredDemands.filter(
              (d, i) => i % 7 === idx || (idx === 0 && i === 0),
            )
            return (
              <div
                key={dayHeader}
                className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2 min-h-[220px]"
              >
                <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <span>{dayHeader}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {dayDemands.length} troca(s)
                  </span>
                </div>

                <div className="space-y-2">
                  {dayDemands.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDemand(d)}
                      className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50/50 cursor-pointer text-[11px] space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{d.scheduled_setup_datetime.split(' ')[1] || '10:30'}</span>
                        {getReadinessBadge(d.readiness_status)}
                      </div>
                      <div className="font-mono text-[10px] text-[#004C97] font-semibold truncate">
                        {d.to_material_code}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        Cilindros:{' '}
                        <strong className="text-slate-800">{d.tooling.cylinder_set_code}</strong>
                      </div>
                      <div className="text-[9.5px] text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                        <span>
                          Prep até: {d.preparation_deadline_datetime.split(' ')[1] || '08:30'}
                        </span>
                        <span>{d.times.planned_total_duration_minutes}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* VISÃO MENSAL DA OFICINA (Requisito 15) */
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-center space-y-3">
          <Calendar className="w-8 h-8 text-[#004C97] mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            Visão Mensal dos Setups de Cilindros — Agosto 2026
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Acompanhamento consolidado de todos os conjuntos programados nas 5 semanas operacionais
            do mês.
          </p>
          <div className="grid grid-cols-5 gap-3 pt-2">
            {[
              { label: 'Semana 35 (24/08 a 30/08)', count: 6, ready: 4, delay: 1 },
              { label: 'Semana 36 (31/08 a 06/09)', count: 8, ready: 6, delay: 0 },
              { label: 'Semana 37 (07/09 a 13/09)', count: 7, ready: 5, delay: 1 },
              { label: 'Semana 38 (14/09 a 20/09)', count: 5, ready: 5, delay: 0 },
              { label: 'Semana 39 (21/09 a 27/09)', count: 6, ready: 4, delay: 0 },
            ].map((wk) => (
              <div
                key={wk.label}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left space-y-1 text-xs"
              >
                <div className="font-bold text-slate-800">{wk.label}</div>
                <div className="text-slate-600">
                  Total Setups: <strong className="text-slate-900">{wk.count}</strong>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <span className="text-emerald-700 font-bold">🟢 {wk.ready} prontos</span>
                  {wk.delay > 0 && (
                    <span className="text-rose-700 font-bold">🔴 {wk.delay} risco</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MODAL LATERAL/POPUP DE ATUALIZAÇÃO RÁPIDA DE PRONTIDÃO */}
      {selectedDemand && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#004C97]" />
                Atualizar Status do Ferramental — {selectedDemand.tooling.cylinder_set_code}
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedDemand(null)}
                className="h-7 text-xs"
              >
                ✕
              </Button>
            </div>

            <div className="text-xs space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                Produto Alvo:{' '}
                <strong className="text-slate-900">{selectedDemand.to_material_code}</strong>
              </div>
              <div>
                Data/Hora Setup Linha:{' '}
                <strong className="text-[#004C97]">
                  {selectedDemand.scheduled_setup_datetime}
                </strong>
              </div>
              <div>
                Prazo Limite Preparação Externa:{' '}
                <strong className="text-amber-800">
                  {selectedDemand.preparation_deadline_datetime}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Novo Status de Prontidão:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  onClick={() => handleUpdateStatus(selectedDemand.id, 'READY')}
                >
                  🟢 100% Pronto
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                  onClick={() => handleUpdateStatus(selectedDemand.id, 'IN_PREPARATION')}
                >
                  🟡 Em Preparação
                </Button>
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  onClick={() => handleUpdateStatus(selectedDemand.id, 'DELAY_RISK')}
                >
                  🔴 Risco Atraso
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Observação / Feedback para o PCP:
              </label>
              <input
                type="text"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="Ex: Conjunto montado e retificado, aguardando transporte..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDemand(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
