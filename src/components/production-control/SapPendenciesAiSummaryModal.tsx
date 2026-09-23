import React from 'react'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Printer,
  ShieldCheck,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { AiAnalysisSummary } from '@/types/sap-pendencies'

interface SapPendenciesAiSummaryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: AiAnalysisSummary | null
  pendencyType: 'COGI' | 'CO1P'
}

export const SapPendenciesAiSummaryModal: React.FC<SapPendenciesAiSummaryModalProps> = ({
  open,
  onOpenChange,
  summary,
  pendencyType,
}) => {
  const { toast } = useToast()

  if (!summary) return null

  const handleCopy = () => {
    const text = `=== RESUMO EXECUTIVO IA — PENDÊNCIAS ${pendencyType} (HUB CIAFAL) ===
Data de Emissão: ${new Date().toLocaleString('pt-BR')}

1. SITUAÇÃO ATUAL:
${summary.situacao_atual}

2. PRIORIDADE IMEDIATA:
${summary.prioridade_imediata}

3. PRINCIPAL PROBLEMA:
${summary.principal_problema}

4. CONCENTRAÇÃO:
${summary.concentracao}

5. REINCIDÊNCIA:
${summary.reincidencia}

6. AÇÕES PREVISTAS:
${summary.acoes_previstas.join('\n')}

FONTES SGQ UTILIZADAS:
${summary.fonte_sgq.join(', ')}

* Diretriz: A IA atua com parecer consultivo; correções transacionais dependem de execução por usuário autorizado no SAP ECC.`

    navigator.clipboard.writeText(text)
    toast({
      title: 'Resumo copiado!',
      description: 'Texto executivo copiado para a área de transferência.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 border-b border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30 text-amber-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Resumo Executivo IA — Pendências {pendencyType}
                  <Badge className="bg-blue-600/60 text-blue-200 text-[10px] font-mono border-blue-400/40">
                    HUB CIAFAL
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-blue-200/80">
                  Parecer sintetizado para reunião de PCP, coordenação de produção e qualidade.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Estruturado */}
        <div className="p-5 space-y-3.5 text-xs max-h-[70vh] overflow-y-auto">
          {/* Situação Atual */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-800 uppercase text-[10px] block mb-1">
              1. Situação Atual
            </span>
            <p className="text-slate-700 leading-relaxed">{summary.situacao_atual}</p>
          </div>

          {/* Prioridade Imediata */}
          <div className="bg-rose-50/70 p-3 rounded-lg border border-rose-200">
            <span className="font-bold text-rose-900 uppercase text-[10px] block mb-1">
              2. Prioridade Imediata
            </span>
            <p className="text-rose-800 leading-relaxed">{summary.prioridade_imediata}</p>
          </div>

          {/* Principal Problema & Concentração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200">
              <span className="font-bold text-amber-900 uppercase text-[10px] block mb-1">
                3. Principal Problema
              </span>
              <p className="text-amber-800 leading-relaxed">{summary.principal_problema}</p>
            </div>
            <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200">
              <span className="font-bold text-blue-900 uppercase text-[10px] block mb-1">
                4. Concentração
              </span>
              <p className="text-blue-800 leading-relaxed">{summary.concentracao}</p>
            </div>
          </div>

          {/* Reincidência */}
          <div className="bg-purple-50/70 p-3 rounded-lg border border-purple-200">
            <span className="font-bold text-purple-900 uppercase text-[10px] block mb-1">
              5. Padrão de Reincidência
            </span>
            <p className="text-purple-800 leading-relaxed">{summary.reincidencia}</p>
          </div>

          {/* Ações Previstas */}
          <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
            <span className="font-bold text-emerald-900 uppercase text-[10px] block mb-1.5">
              6. Ações Previstas e Recomendações SGQ
            </span>
            <ul className="space-y-1 text-emerald-950 font-mono text-[11px]">
              {summary.acoes_previstas.map((acao, i) => (
                <li key={i}>{acao}</li>
              ))}
            </ul>
          </div>

          {/* Fonte SGQ */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Fontes SGQ associadas:</span>
              <span className="font-mono font-bold text-slate-700">
                {summary.fonte_sgq.join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Sem procedimentos inventados
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs h-8 gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Copiar Resumo
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 bg-blue-700 hover:bg-blue-800 text-white"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
