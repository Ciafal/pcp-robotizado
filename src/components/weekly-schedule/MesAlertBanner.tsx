import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Radio, CheckCircle2, Eye, AlertTriangle, User, Clock, ArrowRight } from 'lucide-react'
import { ScheduleMesAlert } from '@/types/schedule-versioning'

interface MesAlertBannerProps {
  alerts: ScheduleMesAlert[]
  onAcknowledge: (alertId: string, notes?: string) => void
  onViewDetails?: (alert: ScheduleMesAlert) => void
}

export const MesAlertBanner: React.FC<MesAlertBannerProps> = ({
  alerts,
  onAcknowledge,
  onViewDetails,
}) => {
  const [selectedAlert, setSelectedAlert] = useState<ScheduleMesAlert | null>(null)
  const [ackModalOpen, setAckModalOpen] = useState(false)
  const [ackNotes, setAckNotes] = useState('')

  // Filtra alertas ativos ou não reconhecidos
  const unacknowledgedAlerts = alerts.filter((a) => a.ack_status !== 'RECONHECIDO')

  if (alerts.length === 0) return null

  const latestAlert = alerts[0]

  const handleOpenAck = (alert: ScheduleMesAlert) => {
    setSelectedAlert(alert)
    setAckModalOpen(true)
  }

  const handleConfirmAck = () => {
    if (selectedAlert) {
      onAcknowledge(selectedAlert.id, ackNotes)
      setAckModalOpen(false)
      setAckNotes('')
    }
  }

  return (
    <div className="space-y-2">
      {/* Banner Principal de Status MES (Requisitos 14, 15, 16) */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between flex-wrap gap-2 transition-all ${
          latestAlert.ack_status === 'RECONHECIDO'
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : 'bg-amber-50/95 border-amber-400 text-amber-950 shadow-sm animate-pulse'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg text-white ${
              latestAlert.ack_status === 'RECONHECIDO' ? 'bg-emerald-600' : 'bg-amber-600'
            }`}
          >
            <Radio className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wide">
                {latestAlert.ack_status === 'RECONHECIDO'
                  ? 'PCP &bull; PROGRAMAÇÃO ATUALIZADA — CIENTE'
                  : 'PCP &bull; PROGRAMAÇÃO ALTERADA (AGUARDANDO CIÊNCIA)'}
              </span>
              <Badge
                className={`text-[10px] font-mono ${
                  latestAlert.ack_status === 'RECONHECIDO'
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-amber-200 text-amber-900'
                }`}
              >
                Linha {latestAlert.line_code} &bull; {latestAlert.previous_version_tag || 'V01'}{' '}
                &rarr; {latestAlert.new_version_tag}
              </Badge>
            </div>

            <p className="text-xs font-medium text-slate-800 mt-0.5">
              Produto: <strong>{latestAlert.product_code}</strong> | Motivo: {latestAlert.reason} |{' '}
              {latestAlert.sequence_prev && latestAlert.sequence_new && (
                <span>
                  Antes: {latestAlert.sequence_prev} &rarr; Depois: {latestAlert.sequence_new}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {latestAlert.ack_status !== 'RECONHECIDO' ? (
            <Button
              size="sm"
              onClick={() => handleOpenAck(latestAlert)}
              className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Registrar Ciência MES
            </Button>
          ) : (
            <div className="text-right text-[11px] text-emerald-800">
              <span className="font-bold block">
                Reconhecido por {latestAlert.acknowledged_by_user}
              </span>
              <span className="text-[10px] text-emerald-600 font-mono">
                {latestAlert.acknowledged_at
                  ? new Date(latestAlert.acknowledged_at).toLocaleTimeString('pt-BR')
                  : 'Hoje'}
              </span>
            </div>
          )}

          {onViewDetails && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(latestAlert)}
              className="text-xs h-8 bg-white border-slate-300"
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> Ver Alteração
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Ciência Operacional MES */}
      {ackModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-slate-200 text-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
              <Radio className="w-5 h-5 text-[#004C97]" />
              <h3 className="font-bold text-sm">
                Registro de Ciência no MES — Linha {selectedAlert.line_code}
              </h3>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border text-[11px] space-y-1">
              <p>
                <strong>Versão Vigente:</strong> {selectedAlert.new_version_tag} (Substitui{' '}
                {selectedAlert.previous_version_tag || 'V01'})
              </p>
              <p>
                <strong>Motivo da Reprogramação:</strong> {selectedAlert.reason}
              </p>
              <p>
                <strong>Usuário Programador:</strong> {selectedAlert.user_name}
              </p>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Observação do Operador Líder / Turno (Opcional):
              </label>
              <textarea
                rows={2}
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                placeholder="Ex: Turno ciente da nova sequência, ferramental pronto..."
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setAckModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAck}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirmar e Registrar Ciência
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default MesAlertBanner
