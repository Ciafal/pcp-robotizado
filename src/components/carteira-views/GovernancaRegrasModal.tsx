import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings2, Sliders, Shield, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { REGRAS_PADRAO, RegrasParametrizadas } from '@/services/carteira-engine'

interface GovernancaRegrasModalProps {
  isOpen: boolean
  onClose: () => void
  onSalvarRegras: (regrasAtualizadas: RegrasParametrizadas) => void
}

export const GovernancaRegrasModal: React.FC<GovernancaRegrasModalProps> = ({
  isOpen,
  onClose,
  onSalvarRegras,
}) => {
  const { toast } = useToast()
  const [regras, setRegras] = useState<RegrasParametrizadas>(REGRAS_PADRAO)
  const [justificativa, setJustificativa] = useState('')

  const handleSalvar = () => {
    if (!justificativa.trim()) {
      toast({
        variant: 'destructive',
        title: 'Justificativa Obrigatória',
        description:
          'É mandatório informar o motivo da alteração das regras de cálculo para auditoria.',
      })
      return
    }

    onSalvarRegras(regras)
    toast({
      title: 'Regras de Cálculo Atualizadas',
      description: 'Nova versão das regras parametrizadas registrada com sucesso no backend.',
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97] text-white rounded-lg">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Governança & Parametrização do Motor de Regras
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Parametrize classificações, janelas de tolerância e regras de negócio com
                versionamento auditável.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#004C97]" /> Janela de Alerta de Ruptura (Dias
                Amarelo)
              </span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {regras.amareloDiasRuptura} dias
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Intervalo de dias entre o término estimado do estoque e a produção programada para
              acionar status Amarelo.
            </p>
            <input
              type="range"
              min="1"
              max="30"
              value={regras.amareloDiasRuptura}
              onChange={(e) =>
                setRegras({ ...regras, amareloDiasRuptura: parseInt(e.target.value) || 7 })
              }
              className="w-full accent-[#004C97]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 block text-xs">
                Prefixos Linha L1 (Parametrizáveis)
              </span>
              <div className="space-y-1">
                {Object.entries(regras.prefixosL1).map(([pref, data]) => (
                  <div
                    key={pref}
                    className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100 text-[11px]"
                  >
                    <span className="font-mono font-bold text-[#004C97]">{pref}</span>
                    <span className="text-slate-600">
                      {data.descricao} ({data.familia})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 block text-xs">
                Prefixos Linha L2 (Parametrizáveis)
              </span>
              <div className="space-y-1">
                {Object.entries(regras.prefixosL2).map(([pref, data]) => (
                  <div
                    key={pref}
                    className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100 text-[11px]"
                  >
                    <span className="font-mono font-bold text-[#004C97]">{pref}</span>
                    <span className="text-slate-600">
                      {data.descricao} ({data.familia})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#004C97] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#004C97]" /> Justificativa Obrigatória de
                Governança
              </span>
              <Badge className="bg-slate-200 text-slate-800 text-[10px]">
                Auditado pelo AD/PCP
              </Badge>
            </div>

            <textarea
              rows={2}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva a razão técnica para alteração das tolerâncias ou regras..."
              className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSalvar}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Salvar & Publicar Nova Versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default GovernancaRegrasModal
