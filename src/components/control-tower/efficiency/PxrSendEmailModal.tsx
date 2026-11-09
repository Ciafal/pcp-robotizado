/**
 * Modal de Envio por E-mail do Previsto x Realizado (Melhoria 6).
 * Envio REAL via Resend conectado no HUB ($connectors.executeAsOwner).
 * Relatório completo em HTML corporativo inline compatível com Outlook e anexo PDF opcional.
 */

import React, { useState } from 'react'
import { Mail, Send, Eye, FileDown, ShieldAlert, Loader2, CheckCircle } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import type { HierarchyLineItem } from '@/services/efficiency-assertiveness-hierarchy-service'
import type {
  PxrAiStructuredAnalysis,
  PxrSavedAnalysisRecord,
} from '@/services/assertiveness-pxr-ai-service'
import {
  generatePxrCorporateReportHtml,
  buildDynamicPxrSubject,
} from '@/services/pxr-corporate-report-generator'
import { sendAssertivenessReport } from '@/services/assertiveness-report-service'

interface PxrSendEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hierarchy: HierarchyLineItem[]
  filters: UnifiedEfficiencyFilters
  aiAnalysis: PxrAiStructuredAnalysis | null
  savedRecord: PxrSavedAnalysisRecord | null
}

export const PxrSendEmailModal: React.FC<PxrSendEmailModalProps> = ({
  open,
  onOpenChange,
  hierarchy,
  filters,
  aiAnalysis,
  savedRecord,
}) => {
  const { toast } = useToast()
  const [assunto, setAssunto] = useState('')
  const [destinatarios, setDestinatarios] = useState('diretoria.industrial@ciafal.com.br')
  const [copia, setCopia] = useState('pcp@ciafal.com.br')
  const [mensagem, setMensagem] = useState('')
  const [anexarPdf, setAnexarPdf] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [isSending, setIsSending] = useState(false)

  React.useEffect(() => {
    if (open) {
      setAssunto(buildDynamicPxrSubject(filters))
    }
  }, [open, filters])

  const htmlReport = React.useMemo(() => {
    return generatePxrCorporateReportHtml({
      filters,
      hierarchy,
      aiAnalysis,
      responsavel: 'Programador PCP (CIAFAL)',
      isApprovedOfficial: savedRecord?.is_official || false,
      approvalInfo: savedRecord
        ? {
            approvedAt: savedRecord.approved_at,
            approvedByName: savedRecord.approved_by_user_name,
            versionNumber: savedRecord.version_number,
          }
        : null,
    })
  }, [filters, hierarchy, aiAnalysis, savedRecord])

  const handleSend = async () => {
    const toList = destinatarios
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0)

    if (toList.length === 0) {
      toast({
        title: 'Destinatários obrigatórios',
        description: 'Informe ao menos um e-mail de destino.',
        variant: 'destructive',
      })
      return
    }

    const ccList = copia
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0)

    setIsSending(true)
    try {
      const res = await sendAssertivenessReport({
        channel: 'EMAIL',
        recipients: toList,
        cc: ccList,
        subject: assunto || 'CIAFAL | PCP — Previsto x Realizado',
        message: mensagem,
        attachPdf: anexarPdf,
        reportSnapshot: {
          title: assunto,
          filters,
          totalLines: hierarchy.length,
          aiAnalysisApproved: savedRecord?.is_official || false,
          html: htmlReport,
        },
      })

      if (res.success) {
        toast({
          title: 'E-mail Corporativo Enviado',
          description: `Disparado com sucesso via Resend para ${toList.join(', ')}.`,
        })
        onOpenChange(false)
      } else {
        throw new Error(res.error || 'Erro no envio de e-mail')
      }
    } catch (err: unknown) {
      console.error('[E-mail Modal] Falha:', err)
      const msg = err instanceof Error ? err.message : 'Falha desconhecida'
      toast({
        title: 'Erro ao disparar e-mail',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97]/10 text-[#004C97] rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Enviar Relatório Executivo por E-mail
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Disparo corporativo via Resend integrado &bull; HTML inline completo &bull; PDF
                anexo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {!savedRecord?.is_official && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <strong>Atenção:</strong> A análise ainda não foi aprovada formalmente. O e-mail
                será sinalizado como "Prévia Operacional" no cabeçalho.
              </div>
            </div>
          )}

          {/* Assunto */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">Assunto do E-mail</label>
            <Input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className="text-xs h-8"
              placeholder="Ex: CIAFAL | PCP — Previsto x Realizado | Linha L1 | Semana 46/2026"
            />
          </div>

          {/* Destinatários e CC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-800">Para (Destinatários principais)</label>
              <Input
                value={destinatarios}
                onChange={(e) => setDestinatarios(e.target.value)}
                className="text-xs h-8"
                placeholder="gestor@ciafal.com.br"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-800">CC (Com Cópia)</label>
              <Input
                value={copia}
                onChange={(e) => setCopia(e.target.value)}
                className="text-xs h-8"
                placeholder="pcp@ciafal.com.br"
              />
            </div>
          </div>

          {/* Mensagem / Introdução */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">Mensagem Introdutória (Opcional)</label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Prezados, segue o relatório consolidado de Previsto x Realizado do período..."
              className="text-xs min-h-[60px]"
            />
          </div>

          {/* Opção de PDF */}
          <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={anexarPdf}
              onChange={(e) => setAnexarPdf(e.target.checked)}
              className="rounded border-slate-300 text-[#004C97]"
            />
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <FileDown className="w-4 h-4 text-[#004C97]" />
              <span>Anexar versão em PDF formatada em paisagem (A4 corporativo)</span>
            </div>
          </label>

          {/* Pré-visualização do Relatório HTML */}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              {showPreview ? 'Ocultar Pré-visualização' : 'Pré-visualizar Corpo do E-mail (HTML)'}
            </Button>
          </div>

          {showPreview && (
            <div className="border border-slate-200 rounded-lg p-4 bg-white max-h-72 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: htmlReport }} />
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={isSending}
            className="text-xs gap-1.5 bg-[#004C97] hover:bg-[#003870] text-white"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Confirmar e Disparar E-mail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
