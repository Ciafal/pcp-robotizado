import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Bell, AlertOctagon, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const AlertCenter: React.FC = () => {
  const { isAlertCenterOpen, setIsAlertCenterOpen, alerts, acknowledgeAlert } = useControlTower()

  if (!isAlertCenterOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 text-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#004C97]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Centro de Alertas & Diagnóstico de Causa-Raiz
          </h2>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAlertCenterOpen(false)}
          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Lista de Alertas Ricos */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
        {alerts.map((al) => {
          const isCritical = al.severity === 'CRITICAL'
          const isWarning = al.severity === 'WARNING' || al.severity === 'RISK'

          return (
            <div
              key={al.id}
              className={`p-3.5 rounded-xl border transition-all ${
                al.acknowledged
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : isCritical
                    ? 'bg-rose-50 border-rose-200'
                    : isWarning
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-bold text-slate-900 text-xs">{al.title}</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1 py-0 uppercase ${
                    isCritical
                      ? 'border-rose-300 text-rose-700 bg-rose-50'
                      : isWarning
                        ? 'border-amber-300 text-amber-700 bg-amber-50'
                        : 'border-slate-300 text-slate-700 bg-slate-50'
                  }`}
                >
                  {al.category}
                </Badge>
              </div>

              {/* Detalhes de Causa e Impacto */}
              <div className="space-y-1 text-[11px] text-slate-700">
                <div>
                  <strong className="text-slate-900">Causa-Raiz:</strong> {al.cause}
                </div>
                <div>
                  <strong className="text-slate-900">Impacto Previsto:</strong> {al.impact}
                </div>
                <div>
                  <strong className="text-slate-900">Afetados:</strong> {al.whoIsAffected}
                </div>
                <div>
                  <strong className="text-slate-900">Horizonte:</strong> {al.whenImpact}
                </div>

                {/* BLOCO C: Metadados Enriquecidos de Risco de Matéria-Prima */}
                {al.rawMaterialRiskData && (
                  <div className="mt-2 p-2.5 rounded bg-slate-900 text-slate-200 border border-slate-800 text-[10px] space-y-1 font-sans">
                    <div className="flex items-center justify-between text-amber-300 font-bold border-b border-slate-700 pb-1">
                      <span>Detalhes Risco de MP:</span>
                      <span className="font-mono">{al.rawMaterialRiskData.classification}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      <div>
                        <span className="text-slate-400">Empresa/Planta:</span>{' '}
                        <strong>
                          {al.rawMaterialRiskData.companyCode} / {al.rawMaterialRiskData.plantCode}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Linha:</span>{' '}
                        <strong className="text-amber-300 font-mono">
                          {al.rawMaterialRiskData.lineCode}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Data Produção:</span>{' '}
                        <strong className="font-mono">
                          {al.rawMaterialRiskData.productionDateStr}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Produto:</span>{' '}
                        <strong className="font-mono">{al.rawMaterialRiskData.productCode}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Qtd Produção:</span>{' '}
                        <strong className="font-mono text-emerald-400">
                          {al.rawMaterialRiskData.productionTons} t
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">MP / Tipo:</span>{' '}
                        <strong className="font-mono">
                          {al.rawMaterialRiskData.rawMaterialCode}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Necessária:</span>{' '}
                        <strong className="font-mono text-blue-300">
                          {al.rawMaterialRiskData.requiredMpTons} t
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Programada:</span>{' '}
                        <strong className="font-mono text-white">
                          {al.rawMaterialRiskData.programmedMpTons} t
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Estoque SAP:</span>{' '}
                        <strong className="font-mono">
                          {al.rawMaterialRiskData.currentStockTons !== null
                            ? `${al.rawMaterialRiskData.currentStockTons} t`
                            : 'N/D'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Entradas / PCP:</span>{' '}
                        <strong className="font-mono">
                          {al.rawMaterialRiskData.supplierReceiptsTons !== null
                            ? `${al.rawMaterialRiskData.supplierReceiptsTons} t`
                            : 'N/D'}{' '}
                          /{' '}
                          {al.rawMaterialRiskData.pcpUpstreamTons > 0
                            ? `${al.rawMaterialRiskData.pcpUpstreamTons} t`
                            : '0 t'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Saldo Projetado:</span>{' '}
                        <strong
                          className={`font-mono ${
                            al.rawMaterialRiskData.projectedBalanceTons !== null &&
                            al.rawMaterialRiskData.projectedBalanceTons < 0
                              ? 'text-rose-400 font-bold'
                              : 'text-emerald-300'
                          }`}
                        >
                          {al.rawMaterialRiskData.projectedBalanceTons !== null
                            ? `${al.rawMaterialRiskData.projectedBalanceTons} t`
                            : 'N/D'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Déficit:</span>{' '}
                        <strong
                          className={`font-mono ${
                            al.rawMaterialRiskData.deficitTons > 0
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          {al.rawMaterialRiskData.deficitTons} t
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {al.aiConfidencePct && (
                  <div className="text-[#004C97] font-mono text-[10px] pt-1 font-semibold">
                    Confiança da Projeção IA: <strong>{al.aiConfidencePct}%</strong>
                  </div>
                )}
              </div>

              {/* Botão de Reconhecer */}
              <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <span>{al.timestamp}</span>

                {!al.acknowledged ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => acknowledgeAlert(al.id)}
                    className="h-6 px-2 text-[10px] text-[#004C97] hover:text-blue-900 hover:bg-blue-50"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Reconhecer Alerta
                  </Button>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Reconhecido
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
