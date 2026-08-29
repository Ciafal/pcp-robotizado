import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPDimensionalItem, MPReapplicationOpportunity } from '@/types/mp-optimization'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Scissors,
  Sparkles,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react'

export const MPExistingCutsPage: React.FC = () => {
  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const inv = await mpOptimizationService.getDimensionalInventory()
      setItems(
        inv.filter(
          (i) =>
            i.item_type === 'BLOCO' ||
            i.item_type === 'PECA' ||
            i.item_type === 'SOBRA_REUTILIZAVEL',
        ),
      )
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
    <MPModuleLayout currentStep={6}>
      {/* Pergunta Chave da IA no Topo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 border border-blue-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#004C97]">
            <HelpCircle className="w-4 h-4" />
            <span>PERGUNTA DIRETRIZ DO MOTOR DE IA</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            "Este material precisa continuar preso à aplicação original?"
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            A IA avalia blocos já cortados cruzando: dimensão real + aplicação original + aplicação
            atual + carteira atual/futura + programação das linhas + custo de oportunidade + risco
            de ruptura.
          </p>
        </div>

        <Badge className="bg-[#004C97] text-white text-xs font-bold font-mono px-3 py-1 shrink-0">
          Análise Dinâmica SAP
        </Badge>
      </div>

      {/* Lista de Blocos Cortados e Diagnóstico de Liberação */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Blocos e Sobras Cortadas Disponíveis para Reavaliação
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Identificação de Oportunidades de Liberação: APLICAÇÃO A → APLICAÇÃO B
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <SapEmptyState
            title="AGUARDANDO INTEGRAÇÃO SAP"
            description="Não existem blocos cortados no estoque físico aptos para reavaliação no momento. As regras não admitem dados fictícios."
            sapTransaction="ZPP86 / ZPPT058"
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
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-blue-50 text-[#004C97] border-blue-200"
                    >
                      {it.steel_grade || 'SAE 1045'}
                    </Badge>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    {it.thickness_mm} × {it.width_mm} × {it.length_mm} mm &bull;{' '}
                    <strong>{it.weight_kg} kg</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">
                    Aplicação Original (ZPP86): <strong>{it.original_application}</strong> &bull;
                    Atual: <strong>{it.current_application}</strong>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-sans space-y-1 sm:max-w-xs">
                  <div className="font-bold text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Oportunidade A → B Identificada</span>
                  </div>
                  <p className="text-[10px] text-emerald-800 leading-snug">
                    Material pode atender pedido prioritário da Linha 02 economizando novo corte de
                    placa inteira.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MPModuleLayout>
  )
}
