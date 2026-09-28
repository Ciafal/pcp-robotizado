import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Layers, Plus, Pencil } from 'lucide-react'
import { LineRawMaterialPriority } from '@/types/line-master'
import { formatDatePTBR } from '@/lib/formatters-ptbr'

interface RawMaterialPrioritiesPanelProps {
  rawMaterials: LineRawMaterialPriority[]
  onAddClick: () => void
  onEditClick: (item: LineRawMaterialPriority) => void
  onToggleStatusClick?: (item: LineRawMaterialPriority) => void
  isReadOnly?: boolean
}

/**
 * Formata intervalo de vigência no padrão requerido:
 * Ex: 01/10/2026 → 31/10/2026 ou 01/10/2026 → Indeterminado
 */
function formatVigencia(start?: string | null, end?: string | null): string {
  const startFmt = start ? formatDatePTBR(start) : '—'
  const endFmt = end ? formatDatePTBR(end) : 'Indeterminado'
  return `${startFmt} → ${endFmt}`
}

export const RawMaterialPrioritiesPanel: React.FC<RawMaterialPrioritiesPanelProps> = ({
  rawMaterials,
  onAddClick,
  onEditClick,
  isReadOnly = false,
}) => {
  // Ordenação da tabela: prioridade crescente e, dentro da mesma prioridade, data de início crescente
  const sortedMaterials = [...rawMaterials].sort((a, b) => {
    const pA = a.priority_order ?? 999
    const pB = b.priority_order ?? 999
    if (pA !== pB) return pA - pB
    const dA = (a.valid_from || '').slice(0, 10)
    const dB = (b.valid_from || '').slice(0, 10)
    return dA.localeCompare(dB)
  })

  return (
    <Card
      id="section-raw-materials"
      data-target-id="raw-materials"
      className="bg-white border-slate-200 text-slate-900 shadow-sm transition-all duration-300"
    >
      <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            Prioridades de Matéria-Prima & Bobinas ({rawMaterials.length})
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Classificação preferencial de matérias-primas por centro produtivo (1 = prioridade
            máxima).
          </CardDescription>
        </div>
        {!isReadOnly && (
          <Button
            id="target-add-raw-material-btn"
            data-testid="btn-add-raw-material-priority"
            size="sm"
            onClick={onAddClick}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 gap-1.5 font-bold shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastrar Prioridade de Matéria-Prima
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-3">
        {/* Tabela Responsiva sem scroll horizontal forçado e sem overflow escondido */}
        <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table
            className="w-full text-left text-xs text-slate-700 table-auto"
            data-testid="raw-materials-table"
          >
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold">
              <tr>
                <th className="p-2.5 w-16 text-center whitespace-nowrap">Prioridade</th>
                <th className="p-2.5 w-28 whitespace-nowrap">Código MP</th>
                <th className="p-2.5 min-w-[150px]">Descrição MP</th>
                <th className="p-2.5 w-24 whitespace-nowrap">Bitola</th>
                <th className="p-2.5 w-32 whitespace-nowrap">Grupo Mercadorias</th>
                <th className="p-2.5 w-24 whitespace-nowrap">Critério</th>
                <th className="p-2.5 w-40 whitespace-nowrap">Vigência</th>
                <th className="p-2.5 w-20 text-center whitespace-nowrap">Status</th>
                <th className="p-2.5 w-20 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMaterials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                    Nenhuma prioridade de matéria-prima cadastrada para este Centro.
                  </td>
                </tr>
              ) : (
                sortedMaterials.map((r) => {
                  const isActive = r.active !== false
                  return (
                    <tr
                      key={r.id}
                      data-testid={`raw-material-row-${r.material_code}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Prioridade */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <Badge
                          className={`font-mono font-bold text-xs ${
                            r.priority_order === 1
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          #{r.priority_order}
                        </Badge>
                      </td>

                      {/* Código MP */}
                      <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.material_code}
                      </td>

                      {/* Descrição MP */}
                      <td
                        className="p-2.5 text-slate-700 font-medium max-w-xs truncate"
                        title={r.material_description}
                      >
                        {r.material_description}
                      </td>

                      {/* Bitola */}
                      <td className="p-2.5 text-slate-700 font-medium whitespace-nowrap">
                        {r.bitola ? (
                          <span className="font-mono text-slate-800">{r.bitola}</span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Grupo Mercadorias */}
                      <td
                        className="p-2.5 text-slate-600 truncate max-w-[140px]"
                        title={r.material_group || ''}
                      >
                        {r.material_group || 'Bobinas BQ'}
                      </td>

                      {/* Critério */}
                      <td className="p-2.5 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-200 bg-slate-50 text-slate-700 font-medium"
                          title={
                            r.criterio_prioridade === 'Outro' && r.descricao_outro_criterio
                              ? `Outro: ${r.descricao_outro_criterio}`
                              : r.criterio_prioridade || 'Rotativa'
                          }
                        >
                          {r.criterio_prioridade || 'Rotativa'}
                        </Badge>
                      </td>

                      {/* Vigência */}
                      <td className="p-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatVigencia(r.valid_from, r.valid_until)}
                      </td>

                      {/* Status */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {isActive ? (
                          <Badge
                            data-testid={`badge-status-active-${r.id}`}
                            className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold"
                          >
                            Ativo
                          </Badge>
                        ) : (
                          <Badge
                            data-testid={`badge-status-inactive-${r.id}`}
                            className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold"
                          >
                            Inativo
                          </Badge>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditClick(r)}
                            data-testid={`btn-edit-raw-material-${r.material_code}`}
                            className="h-7 px-2.5 text-[11px] font-semibold text-[#004C97] hover:bg-blue-50 gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default RawMaterialPrioritiesPanel
