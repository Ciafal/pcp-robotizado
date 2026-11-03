import React, { useState } from 'react'
import {
  History,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  FileText,
  Calendar,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BottleneckMatrixRevisionEntry } from '@/services/bottleneck-matrix-revision-service'
import { LocalErrorBoundary } from '@/components/common/LocalErrorBoundary'

interface BottleneckMatrixRevisionHistoryProps {
  revisions: BottleneckMatrixRevisionEntry[]
  loading: boolean
  error: string | null
  onRetry: () => void
  matrixName?: string
  matrixVersion?: number
}

export const BottleneckMatrixRevisionHistoryInner: React.FC<
  BottleneckMatrixRevisionHistoryProps
> = ({ revisions, loading, error, onRetry, matrixName, matrixVersion }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const getActionBadge = (actionType: BottleneckMatrixRevisionEntry['action_type']) => {
    switch (actionType) {
      case 'CRIACAO':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
            Criação
          </Badge>
        )
      case 'HOMOLOGACAO':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
            Homologação
          </Badge>
        )
      case 'VIGENCIA':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
            Vigência
          </Badge>
        )
      case 'PLANEJADOR':
        return (
          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
            Planejador MRP
          </Badge>
        )
      case 'STATUS':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
            Status
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
            Edição
          </Badge>
        )
    }
  }

  return (
    <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
      <div className="h-1 bg-[#004C97] w-full" />
      <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-[#004C97]/10 text-[#004C97] shrink-0 mt-0.5">
            <History className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-bold text-slate-900 tracking-tight leading-snug break-normal">
                Histórico de Revisões
              </CardTitle>
              {matrixVersion !== undefined && (
                <Badge
                  variant="outline"
                  className="font-mono text-[11px] font-bold text-slate-700 bg-slate-50 border-slate-300"
                >
                  Rev.{matrixVersion}
                </Badge>
              )}
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-medium">
                {revisions.length} {revisions.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 leading-snug mt-0.5 break-normal">
              Linha do tempo auditável de criação, novas revisões, homologações e alterações
              operacionais da matriz selecionada.
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={loading}
            className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            title="Atualizar histórico"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* ESTADO 1: CARREGANDO */}
        {loading && (
          <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-2">
            <RotateCcw className="w-5 h-5 animate-spin text-[#004C97]" />
            <span className="text-xs font-medium">Carregando histórico de revisões...</span>
          </div>
        )}

        {/* ESTADO 2: ERRO */}
        {!loading && error && (
          <div
            role="alert"
            className="p-4 rounded-xl border border-rose-200 bg-rose-50/90 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Falha ao carregar o histórico</p>
                <p className="text-[11px] text-slate-600">{error}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-8 text-xs border-rose-300 bg-white hover:bg-rose-50 text-rose-900 font-semibold gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
              Tentar novamente
            </Button>
          </div>
        )}

        {/* ESTADO 3: EMPTY STATE */}
        {!loading && !error && revisions.length === 0 && (
          <div className="py-10 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
              <History className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Nenhuma revisão registrada ainda</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-snug">
              As alterações técnicas, homologações, ativações e vinculações desta matriz serão
              registradas automaticamente aqui com rastreabilidade completa.
            </p>
          </div>
        )}

        {/* ESTADO 4: LISTA DE REVISÕES / AUDITORIA */}
        {!loading && !error && revisions.length > 0 && (
          <div className="space-y-3">
            {/* Visão de Tabela para telas médias e grandes (com rolagem horizontal restrita) */}
            <div className="hidden md:block border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-24">Revisão</th>
                    <th className="p-3 w-32">Tipo</th>
                    <th className="p-3">Ação Realizada</th>
                    <th className="p-3 w-48">Usuário Responsável</th>
                    <th className="p-3 w-40">Data e Hora</th>
                    <th className="p-3 w-28 text-center">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revisions.map((rev) => {
                    const isExpanded = expandedId === rev.id
                    const hasChanges = rev.changes && rev.changes.length > 0

                    return (
                      <React.Fragment key={rev.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border-slate-300"
                            >
                              Rev.{rev.revision}
                            </Badge>
                          </td>
                          <td className="p-3">{getActionBadge(rev.action_type)}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900 leading-snug">
                              {rev.action}
                            </div>
                            {rev.notes && (
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                                {rev.notes}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-medium text-slate-800 block truncate">
                                  {rev.user_name}
                                </span>
                                {rev.user_role && (
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {rev.user_role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{rev.formatted_datetime}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {hasChanges ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleExpand(rev.id)}
                                className="h-7 px-2 text-[11px] text-[#004C97] hover:bg-blue-50 font-semibold gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    Ocultar <ChevronUp className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    Ver ({rev.changes.length}) <ChevronDown className="w-3 h-3" />
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>

                        {/* Linha expansível com alterações antes/depois */}
                        {isExpanded && hasChanges && (
                          <tr className="bg-slate-50/70 border-b border-slate-200">
                            <td colSpan={6} className="p-3.5">
                              <div className="space-y-2">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                  Alterações Registradas (Antes &rarr; Depois)
                                </span>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs">
                                  {rev.changes.map((ch, idx) => (
                                    <div
                                      key={idx}
                                      className="p-2 rounded border border-slate-200 bg-white flex items-center justify-between gap-2"
                                    >
                                      <span className="font-semibold text-slate-700 shrink-0">
                                        {ch.fieldNamePt || ch.field}:
                                      </span>
                                      <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px] min-w-0">
                                        <span className="line-through text-rose-600 truncate max-w-[120px]">
                                          {ch.before ?? '—'}
                                        </span>
                                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="font-bold text-emerald-700 truncate max-w-[120px]">
                                          {ch.after ?? '—'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Visão de Cards Empilhados para telas mobile/tablet (<768px) */}
            <div className="md:hidden space-y-2.5">
              {revisions.map((rev) => {
                const isExpanded = expandedId === rev.id
                const hasChanges = rev.changes && rev.changes.length > 0

                return (
                  <div
                    key={rev.id}
                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border-slate-300"
                        >
                          Rev.{rev.revision}
                        </Badge>
                        {getActionBadge(rev.action_type)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{rev.formatted_datetime}</span>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 leading-snug">{rev.action}</div>
                      {rev.notes && (
                        <p className="text-[11px] text-slate-500 mt-0.5 italic">{rev.notes}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-600 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{rev.user_name}</span>
                      </div>

                      {hasChanges && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpand(rev.id)}
                          className="h-6 px-1.5 text-[10px] text-[#004C97] font-semibold gap-0.5"
                        >
                          {isExpanded ? 'Ocultar' : `Antes/Depois (${rev.changes.length})`}
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>

                    {isExpanded && hasChanges && (
                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 bg-slate-50 p-2 rounded">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                          Alterações Registradas
                        </span>
                        {rev.changes.map((ch, idx) => (
                          <div
                            key={idx}
                            className="p-1.5 rounded border border-slate-200 bg-white flex flex-col gap-0.5 text-[11px]"
                          >
                            <span className="font-semibold text-slate-700">
                              {ch.fieldNamePt || ch.field}:
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
                              <span className="line-through text-rose-600 truncate">
                                {ch.before ?? '—'}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-bold text-emerald-700 truncate">
                                {ch.after ?? '—'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const BottleneckMatrixRevisionHistory: React.FC<BottleneckMatrixRevisionHistoryProps> = (
  props,
) => {
  return (
    <LocalErrorBoundary
      moduleName="Histórico de Revisões da Matriz de Gargalos"
      onRetry={props.onRetry}
    >
      <BottleneckMatrixRevisionHistoryInner {...props} />
    </LocalErrorBoundary>
  )
}
