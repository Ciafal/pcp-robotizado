/**
 * Duplicar plano: copia todos os dados, exige NOVO código de Plano de Corte,
 * salva como novo registro; histórico registra "Derivado do plano: PXX".
 */
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  tarugoPlansService,
  type TarugoPlanRecord,
  type ValidationError,
} from '@/services/tarugo-plans-service'

interface Props {
  source: TarugoPlanRecord | null
  onClose: () => void
  onDuplicated: () => void
}

export function TarugoPlanDuplicateModal({ source, onClose, onDuplicated }: Props) {
  const [planCode, setPlanCode] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [duplicateKeyError, setDuplicateKeyError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (source) {
      setPlanCode('')
      setDescription(source.plan_description || '')
      setErrors([])
      setDuplicateKeyError(null)
    }
  }, [source])

  const payload = useMemo(() => {
    if (!source) return null
    return {
      company: source.company,
      center: source.center,
      line: source.line,
      cutting_plan: planCode.trim(),
      plan_description: description,
    }
  }, [source, planCode, description])

  const errFor = (field: string) => errors.find((e) => e.field === field)?.message || null

  const handleDuplicate = async () => {
    if (!source || !payload || saving) return
    setErrors([])
    setDuplicateKeyError(null)

    if (!payload.cutting_plan) {
      setErrors([{ field: 'cutting_plan', message: 'Informe o novo código do Plano de Corte.' }])
      return
    }
    if (payload.cutting_plan.toUpperCase() === source.cutting_plan.toUpperCase()) {
      setErrors([
        {
          field: 'cutting_plan',
          message: 'O novo código deve ser diferente do plano original.',
        },
      ])
      return
    }

    setSaving(true)
    try {
      const dup = await tarugoPlansService.checkDuplicateKey(
        {
          company: payload.company,
          center: payload.center,
          line: payload.line,
          cutting_plan: payload.cutting_plan,
        },
        undefined,
      )
      if (dup) {
        setDuplicateKeyError(
          'Já existe um plano com este código para a mesma combinação de Empresa + Centro + Linha.',
        )
        return
      }
      await tarugoPlansService.duplicatePlan(source, payload.cutting_plan)
      toast.success(`Plano de Tarugos ${payload.cutting_plan} salvo com sucesso.`)
      onDuplicated()
    } catch (err: any) {
      console.error('[TarugoPlanDuplicateModal] Erro ao duplicar:', err)
      toast.error(err?.message || 'Não foi possível duplicar o plano.')
    } finally {
      setSaving(false)
    }
  }

  if (!source) return null

  return (
    <Dialog open={!!source} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar Plano de Tarugos {source.cutting_plan}</DialogTitle>
          <DialogDescription>
            Todos os dados do plano serão copiados. Informe o NOVO código de Plano de Corte — o
            plano original permanece intacto e o histórico registrará “Derivado do plano:{' '}
            {source.cutting_plan}”.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Novo Plano de Corte *</Label>
            <Input
              autoFocus
              placeholder="P2, P11..."
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
            />
            {errFor('cutting_plan') && (
              <p className="text-xs text-red-600">{errFor('cutting_plan')}</p>
            )}
            {duplicateKeyError && <p className="text-xs text-red-600">{duplicateKeyError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Descrição do plano</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            <p>
              <span className="font-medium">Resumo da cópia:</span> {source.company} ·{' '}
              {source.center} · {source.line} · tarugo principal{' '}
              <span className="font-mono">{source.main_material_code}</span> ·{' '}
              {(source.alternatives || []).length} alternativa(s).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleDuplicate} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Duplicando…' : 'Duplicar plano'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TarugoPlanDuplicateModal
