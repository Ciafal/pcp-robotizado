import React, { useState } from 'react'
import { ShieldAlert, AlertOctagon, Lock, Send, X, FileText, Clock, User, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { HardBlockModalData } from '@/types/weekly-schedule'
import { weeklyScheduleService } from '@/services/weekly-schedule-service'
import { useToast } from '@/hooks/use-toast'

interface BlockedProductModalProps {
  data: HardBlockModalData
  onClose: () => void
}

export const BlockedProductModal: React.FC<BlockedProductModalProps> = ({ data, onClose }) => {
  const { toast } = useToast()
  const [justification, setJustification] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requested, setRequested] = useState(false)

  const handleRequestExemption = async () => {
    if (!justification.trim()) {
      toast({
        variant: 'destructive',
        title: 'Justificativa Obrigatória',
        description:
          'Informe a justificativa operacional/técnica para solicitar a liberação excepcional.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await weeklyScheduleService.logBlockedProductAttempt({
        materialCode: data.materialCode,
        materialDescription: data.materialDescription,
        lineCode: data.lineCode,
        reason: data.reason,
        notes: `Solicitação de Liberação Excepcional enviada pelo Programador: "${justification.trim()}"`,
      })

      setRequested(true)
      toast({
        title: 'Solicitação Registrada',
        description:
          'A solicitação de liberação excepcional foi enviada para o Gestor da Linha e Trilha de Auditoria. O material permanece bloqueado até parecer oficial.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar solicitação',
        description: 'Não foi possível registrar a solicitação no momento.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={data.isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white border-rose-300 text-slate-900 shadow-2xl p-0 overflow-hidden">
        {/* Cabeçalho Vermelho de Alerta Crítico */}
        <div className="bg-rose-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
                MATERIAL BLOQUEADO PARA ESTA LINHA
                <Badge className="bg-white text-rose-700 text-[10px] font-mono font-black uppercase">
                  HARD BLOCK
                </Badge>
              </DialogTitle>
              <p className="text-xs text-rose-100 font-medium">
                Restrição de Ficha Mestre / Engenharia de Processo CIAFAL
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Alerta de Impedimento */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
            <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-900">
                Este material não pode ser incluído nesta programação.
              </p>
              <p className="text-rose-700 leading-relaxed text-[11px]">
                O motor determinístico e a política de qualidade industrial impedem a inclusão
                automática ou manual deste item na linha selecionada.
              </p>
            </div>
          </div>

          {/* Dados Oficiais do Bloqueio */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 font-mono text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">
                Material / Código SAP:
              </span>
              <span className="font-bold text-slate-900">{data.materialCode}</span>
              <span className="block text-[10px] text-slate-600 font-sans mt-0.5">
                {data.materialDescription}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">
                Linha de Destino:
              </span>
              <span className="font-bold text-[#004C97]">{data.lineCode}</span>
              <span className="block text-[10px] text-slate-600 font-sans mt-0.5">
                {data.lineName}
              </span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-sans">
                Motivo do Bloqueio:
              </span>
              <p className="font-medium text-slate-800 text-xs font-sans mt-0.5 bg-white p-2 rounded border border-slate-200">
                {data.reason ||
                  'Restrição dimensional ou limite físico da linha conforme Ficha Mestre.'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">
                Data do Bloqueio:
              </span>
              <span className="text-slate-700 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-slate-400" />
                {data.blockDate || 'Vigente (Conforme Ficha Mestre)'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">
                Responsável Técnico:
              </span>
              <span className="text-slate-700 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3 text-slate-400" />
                {data.responsibleName || 'Engenharia de Processos CIAFAL'}
              </span>
            </div>
          </div>

          {/* Área de Solicitação de Liberação Excepcional */}
          {!requested ? (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="block text-slate-700 font-bold text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Solicitar Liberação Excepcional
              </label>
              <Textarea
                placeholder="Descreva a justificativa comercial/urgência e o lote para submeter ao Gestor da Linha (a inclusão não será feita automaticamente)..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="text-xs h-20 bg-slate-50 border-slate-300 resize-none"
              />
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-400" />
                A solicitação gera registro de auditoria imutável (UNAUTHORIZED_ACTION_ATTEMPT com
                status DENY).
              </p>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
              <p className="font-bold flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-600" />
                Solicitação submetida com sucesso!
              </p>
              <p className="text-[11px] text-blue-700 mt-1">
                A solicitação foi encaminhada para homologação formal pelo Gestor Titular.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Fechar
          </Button>

          {!requested ? (
            <Button
              onClick={handleRequestExemption}
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Enviando...' : 'Solicitar Liberação Excepcional'}
            </Button>
          ) : (
            <Button
              onClick={onClose}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold"
            >
              Entendido
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
