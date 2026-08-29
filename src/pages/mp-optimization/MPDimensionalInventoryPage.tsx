import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPDimensionalItem, MPApplicationRequirement } from '@/types/mp-optimization'
import { ClassificationBadge } from '@/components/mp-optimization/ClassificationBadge'
import { ZPP86ModifyApplicationModal } from '@/components/mp-optimization/ZPP86ModifyApplicationModal'
import { ZPP88OutOfIdealModal } from '@/components/mp-optimization/ZPP88OutOfIdealModal'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Boxes,
  Search,
  Filter,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Eye,
  AlertTriangle,
} from 'lucide-react'

export const MPDimensionalInventoryPage: React.FC = () => {
  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [requirements, setRequirements] = useState<MPApplicationRequirement[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)

  const [selectedItem, setSelectedItem] = useState<MPDimensionalItem | null>(null)
  const [isZPP86Open, setIsZPP86Open] = useState(false)
  const [isZPP88Open, setIsZPP88Open] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [inv, reqs] = await Promise.all([
        mpOptimizationService.getDimensionalInventory(),
        mpOptimizationService.getApplicationRequirements(),
      ])
      setItems(inv)
      setRequirements(reqs)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredItems = items.filter((it) => {
    const matchesSearch =
      (it.block_number && it.block_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (it.material_code && it.material_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (it.current_application &&
        it.current_application.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'ALL' || it.sap_block_status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <MPModuleLayout currentStep={5}>
      {/* Header com Filtros do Estoque Rastreável */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#004C97]" />
              Estoque Dimensional Rastreável por Unidade Física (Placas, Blocos, Peças, Sobras)
            </h2>
            <p className="text-xs text-slate-500">
              Preservação obrigatória de Aplicação Original ZPP86 &bull; Depósitos TRAUML &bull;
              Movimento 261 SAP.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="border-slate-300 text-slate-700 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
            Sincronizar Estoque
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por Nº Bloco, Corrida, Material, Aplicação..."
              className="pl-9 h-8 text-xs bg-white border-slate-300"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Status SAP:</span>
            {['ALL', '01_DISPONIVEL', '02_SELECIONADO_ENVIO', '04_MP_CIAFAL', '05_FORNO'].map(
              (st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={statusFilter === st ? 'default' : 'outline'}
                  className={`h-7 px-2 text-[11px] ${
                    statusFilter === st
                      ? 'bg-[#004C97] text-white font-bold'
                      : 'border-slate-200 text-slate-600'
                  }`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'ALL' ? 'Todos' : st}
                </Button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Unidades Físicas Rastreáveis ou Estado Vazio */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {filteredItems.length === 0 ? (
          <SapEmptyState
            title="AGUARDANDO INTEGRAÇÃO SAP"
            description="Não há unidades de matéria-prima cadastradas neste filtro no momento. Não são utilizados dados simulados permanentes."
            sapTransaction="ZPP86 / MB52 / ZMM029"
            onRefresh={loadData}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Nº Bloco / Corrida</th>
                  <th className="p-2.5">Centro / Dep.</th>
                  <th className="p-2.5">Aço</th>
                  <th className="p-2.5">Dimensões (mm)</th>
                  <th className="p-2.5">Peso (kg)</th>
                  <th className="p-2.5">Aplicação Original</th>
                  <th className="p-2.5">Aplicação Atual</th>
                  <th className="p-2.5">Status SAP</th>
                  <th className="p-2.5">Classificação</th>
                  <th className="p-2.5 text-right">Ações ZPP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">
                      {it.block_number || it.material_code}{' '}
                      {it.heat_number ? `(${it.heat_number})` : ''}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {it.center_code} / {it.storage_location || 'MP01'}
                    </td>
                    <td className="p-2.5">{it.steel_grade || 'SAE 1045'}</td>
                    <td className="p-2.5 font-bold text-[#004C97]">
                      {it.thickness_mm} × {it.width_mm} × {it.length_mm}
                    </td>
                    <td className="p-2.5 font-bold text-slate-800">{it.weight_kg} kg</td>
                    <td className="p-2.5 font-bold text-slate-600">
                      <Badge variant="outline" className="text-[10px] bg-slate-50">
                        {it.original_application}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-bold text-blue-900">{it.current_application}</td>
                    <td className="p-2.5 font-sans">
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          it.sap_block_status === '01_DISPONIVEL'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {it.sap_block_status}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-sans">
                      <ClassificationBadge
                        classification={it.dimensional_classification}
                        size="sm"
                      />
                    </td>
                    <td className="p-2.5 text-right font-sans space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(it)
                          setIsZPP86Open(true)
                        }}
                        className="h-7 text-[10px] font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <Sliders className="w-3 h-3 text-[#004C97] mr-1" />
                        ZPP86
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(it)
                          setIsZPP88Open(true)
                        }}
                        className="h-7 text-[10px] font-bold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                      >
                        <ShieldCheck className="w-3 h-3 text-amber-700 mr-1" />
                        ZPP88
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais ZPP86 e ZPP88 */}
      <ZPP86ModifyApplicationModal
        isOpen={isZPP86Open}
        onClose={() => setIsZPP86Open(false)}
        item={selectedItem}
        availableRequirements={requirements}
        onSuccess={loadData}
      />

      <ZPP88OutOfIdealModal
        isOpen={isZPP88Open}
        onClose={() => setIsZPP88Open(false)}
        item={selectedItem}
        targetRequirement={requirements[0] || null}
        onApprovedAsConforming={loadData}
      />
    </MPModuleLayout>
  )
}
