import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LocalErrorBoundary } from '@/components/common/LocalErrorBoundary'
import { formatTons3DecimalsValue } from '@/lib/formatters-ptbr'
import { formatPercentStandard } from '@/lib/number-format'
import { EstoqueCentroDetalhe } from '@/types/carteira-sdc'
import { Building2, AlertCircle, CheckCircle2, X } from 'lucide-react'

export interface DetalheEstoquePorCentroModalProps {
  isOpen: boolean
  onClose: () => void
  titulo: string
  subtitulo?: string
  origemInfo?: string
  valorConsolidadoT: number | null | undefined
  centros?: EstoqueCentroDetalhe[] | null
  unidade?: string
  isLoading?: boolean
}

export const DetalheEstoquePorCentroModal: React.FC<DetalheEstoquePorCentroModalProps> = (
  props,
) => {
  return (
    <LocalErrorBoundary moduleName="Detalhamento de Estoque por Centro">
      <DetalheEstoquePorCentroContent {...props} />
    </LocalErrorBoundary>
  )
}

const DetalheEstoquePorCentroContent: React.FC<DetalheEstoquePorCentroModalProps> = ({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  origemInfo,
  valorConsolidadoT,
  centros,
  unidade = 't',
  isLoading = false,
}) => {
  // Ordenar centros por quantidade_t decrescente
  const centrosOrdenados = useMemo(() => {
    if (!centros || !Array.isArray(centros) || centros.length === 0) {
      return []
    }

    const copia = [...centros]
    return copia.sort((a, b) => {
      const qA = typeof a?.quantidade_t === 'number' ? a.quantidade_t : 0
      const qB = typeof b?.quantidade_t === 'number' ? b.quantidade_t : 0
      return qB - qA
    })
  }, [centros])

  // Calcular soma total dos centros para conferência
  const somaCentrosT = useMemo(() => {
    if (!centrosOrdenados || centrosOrdenados.length === 0) return 0
    return centrosOrdenados.reduce((acc, curr) => {
      const q = typeof curr?.quantidade_t === 'number' ? curr.quantidade_t : 0
      return acc + q
    }, 0)
  }, [centrosOrdenados])

  // Valor base para cálculo do percentual: se valorConsolidado for positivo, usa ele; senão usa somaCentrosT
  const totalReferenciaT = useMemo(() => {
    if (typeof valorConsolidadoT === 'number' && valorConsolidadoT > 0) {
      return valorConsolidadoT
    }
    return somaCentrosT > 0 ? somaCentrosT : 0
  }, [valorConsolidadoT, somaCentrosT])

  // Conferência entre soma dos centros e consolidado do card
  const diferencaConsolidado = useMemo(() => {
    if (typeof valorConsolidadoT !== 'number') return null
    return Math.abs(valorConsolidadoT - somaCentrosT)
  }, [valorConsolidadoT, somaCentrosT])

  const confereComConsolidado = diferencaConsolidado !== null && diferencaConsolidado <= 0.005

  const temCentrosValidos = centrosOrdenados.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[96vw] max-w-2xl max-h-[90vh] p-0 bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden focus:outline-none"
        data-testid="modal-detalhamento-estoque-centro"
      >
        {/* Header institucional CIAFAL / HUB */}
        <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white border-b border-slate-200 flex-none">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 bg-[#004C97] text-white rounded-lg shadow-xs shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Detalhamento de Estoque por Centro
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-[#004C97]">{titulo}</span>
                  {subtitulo && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-slate-500">{subtitulo}</span>
                    </>
                  )}
                  {origemInfo && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium text-slate-600 bg-white border-slate-200 py-0 h-4"
                      >
                        {origemInfo}
                      </Badge>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Detalhamento */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
              <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
              <p className="text-xs">Carregando dados de estoque do SAP...</p>
            </div>
          ) : !temCentrosValidos ? (
            <div
              className="py-10 px-4 text-center rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 space-y-2"
              data-testid="aviso-detalhamento-indisponivel"
            >
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold">
                Detalhamento por centro não disponível nesta consulta
              </p>
              <p className="text-[11px] text-amber-800 max-w-md mx-auto leading-relaxed">
                A resposta do SAP ECC via RFC retornou o valor consolidado deste indicador sem a
                abertura individual por centro de distribuição (WERKS).
              </p>
              {typeof valorConsolidadoT === 'number' && (
                <div className="pt-2 text-xs font-medium text-slate-700">
                  Valor consolidado no card:{' '}
                  <strong className="text-[#004C97] font-mono">
                    {formatTons3DecimalsValue(valorConsolidadoT)} {unidade}
                  </strong>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Resumo executivo do consolidado vs soma dos centros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Consolidado do Card
                  </span>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    {typeof valorConsolidadoT === 'number'
                      ? `${formatTons3DecimalsValue(valorConsolidadoT)} ${unidade}`
                      : '0,000 t'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Soma dos Centros SAP
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-bold font-mono text-[#004C97]">
                      {formatTons3DecimalsValue(somaCentrosT)} {unidade}
                    </span>
                    {confereComConsolidado ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                        title="A soma dos centros confere exatamente com o valor consolidado."
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Conferido
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {centrosOrdenados.length} centro(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabela responsiva de centros */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-left text-xs border-collapse"
                    data-testid="tabela-detalhamento-centros"
                  >
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Centro</th>
                        <th className="py-2.5 px-3">Descrição SAP</th>
                        <th className="py-2.5 px-3 text-right">Estoque ({unidade})</th>
                        <th className="py-2.5 px-3 text-right w-24">Part. %</th>
                        <th className="py-2.5 px-3 w-32 hidden sm:table-cell">Distribuição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {centrosOrdenados.map((item, idx) => {
                        const qtd = typeof item.quantidade_t === 'number' ? item.quantidade_t : 0
                        // Participação % calculada
                        const pctCalculado =
                          totalReferenciaT > 0 ? (qtd / totalReferenciaT) * 100 : 0
                        const pctFinal =
                          typeof item.participacao_pct === 'number'
                            ? item.participacao_pct
                            : pctCalculado

                        // Barra proporcional limitada a 100%
                        const barWidth = Math.min(Math.max(pctFinal, 0), 100)

                        return (
                          <tr
                            key={`${item.centro || 'centro'}-${idx}`}
                            className="hover:bg-blue-50/40 transition-colors"
                            data-testid={`linha-centro-${item.centro}`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className="bg-slate-50 border-slate-300 font-mono text-slate-800 text-[11px] px-1.5 py-0.5"
                              >
                                {item.centro || '-'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium break-words max-w-[200px]">
                              {item.descricao || (
                                <span className="text-slate-400 italic text-[11px]">
                                  Centro {item.centro}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatTons3DecimalsValue(qtd)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                              {formatPercentStandard(pctFinal)}
                            </td>
                            <td className="py-2.5 px-3 hidden sm:table-cell align-middle">
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                <div
                                  className="bg-[#004C97] h-full rounded-full transition-all duration-300"
                                  style={{ width: `${barWidth}%` }}
                                  title={`${formatPercentStandard(pctFinal)}`}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs text-slate-900">
                        <td
                          className="py-2.5 px-3 font-semibold uppercase text-slate-700"
                          colSpan={2}
                        >
                          Total Geral
                        </td>
                        <td
                          className="py-2.5 px-3 text-right font-mono text-base text-[#004C97]"
                          data-testid="total-geral-centros"
                        >
                          {formatTons3DecimalsValue(somaCentrosT)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatPercentStandard(100)}
                        </td>
                        <td className="py-2.5 px-3 hidden sm:table-cell">
                          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-[#004C97] h-full rounded-full w-full" />
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer com Fechar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex-none flex items-center justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DetalheEstoquePorCentroModal
