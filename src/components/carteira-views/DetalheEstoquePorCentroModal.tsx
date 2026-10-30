import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LocalErrorBoundary } from '@/components/common/LocalErrorBoundary'
import { formatTons3DecimalsValue } from '@/lib/formatters-ptbr'
import { formatPercentStandard } from '@/lib/number-format'
import { EstoqueCentroDetalhe } from '@/types/carteira-sdc'
import { Building2, AlertCircle, CheckCircle2, X, Search, Filter, RotateCcw } from 'lucide-react'

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
  // Estado dos filtros locais do modal
  const [busca, setBusca] = useState('')
  const [filtroValorMinimo, setFiltroValorMinimo] = useState<string>('TODOS')
  const [filtroParticipacaoMinima, setFiltroParticipacaoMinima] = useState<string>('TODOS')

  // Limpar filtros ao fechar ou reabrir
  const handleLimparFiltros = () => {
    setBusca('')
    setFiltroValorMinimo('TODOS')
    setFiltroParticipacaoMinima('TODOS')
  }

  // Ordenar centros por quantidade_t decrescente (lista completa base)
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

  // Calcular soma total de TODOS os centros recebidos para referência de % e conferência do card
  const somaCentrosTotalCompletaT = useMemo(() => {
    if (!centrosOrdenados || centrosOrdenados.length === 0) return 0
    return centrosOrdenados.reduce((acc, curr) => {
      const q = typeof curr?.quantidade_t === 'number' ? curr.quantidade_t : 0
      return acc + q
    }, 0)
  }, [centrosOrdenados])

  // Valor base para cálculo do percentual: se valorConsolidado for positivo, usa ele; senão usa somaCentrosTotalCompletaT
  const totalReferenciaT = useMemo(() => {
    if (typeof valorConsolidadoT === 'number' && valorConsolidadoT > 0) {
      return valorConsolidadoT
    }
    return somaCentrosTotalCompletaT > 0 ? somaCentrosTotalCompletaT : 0
  }, [valorConsolidadoT, somaCentrosTotalCompletaT])

  // Filtros aplicados sobre a lista de centros
  const centrosFiltrados = useMemo(() => {
    return centrosOrdenados.filter((item) => {
      // 1. Busca textual por código do centro ou descrição SAP
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim()
        const centroStr = (item.centro || '').toLowerCase()
        const descStr = (item.descricao || '').toLowerCase()
        if (!centroStr.includes(termo) && !descStr.includes(termo)) {
          return false
        }
      }

      const qtd = typeof item?.quantidade_t === 'number' ? item.quantidade_t : 0
      const pctCalculado = totalReferenciaT > 0 ? (qtd / totalReferenciaT) * 100 : 0
      const pctItem =
        typeof item?.participacao_pct === 'number' ? item.participacao_pct : pctCalculado

      // 2. Filtro de valor mínimo em t
      if (filtroValorMinimo === 'MAIOR_ZERO' && qtd <= 0) {
        return false
      } else if (filtroValorMinimo === 'MIN_1' && qtd < 1.0) {
        return false
      } else if (filtroValorMinimo === 'MIN_5' && qtd < 5.0) {
        return false
      } else if (filtroValorMinimo === 'MIN_10' && qtd < 10.0) {
        return false
      }

      // 3. Filtro de participação mínima %
      if (filtroParticipacaoMinima === 'MIN_1_PCT' && pctItem < 1.0) {
        return false
      } else if (filtroParticipacaoMinima === 'MIN_5_PCT' && pctItem < 5.0) {
        return false
      } else if (filtroParticipacaoMinima === 'MIN_10_PCT' && pctItem < 10.0) {
        return false
      }

      return true
    })
  }, [centrosOrdenados, busca, filtroValorMinimo, filtroParticipacaoMinima, totalReferenciaT])

  // Indicador de se há algum filtro ativo
  const temFiltroAtivo = useMemo(() => {
    return Boolean(
      busca.trim() !== '' || filtroValorMinimo !== 'TODOS' || filtroParticipacaoMinima !== 'TODOS',
    )
  }, [busca, filtroValorMinimo, filtroParticipacaoMinima])

  // Soma dos centros filtrados
  const somaCentrosFiltradosT = useMemo(() => {
    if (!centrosFiltrados || centrosFiltrados.length === 0) return 0
    return centrosFiltrados.reduce((acc, curr) => {
      const q = typeof curr?.quantidade_t === 'number' ? curr.quantidade_t : 0
      return acc + q
    }, 0)
  }, [centrosFiltrados])

  // Conferência entre soma dos centros e consolidado do card (SÓ válida se NENHUM filtro estiver ativo)
  const diferencaConsolidado = useMemo(() => {
    if (typeof valorConsolidadoT !== 'number') return null
    return Math.abs(valorConsolidadoT - somaCentrosTotalCompletaT)
  }, [valorConsolidadoT, somaCentrosTotalCompletaT])

  const confereComConsolidado =
    !temFiltroAtivo && diferencaConsolidado !== null && diferencaConsolidado <= 0.005

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
              {/* BARRA DE FILTROS DO DETALHAMENTO DE ESTOQUE POR CENTRO */}
              <div
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                data-testid="barra-filtros-estoque-centro"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {/* Busca textual por código ou descrição */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <Input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Filtrar por centro (código ou descrição)..."
                      className="text-xs pl-8 h-8 bg-white border-slate-300"
                      data-testid="input-busca-centro"
                    />
                  </div>

                  {/* Filtro de valor mínimo em toneladas */}
                  <div className="flex items-center gap-2">
                    <select
                      value={filtroValorMinimo}
                      onChange={(e) => setFiltroValorMinimo(e.target.value)}
                      className="text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium w-full sm:w-auto"
                      data-testid="select-filtro-valor-minimo"
                      aria-label="Filtro de valor mínimo"
                    >
                      <option value="TODOS">Valor: Todos</option>
                      <option value="MAIOR_ZERO">Ocultar zerados (&gt; 0 t)</option>
                      <option value="MIN_1">&ge; 1,000 t</option>
                      <option value="MIN_5">&ge; 5,000 t</option>
                      <option value="MIN_10">&ge; 10,000 t</option>
                    </select>

                    {/* Filtro de participação % mínima */}
                    <select
                      value={filtroParticipacaoMinima}
                      onChange={(e) => setFiltroParticipacaoMinima(e.target.value)}
                      className="text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium w-full sm:w-auto"
                      data-testid="select-filtro-participacao"
                      aria-label="Filtro de participação mínima"
                    >
                      <option value="TODOS">Part. %: Todas</option>
                      <option value="MIN_1_PCT">&ge; 1%</option>
                      <option value="MIN_5_PCT">&ge; 5%</option>
                      <option value="MIN_10_PCT">&ge; 10%</option>
                    </select>

                    {/* Botão limpar filtros quando ativo */}
                    {temFiltroAtivo && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleLimparFiltros}
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 shrink-0 gap-1"
                        data-testid="btn-limpar-filtros-centro"
                        title="Restaurar lista completa de centros"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Limpar filtros</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Feedback contextual de filtros aplicados */}
                {temFiltroAtivo && (
                  <div
                    className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-600"
                    data-testid="badge-filtros-ativos"
                  >
                    <span className="font-semibold text-slate-700">Filtro aplicado:</span>
                    {busca.trim() && (
                      <Badge
                        variant="outline"
                        className="bg-white text-slate-700 border-slate-300 font-mono text-[10px] py-0 h-5"
                      >
                        Busca: &ldquo;{busca.trim()}&rdquo;
                      </Badge>
                    )}
                    {filtroValorMinimo !== 'TODOS' && (
                      <Badge
                        variant="outline"
                        className="bg-white text-slate-700 border-slate-300 text-[10px] py-0 h-5"
                      >
                        {filtroValorMinimo === 'MAIOR_ZERO'
                          ? 'Ocultando zerados'
                          : filtroValorMinimo === 'MIN_1'
                            ? 'Estoque ≥ 1 t'
                            : filtroValorMinimo === 'MIN_5'
                              ? 'Estoque ≥ 5 t'
                              : 'Estoque ≥ 10 t'}
                      </Badge>
                    )}
                    {filtroParticipacaoMinima !== 'TODOS' && (
                      <Badge
                        variant="outline"
                        className="bg-white text-slate-700 border-slate-300 text-[10px] py-0 h-5"
                      >
                        Part. ≥{' '}
                        {filtroParticipacaoMinima === 'MIN_1_PCT'
                          ? '1%'
                          : filtroParticipacaoMinima === 'MIN_5_PCT'
                            ? '5%'
                            : '10%'}
                      </Badge>
                    )}
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-500 font-medium">
                      Exibindo {centrosFiltrados.length} de {centrosOrdenados.length} centro(s)
                    </span>
                  </div>
                )}
              </div>

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
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Total recebido via SAP ECC RFC
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    {temFiltroAtivo ? 'Total Filtrado' : 'Soma dos Centros SAP'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-sm font-bold font-mono ${
                        temFiltroAtivo ? 'text-amber-800' : 'text-[#004C97]'
                      }`}
                      data-testid="valor-resumo-soma"
                    >
                      {formatTons3DecimalsValue(
                        temFiltroAtivo ? somaCentrosFiltradosT : somaCentrosTotalCompletaT,
                      )}{' '}
                      {unidade}
                    </span>
                    {confereComConsolidado ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                        title="A soma dos centros confere exatamente com o valor consolidado."
                        data-testid="selo-conferido"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Conferido
                      </span>
                    ) : temFiltroAtivo ? (
                      <span
                        className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-300"
                        data-testid="badge-total-filtrado-contagem"
                      >
                        Subconjunto: {centrosFiltrados.length} centro(s)
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {centrosOrdenados.length} centro(s)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {temFiltroAtivo
                      ? `Reflete apenas os ${centrosFiltrados.length} centros atendendo aos filtros ativos`
                      : 'Soma dos centros individuais'}
                  </span>
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
                      {centrosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            <p className="font-medium text-xs">
                              Nenhum centro SAP atende aos filtros selecionados.
                            </p>
                            <Button
                              size="sm"
                              variant="link"
                              onClick={handleLimparFiltros}
                              className="text-xs text-[#004C97] font-semibold mt-1 h-auto p-0"
                            >
                              Limpar filtros para ver todos os centros
                            </Button>
                          </td>
                        </tr>
                      ) : (
                        centrosFiltrados.map((item, idx) => {
                          const qtd = typeof item.quantidade_t === 'number' ? item.quantidade_t : 0
                          // Participação % calculada com base no consolidado / total completo
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
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs text-slate-900">
                        <td
                          className="py-2.5 px-3 font-semibold uppercase text-slate-700"
                          colSpan={2}
                        >
                          {temFiltroAtivo
                            ? `Total Filtrado (${centrosFiltrados.length} centros)`
                            : 'Total Geral'}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono text-base ${
                            temFiltroAtivo ? 'text-amber-800' : 'text-[#004C97]'
                          }`}
                          data-testid="total-geral-centros"
                        >
                          {formatTons3DecimalsValue(
                            temFiltroAtivo ? somaCentrosFiltradosT : somaCentrosTotalCompletaT,
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatPercentStandard(
                            totalReferenciaT > 0
                              ? ((temFiltroAtivo
                                  ? somaCentrosFiltradosT
                                  : somaCentrosTotalCompletaT) /
                                  totalReferenciaT) *
                                  100
                              : 100,
                          )}
                        </td>
                        <td className="py-2.5 px-3 hidden sm:table-cell">
                          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#004C97] h-full rounded-full"
                              style={{
                                width: `${Math.min(
                                  Math.max(
                                    totalReferenciaT > 0
                                      ? ((temFiltroAtivo
                                          ? somaCentrosFiltradosT
                                          : somaCentrosTotalCompletaT) /
                                          totalReferenciaT) *
                                          100
                                      : 100,
                                    0,
                                  ),
                                  100,
                                )}%`,
                              }}
                            />
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
