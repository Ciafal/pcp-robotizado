import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Save,
  Search,
  Send,
  XCircle,
  FileText,
  Clock,
  User,
  History,
  AlertTriangle,
} from 'lucide-react'
import { ParadaStatus } from '@/services/programacao-parada-service'

interface ParadaHeaderProps {
  codigo: string
  status: ParadaStatus
  versao: number
  criadoEm?: string
  criadoPor?: string
  atualizadoEm?: string
  atualizadoPor?: string
  houveAlteracaoPosComunicado?: boolean
  loading?: boolean
  canEdit?: boolean
  canValidateAI?: boolean
  canSendComm?: boolean
  canCancel?: boolean
  isSaved?: boolean
  onValidateAI: () => void
  onSaveDraft: () => void
  onConsultar: () => void
  onOpenSendComm: () => void
  onCancelParada: () => void
  onOpenHistorico: () => void
}

export const ParadaHeader: React.FC<ParadaHeaderProps> = ({
  codigo,
  status,
  versao,
  criadoEm,
  criadoPor,
  atualizadoEm,
  atualizadoPor,
  houveAlteracaoPosComunicado,
  loading = false,
  canEdit = true,
  canValidateAI = true,
  canSendComm = true,
  canCancel = true,
  isSaved = false,
  onValidateAI,
  onSaveDraft,
  onConsultar,
  onOpenSendComm,
  onCancelParada,
  onOpenHistorico,
}) => {
  const getStatusBadge = (st: ParadaStatus) => {
    switch (st) {
      case 'RASCUNHO':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300 font-semibold px-2.5 py-0.5 text-xs shadow-xs"
          >
            Rascunho
          </Badge>
        )
      case 'VALIDADA':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-[#004C97] border-blue-300 font-semibold px-2.5 py-0.5 text-xs shadow-xs"
          >
            Validada
          </Badge>
        )
      case 'COMUNICADA':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold px-2.5 py-0.5 text-xs shadow-xs"
          >
            Comunicada
          </Badge>
        )
      case 'CANCELADA':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-300 font-semibold px-2.5 py-0.5 text-xs shadow-xs"
          >
            Cancelada
          </Badge>
        )
      case 'CONCLUIDA':
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 font-semibold px-2.5 py-0.5 text-xs shadow-xs"
          >
            Concluída
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="font-semibold text-xs">
            {st}
          </Badge>
        )
    }
  }

  const formatDateTimePtBr = (iso?: string) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return iso
      return d.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Lado Esquerdo: Identificação e Metadados */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-[#004C97] uppercase">
                  PCP Robotizado • Paradas Programadas
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-slate-700">
                  Versão {`V${String(versao).padStart(2, '0')}`}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                PROGRAMAÇÃO DE PARADA
                <span className="text-base font-semibold text-slate-600">
                  {codigo ? `nº ${codigo}` : '— Novo Registro'}
                </span>
              </h1>
            </div>
            <div className="ml-0 sm:ml-2 flex items-center gap-2">
              {getStatusBadge(status)}
              {houveAlteracaoPosComunicado && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 text-xs py-0.5 animate-pulse"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Programação alterada após o último comunicado
                </Badge>
              )}
            </div>
          </div>

          {/* Linha de Metadados de Auditoria */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Criação:</span>
              <strong className="text-slate-700 font-medium">{formatDateTimePtBr(criadoEm)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Criado por:</span>
              <strong className="text-slate-700 font-medium">{criadoPor || 'Usuário PCP'}</strong>
            </span>
            {atualizadoEm && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Última alteração:</span>
                <strong className="text-slate-700 font-medium">
                  {formatDateTimePtBr(atualizadoEm)}
                </strong>
                {atualizadoPor && <span className="text-slate-500">({atualizadoPor})</span>}
              </span>
            )}
            <button
              type="button"
              onClick={onOpenHistorico}
              className="text-[#004C97] hover:underline flex items-center gap-1 font-semibold ml-auto"
            >
              <History className="w-3.5 h-3.5" />
              Ver histórico de versões
            </button>
          </div>
        </div>

        {/* Lado Direito: Ações / Botões */}
        <div className="flex flex-wrap items-center gap-2 lg:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onConsultar}
            className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 gap-1.5 shadow-2xs"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            Consultar Programações
          </Button>

          {canValidateAI && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onValidateAI}
              disabled={loading}
              className="text-xs font-semibold text-purple-700 border-purple-200 bg-purple-50/60 hover:bg-purple-100 hover:text-purple-800 gap-1.5 shadow-2xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />✨ Validar com IA
            </Button>
          )}

          {canEdit && status !== 'CANCELADA' && status !== 'CONCLUIDA' && (
            <Button
              type="button"
              size="sm"
              onClick={onSaveDraft}
              disabled={loading}
              className="text-xs font-semibold bg-[#004C97] hover:bg-[#003d7a] text-white gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Rascunho
            </Button>
          )}

          {canSendComm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSendComm}
              disabled={!isSaved || status === 'CANCELADA'}
              title={
                !isSaved
                  ? 'Salve a programação antes de enviar comunicado'
                  : 'Enviar comunicado oficial por e-mail'
              }
              className="text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 hover:text-emerald-800 gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />✈ Enviar Comunicado
            </Button>
          )}

          {canCancel && isSaved && status !== 'CANCELADA' && status !== 'CONCLUIDA' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancelParada}
              disabled={loading}
              className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 gap-1.5 shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              Cancelar Programação
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
export default ParadaHeader
