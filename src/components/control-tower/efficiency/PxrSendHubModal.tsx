/**
 * Modal de Envio de Comunicado no HUB Industrial (Melhoria 5).
 * Reutiliza a infraestrutura de comunicados/notificações corporativas do HUB (pcp_report_sendings)
 * com confirmação explícita, pré-visualização, seleção de destinatários/setores e confirmação de leitura.
 */

import React, { useState } from 'react'
import {
  Send,
  Building2,
  Users,
  Eye,
  CheckSquare,
  ShieldAlert,
  Loader2,
  FileCheck,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
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

interface PxrSendHubModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hierarchy: HierarchyLineItem[]
  filters: UnifiedEfficiencyFilters
  aiAnalysis: PxrAiStructuredAnalysis | null
  savedRecord: PxrSavedAnalysisRecord | null
}

const DEFAULT_SECTORS = [
  'PCP / Programação Industrial',
  'Operação & Laminação',
  'Diretoria Industrial',
  'Garantia da Qualidade',
  'Manutenção & Confiabilidade',
]

export const PxrSendHubModal: React.FC<PxrSendHubModalProps> = ({
  open,
  onOpenChange,
  hierarchy,
  filters,
  aiAnalysis,
  savedRecord,
}) => {
  const { toast } = useToast()
  const [titulo, setTitulo] = useState('')
  const [mensagemAdicional, setMensagemAdicional] = useState('')
  const [destinatarios, setDestinatarios] = useState('pcp@ciafal.com.br, operacao@ciafal.com.br')
  const [selectedSectors, setSelectedSectors] = useState<string[]>([
    'PCP / Programação Industrial',
    'Operação & Laminação',
  ])
  const [solicitarConfirmacao, setSolicitarConfirmacao] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [isSending, setIsSending] = useState(false)

  React.useEffect(() => {
    if (open) {
      setTitulo(buildDynamicPxrSubject(filters))
    }
  }, [open, filters])

  const toggleSector = (sector: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector],
    )
  }

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
    if (!savedRecord?.is_official) {
      toast({
        title: 'Atenção: Análise não oficial',
        description:
          'O relatório será enviado com marcação de prévia pois ainda não foi aprovado formalmente.',
        variant: 'destructive',
      })
    }

    const emails = destinatarios
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0)

    if (emails.length === 0) {
      toast({
        title: 'Destinatários obrigatórios',
        description: 'Informe ao menos um destinatário para o envio no HUB.',
        variant: 'destructive',
      })
      return
    }

    setIsSending(true)
    try {
      const res = await sendAssertivenessReport({
        channel: 'HUB',
        recipients: emails,
        subject: titulo || 'Comunicado PCP — Previsto x Realizado',
        message: mensagemAdicional,
        requireReadConfirmation: solicitarConfirmacao,
        sectors: selectedSectors,
        reportSnapshot: {
          title: titulo,
          filters,
          totalLines: hierarchy.length,
          aiAnalysisApproved: savedRecord?.is_official || false,
          html: htmlReport,
        },
      })

      if (res.success) {
        toast({
          title: 'Comunicado do HUB enviado com sucesso',
          description: `Protocolo: ${res.reportCode || 'OK'} registrado no sistema corporativo.`,
        })
        onOpenChange(false)
      } else {
        throw new Error(res.error || 'Erro no envio')
      }
    } catch (err: unknown) {
      console.error('[HUB Modal] Falha:', err)
      const message = err instanceof Error ? err.message : 'Falha desconhecida'
      toast({
        title: 'Erro ao enviar comunicado',
        description: message,
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
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Enviar Comunicado Corporativo no HUB CIAFAL
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Publicação de relatório operacional no mural institucional e canais de notificação
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Alerta de Governança se rascunho */}
          {!savedRecord?.is_official && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <strong>Aviso de Governança:</strong> A análise atual está como Rascunho.
                Recomendamos aprovar a análise formalmente antes de divulgar como documento oficial.
              </div>
            </div>
          )}

          {/* Título do Comunicado */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">Título / Assunto do Comunicado</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="text-xs h-8"
              placeholder="Ex: CIAFAL | PCP — Previsto x Realizado | Linha L1"
            />
          </div>

          {/* Setores Autorizados */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#004C97]" /> Setores e Grupos Autorizados
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_SECTORS.map((sec) => {
                const isSel = selectedSectors.includes(sec)
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleSector(sec)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                      isSel
                        ? 'bg-[#004C97] text-white border-[#004C97]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {sec}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Destinatários Diretos */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">
              Destinatários Diretos (e-mails separados por vírgula)
            </label>
            <Input
              value={destinatarios}
              onChange={(e) => setDestinatarios(e.target.value)}
              className="text-xs h-8"
              placeholder="exemplo@ciafal.com.br, equipe@ciafal.com.br"
            />
          </div>

          {/* Mensagem Adicional */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">Mensagem Adicional / Contexto</label>
            <Textarea
              value={mensagemAdicional}
              onChange={(e) => setMensagemAdicional(e.target.value)}
              placeholder="Insira notas explicativas ou instruções para as equipes..."
              className="text-xs min-h-[60px]"
            />
          </div>

          {/* Confirmação de Leitura */}
          <label className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={solicitarConfirmacao}
              onChange={(e) => setSolicitarConfirmacao(e.target.checked)}
              className="rounded border-slate-300 text-[#004C97]"
            />
            <span className="font-medium text-slate-800">
              Solicitar confirmação de leitura obrigatória para os líderes operacionais
            </span>
          </label>

          {/* Alternar Pré-visualização */}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              {showPreview
                ? 'Ocultar Pré-visualização do Relatório'
                : 'Pré-visualizar Relatório Completo'}
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
            Confirmar e Enviar para o HUB
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
