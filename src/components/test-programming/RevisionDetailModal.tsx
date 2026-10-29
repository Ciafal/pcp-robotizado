import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ShieldAlert, FileText, Calendar, User, Clock, CheckCircle2 } from 'lucide-react'
import { TestProgrammingRecord, TestRevisionStatus } from '@/types/test-programming'
import { testProgrammingService } from '@/services/test-programming-service'
import { formatDatePTBR } from '@/lib/formatters-ptbr'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface RevisionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  test: TestProgrammingRecord | null
  onUpdated?: () => void
}

export const RevisionDetailModal: React.FC<RevisionDetailModalProps> = ({
  isOpen,
  onClose,
  test,
  onUpdated,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [currentStatus, setCurrentStatus] = useState<string>(
    test?.revision_status || 'Pendente',
  )
  const [isUpdating, setIsUpdating] = useState<boolean>(false)

  React.useEffect(() => {
    if (test) {
      setCurrentStatus(test.revision_status || (test.needs_revision ? 'Pendente' : 'Não aplicável'))
    }
  }, [test])

  if (!test) return null

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      await testProgrammingService.update(
        test.id,
        { revision_status: newStatus as TestRevisionStatus },
        { id: user?.id, name: user?.name || 'Programador PCP', role: user?.role },
        `Status da revisão alterado para "${newStatus}"`,
        'Governança de Revisão',
      )
      setCurrentStatus(newStatus)
      toast({
        title: 'Status da revisão atualizado',
        description: `Novo status: ${newStatus}`,
      })
      onUpdated?.()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: err?.message || 'Falha ao atualizar status da revisão.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="revision-detail-modal" className="max-w-xl">
        <DialogHeader className="border-b border-slate-100 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Detalhamento da Revisão Obrigatória
              </DialogTitle>
            </div>
            <Badge
              className={`text-xs font-bold ${
                currentStatus === 'Concluída'
                  ? 'bg-emerald-600 text-white'
                  : currentStatus === 'Em revisão'
                    ? 'bg-purple-600 text-white'
                    : currentStatus === 'Em análise'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-600 text-white'
              }`}
            >
              {currentStatus}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          {/* Card Resumo do Teste */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[#004C97] text-xs">
                {test.test_id || 'TESTE'}
              </span>
              <span className="text-slate-500 font-medium">
                {test.company} • Linha {test.production_line}
                {test.work_center ? ` • Centro ${test.work_center}` : ''}
              </span>
            </div>
            <p className="font-semibold text-slate-900">{test.title}</p>
            <p className="text-[11px] text-slate-600">
              Responsável Técnico: <strong>{test.technical_lead}</strong> • Solicitante:{' '}
              {test.requester_name}
            </p>
          </div>

          {/* Dados da Revisão */}
          <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg">
            <div>
              <span className="text-[10px] text-amber-800 uppercase font-bold block">
                Tipo da Revisão
              </span>
              <span className="text-xs font-bold text-amber-950">
                {test.revision_types || 'Documento e Meta'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-amber-800 uppercase font-bold block">
                Data do Fechamento
              </span>
              <span className="text-xs font-mono text-amber-950">
                {test.conclusion_date ? formatDatePTBR(test.conclusion_date) : 'Pendente'}{' '}
                {test.conclusion_time || ''}
              </span>
            </div>
            <div className="col-span-2 pt-1 border-t border-amber-200/60">
              <span className="text-[10px] text-amber-800 uppercase font-bold block">
                Motivo da Revisão
              </span>
              <p className="text-xs text-amber-950 mt-0.5 whitespace-pre-wrap font-medium">
                {test.revision_reason || 'Motivo não informado.'}
              </p>
            </div>
          </div>

          {/* Documento SGQ Relacionado */}
          {(test.revision_document_code || test.revision_document_title) && (
            <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg space-y-1">
              <span className="text-[10px] text-blue-900 uppercase font-bold flex items-center gap-1">
                <FileText className="w-3 h-3 text-[#004C97]" />
                Documento SGQ Relacionado
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-[#004C97]">
                  {test.revision_document_code || 'SGQ'}
                </span>
                <span className="text-slate-800 font-medium">
                  {test.revision_document_title || '-'}
                </span>
                {test.revision_document_version && (
                  <Badge variant="outline" className="text-[10px] bg-white font-mono">
                    {test.revision_document_version}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Conclusão Completa */}
          {test.conclusion && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase font-bold">
                  Conclusão Técnica do Teste
                </span>
                {test.conclusion_user_name && (
                  <span className="text-[10px] text-slate-400">
                    Registrado por: <strong>{test.conclusion_user_name}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {test.conclusion}
              </p>
            </div>
          )}

          {/* Alteração Rápida de Status pelo Usuário */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-slate-700">Atualizar Status:</Label>
              <Select
                value={currentStatus}
                onValueChange={handleUpdateStatus}
                disabled={isUpdating}
              >
                <SelectTrigger className="h-7.5 text-xs w-40 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente" className="text-xs">
                    Pendente
                  </SelectItem>
                  <SelectItem value="Em análise" className="text-xs">
                    Em análise
                  </SelectItem>
                  <SelectItem value="Em revisão" className="text-xs">
                    Em revisão
                  </SelectItem>
                  <SelectItem value="Concluída" className="text-xs">
                    Concluída
                  </SelectItem>
                  <SelectItem value="Não aplicável" className="text-xs">
                    Não aplicável
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-7.5"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
