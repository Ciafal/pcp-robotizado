import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, RotateCcw, AlertCircle, Barcode, Calendar } from 'lucide-react'

interface BatchFilterBarProps {
  lote: string
  setLote: (val: string) => void
  dataInicial: string
  setDataInicial: (val: string) => void
  dataFinal: string
  setDataFinal: (val: string) => void
  materialCode: string
  setMaterialCode: (val: string) => void
  onSearch: () => void
  onClear: () => void
  isLoading: boolean
  validationError: string | null
}

export const BatchFilterBar: React.FC<BatchFilterBarProps> = ({
  lote,
  setLote,
  dataInicial,
  setDataInicial,
  dataFinal,
  setDataFinal,
  materialCode,
  setMaterialCode,
  onSearch,
  onClear,
  isLoading,
  validationError,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch()
  }

  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-50 text-[#004C97]">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Consulta de Movimentações</h2>
                <p className="text-xs text-slate-500">
                  Rastreabilidade contábil SAP (MB51) e física RFID/WMS por lote de produção
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClear}
                disabled={isLoading}
                className="text-slate-600 border-slate-300 hover:bg-slate-50 text-xs h-9"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Limpar filtros
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-semibold h-9 px-4 shadow-sm"
              >
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Consultando...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 mr-1" />
                    Consultar
                  </span>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Campo 1: Número do Lote (OBRIGATÓRIO) */}
            <div>
              <Label
                htmlFor="batch-number"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <span>Número do Lote</span>
                <span className="text-rose-600 font-bold">*</span>
                <span className="text-[10px] text-slate-400 font-normal">(Leitor / Digitação)</span>
              </Label>
              <div className="relative mt-1">
                <Input
                  id="batch-number"
                  placeholder="Ex.: LOTE-2025-001 ou L12345"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  className={`pr-8 h-9 text-xs font-mono font-medium ${
                    validationError && !lote.trim()
                      ? 'border-rose-500 ring-1 ring-rose-500 focus-visible:ring-rose-500'
                      : 'border-slate-300 focus-visible:ring-[#004C97]'
                  }`}
                  autoFocus
                />
                <Barcode className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Campo 2: Código do Material (Opcional) */}
            <div>
              <Label
                htmlFor="material-code"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <span>Código do Material</span>
                <span className="text-[10px] text-slate-400 font-normal">(SAP ECC - Opcional)</span>
              </Label>
              <div className="mt-1">
                <Input
                  id="material-code"
                  placeholder="Ex.: 10004523 ou CA-50"
                  value={materialCode}
                  onChange={(e) => setMaterialCode(e.target.value)}
                  className="h-9 text-xs border-slate-300 focus-visible:ring-[#004C97]"
                />
              </div>
            </div>

            {/* Campo 3: Data Inicial (Opcional) */}
            <div>
              <Label
                htmlFor="date-start"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <span>Data Inicial</span>
                <span className="text-[10px] text-slate-400 font-normal">(dd/mm/aaaa)</span>
              </Label>
              <div className="relative mt-1">
                <Input
                  id="date-start"
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="h-9 text-xs border-slate-300 focus-visible:ring-[#004C97]"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none hidden sm:block" />
              </div>
            </div>

            {/* Campo 4: Data Final (Opcional) */}
            <div>
              <Label
                htmlFor="date-end"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <span>Data Final</span>
                <span className="text-[10px] text-slate-400 font-normal">(dd/mm/aaaa)</span>
              </Label>
              <div className="relative mt-1">
                <Input
                  id="date-end"
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="h-9 text-xs border-slate-300 focus-visible:ring-[#004C97]"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none hidden sm:block" />
              </div>
            </div>
          </div>

          {/* Mensagem de Validação Obrigatória */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span className="font-medium">{validationError}</span>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
