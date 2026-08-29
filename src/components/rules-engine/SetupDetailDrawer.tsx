import React, { useMemo } from 'react'
import {
  Clock,
  Sparkles,
  BarChart3,
  Calendar,
  AlertTriangle,
  History,
  TrendingUp,
  Sliders,
  CheckCircle2,
  X,
  FileText,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SetupAcertoRecord } from '@/services/pcp-rules-service'
import { MesStatisticalEngine } from '@/services/rules-ai-engine'

interface SetupDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  record: SetupAcertoRecord | null
  onRequestRevision: (record: SetupAcertoRecord) => void
}

export const SetupDetailDrawer: React.FC<SetupDetailDrawerProps> = ({
  isOpen,
  onClose,
  record,
  onRequestRevision,
}) => {
  // Busca evidência estatística MES oficial
  const mesEvidence = useMemo(() => {
    if (!record) return MesStatisticalEngine.getMesEvidence('L1', 60)
    return MesStatisticalEngine.getMesEvidence(
      record.line_code,
      record.setup_time_minutes,
      record.from_code_prefix,
      record.to_code_prefix,
      record.setup_code,
    )
  }, [record])

  // Avaliação IA do parâmetro atual vs MES
  const outdatedCheck = useMemo(() => {
    if (!record) return { isOutdated: false }
    return MesStatisticalEngine.identifyOutdatedParameters(record.setup_time_minutes, mesEvidence)
  }, [record, mesEvidence])

  if (!isOpen || !record) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[540px] bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out text-slate-900">
      {/* 1. CABEÇALHO DO PAINEL LATERAL */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#004C97] text-white rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white">
                Detalhes do Parâmetro & Evidência MES
              </h2>
              <Badge className="bg-blue-600/60 text-white border-none text-[10px] font-mono">
                {record.line_code}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Código: {record.setup_code || record.id}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. CONTEÚDO COM ROLAGEM */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 text-xs">
        {/* ALERTA DE PARÂMETRO DESATUALIZADO (REQUISITO 4) */}
        {outdatedCheck.isOutdated && (
          <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl shadow-xs space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 block text-xs">
                  {outdatedCheck.suggestionMessage}
                </span>
                <p className="text-[11px] text-amber-800/90 mt-1">
                  O cadastro oficial SAP ({record.setup_time_minutes} min) difere da execução real
                  na fábrica (mediana de {mesEvidence.median} min nos últimos 6 meses).
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
              <span className="text-[10px] text-amber-800 font-mono">
                Divergência: ~{outdatedCheck.details?.differencePct}%
              </span>
              <Button
                size="sm"
                onClick={() => onRequestRevision(record)}
                className="h-7 px-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1 shadow-2xs"
              >
                <Zap className="w-3 h-3" />
                Criar Proposta de Revisão
              </Button>
            </div>
          </div>
        )}

        {/* PARÂMETRO VIGENTE PUBLICADO */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Parâmetro Vigente Oficial
            </span>
            <Badge
              className={`text-[10px] ${
                record.status === 'ATIVO'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {record.status} &bull; Publicado
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Tempo de Setup Atual:</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {record.setup_time_minutes} min
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Tempo de Acerto / Fino:</span>
              <span className="text-base font-bold text-slate-700 font-mono">
                {record.tuning_time_minutes} min
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Transição DE:</span>
              <span className="font-bold text-slate-800">{record.from_family_code}</span>
              <span className="text-slate-500 block text-[10px]">
                {record.from_description_gauge}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Transição PARA:</span>
              <span className="font-bold text-slate-800">{record.to_family_code}</span>
              <span className="text-slate-500 block text-[10px]">
                {record.to_description_gauge}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Origem do Cadastro:</span>
              <Badge variant="outline" className="text-[10px] font-mono mt-0.5">
                {record.origin}
              </Badge>
            </div>

            <div>
              <span className="text-slate-500 block">Vigência:</span>
              <span className="font-mono text-slate-700 text-[10px]">
                {record.validity_start} &rarr; {record.validity_end}
              </span>
            </div>
          </div>
        </div>

        {/* EVIDÊNCIA MES: ESTATÍSTICA INDUSTRIAL AVANÇADA (REQUISITO 1 & 3) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              Evidência MES & Dispersão Real
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {mesEvidence.sampleCount} ocorrências
            </span>
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            Período analisado: {mesEvidence.periodAnalyzed}
          </div>

          {/* Grid de 8 Métricas Estatísticas */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Média</span>
              <span className="font-bold font-mono text-slate-800 text-xs">
                {mesEvidence.mean} min
              </span>
            </div>

            <div className="p-2 bg-blue-50/70 rounded-lg border border-blue-200">
              <span className="text-[10px] text-blue-700 font-bold block">Mediana</span>
              <span className="font-bold font-mono text-blue-900 text-xs">
                {mesEvidence.median} min
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">P25 (Q1)</span>
              <span className="font-bold font-mono text-slate-800 text-xs">
                {mesEvidence.p25} min
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">P75 (Q3)</span>
              <span className="font-bold font-mono text-slate-800 text-xs">
                {mesEvidence.p75} min
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Mínimo</span>
              <span className="font-mono text-slate-700 text-xs">{mesEvidence.min} min</span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Máximo</span>
              <span className="font-mono text-slate-700 text-xs">{mesEvidence.max} min</span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Desvio Padrão</span>
              <span className="font-mono text-slate-700 text-xs">
                &plusmn;{mesEvidence.standardDeviation}
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Dispersão (CV)</span>
              <span className="font-mono text-slate-700 text-xs">{mesEvidence.dispersionPct}%</span>
            </div>
          </div>

          {/* Gráfico Linear / Faixa Interquartil visual */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] space-y-1">
            <div className="flex justify-between text-slate-500 font-mono">
              <span>Mín: {mesEvidence.min}m</span>
              <span className="text-blue-700 font-bold">
                Faixa P25-P75: [{mesEvidence.p25}m &rarr; {mesEvidence.p75}m]
              </span>
              <span>Máx: {mesEvidence.max}m</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex relative">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${Math.min(100, (mesEvidence.median / mesEvidence.max) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ÚLTIMAS OCORRÊNCIAS REAIS NO MES */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-600" />
              Últimas Trocas Registradas no MES
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {mesEvidence.occurrences.slice(0, 5).map((occ) => (
              <div key={occ.id} className="py-2 flex items-center justify-between text-[11px]">
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <span>{occ.date}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {occ.shift}
                    </Badge>
                    <span className="text-slate-500 font-mono">({occ.operator})</span>
                  </div>
                  {occ.notes && (
                    <span className="text-[10px] text-rose-600 italic block mt-0.5">
                      &bull; Evento Anormal: {occ.notes}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono font-bold ${occ.abnormalEvent ? 'text-rose-600' : 'text-slate-900'}`}
                  >
                    {occ.durationMinutes} min
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {occ.batchNumber}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AVALIAÇÃO TÉCNICA DA IA */}
        <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/70 p-3.5 rounded-xl border border-indigo-200 shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Avaliação Técnica com IA CIAFAL</span>
          </div>
          <p className="text-[11px] text-slate-700">
            A IA avalia o comportamento histórico ponderando mediana, dispersão e eventos atípicos.
            O parâmetro cadastrado é a fonte oficial governada para a Programação Semanal.
          </p>
        </div>
      </div>

      {/* 3. RODAPÉ DO PAINEL LATERAL COM AÇÃO DE REVISÃO */}
      <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
        <div className="text-[11px] text-slate-500">
          Edição direta bloqueada (Governança CIAFAL).
        </div>
        <Button
          onClick={() => onRequestRevision(record)}
          className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-bold gap-1.5 h-8 shadow-sm"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Nova Proposta de Revisão</span>
        </Button>
      </div>
    </div>
  )
}
