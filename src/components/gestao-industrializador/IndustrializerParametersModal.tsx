import React, { useState } from 'react'
import { X, Sliders, Save, RotateCcw, Shield, Info, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ThresholdParameters,
  DEFAULT_THRESHOLDS,
  gestaoIndustrializadorService,
} from '@/services/gestao-industrializador-service'

interface ParametersModalProps {
  isOpen: boolean
  onClose: () => void
  currentThresholds: ThresholdParameters
  onSave: (params: ThresholdParameters) => void
}

export const IndustrializerParametersModal: React.FC<ParametersModalProps> = ({
  isOpen,
  onClose,
  currentThresholds,
  onSave,
}) => {
  const [params, setParams] = useState<ThresholdParameters>({ ...currentThresholds })
  const [savedSuccess, setSavedSuccess] = useState(false)

  if (!isOpen) return null

  const handleResetDefaults = () => {
    setParams({ ...DEFAULT_THRESHOLDS })
  }

  const handleSave = async () => {
    onSave(params)
    await gestaoIndustrializadorService.registerAuditLog({
      action: 'ALTERACAO_PARAMETROS_SEMAFORO_INDUSTRIALIZADOR',
      resource: 'PARAMETROS_LIMITES',
      changes: {
        previous: currentThresholds,
        current: params,
      },
      details: {
        reason: 'Ajuste de tolerâncias parametrizadas para gestão do industrializador',
      },
    })
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      onClose()
    }, 900)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 border border-[#004C97]/20 flex items-center justify-center text-[#004C97]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Parâmetros do Semáforo & Alertas
              </h2>
              <p className="text-[11px] text-slate-500">
                Limites operacionais parametrizados (sem valores hardcodados)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-7 h-7 p-0 rounded-full text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
            <div>
              Regra da CIAFAL: Todos os semáforos (Verde/Amarelo/Vermelho) e limiares de corte são
              calculados dinamicamente com base nestes parâmetros auditados.
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2.5">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Autonomia de Matéria-Prima (Dias de Cobertura)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Mínimo para Verde (&ge; dias)
                  </label>
                  <input
                    type="number"
                    value={params.autonomy_green_days}
                    onChange={(e) =>
                      setParams({ ...params, autonomy_green_days: Number(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white font-mono text-slate-800 focus:ring-1 focus:ring-[#004C97]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Limite Alerta Amarelo (&lt; dias)
                  </label>
                  <input
                    type="number"
                    value={params.autonomy_yellow_days}
                    onChange={(e) =>
                      setParams({ ...params, autonomy_yellow_days: Number(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white font-mono text-slate-800 focus:ring-1 focus:ring-[#004C97]"
                  />
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2.5">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Aderência ao Sequenciamento Previsto &times; Realizado (%)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Meta Verde (&ge; %)
                  </label>
                  <input
                    type="number"
                    value={params.adherence_green_pct}
                    onChange={(e) =>
                      setParams({ ...params, adherence_green_pct: Number(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white font-mono text-slate-800 focus:ring-1 focus:ring-[#004C97]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Alerta Amarelo (&lt; %)
                  </label>
                  <input
                    type="number"
                    value={params.adherence_yellow_pct}
                    onChange={(e) =>
                      setParams({ ...params, adherence_yellow_pct: Number(e.target.value) || 0 })
                    }
                    className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white font-mono text-slate-800 focus:ring-1 focus:ring-[#004C97]"
                  />
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2.5">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Estoque Parado sem Movimentação (Dias)
              </span>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Limite máximo de dias antes de gerar alerta de estagnação
                </label>
                <input
                  type="number"
                  value={params.max_days_without_movement}
                  onChange={(e) =>
                    setParams({ ...params, max_days_without_movement: Number(e.target.value) || 0 })
                  }
                  className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white font-mono text-slate-800 focus:ring-1 focus:ring-[#004C97]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-slate-600 hover:text-slate-900 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrões
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-semibold"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  Salvo com Sucesso!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Salvar Parâmetros
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default IndustrializerParametersModal
