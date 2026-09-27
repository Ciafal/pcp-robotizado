import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import {
  InventoryDemandPriority,
  CreateDemandPayload,
  InventoryDemand,
} from '@/types/pcp-inventory-demands'
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react'

interface NovaDemandaInventarioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (demanda: InventoryDemand) => void
}

export const NovaDemandaInventarioModal: React.FC<NovaDemandaInventarioModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast()

  const [company, setCompany] = useState<string>('CIAFAL')
  const [line, setLine] = useState<string>('L1')
  const [center, setCenter] = useState<string>('FORNOL1')
  const [storageDeposit, setStorageDeposit] = useState<string>('DP07')
  const [materialCode, setMaterialCode] = useState<string>('')
  const [materialDescription, setMaterialDescription] = useState<string>('')
  const [priority, setPriority] = useState<InventoryDemandPriority>('Normal')
  const [gauge, setGauge] = useState<string>('Tarugo 130mm')
  const [application, setApplication] = useState<string>('Laminação L1')
  const [runNumber, setRunNumber] = useState<string>('')
  const [quantityRequired, setQuantityRequired] = useState<string>('')
  const [observation, setObservation] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(false)
  const [errorField, setErrorField] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleReset = () => {
    setCompany('CIAFAL')
    setLine('L1')
    setCenter('FORNOL1')
    setStorageDeposit('DP07')
    setMaterialCode('')
    setMaterialDescription('')
    setPriority('Normal')
    setGauge('Tarugo 130mm')
    setApplication('Laminação L1')
    setRunNumber('')
    setQuantityRequired('')
    setObservation('')
    setErrorField(null)
    setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorField(null)
    setErrorMessage(null)

    if (!company.trim()) {
      setErrorField('company')
      setErrorMessage('Informe a Empresa.')
      return
    }
    if (!line.trim()) {
      setErrorField('line')
      setErrorMessage('Informe a Linha.')
      return
    }
    if (!center.trim()) {
      setErrorField('center')
      setErrorMessage('Informe o Centro.')
      return
    }
    if (!storageDeposit.trim()) {
      setErrorField('storageDeposit')
      setErrorMessage('Informe o Depósito.')
      return
    }
    if (!materialCode.trim()) {
      setErrorField('materialCode')
      setErrorMessage('Informe o Código de Matéria-Prima.')
      return
    }
    const qty = Number(quantityRequired)
    if (isNaN(qty) || qty <= 0) {
      setErrorField('quantityRequired')
      setErrorMessage('Informe uma Quantidade por bitola válida (maior que zero).')
      return
    }

    setLoading(true)
    try {
      const payload: CreateDemandPayload = {
        company: company.trim(),
        line: line.trim(),
        center: center.trim(),
        storage_deposit: storageDeposit.trim(),
        material_code: materialCode.trim(),
        material_description: materialDescription.trim() || undefined,
        priority,
        gauge: gauge.trim(),
        application: application.trim(),
        run_number: runNumber.trim() || undefined,
        quantity_required: qty,
        unit_of_measure: 'pçs',
        observation: observation.trim() || undefined,
      }

      const created = await pcpInventoryDemandsService.createDemand(payload)

      toast({
        title: 'Demanda de inventário gerada',
        description: `Demanda de inventário nº ${created.control_number} gerada com sucesso.`,
      })

      handleReset()
      onOpenChange(false)
      onSuccess(created)
    } catch (err: any) {
      console.error('Erro ao gerar demanda:', err)
      const msg = err?.message || 'Falha ao conectar ao servidor de dados. Tente novamente.'
      setErrorMessage(msg)
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar demanda',
        description: msg,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                Nova Demanda de Inventário de Matéria-Prima
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Preencha os campos abaixo para solicitar um inventário físico de tarugos / MP.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Empresa *</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="CIAFAL"
                className={`text-xs h-8 ${errorField === 'company' ? 'border-rose-500 bg-rose-50/40' : ''}`}
                disabled={loading}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Linha *</Label>
              <Input
                value={line}
                onChange={(e) => setLine(e.target.value)}
                placeholder="L1"
                className={`text-xs h-8 ${errorField === 'line' ? 'border-rose-500 bg-rose-50/40' : ''}`}
                disabled={loading}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Centro *</Label>
              <Input
                value={center}
                onChange={(e) => setCenter(e.target.value)}
                placeholder="FORNOL1"
                className={`text-xs h-8 ${errorField === 'center' ? 'border-rose-500 bg-rose-50/40' : ''}`}
                disabled={loading}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Depósito *</Label>
              <Input
                value={storageDeposit}
                onChange={(e) => setStorageDeposit(e.target.value)}
                placeholder="DP07"
                className={`text-xs h-8 ${errorField === 'storageDeposit' ? 'border-rose-500 bg-rose-50/40' : ''}`}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Label className="text-xs font-semibold text-slate-700">
                Código de Matéria-Prima *
              </Label>
              <Input
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                placeholder="TAR-130-1020"
                className={`text-xs h-8 font-mono ${errorField === 'materialCode' ? 'border-rose-500 bg-rose-50/40' : ''}`}
                disabled={loading}
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">
                Descrição da Matéria-Prima
              </Label>
              <Input
                value={materialDescription}
                onChange={(e) => setMaterialDescription(e.target.value)}
                placeholder="Tarugo SAE 1020 130mm x 12m"
                className="text-xs h-8"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Prioridade *</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as InventoryDemandPriority)}
                className="w-full text-xs h-8 px-2 rounded-md border border-slate-300 bg-white font-medium"
                disabled={loading}
              >
                <option value="Baixa">Baixa</option>
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Bitola / Aplicação</Label>
              <Input
                value={gauge}
                onChange={(e) => setGauge(e.target.value)}
                placeholder="Tarugo 130mm"
                className="text-xs h-8"
                disabled={loading}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Corrida Sugerida</Label>
              <Input
                value={runNumber}
                onChange={(e) => setRunNumber(e.target.value)}
                placeholder="458921"
                className="text-xs h-8 font-mono"
                disabled={loading}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Qtd. Prevista (pçs) *</Label>
              <Input
                type="number"
                min="1"
                value={quantityRequired}
                onChange={(e) => setQuantityRequired(e.target.value)}
                placeholder="80"
                className={`text-xs h-8 font-mono ${errorField === 'quantityRequired' ? 'border-rose-500 bg-rose-50/40' : ''}`}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">
              Observação / Justificativa
            </Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Descreva particularidades ou motivos do inventário (ex.: conferência de lote frio para turno da noite)..."
              rows={3}
              className="text-xs resize-none"
              disabled={loading}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-xs h-8 bg-[#004C97] hover:bg-[#003B75] text-white font-bold gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  Gerar Demanda
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
