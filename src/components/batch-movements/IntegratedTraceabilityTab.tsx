import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IntegratedTraceabilityEvent } from '@/types/batch-movements'
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Box,
  Truck,
  RotateCcw,
  ArrowRightLeft,
  Factory,
  Printer,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react'

interface IntegratedTraceabilityTabProps {
  events: IntegratedTraceabilityEvent[]
  divergencesCount: number
  onExport: () => void
}

export const IntegratedTraceabilityTab: React.FC<IntegratedTraceabilityTabProps> = ({
  events,
  divergencesCount,
  onExport,
}) => {
  const [filterDivergentOnly, setFilterDivergentOnly] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredEvents = filterDivergentOnly ? events.filter((e) => e.tem_divergencia) : events

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getEventIcon = (tipo: string, origem: string) => {
    if (tipo === 'SAP_ESTORNO') return <RotateCcw className="w-4 h-4 text-rose-600" />
    if (tipo === 'SAP_ENTRADA_PRODUCAO') return <Factory className="w-4 h-4 text-emerald-600" />
    if (tipo === 'SAP_CONSUMO') return <Layers className="w-4 h-4 text-amber-600" />
    if (tipo === 'SAP_TRANSFERENCIA') return <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
    if (tipo === 'SAP_EXPEDICAO' || tipo === 'RFID_EXPEDICAO')
      return <Truck className="w-4 h-4 text-blue-600" />
    if (tipo === 'ETIQUETA_IMPRESSA' || tipo === 'ETIQUETA_SOLICITADA')
      return <Printer className="w-4 h-4 text-sky-600" />
    if (origem === 'RFID') return <Radio className="w-4 h-4 text-purple-600" />
    return <Box className="w-4 h-4 text-slate-600" />
  }

  const getOriginBadge = (origem: string) => {
    if (origem === 'SAP') {
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-300 font-bold text-[10px]"
        >
          SAP
        </Badge>
      )
    }
    if (origem === 'RFID') {
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-300 font-bold text-[10px]"
        >
          RFID
        </Badge>
      )
    }
    if (origem === 'ETIQUETA') {
      return (
        <Badge
          variant="outline"
          className="bg-sky-50 text-sky-700 border-sky-300 font-bold text-[10px]"
        >
          ETIQUETA
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-slate-50 text-slate-700 border-slate-300 font-bold text-[10px]"
      >
        HUB
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Alerta de Divergências Encontradas */}
      <div
        className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          divergencesCount > 0
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              divergencesCount > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {divergencesCount > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold">
              {divergencesCount > 0
                ? `${divergencesCount} indicador(es) de divergência identificado(s)`
                : 'Nenhuma divergência detectada entre SAP e RFID'}
            </h4>
            <p className="text-xs opacity-90">
              {divergencesCount > 0
                ? 'Os apontamentos contábeis SAP e as leituras físicas de coletores RFID apresentam discrepâncias.'
                : 'As movimentações contábeis do SAP ECC e a localização física dos coletores RFID estão perfeitamente sincronizadas.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {divergencesCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterDivergentOnly(!filterDivergentOnly)}
              className={`text-xs h-8 ${
                filterDivergentOnly
                  ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                  : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
              }`}
            >
              {filterDivergentOnly ? 'Ver todos os eventos' : 'Filtrar apenas divergências'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="text-xs h-8 bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#004C97]" />
            Exportar Visão Integrada
          </Button>
        </div>
      </div>

      {/* Linha do Tempo e Visão Cronológica */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Linha do Tempo Cronológica (SAP × RFID)
              </h3>
              <p className="text-xs text-slate-500">
                O que o SAP registrou contabilmente e onde o material foi fisicamente identificado
                pelo RFID
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-800">{filteredEvents.length}</strong> eventos
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Nenhum evento registrado para o lote informado.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {filteredEvents.map((ev) => {
                const isExpanded = expandedId === ev.id

                return (
                  <div key={ev.id} className="relative group">
                    {/* Marcador na linha do tempo */}
                    <div
                      className={`absolute -left-[31px] top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white shadow-xs ${
                        ev.tem_divergencia
                          ? 'border-amber-500 text-amber-600'
                          : ev.origem === 'SAP'
                            ? 'border-blue-500 text-blue-600'
                            : ev.origem === 'RFID'
                              ? 'border-purple-500 text-purple-600'
                              : 'border-slate-400 text-slate-600'
                      }`}
                    >
                      {getEventIcon(ev.tipo_evento, ev.origem)}
                    </div>

                    {/* Caixa de Conteúdo do Evento */}
                    <div
                      className={`p-3.5 rounded-lg border transition-all ${
                        ev.tem_divergencia
                          ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getOriginBadge(ev.origem)}
                          <span className="font-bold text-xs text-slate-800">{ev.titulo}</span>

                          {/* Badge de Correlação */}
                          {ev.status_correlacao === 'CORRELACIONADO' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300"
                            >
                              Correlação Confirmada
                            </Badge>
                          )}
                          {ev.status_correlacao === 'CORRELACAO_NAO_CONFIRMADA' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-50 text-amber-700 border-amber-300"
                            >
                              Correlação não confirmada
                            </Badge>
                          )}
                          {ev.status_correlacao === 'SEM_CORRESPONDENCIA' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-slate-50 text-slate-600 border-slate-300"
                            >
                              Sem correspondência na outra fonte
                            </Badge>
                          )}
                        </div>

                        {/* Data e Hora */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.data_display}</span>
                          <span className="text-slate-400">•</span>
                          <span>{ev.hora_display}</span>
                        </div>
                      </div>

                      {/* Descrição Principal */}
                      <p className="text-xs text-slate-600 mt-2">{ev.descricao}</p>

                      {/* Alerta de Divergência Específico */}
                      {ev.tem_divergencia && (
                        <div className="mt-2.5 p-2 rounded bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px] flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                          <div>
                            <strong>Divergência detectada:</strong> {ev.detalhe_divergencia}
                          </div>
                        </div>
                      )}

                      {/* Botão de Expandir Detalhes */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {ev.usuario ? `Operador/Usuário: ${ev.usuario}` : 'Processo automatizado'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(ev.id)}
                          className="h-6 text-[11px] text-[#004C97] hover:bg-sky-50 px-2"
                        >
                          {isExpanded ? (
                            <span className="flex items-center gap-1">
                              Menos detalhes <ChevronUp className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              Mais detalhes <ChevronDown className="w-3 h-3" />
                            </span>
                          )}
                        </Button>
                      </div>

                      {/* Detalhes Expandidos */}
                      {isExpanded && (
                        <div className="mt-2 p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-slate-700">
                          <div>
                            <span className="text-slate-400 block">Lote / Material:</span>
                            <span className="font-mono font-bold">{ev.lote}</span> (
                            {ev.material_code})
                          </div>
                          <div>
                            <span className="text-slate-400 block">Centro / Depósito:</span>
                            <span className="font-bold">
                              {ev.centro || '--'} / {ev.deposito || '--'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Local Físico (RFID):</span>
                            <span className="font-bold">
                              {ev.localizacao_fisica || 'Não aplicável'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Referência:</span>
                            <span className="font-mono">{ev.documento_referencia || '--'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
