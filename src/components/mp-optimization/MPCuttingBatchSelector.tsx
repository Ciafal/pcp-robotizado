import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Boxes,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Filter,
} from 'lucide-react'
import {
  pcpCuttingBatchStockService,
  RawMaterialBatchStockItem,
} from '@/services/pcp-cutting-batch-stock-service'

export interface MPCuttingBatchSelectorProps {
  materialCode: string
  centerCode: string
  selectedBatchNumber?: string
  onSelectBatch: (item: RawMaterialBatchStockItem) => void
  onClearSelection?: () => void
  highlightError?: boolean
}

export const MPCuttingBatchSelector: React.FC<MPCuttingBatchSelectorProps> = ({
  materialCode,
  centerCode,
  selectedBatchNumber,
  onSelectBatch,
  onClearSelection,
  highlightError = false,
}) => {
  const [batches, setBatches] = useState<RawMaterialBatchStockItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Filtros rápidos client-side
  const [codeFilter, setCodeFilter] = useState('')
  const [descFilter, setDescFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [centerFilter, setCenterFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  // Carrega lotes compatíveis com o material / MP selecionado no topo
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await pcpCuttingBatchStockService.getBatchesForMaterial(
          materialCode,
          centerCode,
        )
        if (isMounted) {
          setBatches(data)
          // Se o lote atualmente selecionado não pertence mais a esta lista compatível, limpa
          if (selectedBatchNumber && !data.some((b) => b.batch_number === selectedBatchNumber)) {
            onClearSelection?.()
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar lotes de corte:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    if (materialCode) {
      load()
    } else {
      setBatches([])
    }

    return () => {
      isMounted = false
    }
  }, [materialCode, centerCode])

  // Filtragem rápida client-side (sem reload)
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchCode =
        !codeFilter || b.material_code.toLowerCase().includes(codeFilter.toLowerCase().trim())
      const matchDesc =
        !descFilter ||
        b.material_description.toLowerCase().includes(descFilter.toLowerCase().trim())
      const matchBatch =
        !batchFilter || b.batch_number.toLowerCase().includes(batchFilter.toLowerCase().trim())
      const matchCenter =
        !centerFilter || b.center_code.toLowerCase().includes(centerFilter.toLowerCase().trim())
      const matchLoc =
        !locationFilter ||
        b.storage_location.toLowerCase().includes(locationFilter.toLowerCase().trim())
      return matchCode && matchDesc && matchBatch && matchCenter && matchLoc
    })
  }, [batches, codeFilter, descFilter, batchFilter, centerFilter, locationFilter])

  // Item selecionado atualmente
  const selectedItem = useMemo(() => {
    if (!selectedBatchNumber) return null
    return batches.find((b) => b.batch_number === selectedBatchNumber) || null
  }, [batches, selectedBatchNumber])

  const handleClearFilters = () => {
    setCodeFilter('')
    setDescFilter('')
    setBatchFilter('')
    setCenterFilter('')
    setLocationFilter('')
  }

  return (
    <Card
      id="quadro-material-lote-multiplos"
      className={`border bg-white shadow-sm mb-6 transition-all scroll-mt-6 ${
        highlightError
          ? 'border-red-500 ring-2 ring-red-400/50 bg-red-50/10'
          : selectedItem
            ? 'border-blue-300 ring-1 ring-blue-200'
            : 'border-slate-200'
      }`}
    >
      <CardHeader className="p-4 pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg text-white shadow-sm ${
                highlightError ? 'bg-red-600' : 'bg-blue-900'
              }`}
            >
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Material e Lote para o Plano de Corte
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-purple-50 text-purple-800 border-purple-200 font-semibold"
                >
                  Obrigatório para Múltiplos
                </Badge>
                {selectedItem && (
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Lote Selecionado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione a matéria-prima e o lote que deverão ser considerados na geração do Plano
                de Corte para Múltiplos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(codeFilter || descFilter || batchFilter || centerFilter || locationFilter) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-[11px] text-slate-600 hover:text-slate-900 gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Limpar filtros
              </Button>
            )}
            <Badge variant="outline" className="text-xs font-mono text-slate-600 bg-slate-50">
              {filteredBatches.length} lote(s) compatível(is)
            </Badge>
          </div>
        </div>

        {highlightError && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <strong>Seleção Obrigatória:</strong> Selecione o material e o lote da matéria-prima
              antes de gerar o Plano de Corte para Múltiplos.
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Filtros rápidos client-side por coluna */}
        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-900" /> Filtros Rápidos (Pesquisa parcial)
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              Compatíveis com MP: <strong>{materialCode || 'Todas'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
            <div>
              <Input
                type="text"
                placeholder="Filtrar Cód. Material..."
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                className="h-7 text-xs bg-white"
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Filtrar Descrição..."
                value={descFilter}
                onChange={(e) => setDescFilter(e.target.value)}
                className="h-7 text-xs bg-white"
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Filtrar Lote..."
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="h-7 text-xs bg-white"
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Filtrar Centro..."
                value={centerFilter}
                onChange={(e) => setCenterFilter(e.target.value)}
                className="h-7 text-xs bg-white"
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Filtrar Depósito..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="h-7 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* Tabela responsiva de lotes compatíveis */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-2.5 text-center w-[60px]">Selecionar</th>
                <th className="p-2.5">Cód. Material</th>
                <th className="p-2.5">Descrição do Material</th>
                <th className="p-2.5">Lote</th>
                <th className="p-2.5 text-right">Estoque disponível</th>
                <th className="p-2.5 text-center">Unidade</th>
                <th className="p-2.5">Centro</th>
                <th className="p-2.5">Depósito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                      <span>Consultando lotes disponíveis no estoque...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-700">
                        Nenhum lote compatível encontrado para os filtros aplicados.
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Verifique o material selecionado ({materialCode}) ou limpe os filtros
                        rápidos.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const isSelected = selectedBatchNumber === b.batch_number
                  return (
                    <tr
                      key={`${b.material_code}-${b.batch_number}`}
                      onClick={() => onSelectBatch(b)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-100/70 hover:bg-blue-100 text-blue-950 font-semibold'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="radio"
                          name="selected_cutting_batch"
                          checked={isSelected}
                          onChange={() => onSelectBatch(b)}
                          className="w-4 h-4 text-blue-900 border-slate-300 focus:ring-blue-900 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-mono font-bold text-blue-950">{b.material_code}</td>
                      <td className="p-2.5 font-medium">{b.material_description}</td>
                      <td className="p-2.5 font-mono font-bold">
                        <Badge
                          variant="outline"
                          className={
                            isSelected
                              ? 'bg-blue-900 text-white border-blue-950'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }
                        >
                          {b.batch_number}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {b.available_stock.toLocaleString('pt-BR', {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-500 uppercase">
                        {b.unit}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{b.center_code}</td>
                      <td className="p-2.5 font-mono text-slate-600">{b.storage_location}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Resumo Obrigatório do Lote Selecionado */}
        {selectedItem ? (
          <div className="bg-gradient-to-r from-blue-900/10 via-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 text-xs shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <Sparkles className="w-4 h-4 text-blue-900" />
                  <span>
                    Material selecionado:{' '}
                    <strong className="font-mono text-blue-900">
                      {selectedItem.material_code}
                    </strong>{' '}
                    – {selectedItem.material_description}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-slate-700 font-medium">
                  <span>
                    Lote:{' '}
                    <strong className="font-mono text-blue-950 font-bold">
                      {selectedItem.batch_number}
                    </strong>
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span>
                    Estoque disponível:{' '}
                    <strong className="font-mono text-emerald-800 font-bold">
                      {selectedItem.available_stock.toLocaleString('pt-BR', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{' '}
                      {selectedItem.unit}
                    </strong>{' '}
                    ({selectedItem.available_stock_kg.toLocaleString('pt-BR')} kg)
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span>
                    Centro: <strong>{selectedItem.center_code}</strong> / Depósito:{' '}
                    <strong>{selectedItem.storage_location}</strong>
                  </span>
                </div>
              </div>

              {onClearSelection && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-7 text-[11px] text-blue-900 hover:text-blue-950 hover:bg-blue-100"
                >
                  Trocar Lote
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
            Nenhum lote selecionado. Clique em uma das linhas da tabela acima para selecionar o lote
            da matéria-prima para o Plano de Corte.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
