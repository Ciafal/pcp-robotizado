/**
 * Visualização detalhada do Plano de Tarugos: identificação, tarugo principal
 * e alternativas em tabela (Prioridade | Código | Descrição | Peso | Quantidade |
 * Comprimento | Fornecedor | Status) + ações Editar/Duplicar/Inativar/Histórico.
 */
import { useState } from 'react'
import { Copy, History, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePermission } from '@/components/auth/Can'
import type { TarugoPlanRecord } from '@/services/tarugo-plans-service'
import { tarugoFormatters } from '@/services/tarugo-plans-service'

interface Props {
  plan: TarugoPlanRecord | null
  onClose: () => void
  onEdit: (plan: TarugoPlanRecord) => void
  onDuplicate: (plan: TarugoPlanRecord) => void
  onHistory: (plan: TarugoPlanRecord) => void
}

export function TarugoPlanDetailModal({ plan, onClose, onEdit, onDuplicate, onHistory }: Props) {
  const [tab, setTab] = useState<'identificacao' | 'principal' | 'alternativas'>('identificacao')
  const { canAny } = usePermission()
  const canManageTarugoPlans = canAny(['pcp.mp_opt.simulate', 'pcp.mp_opt.modify_app'])

  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">
        {value != null && String(value).length ? value : 'Dados não disponíveis'}
      </p>
    </div>
  )

  if (!plan) return null

  const alts = plan.alternatives || []

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Plano de Tarugos {plan.cutting_plan} — {plan.company}
          </DialogTitle>
          <DialogDescription>
            {plan.center} · {plan.line} ·{' '}
            <Badge variant={plan.status === 'Ativo' ? 'default' : 'secondary'}>{plan.status}</Badge>{' '}
            <Badge variant="outline" className="text-[10px]">
              Origem: {plan.origin}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Abas simples */}
        <div className="flex gap-1 border-b pb-1 text-sm">
          {(
            [
              ['identificacao', 'Identificação'],
              ['principal', 'Tarugo Principal'],
              ['alternativas', `Alternativas (${alts.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                tab === key
                  ? 'bg-[#004C97]/10 font-semibold text-[#004C97]'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'identificacao' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Empresa" value={plan.company} />
            <Field label="Centro" value={plan.center} />
            <Field label="Linha" value={plan.line} />
            <Field label="Plano de Corte" value={plan.cutting_plan} />
            <Field label="Status" value={plan.status} />
            <Field label="Origem" value={plan.origin} />
            <Field label="Descrição do Plano" value={plan.plan_description} />
            <Field label="Última alteração" value={tarugoFormatters.dateTime(plan.updated)} />
            <Field label="Criado em" value={tarugoFormatters.dateTime(plan.created)} />
          </div>
        )}

        {tab === 'principal' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Código Material SAP" value={plan.main_material_code} />
            <Field label="Descrição" value={plan.main_description} />
            <Field label="Família/Aço" value={plan.main_steel_family} />
            <Field label="Código Fornecedor" value={plan.main_supplier_code} />
            <Field label="Razão Social / Fornecedor" value={plan.main_supplier_name} />
            <Field label="Seção/Dimensão" value={plan.main_dimension_section} />
            <Field label="Comprimento" value={tarugoFormatters.meters(plan.main_length_m)} />
            {plan.main_length_min_m != null && (
              <Field
                label="Comprimento mínimo"
                value={tarugoFormatters.meters(plan.main_length_min_m)}
              />
            )}
            {plan.main_length_max_m != null && (
              <Field
                label="Comprimento máximo"
                value={tarugoFormatters.meters(plan.main_length_max_m)}
              />
            )}
            <Field label="Peso padrão do tarugo" value={tarugoFormatters.kg(plan.main_weight_kg)} />
          </div>
        )}

        {tab === 'alternativas' && (
          <div className="overflow-x-auto">
            {alts.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum tarugo alternativo cadastrado para este plano.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Peso</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Comprimento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alts
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((alt, i) => (
                      <TableRow key={`${alt.material_code}-${i}`}>
                        <TableCell>{alt.priority}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {alt.material_code || '—'}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {alt.description || 'Dados não disponíveis'}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {tarugoFormatters.kg(alt.weight_kg)}
                        </TableCell>
                        <TableCell className="text-right">{alt.quantity}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {tarugoFormatters.meters(alt.length_m)}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">
                          {alt.supplier_name || 'Dados não disponíveis'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={alt.status === 'Ativo' ? 'default' : 'secondary'}>
                            {alt.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
          {canManageTarugoPlans && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(plan)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onDuplicate(plan)}
              >
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onHistory(plan)}>
            <History className="h-3.5 w-3.5" /> Histórico
          </Button>
          <Button size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TarugoPlanDetailModal
