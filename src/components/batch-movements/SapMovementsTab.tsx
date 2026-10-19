import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SapBatchMovement } from '@/types/batch-movements'
import {
  Search,
  ArrowUpDown,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'

interface SapMovementsTabProps {
  movements: SapBatchMovement[]
  isLoading: boolean
  error?: string
  onSelectMovement: (mov: SapBatchMovement) => void
  onExport: () => void
}

export const SapMovementsTab: React.FC<SapMovementsTabProps> = ({
  movements,
  isLoading,
  error,
  onSelectMovement,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof SapBatchMovement>('data_lancamento')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Filtragem interna
  const filteredData = useMemo(() => {
    return movements.filter((item) => {
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        item.mblnr?.toLowerCase().includes(term) ||
        item.material_code?.toLowerCase().includes(term) ||
        item.material_desc?.toLowerCase().includes(term) ||
        item.bwart?.toLowerCase().includes(term) ||
        item.bwart_desc?.toLowerCase().includes(term) ||
        item.lgort?.toLowerCase().includes(term) ||
        item.aufnr?.toLowerCase().includes(term) ||
        item.xblnr?.toLowerCase().includes(term) ||
        item.usnam?.toLowerCase().includes(term)
      )
    })
  }, [movements, searchTerm])

  // Ordenação
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valA = a[sortField] ?? ''
      const valB = b[sortField] ?? ''
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA
      }
      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
    })
  }, [filteredData, sortField, sortDirection])

  // Paginação
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const handleSort = (field: keyof SapBatchMovement) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  // Formatação pt-BR
  const formatNumber = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (isLoading) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center justify-center gap-3 text-slate-500 py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-[#004C97]" />
            <span className="text-sm font-medium">
              Consultando documentos de material no SAP ECC...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border border-rose-200 bg-rose-50/50">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center gap-2 text-rose-700 py-6">
            <AlertCircle className="w-8 h-8 text-rose-600" />
            <span className="text-sm font-semibold">{error}</span>
            <p className="text-xs text-rose-500 max-w-md">
              Verifique os parâmetros informados ou tente novamente mais tarde. A visualização das
              demais abas continua disponível.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (movements.length === 0) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-8">
            <AlertCircle className="w-8 h-8 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              Nenhuma movimentação SAP encontrada para os filtros informados.
            </span>
            <p className="text-xs text-slate-500">
              Não há documentos de material registrados no SAP ECC com este lote no período.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Barra superior da tabela: busca interna e ações */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              placeholder="Pesquisar por documento, BWART, depósito, OP..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 h-9 text-xs border-slate-300"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">
              Total: <strong className="text-slate-800">{filteredData.length}</strong> itens
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="text-xs h-9 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-[#004C97]" />
              Exportar SAP
            </Button>
          </div>
        </div>

        {/* Tabela de Movimentações SAP (Equivalente MB51) */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th
                  className="p-2.5 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  onClick={() => handleSort('data_lancamento')}
                >
                  <div className="flex items-center gap-1">
                    <span>Data/Hora</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="p-2.5 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  onClick={() => handleSort('mblnr')}
                >
                  <div className="flex items-center gap-1">
                    <span>Documento</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2.5 whitespace-nowrap">Material</th>
                <th className="p-2.5 whitespace-nowrap">Lote</th>
                <th
                  className="p-2.5 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  onClick={() => handleSort('bwart')}
                >
                  <div className="flex items-center gap-1">
                    <span>Movimento (BWART)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2.5 min-w-[200px]">Descrição Oficial do Movimento</th>
                <th
                  className="p-2.5 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  onClick={() => handleSort('quantidade')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Quantidade</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2.5 whitespace-nowrap">Centro</th>
                <th className="p-2.5 whitespace-nowrap">Depósito</th>
                <th className="p-2.5 whitespace-nowrap">Origem / Destino</th>
                <th className="p-2.5 whitespace-nowrap">Referência / OP</th>
                <th className="p-2.5 text-center whitespace-nowrap">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedData.map((row, idx) => {
                const isSaida = row.shkzg === 'H' || row.bwart === '261' || row.bwart === '601'
                const isEstorno =
                  row.is_estorno ||
                  row.bwart === '102' ||
                  row.bwart === '262' ||
                  row.bwart === '602'

                return (
                  <tr
                    key={row.id || `${row.mblnr}-${row.zeile}-${idx}`}
                    onClick={() => onSelectMovement(row)}
                    className="hover:bg-sky-50/60 cursor-pointer transition-colors"
                  >
                    {/* Data/Hora */}
                    <td className="p-2.5 whitespace-nowrap font-medium text-slate-700">
                      <div>{row.data_lancamento}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.hora || '--:--:--'}
                      </div>
                    </td>

                    {/* Documento */}
                    <td className="p-2.5 whitespace-nowrap font-mono font-bold text-[#004C97]">
                      {row.mblnr}
                      <span className="text-[10px] font-normal text-slate-500 ml-1">
                        /{row.mjahr} (it. {row.zeile})
                      </span>
                    </td>

                    {/* Material */}
                    <td
                      className="p-2.5 whitespace-nowrap font-mono font-semibold text-slate-800"
                      title={row.material_desc}
                    >
                      {row.material_code}
                    </td>

                    {/* Lote */}
                    <td className="p-2.5 whitespace-nowrap font-mono text-slate-600">{row.lote}</td>

                    {/* Tipo de Movimento (BWART) */}
                    <td className="p-2.5 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs font-bold ${
                          row.bwart === '601'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : isEstorno
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : row.bwart === '101'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : row.bwart === '311' || row.bwart === '315'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                  : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        {row.bwart}
                        {isEstorno && ' (Estorno)'}
                      </Badge>
                    </td>

                    {/* Descrição Oficial (direto do SAP) */}
                    <td className="p-2.5 text-slate-700 font-medium">
                      {row.bwart_desc ? (
                        <span>
                          <strong className="text-slate-800">{row.bwart}</strong> — {row.bwart_desc}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Descrição SAP não retornada</span>
                      )}
                    </td>

                    {/* Quantidade com indicador positivo/negativo */}
                    <td className="p-2.5 text-right whitespace-nowrap font-mono font-bold">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isSaida ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {isSaida ? (
                          <>
                            <TrendingDown className="w-3.5 h-3.5" />-
                            {formatNumber(Math.abs(row.quantidade))}
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-3.5 h-3.5" />+
                            {formatNumber(Math.abs(row.quantidade))}
                          </>
                        )}
                        <span className="text-[10px] text-slate-500 font-normal ml-0.5">
                          {row.unidade_medida || 'UN'}
                        </span>
                      </span>
                    </td>

                    {/* Centro */}
                    <td className="p-2.5 whitespace-nowrap font-medium text-slate-700">
                      {row.werks || '--'}
                    </td>

                    {/* Depósito */}
                    <td className="p-2.5 whitespace-nowrap font-bold text-slate-800">
                      {row.lgort || '--'}
                    </td>

                    {/* Origem / Destino */}
                    <td className="p-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                      {row.origem_movimento || row.destino_movimento ? (
                        <span>
                          {row.origem_movimento || '--'} → {row.destino_movimento || '--'}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>

                    {/* Referência / OP */}
                    <td className="p-2.5 whitespace-nowrap text-[11px] font-mono text-slate-600">
                      {row.aufnr ? `OP ${row.aufnr}` : row.xblnr ? `Ref ${row.xblnr}` : '--'}
                    </td>

                    {/* Ação */}
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectMovement(row)
                        }}
                        className="h-7 w-7 p-0 text-[#004C97] hover:bg-sky-100"
                        title="Ver detalhes da movimentação SAP"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Página <strong className="text-slate-800">{currentPage}</strong> de{' '}
            <strong className="text-slate-800">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="h-7 px-2 text-xs"
            >
              Próximo
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
