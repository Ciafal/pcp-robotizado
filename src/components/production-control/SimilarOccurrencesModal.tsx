import React from 'react'
import {
  Layers,
  History,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  SimilarOccurrencesResult,
  SapCogiPendency,
  SapCo1pPendency,
} from '@/types/sap-pendencies'

interface SimilarOccurrencesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: SapCogiPendency | SapCo1pPendency | null
  result: SimilarOccurrencesResult | null
  onSelectRecord?: (record: SapCogiPendency | SapCo1pPendency) => void
}

export const SimilarOccurrencesModal: React.FC<SimilarOccurrencesModalProps> = ({
  open,
  onOpenChange,
  record,
  result,
  onSelectRecord,
}) => {
  if (!record || !result) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 rounded-lg border border-blue-400/30 text-blue-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-tight">
                Análise de Ocorrências Semelhantes no SAP
              </DialogTitle>
              <p className="text-xs text-slate-400 font-mono">
                Material {record.material_code} | Código de Erro: {record.sap_msg_code}
              </p>
            </div>
          </div>
        </div>

        {/* Estatísticas Agregadas do Padrão */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Identificadas
              </span>
              <span className="font-mono text-base font-bold text-blue-700">
                {result.total_encontradas}
              </span>
              <span className="text-[10px] text-slate-500 block">Casos com mesmo padrão</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Primeira Ocorrência
              </span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {result.primeira_ocorrencia}
              </span>
              <span className="text-[10px] text-slate-500 block">Início do sintoma</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Tempo Médio Solução
              </span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {result.tempo_medio_solucao_horas} horas
              </span>
              <span className="text-[10px] text-slate-500 block">Histórico de resolução</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Taxa de Reincidência
              </span>
              <span className="font-mono text-xs font-bold text-amber-700">
                {result.reincidencia_apos_correcao_pct}%
              </span>
              <span className="text-[10px] text-slate-500 block">Pós-intervenção</span>
            </div>
          </div>

          {/* Tratamentos Históricos Aplicados */}
          <div>
            <span className="text-[11px] font-bold text-slate-700 uppercase block mb-1.5">
              Tratamentos e Desfechos Utilizados no Passado:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.tratamentos_utilizados.map((t, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded border border-slate-200 bg-white flex items-center justify-between"
                >
                  <div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {t.status}
                    </Badge>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Responsável: {t.responsavel}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-800 text-sm">{t.count}x</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Registros Similares */}
          <div>
            <span className="text-[11px] font-bold text-slate-700 uppercase block mb-1.5">
              Últimas Ocorrências com Este Padrão:
            </span>
            <div className="space-y-2">
              {result.registros_similares.map((sim) => (
                <div
                  key={sim.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-400 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700">OP {sim.op_number}</span>
                      <span className="text-slate-400">|</span>
                      <span className="font-mono text-slate-800">{sim.material_code}</span>
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                        Centro {sim.centro_code}
                      </Badge>
                    </div>
                    <p className="text-slate-600 font-mono text-[11px] truncate max-w-lg">
                      {sim.sap_message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {sim.treatment_status}
                    </Badge>
                    {onSelectRecord && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onSelectRecord(sim)
                          onOpenChange(false)
                        }}
                        className="h-7 text-xs text-blue-700 hover:text-blue-800"
                      >
                        Abrir
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 bg-slate-800 hover:bg-slate-900 text-white"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
