import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react'
import type { ProductionOrder, ProductionMassValidationItem } from '@/types/pcp-production'
import { pcpProductionService } from '@/services/pcp-production-service'
import { formatQuantity } from '@/lib/formatters-ptbr'

interface MassCloseModalProps {
  isOpen: boolean
  onClose: () => void
  selectedOrders: ProductionOrder[]
  onSuccess: (result: {
    batch_id: string
    summary: { total: number; success: number; failed: number }
    results: any[]
  }) => void
}

export const MassCloseModal: React.FC<MassCloseModalProps> = ({
  isOpen,
  onClose,
  selectedOrders,
  onSuccess,
}) => {
  const [validating, setValidating] = useState(false)
  const [validationItems, setValidationItems] = useState<ProductionMassValidationItem[]>([])
  const [summary, setSummary] = useState<{
    total_selected: number
    aptas: number
    com_pendencias: number
    ja_encerradas: number
  }>({
    total_selected: 0,
    aptas: 0,
    com_pendencias: 0,
    ja_encerradas: 0,
  })

  // Seleção individual de OPs dentre as aptas
  const [checkedOpNumbers, setCheckedOpNumbers] = useState<Set<string>>(new Set())

  // Etapa de confirmação explícita antes de enviar ao SAP ECC
  const [showConfirmStep, setShowConfirmStep] = useState(false)
  const [closing, setClosing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Pré-validação automática ao abrir
  useEffect(() => {
    if (isOpen && selectedOrders.length > 0) {
      setValidating(true)
      setErrorMessage(null)
      setShowConfirmStep(false)
      const opNumbers = selectedOrders.map((o) => o.op_number)

      pcpProductionService
        .validateOrdersForClosure(opNumbers)
        .then((res) => {
          if (res && res.results) {
            setValidationItems(res.results)
            setSummary(
              res.summary || {
                total_selected: opNumbers.length,
                aptas: res.results.filter((r) => r.is_eligible).length,
                com_pendencias: res.results.filter((r) => r.status_category === 'COM_PENDENCIA')
                  .length,
                ja_encerradas: res.results.filter((r) => r.status_category === 'JA_ENCERRADA')
                  .length,
              },
            )
            // Marcar por padrão apenas as elegíveis/aptas
            const eligibleSet = new Set(
              res.results.filter((r) => r.is_eligible).map((r) => r.op_number),
            )
            setCheckedOpNumbers(eligibleSet)
          }
        })
        .catch((err) => {
          console.error('Erro na pré-validação:', err)
          setErrorMessage('Erro ao pré-validar ordens de produção.')
        })
        .finally(() => {
          setValidating(false)
        })
    } else {
      setShowConfirmStep(false)
    }
  }, [isOpen, selectedOrders])

  if (!isOpen) return null

  const handleToggleOp = (opNumber: string, isEligible: boolean) => {
    if (!isEligible) return // Não permite marcar ordens bloqueadas ou já encerradas
    const next = new Set(checkedOpNumbers)
    if (next.has(opNumber)) {
      next.delete(opNumber)
    } else {
      next.add(opNumber)
    }
    setCheckedOpNumbers(next)
  }

  const handleToggleSelectAllEligible = () => {
    const eligibleOps = validationItems.filter((i) => i.is_eligible).map((i) => i.op_number)
    const allSelected = eligibleOps.every((op) => checkedOpNumbers.has(op))
    if (allSelected) {
      setCheckedOpNumbers(new Set())
    } else {
      setCheckedOpNumbers(new Set(eligibleOps))
    }
  }

  const eligibleItems = validationItems.filter((i) => i.is_eligible)
  const isAllEligibleSelected =
    eligibleItems.length > 0 && eligibleItems.every((i) => checkedOpNumbers.has(i.op_number))

  // Execução final de encerramento em massa
  const handleExecuteClosure = async () => {
    if (closing || checkedOpNumbers.size === 0) return
    setClosing(true)
    setErrorMessage(null)

    try {
      const ordersToClose = validationItems
        .filter((i) => checkedOpNumbers.has(i.op_number))
        .map((i) => ({
          op_number: i.op_number,
          current_status: i.status_op,
        }))

      const response = await pcpProductionService.executeMassClose({
        orders: ordersToClose,
      })

      onSuccess(response)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao executar encerramento em massa no SAP.')
      setShowConfirmStep(false)
    } finally {
      setClosing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !closing && !validating && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Encerramento Técnico de Ordens de Produção (TECO)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Pré-validação analítica das travas de fechamento antes da sincronização no SAP ECC.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {validating ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#004C97] animate-spin" />
            <p className="text-sm font-medium text-slate-700">
              Validando pendências COGI, CO1P, saldos residuais e divergências MES x SAP...
            </p>
            <p className="text-xs text-slate-500">
              Consultando regras corporativas de encerramento no backend...
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* RESUMO DE VALIDAÇÃO (CARDS) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg border bg-slate-50 border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Selecionadas
                </span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {summary.total_selected}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-emerald-50 border-emerald-200">
                <span className="text-[10px] uppercase font-semibold text-emerald-700 block">
                  Aptas p/ Fechamento
                </span>
                <span className="text-lg font-bold font-mono text-emerald-800">
                  {summary.aptas}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-rose-50 border-rose-200">
                <span className="text-[10px] uppercase font-semibold text-rose-700 block">
                  Com Pendências
                </span>
                <span className="text-lg font-bold font-mono text-rose-800">
                  {summary.com_pendencias}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-amber-50 border-amber-200">
                <span className="text-[10px] uppercase font-semibold text-amber-700 block">
                  Já Encerradas
                </span>
                <span className="text-lg font-bold font-mono text-amber-800">
                  {summary.ja_encerradas}
                </span>
              </div>
            </div>

            {/* CONFIRMAÇÃO EXPLÍCITA */}
            {showConfirmStep ? (
              <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-rose-900">
                      Confirmação Explícita de Encerramento (TECO)
                    </h3>
                    <p className="text-xs text-rose-800 mt-1">
                      Você está prestes a encerrar <strong>{checkedOpNumbers.size}</strong> Ordens
                      de Produção.
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      Esta operação alterará o status das ordens no <strong>SAP ECC</strong>{' '}
                      definitivamente para Fechada Tecnicamente (TECO). Nenhuma OP com saldo
                      indevido ou pendência COGI/CO1P será processada.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-rose-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirmStep(false)}
                    disabled={closing}
                    className="h-8 text-xs bg-white text-slate-700"
                  >
                    Voltar para lista
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExecuteClosure}
                    disabled={closing}
                    className="h-8 text-xs bg-rose-700 hover:bg-rose-800 text-white font-semibold"
                  >
                    {closing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Encerrando no SAP...
                      </>
                    ) : (
                      'Confirmar encerramento'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* TABELA DE PRÉ-VALIDAÇÃO */
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-2.5 bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-eligible"
                      checked={isAllEligibleSelected}
                      onCheckedChange={handleToggleSelectAllEligible}
                      disabled={eligibleItems.length === 0}
                    />
                    <label htmlFor="select-all-eligible" className="cursor-pointer">
                      Selecionar todas as aptas ({checkedOpNumbers.size} selecionadas)
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Apenas ordens 🟢 Aptas podem ser marcadas
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 border-b sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">Sel.</th>
                        <th className="py-2 px-3 font-semibold">OP</th>
                        <th className="py-2 px-3 font-semibold">Material</th>
                        <th className="py-2 px-3 font-semibold">Centro</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                        <th className="py-2 px-3 font-semibold">Resultado da Validação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationItems.map((item) => {
                        const isChecked = checkedOpNumbers.has(item.op_number)

                        return (
                          <tr
                            key={item.op_number}
                            className={`transition-colors ${
                              item.is_eligible
                                ? 'hover:bg-emerald-50/40'
                                : 'bg-slate-50/60 opacity-80'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() =>
                                  handleToggleOp(item.op_number, item.is_eligible)
                                }
                                disabled={!item.is_eligible}
                              />
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-[#004C97] whitespace-nowrap">
                              {item.op_number}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-mono text-[11px] text-slate-800">
                                {item.material_code}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                {item.material_description}
                              </div>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-700">
                              {item.centro_code}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px]">
                              <Badge variant="outline" className="text-[10px]">
                                {item.status_op}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              {item.is_eligible ? (
                                <div className="flex items-center gap-1.5 text-emerald-700">
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 text-[10px] font-semibold">
                                    🟢 Apta
                                  </Badge>
                                  <span className="text-[11px] text-slate-600">
                                    Sem pendências de integração
                                  </span>
                                </div>
                              ) : item.status_category === 'JA_ENCERRADA' ? (
                                <div className="flex items-center gap-1.5 text-amber-700">
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 text-[10px] font-semibold">
                                    🟡 Já encerrada
                                  </Badge>
                                  <span className="text-[11px] text-slate-600">
                                    Ordem já possui TECO no SAP ECC
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 text-[10px] font-semibold">
                                      🔴{' '}
                                      {item.block_reasons[0]?.includes('COGI')
                                        ? 'Pendência COGI'
                                        : item.block_reasons[0]?.includes('CO1P')
                                          ? 'Pendência CO1P'
                                          : item.block_reasons[0]?.includes(
                                                'sem nenhuma confirmação',
                                              )
                                            ? 'Quantidade ainda não confirmada'
                                            : item.block_reasons[0]?.includes('Confirmação Final')
                                              ? 'Confirmação final inexistente'
                                              : 'Bloqueada'}
                                    </Badge>
                                  </div>
                                  {item.block_reasons.map((r, rIdx) => (
                                    <div
                                      key={rIdx}
                                      className="text-[10px] text-rose-700 leading-tight"
                                    >
                                      • {r}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!showConfirmStep && (
          <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={closing || validating}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setShowConfirmStep(true)}
              disabled={closing || validating || checkedOpNumbers.size === 0}
              className="text-xs bg-rose-700 hover:bg-rose-800 text-white font-semibold"
            >
              Continuar com as elegíveis ({checkedOpNumbers.size} OPs)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default MassCloseModal
