/**
 * Modal de cadastro/edição GRANDE (3 blocos) do Plano de Tarugos.
 * Validações bloqueiam salvar; erros aparecem ABAIXO do campo;
 * o que foi digitado nunca é apagado por validação.
 */
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MaterialSelector } from '@/components/common/MaterialSelector'
import type { MaterialOption } from '@/components/common/MaterialSelector'
import {
  tarugoPlansService,
  type TarugoAlternative,
  type TarugoPlanRecord,
  type ValidationError,
} from '@/services/tarugo-plans-service'
import { useHierarchyOptions } from '@/components/mp-optimization/tarugo-plan-hierarchy-options'

interface FormState {
  company: string
  center: string
  line: string
  cutting_plan: string
  plan_description: string
  status: 'Ativo' | 'Inativo'
  main_material_code: string
  main_description: string
  main_steel_family: string
  main_supplier_code: string
  main_supplier_name: string
  main_dimension_section: string
  main_length_m: string
  main_length_min_m: string
  main_length_max_m: string
  main_weight_kg: string
  use_length_range: boolean
  alternatives: Array<TarugoAlternative & { _key: string }>
}

function emptyForm(): FormState {
  return {
    company: '',
    center: '',
    line: '',
    cutting_plan: '',
    plan_description: '',
    status: 'Ativo',
    main_material_code: '',
    main_description: '',
    main_steel_family: '',
    main_supplier_code: '',
    main_supplier_name: '',
    main_dimension_section: '',
    main_length_m: '',
    main_length_min_m: '',
    main_length_max_m: '',
    main_weight_kg: '',
    use_length_range: false,
    alternatives: [],
  }
}

function toForm(p: TarugoPlanRecord): FormState {
  return {
    company: p.company,
    center: p.center,
    line: p.line,
    cutting_plan: p.cutting_plan,
    plan_description: p.plan_description || '',
    status: p.status,
    main_material_code: p.main_material_code,
    main_description: p.main_description || '',
    main_steel_family: p.main_steel_family || '',
    main_supplier_code: p.main_supplier_code || '',
    main_supplier_name: p.main_supplier_name || '',
    main_dimension_section: p.main_dimension_section || '',
    main_length_m: String(p.main_length_m ?? ''),
    main_length_min_m: p.main_length_min_m != null ? String(p.main_length_min_m) : '',
    main_length_max_m: p.main_length_max_m != null ? String(p.main_length_max_m) : '',
    main_weight_kg: String(p.main_weight_kg ?? ''),
    use_length_range: p.main_length_min_m != null || p.main_length_max_m != null,
    alternatives: (p.alternatives || []).map((a, i) => ({ ...a, _key: `a${i}` })),
  }
}

interface Props {
  open: boolean
  editing: TarugoPlanRecord | null
  onClose: () => void
  onSaved: () => void
}

