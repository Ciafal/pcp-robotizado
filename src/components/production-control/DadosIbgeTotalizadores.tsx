/**
 * Totalizadores Oficiais — Peça 1: Dados IBGE
 * Respondendo fielmente aos filtros:
 * 1. Centros selecionados
 * 2. Materiais (distintos)
 * 3. Quantidade produzida (NUNCA somar UM incompatíveis; discriminar por unidade se houver mais de uma)
 * 4. Registros
 * 5. Status (Pendente / Conferida / Enviada à Contabilidade)
 */

import React from 'react'
import { TotalizadoresIbge } from '@/types/dados-ibge'
import { Factory, Package, Scale, FileText, CheckCircle2, Clock } from 'lucide-react'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'
import { Badge } from '@/components/ui/badge'

interface Props {
  totalizadores: TotalizadoresIbge
  carregando?: boolean
}

export const DadosIbgeTotalizadores: React.FC<Props> = ({ totalizadores, carregando = false }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enviada à Contabilidade':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Enviada à Contabilidade
          </Badge>
        )
      case 'Conferida':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3 text-[#004C97]" />
            Conferida
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-xs">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente
          </Badge>
        )
    }
  }

  // Quantidade produzida discriminada por unidade de medida (NUNCA somar UM incompatíveis)
  const umEntries = Object.entries(totalizadores.quantidades_por_unidade)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Centros selecionados */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 text-[#004C97] rounded-xl border border-blue-100 shrink-0">
          <Factory className="w-5 h-5 text-[#004C97]" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Centros selecionados
          </span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">
            {carregando
              ? '—'
              : totalizadores.centros_selecionados_count === 0
                ? 'Todos'
                : totalizadores.centros_selecionados_count}
          </div>
          <span className="text-[10px] text-slate-400">
            {totalizadores.centros_selecionados_count === 0
              ? 'Todos os centros da linha'
              : `${totalizadores.centros_selecionados_count} centro(s) no escopo`}
          </span>
        </div>
      </div>

      {/* 2. Materiais distintos */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
        <div className="p-2.5 bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shrink-0">
          <Package className="w-5 h-5 text-[#004C97]" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Materiais distintos
          </span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">
            {carregando ? '—' : totalizadores.materiais_distintos_count}
          </div>
          <span className="text-[10px] text-slate-400">Itens em consolidação</span>
        </div>
      </div>

      {/* 3. Quantidade produzida (Discriminado por UM para NUNCA somar unidades diferentes) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
        <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shrink-0">
          <Scale className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Quantidade produzida
          </span>
          <div className="text-lg font-bold text-slate-900 mt-0.5 truncate">
            {carregando
              ? '—'
              : umEntries.length === 0
                ? '0,000 t'
                : umEntries.map(([um, val], idx) => (
                    <span key={um} className="inline-block mr-2 font-mono">
                      {formatNumberPTBR(val, 3)} <span className="text-xs uppercase">{um}</span>
                      {idx < umEntries.length - 1 ? ' | ' : ''}
                    </span>
                  ))}
          </div>
          <span className="text-[10px] text-slate-400">
            {umEntries.length > 1 ? 'Discriminado por unidade' : 'Volume total apurado'}
          </span>
        </div>
      </div>

      {/* 4. Registros considerados */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
        <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 shrink-0">
          <FileText className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Registros
          </span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">
            {carregando ? '—' : totalizadores.total_registros}
          </div>
          <span className="text-[10px] text-slate-400">Apontamentos MES + OPs</span>
        </div>
      </div>

      {/* 5. Status Geral do Fechamento */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
        <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 shrink-0">
          <CheckCircle2 className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Status do Fechamento
          </span>
          <div className="mt-1">
            {carregando ? '—' : getStatusBadge(totalizadores.status_geral)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {totalizadores.contagem_por_status.enviada > 0
              ? `${totalizadores.contagem_por_status.enviada} enviada(s)`
              : `${totalizadores.contagem_por_status.pendente} pendente(s)`}
          </span>
        </div>
      </div>
    </div>
  )
}

export default DadosIbgeTotalizadores
