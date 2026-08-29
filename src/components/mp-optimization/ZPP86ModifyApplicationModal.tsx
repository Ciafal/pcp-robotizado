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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MPDimensionalItem, MPApplicationRequirement } from '@/types/mp-optimization'
import { evaluateDimensionalClassification, validateZPPMP } from '@/services/mp-optimization-engine'
import { ClassificationBadge } from './ClassificationBadge'
import { ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, History } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface ZPP86ModifyApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  item: MPDimensionalItem | null
  availableRequirements?: MPApplicationRequirement[]
  onSuccess?: () => void
}

export const ZPP86ModifyApplicationModal: React.FC<ZPP86ModifyApplicationModalProps> = ({
  isOpen,
  onClose,
  item,
  availableRequirements = [],
  onSuccess,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [selectedAppCode, setSelectedAppCode] = useState<string>('')
  const [reasonCode, setReasonCode] = useState<string>('REAPROVEITAMENTO_CARTEIRA')
  const [reasonDescription, setReasonDescription] = useState<string>('')
  const [userRegistration, setUserRegistration] = useState<string>(
    user?.email?.split('@')[0] || 'MATR-9042',
  )
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  if (!item) return null

  // Validação das regras SAP ZPP86
  const isLaminatedOrFurnace =
    item.sap_block_status === '05_FORNO' || item.sap_block_status === '07_LAMINADO'

  const targetReq = availableRequirements.find((r) => r.application_code === selectedAppCode)

  const evalResult = targetReq
    ? evaluateDimensionalClassification(item, targetReq, targetReq.allows_out_of_ideal)
    : null

  const zppmpValidation = targetReq ? validateZPPMP(item, targetReq) : null

  const handleSubmit = async () => {
    if (isLaminatedOrFurnace) {
      toast({
        variant: 'destructive',
        title: 'Operação Bloqueada no SAP',
        description:
          'Bloco já enfornado ou laminado (Status 05/07) não pode ter aplicação modificada.',
      })
      return
    }

    if (!selectedAppCode) {
      toast({
        variant: 'destructive',
        title: 'Seleção Obrigatória',
        description: 'Selecione a nova aplicação desejada.',
      })
      return
    }

    if (!reasonDescription.trim()) {
      toast({
        variant: 'destructive',
        title: 'Motivo Obrigatório',
        description: 'Informe o motivo detalhado para rastreabilidade ZPPT058 / ZMM029.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { mpOptimizationService } = await import('@/services/mp-optimization')

      // 1. Atualizar registro no estoque (mantendo aplicação original intacta)
      await mpOptimizationService.updateDimensionalItem(item.id, {
        current_application: selectedAppCode,
        dimensional_classification: evalResult?.classification || 'NIVEL_2_ADMISSIVEL',
      })

      // 2. Registrar evento histórico inalterável (ZPPT058 / ZMM029)
      await mpOptimizationService.recordApplicationModification({
        event_code: `EVT-ZPP86-${Date.now()}`,
        center_code: item.center_code || '1001',
        block_number: item.block_number || item.material_code,
        heat_number: item.heat_number,
        letter_code: item.letter_code,
        material_code: item.material_code,
        supplier_code: item.supplier_code,
        original_application: item.original_application, // SEMPRE PRESERVADA
        previous_application: item.current_application,
        new_application: selectedAppCode,
        thickness_mm: item.thickness_mm,
        width_mm: item.width_mm,
        length_mm: item.length_mm,
        weight_kg: item.weight_kg,
        reason_code: reasonCode,
        reason_description: reasonDescription,
        user_registration_matricula: userRegistration,
        user_name: user?.name || user?.email || 'Programador PCP',
        user_id: user?.id,
        event_timestamp: new Date().toISOString(),
        sap_status_code: item.sap_block_status,
      })

      toast({
        title: 'Aplicação Modificada com Sucesso (ZPP86)',
        description: `Aplicação atualizada para ${selectedAppCode}. Aplicação original ${item.original_application} preservada no histórico.`,
      })

      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Modificar Aplicação',
        description: err.message || 'Falha ao persistir no PocketBase.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-mono text-[#004C97] font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>TRANSAÇÃO SAP ZPP86 &bull; MODIFICAR APLICAÇÃO KS</span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Modificar Aplicação de Matéria-Prima
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Preserva integralmente a rastreabilidade: a Aplicação Original NUNCA é sobrescrita e o
            histórico auditorial é gravado na ZPPT058.
          </DialogDescription>
        </DialogHeader>

        {isLaminatedOrFurnace && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Regra Inviolável SAP:</span> Este bloco está com status{' '}
              <span className="font-mono font-bold">{item.sap_block_status}</span>. Blocos
              enfornados ou já laminados não podem sofrer alteração de aplicação.
            </div>
          </div>
        )}

        {/* Resumo do Material */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Nº Bloco / Corrida
            </span>
            <span className="font-mono font-bold text-slate-900">
              {item.block_number || 'S/N'} / {item.heat_number || 'S/C'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Aplicação Original
            </span>
            <Badge
              variant="outline"
              className="font-mono bg-blue-50 text-[#004C97] border-blue-200 text-[11px]"
            >
              {item.original_application}
            </Badge>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Aplicação Atual
            </span>
            <span className="font-mono font-semibold text-slate-800">
              {item.current_application}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Dimensões & Peso
            </span>
            <span className="font-mono text-slate-900 font-semibold">
              {item.thickness_mm}×{item.width_mm}×{item.length_mm} mm ({item.weight_kg} kg)
            </span>
          </div>
        </div>

        {/* Formulário de Alteração */}
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Nova Aplicação Desejada
              </Label>
              <Select value={selectedAppCode} onValueChange={setSelectedAppCode}>
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue placeholder="Selecione a aplicação..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {availableRequirements.map((req) => (
                    <SelectItem key={req.application_code} value={req.application_code}>
                      {req.application_code} — {req.application_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Código do Motivo SAP</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue placeholder="Motivo..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="REAPROVEITAMENTO_CARTEIRA">
                    01 — Otimização de Carteira de Pedidos
                  </SelectItem>
                  <SelectItem value="EVITAR_SUCATA">02 — Evitar Geração de Sucata</SelectItem>
                  <SelectItem value="PRESERVACAO_MP_CRITICA">
                    03 — Preservação de MP Crítica
                  </SelectItem>
                  <SelectItem value="DESVIO_QUALIDADE_COMPENSADO">
                    04 — Compensação Dimensional Autorizada
                  </SelectItem>
                  <SelectItem value="SOLICITACAO_ENGENHARIA">
                    05 — Solicitação Técnica Engenharia/PCP
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Análise de Enquadramento Dimensional da Nova Aplicação */}
          {targetReq && evalResult && zppmpValidation && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px]">
                  Enquadramento ZPPMP / ZPP88:
                </span>
                <ClassificationBadge classification={evalResult.classification} />
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">{evalResult.justification}</p>

              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                <div
                  className={`p-1.5 rounded border ${
                    zppmpValidation.thickness.status === 'GREEN'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  Espessura: {item.thickness_mm} mm ({targetReq.min_thickness_mm} -{' '}
                  {targetReq.max_thickness_mm})
                </div>
                <div
                  className={`p-1.5 rounded border ${
                    zppmpValidation.width.status === 'GREEN'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  Largura: {item.width_mm} mm ({targetReq.min_width_mm} - {targetReq.max_width_mm})
                </div>
                <div
                  className={`p-1.5 rounded border ${
                    zppmpValidation.length.status === 'GREEN'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  Comp.: {item.length_mm} mm ({targetReq.min_length_mm} - {targetReq.max_length_mm})
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Matrícula / Usuário do Apontamento
              </Label>
              <Input
                value={userRegistration}
                onChange={(e) => setUserRegistration(e.target.value)}
                className="mt-1 bg-white border-slate-300 font-mono"
                placeholder="Ex: 9042"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Centro SAP & Depósito</Label>
              <Input
                disabled
                value={`${item.center_code || '1001'} - ${item.storage_location || 'MP01'}`}
                className="mt-1 bg-slate-100 border-slate-300 font-mono text-slate-600"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">
              Justificativa Técnica Detalhada (Obrigatória para Auditoria)
            </Label>
            <Textarea
              rows={2}
              value={reasonDescription}
              onChange={(e) => setReasonDescription(e.target.value)}
              placeholder="Descreva a razão operacional, ordem de produção de destino ou liberação de engenharia..."
              className="mt-1 bg-white border-slate-300 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-slate-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLaminatedOrFurnace || !selectedAppCode}
            className="bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
          >
            {isSubmitting ? 'Gravando no SAP/Auditoria...' : 'Confirmar Alteração de Aplicação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
