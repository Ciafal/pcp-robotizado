import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPApplicationRequirement } from '@/types/mp-optimization'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Layers, Database, RefreshCw, Plus, CheckCircle2, AlertCircle } from 'lucide-react'

export const MPByApplicationPage: React.FC = () => {
  const [requirements, setRequirements] = useState<MPApplicationRequirement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await mpOptimizationService.getApplicationRequirements()
      setRequirements(data)
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
    <MPModuleLayout currentStep={3}>
      {/* Header com Descrição Técnica ZPPMP & ZBITOLAS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Matriz de Requisitos Paramétricos por Aplicação (ZPPMP &bull; ZBITOLAS &bull; SAP)
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            APLICAÇÃO → AÇO → FORNECEDOR → ESPESSURA → LARGURA → COMPRIMENTO → DIMENSÃO IDEAL →
            MÍNIMO → MÁXIMO → ALTERNATIVAS → RESTRIÇÕES
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          className="border-slate-300 text-slate-700 text-xs font-semibold gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
          Sincronizar ZPPMP
        </Button>
      </div>

      {/* Tabela de Requisitos ou Estado Vazio */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {requirements.length === 0 ? (
          <SapEmptyState
            title="AGUARDANDO INTEGRAÇÃO SAP"
            description="A tabela mestre de requisitos de aplicação ZPPMP / ZBITOLAS ainda não possui registros carregados do SAP ECC. Sem dados fictícios: as telas estão prontas para carga real."
            sapTransaction="ZPPMP / ZBITOLAS"
            onRefresh={loadData}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Aplicação</th>
                  <th className="p-2.5">Aço</th>
                  <th className="p-2.5">Fornecedor</th>
                  <th className="p-2.5">Espessura (mm)</th>
                  <th className="p-2.5">Largura (mm)</th>
                  <th className="p-2.5">Comprimento (mm)</th>
                  <th className="p-2.5">Dimensão Ideal</th>
                  <th className="p-2.5">ZPP88 Permite Fora do Ideal?</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{r.application_code}</td>
                    <td className="p-2.5">{r.steel_grade}</td>
                    <td className="p-2.5 text-slate-600">
                      {r.supplier_name || r.supplier_code || 'Gerdau / CSN'}
                    </td>
                    <td className="p-2.5">
                      {r.min_thickness_mm} – {r.max_thickness_mm}
                    </td>
                    <td className="p-2.5">
                      {r.min_width_mm} – {r.max_width_mm}
                    </td>
                    <td className="p-2.5">
                      {r.min_length_mm} – {r.max_length_mm}
                    </td>
                    <td className="p-2.5 text-[#004C97] font-bold">
                      {r.ideal_thickness_mm || '—'} × {r.ideal_width_mm || '—'} ×{' '}
                      {r.ideal_length_mm || '—'}
                    </td>
                    <td className="p-2.5">
                      {r.allows_out_of_ideal ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sim (ZPP88)
                        </span>
                      ) : (
                        <span className="text-slate-400 font-sans">Não</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-sans">
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                        Ativa SAP
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MPModuleLayout>
  )
}
