import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  History,
  Clock,
  User,
  ArrowRight,
  GitCommit,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react'
import {
  ProgramacaoParadaHistorico,
  programacaoParadaService,
} from '@/services/programacao-parada-service'

interface VersionHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paradaId: string
  codigo: string
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  open,
  onOpenChange,
  paradaId,
  codigo,
}) => {
  const [historico, setHistorico] = useState<ProgramacaoParadaHistorico[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (!open || !paradaId) return

    const loadHistory = async () => {
      setLoading(true)
      try {
        const hists = await programacaoParadaService.listarHistorico(paradaId)
        setHistorico(hists)
      } catch (e) {
        console.warn('Erro ao carregar histórico de versões:', e)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [open, paradaId])

  const formatDateTimePtBr = (iso?: string) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white p-0 border border-slate-200 rounded-2xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#004C97]/10 text-[#004C97] flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Histórico de Versões & Auditoria
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#004C97]">
                  {codigo}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Rastreabilidade cronológica com valores antes e depois, autor e registro das
                alterações.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-200 border-t-[#004C97] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Carregando versionamento da parada...</p>
            </div>
          ) : historico.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Nenhum histórico registrado</h4>
              <p className="text-xs text-slate-500">
                As alterações realizadas nesta programação serão registradas aqui em versões
                sucessivas (V01, V02...).
              </p>
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {historico.map((h, idx) => (
                <div key={h.id || idx} className="relative pl-8 space-y-2">
                  <div className="absolute left-1.5 top-2 w-4 h-4 rounded-full bg-white border-2 border-[#004C97] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004C97]" />
                  </div>

                  <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-[#004C97] border-blue-300 font-bold text-xs"
                        >
                          V{String(h.versao).padStart(2, '0')}
                        </Badge>
                        <strong className="text-xs font-bold text-slate-800">
                          {h.tipo_alteracao || 'Alteração Cadastral'}
                        </strong>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDateTimePtBr(h.created)}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {h.usuario_nome || 'Usuário PCP'}
                        </span>
                      </div>
                    </div>

                    {h.descricao_alteracao && (
                      <p className="text-xs text-slate-700 font-medium">{h.descricao_alteracao}</p>
                    )}

                    {/* Diff Antes x Depois */}
                    {h.dados_antes && h.dados_depois && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="p-2.5 bg-rose-50/50 border border-rose-200/70 rounded-lg space-y-1">
                          <span className="font-bold text-rose-800 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Antes
                          </span>
                          <div className="text-slate-700 font-mono text-[10px] space-y-0.5">
                            <div>Status: {h.dados_antes.status || '-'}</div>
                            <div>Motivo: {h.dados_antes.motivo_geral || '-'}</div>
                            <div>
                              Centros:{' '}
                              {Array.isArray(h.dados_antes.centros)
                                ? h.dados_antes.centros.map((c: any) => c.centro_code).join(', ')
                                : '-'}
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/70 rounded-lg space-y-1">
                          <span className="font-bold text-emerald-800 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Depois (Atualizado)
                          </span>
                          <div className="text-slate-700 font-mono text-[10px] space-y-0.5">
                            <div>Status: {h.dados_depois.status || '-'}</div>
                            <div>Motivo: {h.dados_depois.motivo_geral || '-'}</div>
                            <div>
                              Centros:{' '}
                              {Array.isArray(h.dados_depois.centros)
                                ? h.dados_depois.centros.map((c: any) => c.centro_code).join(', ')
                                : '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold bg-[#004C97] hover:bg-[#003d7a] text-white"
          >
            Fechar Histórico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default VersionHistoryModal
