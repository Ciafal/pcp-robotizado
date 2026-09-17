import React, { useState } from 'react'
import { FileText, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScheduleItemDocumentImpact } from '@/types/sgq-rules'
import { SGQ_INTERFERENCE_CATEGORY_LABELS } from '@/services/sgq-document-provider'

interface SgqRuleIndicatorBadgeProps {
  impacts: ScheduleItemDocumentImpact[]
  compact?: boolean
}

export const SgqRuleIndicatorBadge: React.FC<SgqRuleIndicatorBadgeProps> = ({
  impacts,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!impacts || impacts.length === 0) {
    return null
  }

  const hasBlocking = impacts.some(
    (i) => i.rule_type === 'OBRIGATORIA' || i.rule_type === 'PROIBICAO' || i.rule_type === 'LIMITE',
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all shadow-2xs ${
            hasBlocking
              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
          }`}
          title="Clique para ver os detalhes da regra documental do SGQ aplicada"
        >
          <span className="shrink-0">📄</span>
          <span>{compact ? 'SGQ' : 'Regra SGQ aplicada'}</span>
          {impacts.length > 1 && (
            <span className="ml-0.5 px-1 rounded-full bg-white/70 text-[9px] font-bold">
              {impacts.length}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-3 text-xs space-y-3 z-50 shadow-lg" align="start">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Regras Oficiais do SGQ</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {impacts.length} {impacts.length === 1 ? 'regra' : 'regras'}
          </Badge>
        </div>

        <div className="space-y-2.5 max-h-64 overflow-y-auto">
          {impacts.map((imp, idx) => (
            <div key={idx} className="p-2 rounded border bg-muted/20 space-y-1 text-[11px]">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-primary flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {imp.document_code} ({imp.revision})
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase tracking-wider font-semibold"
                >
                  {SGQ_INTERFERENCE_CATEGORY_LABELS[imp.category] || imp.category}
                </Badge>
              </div>

              {/* Impacto realizado */}
              <div className="text-foreground font-medium mt-1">{imp.impact_realized}</div>

              {/* Trecho de origem */}
              {imp.source_excerpt && (
                <div className="text-muted-foreground italic text-[10px] bg-background/80 p-1.5 rounded border border-border/40">
                  "{imp.source_excerpt}"
                </div>
              )}

              {/* Botão Abrir Documento Original */}
              {imp.original_url && (
                <div className="pt-1 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    className="h-6 text-[10px] gap-1 px-1.5 text-primary hover:text-primary"
                  >
                    <a href={imp.original_url} target="_blank" rel="noopener noreferrer">
                      <span>Abrir documento original</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default SgqRuleIndicatorBadge
