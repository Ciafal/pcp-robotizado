import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Check, X, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'

export interface AIReviewModalProps {
  isOpen: boolean
  onClose: () => void
  sectionTitle: string
  sectionKey: string
  mode: string
  originalText: string
  suggestedText: string
  onAccept: (acceptedText: string) => void
  onReject: () => void
}

export const AIReviewModal: React.FC<AIReviewModalProps> = ({
  isOpen,
  onClose,
  sectionTitle,
  sectionKey,
  mode,
  originalText,
  suggestedText,
  onAccept,
  onReject,
}) => {
  const [editedText, setEditedText] = useState<string>(suggestedText)

  // Sincroniza quando a sugestão muda
  React.useEffect(() => {
    setEditedText(suggestedText)
  }, [suggestedText])

  const modeLabels: Record<string, string> = {
    grammar: 'Corrigir Português',
    clarity: 'Melhorar Clareza',
    executive: 'Tornar Mais Executivo',
    summarize: 'Resumir Análise',
    expand: 'Expandir Análise',
    inconsistencies: 'Verificar Inconsistências',
    compare_sources: 'Comparar com Fontes de Origem',
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#004C97] text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Revisão Assistida com Agente IA Nativo CIAFAL
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Seção: <strong>{sectionTitle}</strong> ({sectionKey})
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-sky-50 text-sky-800 border-sky-300 text-xs font-semibold"
            >
              Modo: {modeLabels[mode] || mode}
            </Badge>
          </div>
        </DialogHeader>

        {/* Alerta de Diretriz CIAFAL */}
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Diretriz de Segurança:</strong> A IA nunca altera números, toneladas, códigos
            SAP, materiais ou datas. Qualquer inconsistência detectada é sinalizada para decisão do
            programador PCP.
          </span>
        </div>

        {/* Comparação Lado a Lado (Original vs Sugestão) */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Lado Esquerdo: Original */}
          <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
            <div className="p-2.5 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
              <span>Texto Original PCP</span>
              <span className="text-[10px] text-slate-500">Imutável nesta visão</span>
            </div>
            <div className="p-3 text-slate-800 whitespace-pre-wrap font-sans leading-relaxed flex-1 overflow-y-auto max-h-[360px]">
              {originalText || '(Texto em branco)'}
            </div>
          </div>

          {/* Lado Direito: Sugestão IA */}
          <div className="flex flex-col border-2 border-sky-300 rounded-lg overflow-hidden bg-white shadow-xs">
            <div className="p-2.5 bg-sky-50 border-b border-sky-200 font-bold text-sky-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Sugestão Proposta pelo Agente
              </span>
              <span className="text-[10px] text-sky-700">Editável antes do aceite</span>
            </div>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="p-3 text-slate-900 font-sans leading-relaxed flex-1 w-full border-0 focus:outline-none focus:ring-0 resize-none min-h-[300px] text-xs"
              placeholder="Sugestão gerada pela inteligência artificial..."
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onReject()
                onClose()
              }}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
              <span>Rejeitar Sugestão</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onAccept(editedText)
                onClose()
              }}
              className="text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-bold shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aceitar Sugestão e Aplicar</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default AIReviewModal