export function TarugoPlanFormModal({ open, editing, onClose, onSaved }: Props) {
  const hierarchy = useHierarchyOptions()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [saving, setSaving] = useState(false)
  const [duplicateKeyError, setDuplicateKeyError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(editing ? toForm(editing) : emptyForm())
      setErrors([])
      setDuplicateKeyError(null)
    }
  }, [open, editing])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const setAlt = (key: string, patch: Partial<TarugoAlternative>) =>
    setForm((f) => ({
      ...f,
      alternatives: f.alternatives.map((a) => (a._key === key ? { ...a, ...patch } : a)),
    }))

  const addAlt = () =>
    setForm((f) => ({
      ...f,
      alternatives: [
        ...f.alternatives,
        {
          order: f.alternatives.length + 2, // 1ª posição é o tarugo principal
          material_code: '',
          description: '',
          supplier_code: '',
          supplier_name: '',
          steel_family: '',
          weight_kg: 0,
          quantity: 1,
          length_m: 0,
          priority: ordinal(f.alternatives.length + 2),
          status: 'Ativo',
          _key: `a${Date.now()}`,
        },
      ],
    }))

  const removeAlt = (key: string) =>
    setForm((f) => ({
      ...f,
      alternatives: f.alternatives
        .filter((a) => a._key !== key)
        .map((a, i) => ({ ...a, order: i + 2, priority: ordinal(i + 2) })),
    }))

  const applyMaterial = (m: MaterialOption | undefined) => {
    if (!m) return
    setForm((f) => ({
      ...f,
      main_material_code: m.code,
      main_description: m.name || f.main_description,
      main_steel_family: m.steelGrade || m.family || f.main_steel_family,
      main_dimension_section: m.dimension || f.main_dimension_section,
    }))
  }

  const applyAltMaterial = (key: string, m: MaterialOption | undefined) => {
    if (!m) return
    setAlt(key, {
      material_code: m.code,
      description: m.name || '',
      steel_family: m.steelGrade || m.family || '',
    })
  }

  const errFor = (field: string): string | null =>
    errors.find((e) => e.field === field)?.message || null

  const errBelow = (field: string) =>
    errFor(field) ? <p className="mt-1 text-xs text-red-600">{errFor(field)}</p> : null

  function ordinal(n: number): string {
    const ordinals = [
      '1ª opção',
      '2ª opção',
      '3ª opção',
      '4ª opção',
      '5ª opção',
      '6ª opção',
      '7ª opção',
      '8ª opção',
      '9ª opção',
      '10ª opção',
    ]
    return ordinals[n - 1] || `${n}ª opção`
  }

  const handleSave = async () => {
    if (saving) return // bloqueio de duplo clique
    setErrors([])
    setDuplicateKeyError(null)

    const num = (v: string) => {
      const n = Number(String(v).replace(',', '.'))
      return isNaN(n) ? null : n
    }

    const payload = {
      company: form.company,
      center: form.center,
      line: form.line,
      cutting_plan: form.cutting_plan.trim(),
      plan_description: form.plan_description,
      status: form.status,
      main_material_code: form.main_material_code.trim(),
      main_description: form.main_description,
      main_steel_family: form.main_steel_family,
      main_supplier_code: form.main_supplier_code,
      main_supplier_name: form.main_supplier_name,
      main_dimension_section: form.main_dimension_section,
      main_length_m: num(form.main_length_m) ?? 0,
      main_length_min_m: form.use_length_range
        ? (num(form.main_length_min_m) ?? undefined)
        : undefined,
      main_length_max_m: form.use_length_range
        ? (num(form.main_length_max_m) ?? undefined)
        : undefined,
      main_weight_kg: num(form.main_weight_kg) ?? 0,
      alternatives: form.alternatives.map(({ _key, ...rest }) => ({
        ...rest,
        weight_kg: num(String(rest.weight_kg)) ?? 0,
        quantity: Number(rest.quantity) || 0,
        length_m: num(String(rest.length_m)) ?? 0,
      })),
    }

    // 1. Validações locais que bloqueiam salvar
    const errs = tarugoPlansService.validatePlan({
      company: payload.company,
      center: payload.center,
      line: payload.line,
      cutting_plan: payload.cutting_plan,
      main_material_code: payload.main_material_code,
      main_length_m: payload.main_length_m,
      main_weight_kg: payload.main_weight_kg,
      alternatives: payload.alternatives,
      steelFamily: payload.main_steel_family,
    })
    if (errs.length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      // 2. Duplicidade Empresa+Centro+Linha+Plano
      const dup = await tarugoPlansService.checkDuplicateKey(
        {
          company: payload.company,
          center: payload.center,
          line: payload.line,
          cutting_plan: payload.cutting_plan,
        },
        editing?.id,
      )
      if (dup) {
        setDuplicateKeyError(
          'Já existe um plano com este código para a mesma combinação de Empresa + Centro + Linha. Altere o Plano de Corte.',
        )
        return
      }

      if (editing) {
        await tarugoPlansService.updatePlan(editing.id, editing, payload)
        toast.success(`Plano de Tarugos ${payload.cutting_plan} atualizado com sucesso.`)
      } else {
        await tarugoPlansService.createPlan(payload, 'HUB')
        toast.success(`Plano de Tarugos ${payload.cutting_plan} cadastrado com sucesso.`)
      }
      onSaved()
    } catch (err: any) {
      console.error('[TarugoPlanFormModal] Erro ao salvar:', err)
      toast.error(err?.message || 'Não foi possível salvar o plano.')
    } finally {
      setSaving(false)
    }
  }

  const centerOptions = useMemo(() => hierarchy.centers, [hierarchy.centers])
  const lineOptions = useMemo(
    () => hierarchy.lines.filter((l) => !form.center || l.plant_id === form.center),
    [hierarchy.lines, form.center],
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar Plano Padrão de Tarugos' : 'Cadastrar Plano Padrão de Tarugos'}
          </DialogTitle>
          <DialogDescription>
            Cadastro e gestão dos planos padrão de corte e combinações de matéria-prima.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* BLOCO 1 — Identificação */}
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#004C97]">1. Identificação</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Empresa *</Label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {(hierarchy.companies.length ? hierarchy.companies.map((c) => c.name) : []).map(
                    (name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ),
                  )}
                </select>
                {errBelow('company')}
              </div>
              <div className="space-y-1.5">
                <Label>Centro *</Label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={form.center}
                  onChange={(e) => {
                    set('center', e.target.value)
                    set('line', '')
                  }}
                >
                  <option value="">Selecione...</option>
                  {centerOptions.map((c) => (
                    <option key={c.code} value={c.sap_plant_code}>
                      {c.sap_plant_code} — {c.name}
                    </option>
                  ))}
                </select>
                {errBelow('center')}
              </div>
              <div className="space-y-1.5">
                <Label>Linha *</Label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={form.line}
                  onChange={(e) => set('line', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {lineOptions.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code} — {l.name}
                    </option>
                  ))}
                </select>
                {errBelow('line')}
              </div>
              <div className="space-y-1.5">
                <Label>Plano de Corte *</Label>
                <Input
                  placeholder="P1, P2, P10..."
                  value={form.cutting_plan}
                  onChange={(e) => set('cutting_plan', e.target.value)}
                />
                {errBelow('cutting_plan')}
                {duplicateKeyError && <p className="text-xs text-red-600">{duplicateKeyError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as 'Ativo' | 'Inativo')}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>
          </section>

          {/* BLOCO 2 — Tarugo Principal */}
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#004C97]">2. Tarugo Principal</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label>Código do Material SAP *</Label>
                <MaterialSelector
                  value={form.main_material_code}
                  onChange={(code, material) => applyMaterial(material)}
                />
                {errBelow('main_material_code')}
              </div>
              <div className="space-y-1.5">
                <Label>Descrição (automática)</Label>
                <Input value={form.main_description} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label>Família/Aço (automática)</Label>
                <Input value={form.main_steel_family} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label>Seção/Dimensão</Label>
                <Input
                  placeholder="130 × 130 mm"
                  value={form.main_dimension_section}
                  onChange={(e) => set('main_dimension_section', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Código Fornecedor</Label>
                <Input
                  value={form.main_supplier_code}
                  onChange={(e) => set('main_supplier_code', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fornecedor / Razão Social</Label>
                <Input
                  value={form.main_supplier_name}
                  onChange={(e) => set('main_supplier_name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comprimento (m) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="12,00"
                  value={form.main_length_m}
                  onChange={(e) => set('main_length_m', e.target.value)}
                />
                {errBelow('main_length_m')}
              </div>
              <div className="space-y-1.5">
                <Label>Peso padrão do tarugo (kg) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="525"
                  value={form.main_weight_kg}
                  onChange={(e) => set('main_weight_kg', e.target.value)}
                />
                {errBelow('main_weight_kg')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-length-range"
                checked={form.use_length_range}
                onCheckedChange={(v) => set('use_length_range', v === true)}
              />
              <Label htmlFor="use-length-range" className="text-xs cursor-pointer">
                Definir faixa de comprimento (mínimo/máximo)
              </Label>
            </div>
            {form.use_length_range && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Comprimento mínimo (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.main_length_min_m}
                    onChange={(e) => set('main_length_min_m', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Comprimento máximo (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.main_length_max_m}
                    onChange={(e) => set('main_length_max_m', e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          {/* BLOCO 3 — Tarugos Alternativos */}
          <section className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#004C97]">
                3. Tarugos Alternativos / Composição do Plano
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addAlt} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar Tarugo Alternativo
              </Button>
            </div>
            {form.alternatives.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhum tarugo alternativo. Clique em “Adicionar Tarugo Alternativo” para compor o
                plano.
              </p>
            ) : (
              <div className="space-y-3">
                {form.alternatives.map((alt, idx) => (
                  <div key={alt._key} className="rounded-md border bg-slate-50/60 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Alternativa {idx + 1} · {alt.priority}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600 hover:bg-red-50"
                        onClick={() => removeAlt(alt._key)}
                        title="Remover alternativa"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label>Ordem</Label>
                        <Input
                          type="number"
                          min="1"
                          value={alt.order}
                          onChange={(e) => setAlt(alt._key, { order: Number(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Peso do Tarugo (kg)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={alt.weight_kg || ''}
                          onChange={(e) =>
                            setAlt(alt._key, { weight_kg: Number(e.target.value) || 0 })
                          }
                        />
                        {errBelow(`alt_weight_${idx}`)}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nº de Tarugos</Label>
                        <Input
                          type="number"
                          min="1"
                          value={alt.quantity || ''}
                          onChange={(e) =>
                            setAlt(alt._key, { quantity: Number(e.target.value) || 0 })
                          }
                        />
                        {errBelow(`alt_quantity_${idx}`)}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Comprimento (m)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={alt.length_m || ''}
                          onChange={(e) =>
                            setAlt(alt._key, { length_m: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                        <Label>Código Material SAP</Label>
                        <MaterialSelector
                          value={alt.material_code}
                          onChange={(code, material) => applyAltMaterial(alt._key, material)}
                        />
                        {errBelow(`alt_material_${idx}`)}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Descrição (automática)</Label>
                        <Input value={alt.description || ''} readOnly className="bg-slate-50" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fornecedor</Label>
                        <Input
                          value={alt.supplier_name || ''}
                          onChange={(e) => setAlt(alt._key, { supplier_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Prioridade de utilização</Label>
                        <select
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                          value={alt.priority}
                          onChange={(e) => setAlt(alt._key, { priority: e.target.value })}
                        >
                          {Array.from({ length: 10 }).map((_, i) => (
                            <option key={i} value={ordinal(i + 1)}>
                              {ordinal(i + 1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <select
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                          value={alt.status}
                          onChange={(e) =>
                            setAlt(alt._key, { status: e.target.value as 'Ativo' | 'Inativo' })
                          }
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TarugoPlanFormModal
