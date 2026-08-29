import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPDimensionalItem, MPApplicationRequirement } from '@/types/mp-optimization'
import { ClassificationBadge } from '@/components/mp-optimization/ClassificationBadge'
import { ZPP88OutOfIdealModal } from '@/components/mp-optimization/ZPP88OutOfIdealModal'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Microscope, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'

export const MPOutOfIdealPage: React.FC = () => {
  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [requirements, setRequirements] = useState<MPApplicationRequirement[]>([])
  const [selectedItem, setSelectedItem] = useState<MPDimensionalItem | null>(null)
  const [isZPP88ModalOpen, setIsZPP88ModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [inv, reqs] = await Promise.all([
        mpOptimizationService.getDimensionalInventory(),
        mpOptimizationService.getApplicationRequirements(),
      ])
      // Filtra itens com desvio dimensional ou Nível 3/4
      setItems(
        inv.filter(
          (i) =>
            i.dimensional_classification === 'NIVEL_3_FORA_IDEAL_CONFORME' ||
            i.dimensional_classification === 'NIVEL_4_EXCECAO_TECNICA',
        ),
      )
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

  return (
    <MPModuleLayout currentStep={8}>
      {/* Header com Conceito ZPP88 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#004C97]">
            <Microscope className="w-4 h-4" />
            <span>TRANSAÇÃO SAP ZPP88 &bull; VALIDAÇÃO DE SEGUNDA ETAPA</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Peças Fora do Padrão Ideal com Produto Final Projetado Conforme
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            "FORA DO IDEAL" não é automaticamente REPROVADO. Quando o bloco estiver fora da faixa
            ideal da MP, a engenharia avalia a cadeia de laminação, perdas e tolerâncias. Se o
            produto final projetado for conforme, o material é liberado como Nível 3.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          className="border-slate-300 text-slate-700 text-xs font-semibold gap-1.5 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
          Atualizar ZPP88
        </Button>
      </div>

      {/* Tabela de Peças em Análise ZPP88 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {items.length === 0 ? (
          <SapEmptyState
            title="AGUARDANDO INTEGRAÇÃO SAP"
            description="Não há peças fora da faixa ideal pendentes de avaliação ZPP88 no momento."
            sapTransaction="ZPP88 / ZPPMP"
            onRefresh={loadData}
          />
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      Bloco {it.block_number || it.material_code}
                    </span>
                    <ClassificationBadge classification={it.dimensional_classification} size="sm" />
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Dimensão Real: {it.thickness_mm} × {it.width_mm} × {it.length_mm} mm &bull;{' '}
                    <strong>{it.weight_kg} kg</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">
                    Aplicação Pretendida: <strong>{it.current_application}</strong> &bull; Centro:{' '}
                    <strong>{it.center_code}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedItem(it)
                      setIsZPP88ModalOpen(true)
                    }}
                    className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs gap-1.5"
                  >
                    <Microscope className="w-3.5 h-3.5" />
                    AVALIAR PEÇA FORA DO PADRÃO (ZPP88)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ZPP88OutOfIdealModal
        isOpen={isZPP88ModalOpen}
        onClose={() => setIsZPP88ModalOpen(false)}
        item={selectedItem}
        targetRequirement={requirements[0] || null}
        onApprovedAsConforming={loadData}
      />
    </MPModuleLayout>
  )
}
