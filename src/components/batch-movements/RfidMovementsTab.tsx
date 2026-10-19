import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RfidMovement } from '@/types/batch-movements'
import {
  Search,
  ArrowUpDown,
  Download,
  AlertCircle,
  Radio,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Cpu,
} from 'lucide-react'

interface RfidMovementsTabProps {
  movements: RfidMovement[]
  isLoading: boolean
  error?: string
  onExport: () => void
}

export const RfidMovementsTab: React.FC<RfidMovementsTabProps> = ({
  movements,
  isLoading,
  error,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof RfidMovement>('data_leitura')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Filtragem interna
  const filteredData = useMemo(() => {
    return movements.filter((item) => {
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        item.tag_rfid?.toLowerCase().includes(term) ||
        item.epc?.toLowerCase().includes(term) ||
        item.material_code?.toLowerCase().includes(term) ||
        item.localizacao_atual?.toLowerCase().includes(term) ||
        item.deposito?.toLowerCase().includes(term) ||
        item.equipamento_coletor?.toLowerCase().includes(term) ||
        item.usuario?.toLowerCase().includes(term) ||
        item.tipo_coleta?.toLowerCase().includes(term)
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

  const handleSort = (field: keyof RfidMovement) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const formatNumber = (val?: number) => {
    if (val === undefined || val === null) return '--'
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (isLoading) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center justify-center gap-3 text-slate-500 py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-[#004C97]" />
            <span className="text-sm font-medium">
              Consultando registros dos coletores e antenas RFID...
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
              Não foi possível consultar os coletores/antenas RFID. A visualização das demais abas
              continua ativa.
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
            <Radio className="w-8 h-8 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              Nenhuma movimentação RFID encontrada para os filtros informados.
            </span>
            <p className="text-xs text-slate-500">
              Não constam leituras de TAGs ou coletas WMS vinculadas a este lote.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Barra de Busca e Exportação */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              placeholder="Pesquisar por TAG, EPC, coletor, usuário, depósito..."
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
              Total: <strong className="text-slate-800">{filteredData.length}</strong> leituras
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="text-xs h-9 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-purple-600" />
              Exportar RFID
            </Button>
          </div>
        </div>

        {/* Tabela de Movimentações RFID */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th
                  className="p-2.5 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  onClick={() => handleSort('data_leitura')}
                >
                  <div className="flex items-center gap-1">
                    <span>Data/Hora</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="p-2.5 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  onClick={() => handleSort('tag_rfid')}
                >
                  <div className="flex items-center gap-1">
                    <span>TAG RFID / EPC</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2.5 whitespace-nowrap">Material</th>
                <th className="p-2.5 whitespace-nowrap">Lote</th>
                <th className="p-2.5 text-right whitespace-nowrap">Qtd / Peso</th>
                <th className="p-2.5 whitespace-nowrap">Localização Anterior</th>
                <th className="p-2.5 whitespace-nowrap">Localização Atual</th>
                <th className="p-2.5 whitespace-nowrap">Depósito / Centro</th>
                <th className="p-2.5 whitespace-nowrap">Equipamento / Coletor</th>
                <th className="p-2.5 whitespace-nowrap">Usuário</th>
                <th className="p-2.5 whitespace-nowrap">Tipo da Coleta</th>
                <th className="p-2.5 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedData.map((row) => (
                <tr key={row.id} className="hover:bg-purple-50/40 transition-colors">
                  {/* Data/Hora */}
                  <td className="p-2.5 whitespace-nowrap font-medium text-slate-700">
                    <div>{row.data_leitura}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {row.hora_leitura || '--:--:--'}
                    </div>
                  </td>

                  {/* TAG RFID e EPC */}
                  <td className="p-2.5 whitespace-nowrap font-mono font-bold text-purple-700">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-purple-500" />
                      <span>{row.tag_rfid}</span>
                    </div>
                    {row.epc && (
                      <div
                        className="text-[10px] font-normal text-slate-400 truncate max-w-[140px]"
                        title={row.epc}
                      >
                        EPC: {row.epc}
                      </div>
                    )}
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

                  {/* Quantidade / Peso */}
                  <td className="p-2.5 text-right whitespace-nowrap font-mono font-semibold text-slate-800">
                    {formatNumber(row.quantidade)}{' '}
                    <span className="text-[10px] font-normal text-slate-500">
                      {row.unidade_medida || 'KG'}
                    </span>
                  </td>

                  {/* Localização Anterior */}
                  <td className="p-2.5 whitespace-nowrap text-slate-500 text-[11px]">
                    {row.localizacao_anterior || '--'}
                  </td>

                  {/* Localização Atual */}
                  <td className="p-2.5 whitespace-nowrap font-bold text-slate-800 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                      {row.localizacao_atual}
                    </span>
                  </td>

                  {/* Depósito / Centro */}
                  <td className="p-2.5 whitespace-nowrap font-medium text-slate-700">
                    {row.deposito || '--'} <span className="text-slate-400">/</span>{' '}
                    {row.centro || '--'}
                  </td>

                  {/* Equipamento / Coletor */}
                  <td className="p-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-slate-400" />
                      <span>{row.equipamento_coletor || 'Coletor Manual'}</span>
                    </div>
                  </td>

                  {/* Usuário */}
                  <td className="p-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{row.usuario || '--'}</span>
                    </div>
                  </td>

                  {/* Tipo da Coleta */}
                  <td className="p-2.5 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium bg-slate-50 text-slate-700"
                    >
                      {row.tipo_coleta || 'Movimentação'}
                    </Badge>
                  </td>

                  {/* Status */}
                  <td className="p-2.5 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        row.status === 'OK' || row.status === 'Validado'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : row.status === 'Divergente'
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      {row.status || 'Registrado'}
                    </Badge>
                  </td>
                </tr>
              ))}
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
