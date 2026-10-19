import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ShieldCheck, Clock, Loader2, FileCheck2, AlertCircle } from 'lucide-react'
import { PCPMeetingAtaRecord, PCPMeetingRecord } from '@/types/pcp-meeting'
import { PcpAtaConfirmacaoLeituraRecord } from '@/types/pcp-ata-distribuicao'
import pcpAtaDistribuicaoService from '@/services/pcp-ata-distribuicao-service'
import pb from '@/lib/pocketbase/client'

export interface ConfirmacaoLeituraAtaBannerProps {
  meeting: PCPMeetingRecord
  ata: PCPMeetingAtaRecord
  onConfirmado?: () => void
}

export const ConfirmacaoLeituraAtaBanner: React.FC<ConfirmacaoLeituraAtaBannerProps> = ({
  meeting,
  ata,
  onConfirmado,
}) => {
  const [loadingCheck, setLoadingCheck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmacaoRecord, setConfirmacaoRecord] = useState<PcpAtaConfirmacaoLeituraRecord | null>(
    null,
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const currentUser = (pb.authStore.record || pb.authStore.model) as any
  const userId = currentUser?.id || ''
  const userEmail = currentUser?.email || ''
  const userName = currentUser?.name || currentUser?.email || 'Usuário HUB'
  const userRole = currentUser?.role || 'PCP'

  useEffect(() => {
    if (!ata?.id) return

    let isMounted = true
    const checkUserConfirmation = async () => {
      setLoadingCheck(true)
      try {
        const conf = await pcpAtaDistribuicaoService.verificarConfirmacaoUsuario(
          ata.id,
          userId,
          userEmail,
        )
        if (isMounted) {
          setConfirmacaoRecord(conf)
        }
      } catch (err) {
        // silencioso
      } finally {
        if (isMounted) setLoadingCheck(false)
      }
    }

    checkUserConfirmation()
    return () => {
      isMounted = false
    }
  }, [ata?.id, userId, userEmail])

  const handleConfirmarLeitura = async () => {
    if (!ata?.id || !meeting?.id) return
    setSubmitting(true)
    setErrorMsg(null)

    try {
      const rec = await pcpAtaDistribuicaoService.confirmarLeituraAta({
        ataId: ata.id,
        meetingId: meeting.id,
        codigoAta: meeting.meeting_code,
        versaoAta: ata.version,
        canalAcesso: 'HUB_PCP_ROBOTIZADO',
        currentUser: {
          id: userId,
          name: userName,
          email: userEmail,
          role: userRole,
        },
      })

      setConfirmacaoRecord(rec)
      if (onConfirmado) onConfirmado()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar confirmação de leitura.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingCheck) return null

  // Se o usuário já confirmou
  if (confirmacaoRecord) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-600 text-white rounded-md shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-emerald-950 font-bold">Leitura Confirmada com Sucesso</strong>
              <Badge className="bg-emerald-200 text-emerald-900 border-emerald-300 text-[9px] py-0 font-mono">
                Evidência SGQ
              </Badge>
            </div>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Confirmado por <strong>{confirmacaoRecord.user_nome}</strong> em{' '}
              {new Date(confirmacaoRecord.confirmado_em).toLocaleString('pt-BR')} &bull; Canal:{' '}
              {confirmacaoRecord.canal_acesso || 'HUB CIAFAL'}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-emerald-700 font-mono block">
            Versão {confirmacaoRecord.versao_ata}.0 Auditada
          </span>
        </div>
      </div>
    )
  }

  // Se ainda NÃO confirmou a leitura
  return (
    <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-[#004C97] text-white rounded-md shrink-0">
          <FileCheck2 className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <strong className="text-slate-900 font-bold">
              Confirmação Formal de Leitura da ATA
            </strong>
            <Badge variant="outline" className="text-[9px] border-blue-300 text-[#004C97] py-0">
              Solicitação SGQ
            </Badge>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Ao clicar em confirmar, você atesta eletronicamente que leu e tomou conhecimento das
            deliberações, ações e paradas programadas desta ATA.
          </p>
          {errorMsg && (
            <p className="text-rose-600 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleConfirmarLeitura}
          disabled={submitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5 shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmar leitura
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default ConfirmacaoLeituraAtaBanner
