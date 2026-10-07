import React from 'react'
import {
  X,
  Database,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatNumberPtBr } from '@/lib/number-format'

export interface DetailModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badgeLabel?: string
  totalCount?: number
  items: any[]
  type:
    | 'MP_DETAIL'
    | 'CARTEIRA_DETAIL'
    | 'SEQUENCING_DETAIL'
    | 'ESTOQUE_DETAIL'
    | 'AI_RECOMMENDATION'
    | 'CHAIN_SUMMARY'
}

export const IndustrializerDetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeLabel,
  totalCount,
  items,
  type,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col w-full sm:w-[94vw] lg:w-[90vw] xl:w-[85vw] max-w-[1500px] h-full sm:h-[90vh] max-h-[95vh] border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho Fixo do Modal */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#004C97]/10 border border-[#004C97]/20 flex items-center justify-center text-[#004C97]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Detalhamento Analítico & Rastreabilidade
                </span>
                {badgeLabel && (
                  <Badge className="bg-[#004C97] text-white text-[10px]">{badgeLabel}</Badge>
                )}
                {totalCount !== undefined && (
                  <Badge variant="outline" className="text-[10px] text-slate-600">
                    {totalCount} registro(s) correlacionado(s)
                  </Badge>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {title}
              </h2>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Corpo do Modal com Rolagem Vertical e Tabela com Rolagem Horizontal Interna */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {subtitle && (
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">
                  Orientações & Rastreabilidade:{' '}
                </span>
                {subtitle}
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs">
              <Layers className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">
                Nenhum registro para exibir neste critério.
              </p>
              <p className="text-slate-400">
                Verifique os filtros selecionados ou atualize a sincronização.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto max-h-[64vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 sticky top-0 z-10 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap">#</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Código Material</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Descrição</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Industrializador</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Aço / Norma</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Dimensão</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">Quantidade</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Depósito / Local</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Rastreabilidade / Origem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {items.map((row, idx) => {
                      const code =
                        row.material_code || row.mp_code || row.sap_order || `REG-${idx + 1}`
                      const desc =
                        row.material_description || row.description || row.client_name || '-'
                      const ind = row.industrializer_name || row.industrializer_code || 'CIAFAL'
                      const steel = row.steel_grade || '-'
                      const dim = row.dimension || row.dimensions || row.standard_billet || '-'
                      const qty =
                        row.ordered_quantity_tons ??
                        row.quantity_tons ??
                        row.planned_volume_tons ??
                        row.released_stock_tons ??
                        row.current_stock_tons ??
                        0
                      const loc = row.storage_location || row.center_line || 'CFPL'
                      const statusVal = row.status || row.status_label || 'NORMAL'
                      const source = row.data_source || row.official_source || 'SAP ECC MB52'

                      return (
                        <tr key={row.id || idx} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {code}
                          </td>
                          <td
                            className="py-2 px-3 min-w-[200px] max-w-[320px] truncate"
                            title={desc}
                          >
                            {desc}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-600">{ind}</td>
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                            {steel}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">{dim}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                            {formatNumberPtBr(qty, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 2,
                            })}{' '}
                            t
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {loc}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                statusVal.includes('VERMELHO') ||
                                statusVal.includes('ATRASADO') ||
                                statusVal.includes('CRITICO')
                                  ? 'bg-rose-100 text-rose-800'
                                  : statusVal.includes('AMARELO') ||
                                      statusVal.includes('PARCIAL') ||
                                      statusVal.includes('ALTO')
                                    ? 'bg-amber-100 text-amber-800'
                                    : statusVal.includes('AZUL') || statusVal.includes('FUTURA')
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {statusVal}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-500">
                            <div className="flex items-center gap-1 font-mono">
                              <Database className="w-3 h-3 text-[#004C97]" />
                              <span>{source}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Formato oficial:</span>
            <span>SI / ABNT (t, mm) &bull; Vírgula decimal pt-BR &bull; Validação SAP RFC</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs bg-white text-slate-700 hover:bg-slate-100"
          >
            Fechar Janela
          </Button>
        </div>
      </div>
    </div>
  )
}
export default IndustrializerDetailModal
