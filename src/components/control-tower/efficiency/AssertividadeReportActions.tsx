/**
 * Barra de ações do Previsto x Realizado: "Gerar PDF" e "Enviar Relatório".
 * Posicionada abaixo do título "Assertividade da Programação" e acima do painel
 * "Período de Análise". "Gerar Rotina" (Fases 3-5) NÃO faz parte desta rodada.
 */
import React, { useEffect, useState } from 'react'
import { FileText, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import {
  REPORT_SECTIONS,
  REPORT_KIND_LABEL,
  buildReportHtml,
  printReportHtml,
  defaultSectionsForKind,
  type ReportKind,
  type ReportSectionId,
  type AssertividadeReportRow,
} from '@/services/assertiveness-report-service'

interface AssertividadeReportActionsProps {
  rows: AssertividadeReportRow[]
  filters: UnifiedEfficiencyFilters
}

function resolveResponsavel(): string {
  try {
    const rec = (pb.authStore as unknown as { record?: { name?: string; email?: string } }).record
    return rec?.name || rec?.email || 'Usuário HUB CIAFAL'
  } catch {
    return 'Usuário HUB CIAFAL'
  }
}

export const AssertividadeReportActions: React.FC<AssertividadeReportActionsProps> = ({
  rows,
  filters,
}) => {
  const { toast } = useToast()
  const [pdfOpen, setPdfOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [kind, setKind] = useState<ReportKind>('completo')
  const [sections, setSections] = useState<ReportSectionId[]>(defaultSectionsForKind('completo'))
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    if (pdfOpen) setSections(defaultSectionsForKind(kind))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, pdfOpen])

  const toggleSection = (id: ReportSectionId, checked: boolean) => {
    setSections((prev) => (checked ? [...prev, id] : prev.filter((s) => s !== id)))
  }

  const handleGerarPdf = () => {
    if (sections.length === 0) {
      toast({
        title: 'Selecione o conteúdo do relatório',
        description: 'Escolha ao menos uma seção para gerar o documento.',
        variant: 'destructive',
      })
      return
    }
    setGerando(true)
    try {
      const html = buildReportHtml({
        kind,
        sections,
        rows,
        filters,
        responsavel: resolveResponsavel(),
        geradoEm: new Date(),
      })
      printReportHtml(html)
      toast({
        title: 'Relatório gerado',
        description: 'Documento A4 enviado para impressão/PDF com os filtros atuais da tela.',
      })
      setPdfOpen(false)
    } catch (err) {
      console.error('[RelatorioPrevistoRealizado] Erro ao montar o relatório:', err)
      toast({
        title: 'Falha ao gerar o relatório',
        description: 'Não foi possível montar o documento. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 print:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        title="Gerar relatório em PDF (A4, padrão institucional Ciafal)"
        className="border-[#004C97]/30 text-[#004C97] hover:bg-[#004C97]/5"
        onClick={() => setPdfOpen(true)}
      >
        <FileText className="w-4 h-4 mr-1.5" />
        Gerar PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        title="Enviar o relatório por e-mail corporativo e/ou alerta interno do HUB"
        className="border-[#004C97]/30 text-[#004C97] hover:bg-[#004C97]/5"
        onClick={() => setSendOpen(true)}
      >
        <Send className="w-4 h-4 mr-1.5" />
        Enviar Relatório
      </Button>

      {/* Janela de configuração do relatório (Fase 1) */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#004C97]">Gerar Relatório PDF</DialogTitle>
            <DialogDescription>
              Os filtros atuais da tela (empresa, planta, linha e período) são carregados
              automaticamente no documento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Tipo de relatório</Label>
              <RadioGroup
                value={kind}
                onValueChange={(v) => setKind(v as ReportKind)}
                className="mt-2 grid grid-cols-3 gap-2"
              >
                {(Object.keys(REPORT_KIND_LABEL) as ReportKind[]).map((k) => (
                  <Label
                    key={k}
                    htmlFor={`kind-${k}`}
                    className="flex items-center gap-2 border rounded-md px-2.5 py-2 text-xs font-normal cursor-pointer hover:bg-slate-50"
                  >
                    <RadioGroupItem id={`kind-${k}`} value={k} />
                    {REPORT_KIND_LABEL[k].replace('Relatório ', '')}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Conteúdo do relatório</Label>
              <div className="mt-2 space-y-1.5 border rounded-md p-2.5 max-h-56 overflow-y-auto">
                {REPORT_SECTIONS.map((s) => (
                  <div key={s.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`sec-${s.id}`}
                      checked={sections.includes(s.id)}
                      onCheckedChange={(c) => toggleSection(s.id, c === true)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`sec-${s.id}`}
                      className="text-xs font-normal cursor-pointer leading-snug"
                    >
                      {s.label}
                      {!s.available && (
                        <span className="ml-1.5 text-[10px] text-amber-700">
                          (Dados não disponíveis)
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPdfOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#004C97] hover:bg-[#003a75] text-white"
              onClick={handleGerarPdf}
              disabled={gerando}
            >
              {gerando ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-1.5" />
              )}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fase 2 — Enviar Relatório */}
      <AssertividadeSendReportLazy
        open={sendOpen}
        onOpenChange={setSendOpen}
        rows={rows}
        filters={filters}
      />
    </div>
  )
}

import { AssertividadeSendReportModal as AssertividadeSendReportLazy } from './AssertividadeSendReportModal'

export default AssertividadeReportActions
