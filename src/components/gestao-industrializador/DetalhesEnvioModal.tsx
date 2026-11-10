import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  Layers,
  Copy,
  Check,
  FileText,
  Filter,
} from 'lucide-react'
import type { ReportSendingRecord } from '@/services/industrializer-report-sendings-service'

interface DetalhesEnvioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: ReportSendingRecord | null
}

export const DetalhesEnvioModal: React.FC<DetalhesEnvioModalProps> = ({
  open,
  onOpenChange,
  record,
}) => {
  const [copied, setCopied] = React.useState(false)

  if (!record) return null

  const isEmail = record.channel === 'EMAIL'
  const isSuccess = record.status === 'SUCESSO'

  const handleCopyContent = () => {
    if (!record.body_content) return
    navigator.clipboard?.writeText(record.body_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-[#004C97]/20">
        {/* Cabeçalho Ciafal #004C97 */}
        <div className="bg-[#004C97] text-white p-5 rounded-t-lg">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/10 rounded-md">
                {isEmail ? <Mail className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              </span>
              <Badge
                variant="outline"
                className="bg-white/15 text-white border-white/30 text-xs font-semibold"
              >
                {isEmail ? 'Envio por E-mail' : 'Publicação no HUB'}
              </Badge>
              <Badge
                variant="outline"
                className="bg-white/15 text-white border-white/30 text-xs font-semibold"
              >
                {record.screen_name}
              </Badge>
            </div>

            <Badge
              className={
                isSuccess
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-0 flex items-center gap-1'
                  : 'bg-rose-500 hover:bg-rose-600 text-white border-0 flex items-center gap-1'
              }
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sucesso</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Falha no envio</span>
                </>
              )}
            </Badge>
          </div>

          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-bold text-white tracking-tight">
              {record.subject}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs flex items-center gap-2">
              <span>Código: {record.sending_code}</span>
              <span>•</span>
              <span>Origem: {record.source_collection}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Metadados e Informações Estruturadas */}
        <div className="p-6 space-y-5 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#004C97]" />
                Data e Hora do Envio
              </span>
              <p className="font-semibold text-slate-800 text-sm">{record.sent_at_formatted}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#004C97]" />
                Usuário Responsável
              </span>
              <p className="font-semibold text-slate-800 text-sm">{record.sender_user_name}</p>
              <p className="text-slate-500 text-[11px] truncate">{record.sender_user_email}</p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#004C97]" />
                Destinatários ({record.recipients.length})
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {record.recipients.length > 0 ? (
                  record.recipients.map((dest, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200"
                    >
                      {dest}
                    </Badge>
                  ))
                ) : (
                  <span className="text-slate-500 italic">Nenhum destinatário informado</span>
                )}
              </div>
            </div>

            {record.filters_applied && Object.keys(record.filters_applied).length > 0 && (
              <div className="space-y-1 sm:col-span-2 border-t pt-2 border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#004C97]" />
                  Filtros da Tela no Momento do Envio
                </span>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px] text-slate-700 space-y-0.5">
                  {Object.entries(record.filters_applied).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">{k}:</span>
                      <span className="font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conteúdo / Resumo do Envio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#004C97]" />
                Conteúdo / Resumo Enviado
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex items-center gap-1.5 text-slate-600 hover:text-[#004C97]"
                onClick={handleCopyContent}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar texto</span>
                  </>
                )}
              </Button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-inner max-h-[280px] overflow-y-auto">
              {record.body_content ? (
                <pre className="text-xs font-sans text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {record.body_content}
                </pre>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhum corpo de texto detalhado registrado para este envio.
                </p>
              )}
            </div>
          </div>

          {record.metadata?.error_message && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Motivo da Falha Registrada:
              </span>
              <p className="font-mono text-[11px] break-all">{record.metadata.error_message}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Rodapé com botão de fechar */}
        <div className="p-4 bg-white flex justify-end">
          <Button
            className="bg-[#004C97] hover:bg-[#003870] text-white px-6 text-xs h-9 font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DetalhesEnvioModal
