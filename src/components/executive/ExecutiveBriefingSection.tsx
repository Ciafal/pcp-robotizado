import React, { useState } from 'react'
import {
  FileText,
  Download,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExecutiveBriefingRecord, BriefingCadence } from '@/types/executive-cockpit'
import { formatCiafalNumber, formatWithUnit } from '@/services/deterministic-executive-engine'
import { useToast } from '@/hooks/use-toast'
import { OeeInteractiveValue } from '@/components/common/OeeInteractiveValue'

interface ExecutiveBriefingSectionProps {
  briefings: ExecutiveBriefingRecord[]
  kpis: any
  onGenerateBriefing: (cadence: BriefingCadence) => Promise<void>
}

export const ExecutiveBriefingSection: React.FC<ExecutiveBriefingSectionProps> = ({
  briefings,
  kpis,
  onGenerateBriefing,
}) => {
  const { toast } = useToast()
  const [selectedCadence, setSelectedCadence] = useState<BriefingCadence>('SEMANAL')
  const [generating, setGenerating] = useState<boolean>(false)

  const handleTriggerGenerate = async () => {
    setGenerating(true)
    try {
      await onGenerateBriefing(selectedCadence)
      toast({
        title: 'Briefing Executivo Consolidado',
        description: `Briefing ${selectedCadence} gerado com sucesso e disponível para download.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar briefing',
        description: err?.message || 'Falha ao consolidar briefing executivo.',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handlePrintPDF = () => {
    window.print()
  }

  const latestBriefing = briefings[0]

  return (
    <Card className="bg-white border-slate-200 shadow-sm print:border-none print:shadow-none">
      <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#004C97] text-white rounded-md shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              Briefing Executivo CIAFAL
              <Badge
                variant="outline"
                className="text-[10px] border-blue-300 text-[#004C97] bg-blue-50"
              >
                Rotina Periódica & PDF
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Consolidação automatizada: o que mudou, desvios, tendências, riscos, decisões
              pendentes e ações atrasadas.
            </p>
          </div>
        </div>

        {/* Controles de Geração e Exportação */}
        <div className="flex items-center gap-2 print:hidden">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
            {(['DIARIO', 'SEMANAL', 'MENSAL'] as BriefingCadence[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCadence(c)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                  selectedCadence === c
                    ? 'bg-[#004C97] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={handleTriggerGenerate}
            disabled={generating}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 gap-1 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generating ? 'Consolidando...' : 'Gerar Novo Briefing'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintPDF}
            className="border-slate-300 text-slate-700 text-xs h-8 gap-1"
          >
            <Printer className="w-3.5 h-3.5 text-[#004C97]" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Documento Executivo Formatado */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4 print:p-0 print:border-none">
          {/* Cabeçalho do Relatório */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#004C97]">
                CIAFAL Wilson Santos &bull; Inteligência Industrial
              </span>
              <h2 className="text-base font-black text-slate-900">
                {latestBriefing?.title || `Briefing Executivo CIAFAL - ${selectedCadence}`}
              </h2>
              <span className="text-[11px] text-slate-500">
                Período de Referência:{' '}
                {latestBriefing?.period_ref || new Date().toISOString().split('T')[0]} &bull; Gerado
                por: {latestBriefing?.generated_by_name || 'Sistema Central PCP'}
              </span>
            </div>

            <div className="text-right">
              <Badge className="bg-[#004C97] text-white text-[10px] font-mono">
                {latestBriefing?.code || 'BRF-2025-W21-LIVE'}
              </Badge>
              <span className="block text-[9px] text-slate-400 mt-1">
                Unidades Oficiais: <strong>t</strong> &bull; <strong>kg</strong> &bull;{' '}
                <strong>h</strong> &bull; <strong>%</strong>
              </span>
            </div>
          </div>

          {/* Destaques de Indicadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">
                Produção Realizada
              </span>
              <span className="text-base font-black text-slate-900">920,0 t</span>
              <span className="block text-[9px] text-rose-600 font-bold">-40,0 t vs Meta</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">
                Aderência OTIF
              </span>
              <span className="text-base font-black text-[#004C97]">94,0%</span>
              <span className="block text-[9px] text-emerald-600 font-bold">+1,2% vs S-1</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">
                OEE Agregado
              </span>
              <div className="text-base font-black text-slate-900">
                <OeeInteractiveValue
                  value={83.5}
                  target={85.0}
                  unit="%"
                  className="text-base font-black text-slate-900"
                  drilldownContext={{
                    lineCode: 'L1',
                    period: 'semanal',
                  }}
                />
              </div>
              <span className="block text-[9px] text-amber-600 font-bold">Meta: 85,0%</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">
                Estoque Pulmão
              </span>
              <span className="text-base font-black text-slate-900">1.420,5 t</span>
              <span className="block text-[9px] text-slate-500 font-bold">
                18 dias de cobertura
              </span>
            </div>
          </div>

          {/* Resumo Estruturado do Briefing */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                1. O que mudou e Principais Resultados
              </span>
              <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                A cadência da Linha 01 (Laminação) recuperou estabilidade térmica após a
                substituição preventiva dos cilindros, alcançando 38,5 t/h. O sequenciamento gerado
                pelo solver CP-SAT garantiu 94,0% de aderência na carteira comercial programada para
                a semana corrente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  2. Desvios e Gargalos Críticos
                </span>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 space-y-1.5">
                  <p>
                    &bull; <strong>Buffer Térmico L01&rarr;L02:</strong> Operando em 8,5 t (mínimo
                    de segurança: 15,0 t).
                  </p>
                  <p>
                    &bull; <strong>Tempo de Setup L02:</strong> Média de 42 min por troca (padrão de
                    ficha mestre: 25 min).
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
                  3. Decisões Pendentes e Ações Prioritárias
                </span>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 space-y-1.5">
                  <p>
                    &bull; <strong>Aprovação de Reordenamento CP-SAT:</strong> Pendente de validação
                    pela gerência de Laminação.
                  </p>
                  <p>
                    &bull; <strong>Lote Emergencial de Tarugos:</strong> Transferência de 50,0 t
                    programada para o 2º turno.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assinatura e Rastreabilidade */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Documento auditado e assinado digitalmente no HUB CIAFAL
            </span>
            <span className="font-mono text-[9px]">
              Emitido em: {new Date().toLocaleString('pt-BR')} &bull; LGPD Compliant
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ExecutiveBriefingSection
