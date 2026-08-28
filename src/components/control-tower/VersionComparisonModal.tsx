import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { History, CheckCircle2, FileText, UserCheck, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const VersionComparisonModal: React.FC = () => {
  const { isVersionModalOpen, setIsVersionModalOpen, versionHistory } = useControlTower()

  return (
    <Dialog open={isVersionModalOpen} onOpenChange={setIsVersionModalOpen}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-base flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" /> Rastreabilidade & Versionamento de
            Programação
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Trilha de auditoria das publicações e esteira de homologação humana em 2 fases (PCP e
            Gestão).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          {versionHistory.map((v, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border space-y-2 ${
                v.status === 'CURRENT'
                  ? 'bg-purple-950/20 border-purple-800/80'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan-300 text-sm">{v.version}</span>
                  {v.status === 'CURRENT' && (
                    <Badge className="bg-[#004C97] text-white text-[9px] uppercase">
                      Versão Ativa
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">{v.publishedAt}</span>
              </div>

              <div className="text-[11px] text-slate-300 space-y-1">
                <div>
                  <strong className="text-slate-400">Autor:</strong> {v.author} &bull;{' '}
                  <strong className="text-slate-400">Aprovador:</strong> {v.approver}
                </div>
                <div>
                  <strong className="text-slate-400">Motivo:</strong> {v.reason}
                </div>
                <div>
                  <strong className="text-slate-400">Alterações:</strong> {v.changesCount} ordens
                  reprogramadas ({v.deltaTons > 0 ? `+${v.deltaTons}` : v.deltaTons} t)
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVersionModalOpen(false)}
            className="border-slate-800 bg-slate-900 text-slate-300 text-xs"
          >
            Fechar Histórico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
