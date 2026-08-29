import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { MP3DCanvasViewer } from '@/components/mp-optimization/MP3DCanvasViewer'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPDimensionalItem } from '@/types/mp-optimization'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Maximize2, Box, Layers, RefreshCw, Sparkles, Sliders } from 'lucide-react'

export const MPProjection3DPage: React.FC = () => {
  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MPDimensionalItem | null>(null)
  const [activeTab, setActiveTab] = useState<
    'NUVEM' | 'GEMEO' | 'PLANO' | 'REAPLICACAO' | 'TRANSFORMACAO'
  >('GEMEO')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const inv = await mpOptimizationService.getDimensionalInventory()
      setItems(inv)
      if (inv.length > 0) setSelectedItem(inv[0])
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <MPModuleLayout currentStep={10}>
      {/* 5 Abas de Visualização 3D Conforme Especificação */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant={activeTab === 'GEMEO' ? 'default' : 'ghost'}
            className={`text-xs font-bold ${activeTab === 'GEMEO' ? 'bg-[#004C97] text-white' : 'text-slate-600'}`}
            onClick={() => setActiveTab('GEMEO')}
          >
            (b) Gêmeo Digital Dimensional
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'PLANO' ? 'default' : 'ghost'}
            className={`text-xs font-bold ${activeTab === 'PLANO' ? 'bg-[#004C97] text-white' : 'text-slate-600'}`}
            onClick={() => setActiveTab('PLANO')}
          >
            (c) Projeção 3D Plano de Corte
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'REAPLICACAO' ? 'default' : 'ghost'}
            className={`text-xs font-bold ${activeTab === 'REAPLICACAO' ? 'bg-[#004C97] text-white' : 'text-slate-600'}`}
            onClick={() => setActiveTab('REAPLICACAO')}
          >
            (d) Projeção 3D de Reaplicação
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'TRANSFORMACAO' ? 'default' : 'ghost'}
            className={`text-xs font-bold ${activeTab === 'TRANSFORMACAO' ? 'bg-[#004C97] text-white' : 'text-slate-600'}`}
            onClick={() => setActiveTab('TRANSFORMACAO')}
          >
            (e) Projeção 3D da Transformação
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'NUVEM' ? 'default' : 'ghost'}
            className={`text-xs font-bold ${activeTab === 'NUVEM' ? 'bg-[#004C97] text-white' : 'text-slate-600'}`}
            onClick={() => setActiveTab('NUVEM')}
          >
            (a) Nuvem Dimensional XYZ
          </Button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          className="border-slate-300 text-slate-700 text-xs font-semibold gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
          Recarregar Malha 3D
        </Button>
      </div>

      {/* Visualizador 3D Integrado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-9">
          <MP3DCanvasViewer
            title={`Ambiente 3D Interativo — ${
              activeTab === 'GEMEO'
                ? 'Gêmeo Digital Proporcional'
                : activeTab === 'PLANO'
                  ? 'Layout Tridimensional de Corte e Sobras'
                  : activeTab === 'REAPLICACAO'
                    ? 'Envelope Ideal vs Admissível'
                    : activeTab === 'TRANSFORMACAO'
                      ? 'Cadeia de Transformação Dimensional Fabril'
                      : 'Nuvem Dimensional XYZ de Blocos Reais'
            }`}
            plate={
              selectedItem
                ? {
                    thickness: selectedItem.thickness_mm,
                    width: selectedItem.width_mm,
                    length: selectedItem.length_mm,
                    weight: selectedItem.weight_kg,
                    label: `Bloco ${selectedItem.block_number} (${selectedItem.steel_grade || 'SAE 1045'})`,
                  }
                : undefined
            }
            envelopeIdeal={
              activeTab === 'REAPLICACAO'
                ? {
                    min_thickness: 120,
                    max_thickness: 160,
                    min_width: 1000,
                    max_width: 1300,
                    min_length: 2800,
                    max_length: 3200,
                  }
                : undefined
            }
          />
        </div>

        {/* Painel Lateral de Seleção e Informação */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span>Unidade em Foco</span>
            <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono">
              3D Proporcional
            </Badge>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-6 text-slate-400 font-mono text-[11px]">
              Sem blocos carregados do SAP.
            </div>
          ) : (
            <div className="space-y-2">
              {items.slice(0, 5).map((it) => (
                <div
                  key={it.id}
                  onClick={() => setSelectedItem(it)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedItem?.id === it.id
                      ? 'border-[#004C97] bg-blue-50/70 font-bold text-[#004C97]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-mono text-[11px]">
                    Bloco {it.block_number || it.material_code}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {it.thickness_mm}×{it.width_mm}×{it.length_mm} mm &bull; {it.weight_kg} kg
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-[11px] text-slate-600">
            <span className="font-bold text-slate-900 block">Renderizador 3D Vetorial</span>
            <p>
              Representação em escala real com tolerância de corte, kerf e sobremetal para simulação
              precisa.
            </p>
          </div>
        </div>
      </div>
    </MPModuleLayout>
  )
}
